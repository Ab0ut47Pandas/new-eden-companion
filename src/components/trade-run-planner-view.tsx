"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleHelp,
  Coins,
  Navigation,
  PackagePlus,
  Route,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import styles from "@/app/items/item-explorer.module.css";
import type { DashboardData } from "@/lib/dashboard/model";
import type { TradeOptimizationGoal } from "@/lib/economy/trade-run-optimizer";
import { MARKET_HUBS } from "@/lib/map/hubs";
import type { RiskRouteMode } from "@/lib/map/risk-route-core";

interface CandidateSearchResult {
  typeId: number;
  name: string;
  unitVolumeM3: number;
  groupName: string | null;
}

interface TradePlanResponse {
  origin: { id: number; name: string; stationName: string };
  destination: { id: number; name: string; stationName: string };
  marketFetchedAt: string;
  plan: {
    lines: Array<{
      typeId: number;
      name: string;
      quantity: number;
      volumeM3: number;
      acquisitionCostIsk: number;
      grossRevenueIsk: number;
      salesTaxIsk: number;
      netRevenueIsk: number;
      profitIsk: number;
      roiPercent: number;
      profitPerM3: number;
    }>;
    cargoCapacityM3: number;
    cargoUsedM3: number;
    capitalAvailableIsk: number;
    capitalUsedIsk: number;
    grossRevenueIsk: number;
    salesTaxIsk: number;
    netRevenueIsk: number;
    profitIsk: number;
    remainingCargoM3: number;
    remainingCapitalIsk: number;
    warnings: string[];
  };
}

interface RiskRouteResponse {
  generatedAt: string;
  route: {
    mode: RiskRouteMode;
    systems: Array<{
      id: number;
      name: string;
      securityStatus: number;
      shipKills: number;
      podKills: number;
      shipJumps: number;
      exposureIndex: number;
    }>;
    jumps: number;
    shortestJumps: number;
    extraJumps: number;
    exposureIndex: number;
    reasons: string[];
    warnings: string[];
  };
}

function isk(value: number): string {
  return `${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value)} ISK`;
}

function numeric(value: string, fallback = 0): number {
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function errorText(payload: unknown, fallback: string): string {
  return payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
    ? payload.error
    : fallback;
}

export function TradeRunPlannerView({ data, connected }: { data: DashboardData; connected: boolean }) {
  const currentHub = MARKET_HUBS.find((hub) => hub.id === data.character.solarSystemId);
  const defaultOrigin = currentHub?.id ?? MARKET_HUBS.find((hub) => hub.name === "Amarr")?.id ?? MARKET_HUBS[0].id;
  const defaultDestination = MARKET_HUBS.find((hub) => hub.name === "Jita" && hub.id !== defaultOrigin)?.id
    ?? MARKET_HUBS.find((hub) => hub.id !== defaultOrigin)?.id
    ?? MARKET_HUBS[0].id;

  const [originId, setOriginId] = useState(defaultOrigin);
  const [destinationId, setDestinationId] = useState(defaultDestination);
  const [cargoCapacity, setCargoCapacity] = useState("");
  const [capital, setCapital] = useState(connected ? String(Math.max(0, Math.floor(data.summary.wallet))) : "100000000");
  const [salesTax, setSalesTax] = useState("7.5");
  const [goal, setGoal] = useState<TradeOptimizationGoal>("profit");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [candidateResults, setCandidateResults] = useState<CandidateSearchResult[]>([]);
  const [candidates, setCandidates] = useState<CandidateSearchResult[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [plan, setPlan] = useState<TradePlanResponse | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  const [routeMode, setRouteMode] = useState<RiskRouteMode>("lower-exposure");
  const [maxExtraJumps, setMaxExtraJumps] = useState("10");
  const [highSecOnly, setHighSecOnly] = useState(true);
  const [avoidQuery, setAvoidQuery] = useState("");
  const [avoidResults, setAvoidResults] = useState<Array<{ id: number; name: string; securityStatus: number }>>([]);
  const [avoids, setAvoids] = useState<Array<{ id: number; name: string; securityStatus: number }>>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<RiskRouteResponse | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState<string | null>(null);
  const [sendingRoute, setSendingRoute] = useState(false);

  const origin = useMemo(() => MARKET_HUBS.find((hub) => hub.id === originId) ?? MARKET_HUBS[0], [originId]);
  const destination = useMemo(() => MARKET_HUBS.find((hub) => hub.id === destinationId) ?? MARKET_HUBS[1] ?? MARKET_HUBS[0], [destinationId]);

  async function searchCandidates(event: FormEvent) {
    event.preventDefault();
    if (candidateQuery.trim().length < 2) return;
    setCandidateLoading(true);
    try {
      const response = await fetch(`/api/hauling/trade-run/search?q=${encodeURIComponent(candidateQuery.trim())}`, { cache: "no-store" });
      const payload = await response.json() as { results?: CandidateSearchResult[]; error?: string };
      if (!response.ok) throw new Error(errorText(payload, "Candidate search failed."));
      setCandidateResults(payload.results ?? []);
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : "Candidate search failed.");
    } finally {
      setCandidateLoading(false);
    }
  }

  function addCandidate(candidate: CandidateSearchResult) {
    setCandidates((current) => current.some((item) => item.typeId === candidate.typeId) || current.length >= 16 ? current : [...current, candidate]);
  }

  async function optimize() {
    setPlanLoading(true);
    setPlanError(null);
    setPlan(null);
    try {
      const response = await fetch("/api/hauling/trade-run/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originSystemId: origin.id,
          destinationSystemId: destination.id,
          typeIds: candidates.map((candidate) => candidate.typeId),
          cargoCapacityM3: numeric(cargoCapacity),
          capitalIsk: numeric(capital),
          salesTaxPercent: numeric(salesTax),
          goal,
        }),
      });
      const payload = await response.json() as TradePlanResponse | { error?: string };
      if (!response.ok || !("plan" in payload)) throw new Error(errorText(payload, "Trade-run planning failed."));
      setPlan(payload);
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : "Trade-run planning failed.");
    } finally {
      setPlanLoading(false);
    }
  }

  async function searchAvoids(event: FormEvent) {
    event.preventDefault();
    if (avoidQuery.trim().length < 2) return;
    try {
      const response = await fetch(`/api/map/risk-route/search?q=${encodeURIComponent(avoidQuery.trim())}`, { cache: "no-store" });
      const payload = await response.json() as { results?: Array<{ id: number; name: string; securityStatus: number }>; error?: string };
      if (!response.ok) throw new Error(errorText(payload, "System search failed."));
      setAvoidResults(payload.results ?? []);
    } catch (error) {
      setRouteError(error instanceof Error ? error.message : "System search failed.");
    }
  }

  async function planRoute() {
    setRouteLoading(true);
    setRouteError(null);
    setRouteResult(null);
    setSendMessage(null);
    try {
      const response = await fetch("/api/map/risk-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originId: origin.id,
          destinationId: destination.id,
          mode: routeMode,
          avoidSystemIds: avoids.map((system) => system.id),
          maxExtraJumps: numeric(maxExtraJumps, 10),
          highSecOnly,
        }),
      });
      const payload = await response.json() as RiskRouteResponse | { error?: string };
      if (!response.ok || !("route" in payload)) throw new Error(errorText(payload, "Route planning failed."));
      setRouteResult(payload);
    } catch (error) {
      setRouteError(error instanceof Error ? error.message : "Route planning failed.");
    } finally {
      setRouteLoading(false);
    }
  }

  async function sendRouteToEve() {
    if (!routeResult || !connected) return;
    setSendingRoute(true);
    setSendMessage(null);
    try {
      const response = await fetch("/api/map/risk-route/waypoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemIds: routeResult.route.systems.map((system) => system.id), replaceRoute: true }),
      });
      const payload = await response.json() as { written?: number; error?: string };
      if (!response.ok) throw new Error(errorText(payload, "EVE did not accept the custom route."));
      setSendMessage(`Sent ${payload.written ?? routeResult.route.systems.length} validated route systems to EVE.`);
    } catch (error) {
      setSendMessage(error instanceof Error ? error.message : "EVE did not accept the custom route.");
    } finally {
      setSendingRoute(false);
    }
  }

  function changeOrigin(value: number) {
    setOriginId(value);
    if (value === destinationId) setDestinationId(MARKET_HUBS.find((hub) => hub.id !== value)?.id ?? destinationId);
    setPlan(null);
    setRouteResult(null);
  }

  function changeDestination(value: number) {
    setDestinationId(value);
    if (value === originId) setOriginId(MARKET_HUBS.find((hub) => hub.id !== value)?.id ?? originId);
    setPlan(null);
    setRouteResult(null);
  }

  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <div className={styles.topbar}>
          <Link className={styles.backLink} href="/activities/hauling"><ArrowLeft size={15} /> Hauling readiness</Link>
          <div className={styles.pills}><span className={styles.dataBadge}><TrendingUp size={14} /> HAU-02 preview</span></div>
        </div>

        <section className={styles.hero}>
          <div className={styles.eyebrow}>Trade-run optimizer</div>
          <h1>Max the run you can actually carry</h1>
          <p>Choose two major NPC trade hubs, the ISK you are willing to invest, your real fitted cargo capacity, and candidate items. NEC walks visible order depth, subtracts your sales tax, fills the hold under your capital limit, and separately compares a bounded lower-exposure route.</p>
        </section>

        <div className={styles.notice}><CircleHelp size={16} /><div><strong>Candidate optimization is exact; global discovery is not finished yet.</strong><span>NEC optimizes the items you add below. It does not yet claim those items are every profitable opportunity in New Eden. Broad market discovery remains the unfinished part of HAU-02.</span></div></div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}><div><div className={styles.eyebrow}>1 · Run constraints</div><h2>Where, how big, how much ISK?</h2></div><p>{connected ? `${isk(data.summary.wallet)} currently liquid` : "Connect EVE to prefill your live wallet"}</p></div>
          <form className={styles.searchForm} onSubmit={(event) => event.preventDefault()}>
            <label className={styles.searchBox}><Truck size={16} /><select value={origin.id} onChange={(event) => changeOrigin(Number(event.target.value))} aria-label="Origin trade hub">{MARKET_HUBS.map((hub) => <option key={hub.id} value={hub.id}>{hub.name} — {hub.stationName}</option>)}</select></label>
            <label className={styles.searchBox}><Navigation size={16} /><select value={destination.id} onChange={(event) => changeDestination(Number(event.target.value))} aria-label="Destination trade hub">{MARKET_HUBS.map((hub) => <option key={hub.id} value={hub.id}>{hub.name} — {hub.stationName}</option>)}</select></label>
            <label className={styles.searchBox}><input value={cargoCapacity} onChange={(event) => setCargoCapacity(event.target.value)} inputMode="decimal" placeholder="Actual fitted cargo capacity m³" aria-label="Cargo capacity" /></label>
            <label className={styles.searchBox}><Coins size={16} /><input value={capital} onChange={(event) => setCapital(event.target.value)} inputMode="decimal" placeholder="ISK available to invest" aria-label="Investment capital" /></label>
            <label className={styles.searchBox}><input value={salesTax} onChange={(event) => setSalesTax(event.target.value)} inputMode="decimal" placeholder="Sales tax %" aria-label="Sales tax percentage" /></label>
          </form>
          <div className={styles.productLinks}>{(["profit", "profit-per-m3", "roi", "balanced"] as TradeOptimizationGoal[]).map((item) => <button key={item} type="button" className={goal === item ? styles.secondaryLink : styles.pill} onClick={() => setGoal(item)}>{item === "profit" ? "Max ISK/trip" : item === "profit-per-m3" ? "Max ISK/m³" : item === "roi" ? "Max ROI" : "Balanced"}</button>)}</div>
          <div className={styles.notice}><ShieldCheck size={15} /><span>Default tax is 7.5%. Enter the actual sales-tax rate your EVE client shows if your Accounting skill reduces it. This first planner models immediate station buys and immediate sales into existing buy orders, so it does not add broker/relist fees for orders you are not creating.</span></div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}><div><div className={styles.eyebrow}>2 · Candidate basket</div><h2>What should NEC compare?</h2></div><p>{candidates.length}/16 selected</p></div>
          <form className={styles.searchForm} onSubmit={searchCandidates}><label className={styles.searchBox}><Search size={16} /><input value={candidateQuery} onChange={(event) => setCandidateQuery(event.target.value)} placeholder="Search market item: Isogen, Scourge Heavy Missile, module…" /></label><button className={styles.searchButton} disabled={candidateLoading}>{candidateLoading ? "Searching…" : "Find"}</button></form>
          {candidateResults.length > 0 && <div className={styles.results}>{candidateResults.map((candidate) => <button type="button" className={styles.resultCard} key={candidate.typeId} onClick={() => addCandidate(candidate)} disabled={candidates.some((item) => item.typeId === candidate.typeId) || candidates.length >= 16}><div className={styles.resultTop}><span className={styles.mutedPill}>{candidate.groupName ?? "market item"}</span><span className={styles.pill}>{candidate.unitVolumeM3.toLocaleString()} m³/unit</span></div><h3>{candidate.name}</h3><p>Type {candidate.typeId}</p></button>)}</div>}
          {candidates.length > 0 ? <div className={styles.results}>{candidates.map((candidate) => <article className={styles.infoCard} key={candidate.typeId}><div className={styles.resultTop}><span className={styles.kindPill}>selected</span><button type="button" className={styles.pill} onClick={() => setCandidates((current) => current.filter((item) => item.typeId !== candidate.typeId))}><Trash2 size={12} /> remove</button></div><h3>{candidate.name}</h3><p className={styles.description}>{candidate.unitVolumeM3.toLocaleString()} m³ each</p></article>)}</div> : <div className={styles.emptyState}><PackagePlus size={22} /><strong>Add candidate items.</strong>HAU-02 will not invent a “best trade” from an unscanned market.</div>}
          <button className={styles.searchButton} type="button" onClick={() => void optimize()} disabled={planLoading || candidates.length === 0}>{planLoading ? "Walking live order depth…" : "Optimize this cargo"}</button>
          {planError && <div className={styles.error}>{planError}</div>}
        </section>

        {plan && <section className={styles.section}>
          <div className={styles.sectionHeader}><div><div className={styles.eyebrow}>Cargo answer</div><h2>{plan.plan.lines.length ? `${isk(plan.plan.profitIsk)} estimated net profit` : "No positive after-tax spread found"}</h2></div><p>{plan.origin.name} → {plan.destination.name}</p></div>
          <div className={styles.results}>
            <article className={styles.infoCard}><h3>{plan.plan.cargoUsedM3.toLocaleString(undefined, { maximumFractionDigits: 2 })} / {plan.plan.cargoCapacityM3.toLocaleString()} m³</h3><p>Cargo used</p></article>
            <article className={styles.infoCard}><h3>{isk(plan.plan.capitalUsedIsk)}</h3><p>Capital invested</p></article>
            <article className={styles.infoCard}><h3>{isk(plan.plan.salesTaxIsk)}</h3><p>Sales tax</p></article>
          </div>
          <div className={styles.results}>{plan.plan.lines.map((line) => <article className={styles.infoCard} key={line.typeId}><div className={styles.resultTop}><span className={styles.kindPill}>× {line.quantity.toLocaleString()}</span><span className={styles.pill}>{line.volumeM3.toLocaleString(undefined, { maximumFractionDigits: 2 })} m³</span></div><h3>{line.name}</h3><p className={styles.description}>Buy {isk(line.acquisitionCostIsk)} → after-tax revenue {isk(line.netRevenueIsk)}</p><p className={styles.description}><strong>{isk(line.profitIsk)} profit</strong> · {line.roiPercent.toFixed(1)}% ROI · {isk(line.profitPerM3)}/m³</p></article>)}</div>
          <div className={styles.notice}><AlertTriangle size={16} /><span>{plan.plan.warnings.join(" ")}</span></div>
        </section>}

        <section className={styles.section}>
          <div className={styles.sectionHeader}><div><div className={styles.eyebrow}>3 · Route policy</div><h2>How much detour is lower exposure worth?</h2></div><p>{origin.name} → {destination.name}</p></div>
          <div className={styles.productLinks}>{(["fastest", "balanced", "lower-exposure"] as RiskRouteMode[]).map((item) => <button key={item} type="button" className={routeMode === item ? styles.secondaryLink : styles.pill} onClick={() => setRouteMode(item)}>{item.replace("-", " ")}</button>)}</div>
          <form className={styles.searchForm} onSubmit={(event) => event.preventDefault()}><label className={styles.searchBox}><Route size={16} /><input value={maxExtraJumps} onChange={(event) => setMaxExtraJumps(event.target.value)} inputMode="numeric" placeholder="Maximum extra jumps" /></label><label className={styles.searchBox}><input type="checkbox" checked={highSecOnly} onChange={(event) => setHighSecOnly(event.target.checked)} /> High-sec intermediate systems only</label></form>
          <form className={styles.searchForm} onSubmit={searchAvoids}><label className={styles.searchBox}><Search size={16} /><input value={avoidQuery} onChange={(event) => setAvoidQuery(event.target.value)} placeholder="Avoid a system, e.g. Uedama" /></label><button className={styles.searchButton}>Find system</button></form>
          {avoidResults.length > 0 && <div className={styles.productLinks}>{avoidResults.map((system) => <button key={system.id} type="button" className={styles.pill} onClick={() => setAvoids((current) => current.some((item) => item.id === system.id) ? current : [...current, system])}>{system.name} {system.securityStatus.toFixed(1)}</button>)}</div>}
          {avoids.length > 0 && <div className={styles.productLinks}>{avoids.map((system) => <button key={system.id} type="button" className={styles.secondaryLink} onClick={() => setAvoids((current) => current.filter((item) => item.id !== system.id))}>{system.name} ×</button>)}</div>}
          <button className={styles.searchButton} type="button" onClick={() => void planRoute()} disabled={routeLoading}>{routeLoading ? "Comparing paths…" : "Compare route"}</button>
          {routeError && <div className={styles.error}>{routeError}</div>}
        </section>

        {routeResult && <section className={styles.section}>
          <div className={styles.sectionHeader}><div><div className={styles.eyebrow}>Route answer</div><h2>{routeResult.route.jumps} jumps · {routeResult.route.extraJumps > 0 ? `+${routeResult.route.extraJumps} detour` : "minimum-jump length"}</h2></div><p>Exposure index {routeResult.route.exposureIndex.toFixed(1)}</p></div>
          <div className={styles.notice}><ShieldCheck size={16} /><div><strong>{routeResult.route.reasons[0]}</strong><span>{routeResult.route.reasons.slice(1).join(" ")}</span></div></div>
          <div className={styles.results}>{routeResult.route.systems.map((system, index) => <article className={styles.infoCard} key={`${system.id}-${index}`}><div className={styles.resultTop}><span className={system.securityStatus >= 0.45 ? styles.kindPill : styles.warnPill}>{system.securityStatus.toFixed(1)}</span><span className={styles.mutedPill}>jump {index}</span></div><h3>{system.name}</h3><p className={styles.description}>{system.shipKills} ship kills · {system.podKills} pods · {system.shipJumps.toLocaleString()} jumps in current CCP snapshot</p>{system.exposureIndex > 0 && <p className={styles.description}>Route exposure weight: {system.exposureIndex.toFixed(1)}</p>}</article>)}</div>
          <div className={styles.notice}><AlertTriangle size={16} /><span>{routeResult.route.warnings.join(" ")}</span></div>
          {connected ? <button className={styles.searchButton} type="button" onClick={() => void sendRouteToEve()} disabled={sendingRoute}>{sendingRoute ? "Sending waypoints…" : "Replace my EVE route with this exact path"}</button> : <div className={styles.notice}><CircleHelp size={16} /> Connect EVE before sending waypoints to the client.</div>}
          {sendMessage && <div className={sendMessage.startsWith("Sent") ? styles.notice : styles.error}>{sendMessage.startsWith("Sent") ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}{sendMessage}</div>}
        </section>}
      </div>
    </main>
  );
}
