"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleHelp,
  Coins,
  ExternalLink,
  Navigation,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import styles from "@/app/items/item-explorer.module.css";
import type { DashboardData } from "@/lib/dashboard/model";
import type { TradeOptimizationGoal } from "@/lib/economy/trade-run-optimizer";
import { MARKET_HUBS } from "@/lib/map/hubs";
import type { RiskRouteMode } from "@/lib/map/risk-route-core";

interface DiscoveryResponse {
  origin: { id: number; name: string; stationName: string };
  destination: { id: number; name: string; stationName: string };
  discovered: Array<{
    typeId: number;
    name: string;
    unitVolumeM3: number;
    discoveryOriginSell: number;
    discoveryDestinationBuy: number;
  }>;
  source: {
    discovery: string;
    verification: string;
    discoveryFetchedAt: string;
    verificationFetchedAt: string;
  };
  plan: {
    lines: Array<{
      typeId: number;
      name: string;
      quantity: number;
      volumeM3: number;
      acquisitionCostIsk: number;
      netRevenueIsk: number;
      salesTaxIsk: number;
      profitIsk: number;
      roiPercent: number;
      profitPerM3: number;
    }>;
    cargoCapacityM3: number;
    cargoUsedM3: number;
    capitalUsedIsk: number;
    salesTaxIsk: number;
    profitIsk: number;
  };
  warnings: string[];
}

interface RiskRouteResponse {
  route: {
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

function parseNumber(value: string, fallback = 0): number {
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function errorText(payload: unknown, fallback: string): string {
  return payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
    ? payload.error
    : fallback;
}

export function TradeRunDiscoveryView({ data, connected }: { data: DashboardData; connected: boolean }) {
  const currentHub = MARKET_HUBS.find((hub) => hub.id === data.character.solarSystemId);
  const initialOrigin = currentHub?.id ?? MARKET_HUBS.find((hub) => hub.name === "Amarr")?.id ?? MARKET_HUBS[0].id;
  const initialDestination = MARKET_HUBS.find((hub) => hub.name === "Jita" && hub.id !== initialOrigin)?.id
    ?? MARKET_HUBS.find((hub) => hub.id !== initialOrigin)?.id
    ?? MARKET_HUBS[0].id;

  const [originId, setOriginId] = useState(initialOrigin);
  const [destinationId, setDestinationId] = useState(initialDestination);
  const [cargoCapacity, setCargoCapacity] = useState("");
  const [capital, setCapital] = useState(connected ? String(Math.max(0, Math.floor(data.summary.wallet))) : "100000000");
  const [salesTax, setSalesTax] = useState("7.5");
  const [goal, setGoal] = useState<TradeOptimizationGoal>("profit");
  const [discovering, setDiscovering] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const [routeMode, setRouteMode] = useState<RiskRouteMode>("lower-exposure");
  const [maxExtraJumps, setMaxExtraJumps] = useState("10");
  const [highSecOnly, setHighSecOnly] = useState(true);
  const [avoidQuery, setAvoidQuery] = useState("");
  const [avoidResults, setAvoidResults] = useState<Array<{ id: number; name: string; securityStatus: number }>>([]);
  const [avoids, setAvoids] = useState<Array<{ id: number; name: string; securityStatus: number }>>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<RiskRouteResponse | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState<string | null>(null);

  const origin = useMemo(() => MARKET_HUBS.find((hub) => hub.id === originId) ?? MARKET_HUBS[0], [originId]);
  const destination = useMemo(() => MARKET_HUBS.find((hub) => hub.id === destinationId) ?? MARKET_HUBS[1] ?? MARKET_HUBS[0], [destinationId]);

  function resetAnswers() {
    setDiscovery(null);
    setRouteResult(null);
    setSendMessage(null);
  }

  function changeOrigin(value: number) {
    setOriginId(value);
    if (value === destinationId) setDestinationId(MARKET_HUBS.find((hub) => hub.id !== value)?.id ?? destinationId);
    resetAnswers();
  }

  function changeDestination(value: number) {
    setDestinationId(value);
    if (value === originId) setOriginId(MARKET_HUBS.find((hub) => hub.id !== value)?.id ?? originId);
    resetAnswers();
  }

  async function discover() {
    setDiscovering(true);
    setDiscoveryError(null);
    setDiscovery(null);
    try {
      const response = await fetch("/api/hauling/trade-run/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originSystemId: origin.id,
          destinationSystemId: destination.id,
          cargoCapacityM3: parseNumber(cargoCapacity),
          capitalIsk: parseNumber(capital),
          salesTaxPercent: parseNumber(salesTax),
          goal,
        }),
      });
      const payload = await response.json() as DiscoveryResponse | { error?: string };
      if (!response.ok || !("plan" in payload)) throw new Error(errorText(payload, "Trade discovery failed."));
      setDiscovery(payload);
    } catch (error) {
      setDiscoveryError(error instanceof Error ? error.message : "Trade discovery failed.");
    } finally {
      setDiscovering(false);
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

  async function compareRoute() {
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
          maxExtraJumps: parseNumber(maxExtraJumps, 10),
          highSecOnly,
        }),
      });
      const payload = await response.json() as RiskRouteResponse | { error?: string };
      if (!response.ok || !("route" in payload)) throw new Error(errorText(payload, "Route comparison failed."));
      setRouteResult(payload);
    } catch (error) {
      setRouteError(error instanceof Error ? error.message : "Route comparison failed.");
    } finally {
      setRouteLoading(false);
    }
  }

  async function sendRoute() {
    if (!routeResult || !connected) return;
    setSending(true);
    setSendMessage(null);
    try {
      const response = await fetch("/api/map/risk-route/waypoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemIds: routeResult.route.systems.map((system) => system.id), replaceRoute: true }),
      });
      const payload = await response.json() as { written?: number; error?: string };
      if (!response.ok) throw new Error(errorText(payload, "EVE did not accept the custom route."));
      setSendMessage(`Sent ${payload.written ?? routeResult.route.systems.length} validated waypoints to EVE.`);
    } catch (error) {
      setSendMessage(error instanceof Error ? error.message : "EVE did not accept the custom route.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <div className={styles.topbar}>
          <Link className={styles.backLink} href="/activities/hauling"><ArrowLeft size={15} /> Hauling readiness</Link>
          <div className={styles.pills}>
            <Link className={styles.secondaryLink} href="/activities/hauling/trade-run/custom"><Search size={14} /> Choose candidates manually</Link>
            <span className={styles.dataBadge}><TrendingUp size={14} /> HAU-02</span>
          </div>
        </div>

        <section className={styles.hero}>
          <div className={styles.eyebrow}>Trade-run discovery + exact verification</div>
          <h1>Find me the best run</h1>
          <p>NEC scans the broad market for likely hub-to-hub spreads, verifies the finalists against CCP&apos;s exact station order depth, fills the cargo hold under your ISK limit, and then compares a separate custom route that can spend extra jumps to avoid systems or reduce current activity exposure.</p>
        </section>

        <div className={styles.notice}><ShieldCheck size={16} /><div><strong>Discovery is not the final price source.</strong><span>Fuzzwork aggregates are only a fast shortlist. NEC recalculates the recommended cargo from CCP ESI exact-station orders before showing profit.</span></div></div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}><div><div className={styles.eyebrow}>1 · Constraints</div><h2>What run are we maximizing?</h2></div><p>{connected ? `${isk(data.summary.wallet)} liquid` : "Demo wallet shown"}</p></div>
          <form className={styles.searchForm} onSubmit={(event) => event.preventDefault()}>
            <label className={styles.searchBox}><Navigation size={15} /><select value={origin.id} onChange={(event) => changeOrigin(Number(event.target.value))}>{MARKET_HUBS.map((hub) => <option value={hub.id} key={hub.id}>From {hub.name} — {hub.stationName}</option>)}</select></label>
            <label className={styles.searchBox}><Navigation size={15} /><select value={destination.id} onChange={(event) => changeDestination(Number(event.target.value))}>{MARKET_HUBS.map((hub) => <option value={hub.id} key={hub.id}>To {hub.name} — {hub.stationName}</option>)}</select></label>
            <label className={styles.searchBox}><input value={cargoCapacity} onChange={(event) => setCargoCapacity(event.target.value)} inputMode="decimal" placeholder="Actual fitted cargo capacity m³" /></label>
            <label className={styles.searchBox}><Coins size={15} /><input value={capital} onChange={(event) => setCapital(event.target.value)} inputMode="decimal" placeholder="ISK willing to invest" /></label>
            <label className={styles.searchBox}><input value={salesTax} onChange={(event) => setSalesTax(event.target.value)} inputMode="decimal" placeholder="Your sales tax %" /></label>
          </form>
          <div className={styles.productLinks}>{(["profit", "profit-per-m3", "roi", "balanced"] as TradeOptimizationGoal[]).map((item) => <button type="button" key={item} className={goal === item ? styles.secondaryLink : styles.pill} onClick={() => setGoal(item)}>{item === "profit" ? "Max ISK/trip" : item === "profit-per-m3" ? "Max ISK/m³" : item === "roi" ? "Max ROI" : "Balanced"}</button>)}</div>
          <div className={styles.notice}><CircleHelp size={15} /><span>Enter the usable cargo capacity from your actual fitted ship in EVE. The 7.5% tax is only a starting value; replace it with the rate your client shows. This planner models immediate buys and immediate sale into existing destination buy orders, not speculative sell orders.</span></div>
          <button className={styles.searchButton} type="button" onClick={() => void discover()} disabled={discovering}>{discovering ? "Scanning, shortlisting, then verifying…" : "Find best cargo now"}</button>
          {discoveryError && <div className={styles.error}>{discoveryError}</div>}
        </section>

        {discovery && <section className={styles.section}>
          <div className={styles.sectionHeader}><div><div className={styles.eyebrow}>Verified cargo</div><h2>{discovery.plan.lines.length ? `${isk(discovery.plan.profitIsk)} estimated net profit` : "No verified positive spread found"}</h2></div><p>{origin.name} → {destination.name}</p></div>
          <div className={styles.results}>
            <article className={styles.infoCard}><h3>{discovery.plan.cargoUsedM3.toLocaleString(undefined, { maximumFractionDigits: 2 })} / {discovery.plan.cargoCapacityM3.toLocaleString()} m³</h3><p>Cargo used</p></article>
            <article className={styles.infoCard}><h3>{isk(discovery.plan.capitalUsedIsk)}</h3><p>Capital invested</p></article>
            <article className={styles.infoCard}><h3>{isk(discovery.plan.salesTaxIsk)}</h3><p>Sales tax</p></article>
          </div>
          <div className={styles.results}>{discovery.plan.lines.map((line) => <article className={styles.infoCard} key={line.typeId}><div className={styles.resultTop}><span className={styles.kindPill}>× {line.quantity.toLocaleString()}</span><span className={styles.pill}>{line.volumeM3.toLocaleString(undefined, { maximumFractionDigits: 2 })} m³</span></div><h3>{line.name}</h3><p className={styles.description}>Buy {isk(line.acquisitionCostIsk)} → after-tax revenue {isk(line.netRevenueIsk)}</p><p className={styles.description}><strong>{isk(line.profitIsk)} profit</strong> · {line.roiPercent.toFixed(1)}% ROI · {isk(line.profitPerM3)}/m³</p></article>)}</div>
          <div className={styles.notice}><Sparkles size={16} /><div><strong>How NEC found these</strong><span>{discovery.source.discovery}; finalists rechecked with {discovery.source.verification}. The shortlist contained {discovery.discovered.length} station-level candidates before exact ESI verification.</span></div></div>
          <div className={styles.notice}><AlertTriangle size={16} /><span>{discovery.warnings.join(" ")}</span></div>
        </section>}

        <section className={styles.section}>
          <div className={styles.sectionHeader}><div><div className={styles.eyebrow}>2 · Route</div><h2>Fastest, balanced, or lower exposure?</h2></div><p>{origin.name} → {destination.name}</p></div>
          <div className={styles.productLinks}>{(["fastest", "balanced", "lower-exposure"] as RiskRouteMode[]).map((item) => <button type="button" key={item} className={routeMode === item ? styles.secondaryLink : styles.pill} onClick={() => setRouteMode(item)}>{item.replaceAll("-", " ")}</button>)}</div>
          <form className={styles.searchForm} onSubmit={(event) => event.preventDefault()}><label className={styles.searchBox}><Route size={15} /><input value={maxExtraJumps} onChange={(event) => setMaxExtraJumps(event.target.value)} inputMode="numeric" placeholder="Maximum extra jumps" /></label><label className={styles.searchBox}><input type="checkbox" checked={highSecOnly} onChange={(event) => setHighSecOnly(event.target.checked)} /> High-sec intermediate systems only</label></form>
          <form className={styles.searchForm} onSubmit={searchAvoids}><label className={styles.searchBox}><Search size={15} /><input value={avoidQuery} onChange={(event) => setAvoidQuery(event.target.value)} placeholder="Avoid a system, e.g. Uedama" /></label><button className={styles.searchButton}>Find</button></form>
          {avoidResults.length > 0 && <div className={styles.productLinks}>{avoidResults.map((system) => <button type="button" className={styles.pill} key={system.id} onClick={() => setAvoids((current) => current.some((item) => item.id === system.id) ? current : [...current, system])}>{system.name} {system.securityStatus.toFixed(1)}</button>)}</div>}
          {avoids.length > 0 && <div className={styles.productLinks}>{avoids.map((system) => <button type="button" className={styles.secondaryLink} key={system.id} onClick={() => setAvoids((current) => current.filter((item) => item.id !== system.id))}>{system.name} ×</button>)}</div>}
          <button className={styles.searchButton} type="button" onClick={() => void compareRoute()} disabled={routeLoading}>{routeLoading ? "Comparing paths…" : "Find route"}</button>
          {routeError && <div className={styles.error}>{routeError}</div>}
        </section>

        {routeResult && <section className={styles.section}>
          <div className={styles.sectionHeader}><div><div className={styles.eyebrow}>Route answer</div><h2>{routeResult.route.jumps} jumps · {routeResult.route.extraJumps ? `+${routeResult.route.extraJumps} over shortest` : "shortest length"}</h2></div><p>Exposure index {routeResult.route.exposureIndex.toFixed(1)}</p></div>
          <div className={styles.notice}><ShieldCheck size={16} /><div><strong>{routeResult.route.reasons[0]}</strong><span>{routeResult.route.reasons.slice(1).join(" ")}</span></div></div>
          <div className={styles.results}>{routeResult.route.systems.map((system, index) => <article className={styles.infoCard} key={`${system.id}-${index}`}><div className={styles.resultTop}><span className={system.securityStatus >= 0.45 ? styles.kindPill : styles.warnPill}>{system.securityStatus.toFixed(1)}</span><span className={styles.mutedPill}>{index === 0 ? "origin" : `jump ${index}`}</span></div><h3>{system.name}</h3><p className={styles.description}>{system.shipKills} ship kills · {system.podKills} pods · {system.shipJumps.toLocaleString()} ship jumps</p>{system.exposureIndex > 0 && <p className={styles.description}>Exposure weight {system.exposureIndex.toFixed(1)}</p>}</article>)}</div>
          <div className={styles.notice}><AlertTriangle size={16} /><span>{routeResult.route.warnings.join(" ")}</span></div>
          {connected ? <button className={styles.searchButton} type="button" onClick={() => void sendRoute()} disabled={sending}>{sending ? "Sending exact route…" : "Replace my EVE route with this exact path"}</button> : <div className={styles.notice}><CircleHelp size={16} /> Connect EVE to send the custom route into the client.</div>}
          {sendMessage && <div className={sendMessage.startsWith("Sent") ? styles.notice : styles.error}>{sendMessage.startsWith("Sent") ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}{sendMessage}</div>}
        </section>}

        <section className={styles.section}>
          <div className={styles.notice}><ExternalLink size={15} /><span>Need to test a specific item instead? <Link className={styles.secondaryLink} href="/activities/hauling/trade-run/custom">Open the manual candidate-basket optimizer.</Link></span></div>
        </section>
      </div>
    </main>
  );
}
