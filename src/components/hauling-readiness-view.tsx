"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  CircleHelp,
  PackageOpen,
  Route,
  ShieldCheck,
  Truck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import styles from "@/app/items/item-explorer.module.css";
import {
  assessHaulingReadiness,
  type HaulingEvidenceState,
  type HaulingMode,
  type HaulingShipProfile,
  type ReplacementRiskState,
} from "@/lib/activity/hauling-readiness";
import type { DashboardData } from "@/lib/dashboard/model";
import type { HaulRisk } from "@/lib/economy/haul-decision";
import type { ShipCatalogResponse } from "@/lib/ships/model";
import { recommendFits, SHIP_TASKS, type FitRecommendation } from "@/lib/ships/task-planner";

const HAUL_TASK = SHIP_TASKS.find((task) => task.id === "highsec-hauling");

function nullableNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function integerOr(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function isk(value: number | null): string {
  if (value === null) return "unknown";
  return `${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value)} ISK`;
}

function statusClass(status: string): string {
  if (status === "ready" || status === "eligible" || status === "met") return styles.kindPill;
  if (status === "blocked" || status === "needs-work" || status === "caution" || status === "unmet") return styles.warnPill;
  return styles.mutedPill;
}

function ownedLabel(fit: FitRecommendation): string {
  if (fit.owned) return "owned";
  if (fit.shipName === fit.ship.name) return "not seen in tracked assets";
  return "ownership unknown";
}

export function HaulingReadinessView({ data, connected }: { data: DashboardData; connected: boolean }) {
  const [catalog, setCatalog] = useState<ShipCatalogResponse | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedFitId, setSelectedFitId] = useState("");
  const [mode, setMode] = useState<HaulingMode>("own-cargo");
  const [purpose, setPurpose] = useState("Move my cargo");
  const [cargoVolume, setCargoVolume] = useState("");
  const [cargoCapacity, setCargoCapacity] = useState("");
  const [fitReady, setFitReady] = useState<HaulingEvidenceState>("unknown");
  const [profile, setProfile] = useState<HaulingShipProfile>("balanced");
  const [replacementRisk, setReplacementRisk] = useState<ReplacementRiskState>("unknown");
  const [destination, setDestination] = useState("");
  const [routeJumps, setRouteJumps] = useState("");
  const [routeRisk, setRouteRisk] = useState<HaulRisk>("unknown");
  const [maxJumps, setMaxJumps] = useState("25");
  const [maxRisk, setMaxRisk] = useState<Exclude<HaulRisk, "unknown">>("medium");
  const [collateral, setCollateral] = useState("");
  const [reward, setReward] = useState("");

  const ownedShipNames = useMemo(
    () => new Set([data.character.shipType, ...data.assets.topItems.map((item) => item.name)]),
    [data.assets.topItems, data.character.shipType],
  );

  const fits = useMemo(() => {
    if (!catalog || !HAUL_TASK) return [];
    return recommendFits(HAUL_TASK, catalog.ships, data.skills.trained, ownedShipNames);
  }, [catalog, data.skills.trained, ownedShipNames]);

  const selectedFit = fits.find((fit) => fit.id === selectedFitId) ?? fits[0] ?? null;
  const walletUnavailable = data.dataQuality.unavailable.some((item) => item.toLowerCase().includes("wallet"));
  const walletIsk = connected && !walletUnavailable ? data.summary.wallet : null;

  const assessment = useMemo(() => {
    if (!selectedFit) return null;
    return assessHaulingReadiness({
      mode,
      purpose: {
        label: purpose.trim() || "Unspecified hauling job",
        detail: mode === "courier"
          ? "Player-selected courier/freelance move; contract terms still need to be verified in EVE."
          : "Player-selected movement of owned cargo.",
      },
      cargoVolumeM3: nullableNumber(cargoVolume),
      route: {
        jumps: nullableNumber(routeJumps),
        risk: routeRisk,
        originLabel: data.character.solarSystem,
        destinationLabel: destination.trim() || undefined,
        detail: "Route distance/exposure is user-entered for HAU-01. Use NEC Route Map and Nearby Action to inspect the path; HAU-02 will calculate custom risk-aware routes.",
      },
      tolerance: {
        maxJumps: integerOr(maxJumps, 25),
        maxRisk,
      },
      ships: [{
        id: selectedFit.id,
        name: selectedFit.shipName,
        owned: selectedFit.owned,
        canBoard: selectedFit.canBoard ? "yes" : "no",
        fitReady,
        cargoCapacityM3: nullableNumber(cargoCapacity),
        profile,
        profileDetail: "Cargo-versus-survivability emphasis is explicitly selected by the player; NEC does not infer safety from hull size or cargo capacity.",
        replacementRisk,
        replacementDetail: "Replacement exposure is player-confirmed in this first hauling slice rather than inferred from an unstated loss policy.",
      }],
      courier: mode === "courier" ? {
        collateralIsk: nullableNumber(collateral),
        rewardIsk: nullableNumber(reward),
        walletIsk,
        detail: "Courier collateral is taken when the contract is accepted, returned after successful delivery, and can be lost if the contract fails. Verify the live contract before accepting it.",
      } : undefined,
    });
  }, [cargoCapacity, cargoVolume, collateral, data.character.solarSystem, destination, fitReady, maxJumps, maxRisk, mode, profile, purpose, replacementRisk, reward, routeJumps, routeRisk, selectedFit, walletIsk]);

  async function loadCatalog() {
    if (catalog || loadingCatalog) return;
    setLoadingCatalog(true);
    setCatalogError(null);
    try {
      const response = await fetch("/api/ships", { cache: "no-store" });
      const body = await response.json() as ShipCatalogResponse | { error?: string };
      if (!response.ok || !("ships" in body)) throw new Error("error" in body && body.error ? body.error : "Ship catalog request failed.");
      setCatalog(body);
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : "Ship catalog request failed.");
    } finally {
      setLoadingCatalog(false);
    }
  }

  if (!HAUL_TASK) {
    return <main className={styles.shell}><div className={styles.container}><div className={styles.error}>The hauling task catalog is unavailable.</div></div></main>;
  }

  return (
    <main className={styles.shell} onMouseEnter={() => void loadCatalog()}>
      <div className={styles.container}>
        <div className={styles.topbar}>
          <Link className={styles.backLink} href="/"><ArrowLeft size={15} /> Back to companion</Link>
          <div className={styles.pills}>
            <Link className={styles.secondaryLink} href="/assets/cleanup"><Boxes size={15} /> Asset Cleanup</Link>
            <span className={styles.dataBadge}><Truck size={14} /> HAU-01</span>
          </div>
        </div>

        <section className={styles.hero}>
          <div className={styles.eyebrow}>Move cargo without guessing</div>
          <h1>Hauling readiness</h1>
          <p>Tell NEC what you are moving, the usable capacity EVE shows for the hauler, and what you know about the route. It will separate cargo efficiency, route exposure, contract collateral, and loss tolerance instead of calling the biggest hold the “best” ship.</p>
        </section>

        {!connected && <div className={styles.notice}><CircleHelp size={16} /> Demo data is active. Connect your EVE character for real skills, wallet and owned-ship hints.</div>}
        <div className={styles.notice}>
          <ShieldCheck size={16} /> HAU-01 does not claim a route is safe. Route risk is explicit/manual here. The custom traffic/kill-aware pathfinder and trade-run optimization are HAU-02.
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Step 1</div><h2>What are you trying to move?</h2></div>
            <p>The “why” stays attached to the recommendation.</p>
          </div>
          <div className={styles.results}>
            <button type="button" className={styles.resultCard} aria-pressed={mode === "own-cargo"} onClick={() => { setMode("own-cargo"); if (purpose === "Run a courier contract") setPurpose("Move my cargo"); }}>
              <div className={styles.resultTop}><span className={mode === "own-cargo" ? styles.kindPill : styles.mutedPill}>own cargo</span></div>
              <h3>Move my stuff</h3><p>Assets, minerals, loot, modules, ships or production inputs you already own.</p>
            </button>
            <button type="button" className={styles.resultCard} aria-pressed={mode === "courier"} onClick={() => { setMode("courier"); if (purpose === "Move my cargo") setPurpose("Run a courier contract"); }}>
              <div className={styles.resultTop}><span className={mode === "courier" ? styles.kindPill : styles.mutedPill}>courier / freelance</span></div>
              <h3>Move someone else&apos;s package</h3><p>Evaluate cargo size, route, reward and the collateral you put at risk.</p>
            </button>
          </div>
          <form className={styles.searchForm} onSubmit={(event) => event.preventDefault()}>
            <label className={styles.searchBox}><PackageOpen size={17} /><input value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="Why are you moving it?" aria-label="Hauling purpose" /></label>
            <label className={styles.searchBox}><input value={cargoVolume} onChange={(event) => setCargoVolume(event.target.value)} inputMode="decimal" placeholder="Cargo volume m³" aria-label="Cargo volume in cubic meters" /></label>
          </form>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Step 2</div><h2>Choose the hauler</h2></div>
            <p>Starter hauling templates are ranked against your character&apos;s training and tracked ownership.</p>
          </div>

          {catalogError && <div className={styles.error}>{catalogError}</div>}
          {!catalog && !catalogError && <button className={styles.searchButton} type="button" onClick={() => void loadCatalog()} disabled={loadingCatalog}>{loadingCatalog ? "Loading ship catalog…" : "Load my hauling options"}</button>}

          {fits.length > 0 && (
            <>
              <div className={styles.results}>
                {fits.map((fit) => {
                  const active = selectedFit?.id === fit.id;
                  return (
                    <button className={styles.resultCard} type="button" aria-pressed={active} key={fit.id} onClick={() => { setSelectedFitId(fit.id); setCargoCapacity(""); setFitReady("unknown"); setReplacementRisk("unknown"); }}>
                      <div className={styles.resultTop}>
                        <span className={fit.owned ? styles.kindPill : styles.mutedPill}>{ownedLabel(fit)}</span>
                        <span className={fit.canBoard ? styles.kindPill : styles.warnPill}>{fit.canBoard ? "can board" : "training required"}</span>
                        <span className={fit.canUseTemplate ? styles.kindPill : styles.warnPill}>{fit.canUseTemplate ? "template skills met" : `${fit.requiredGaps.length} fit-skill gaps`}</span>
                      </div>
                      <h3>{fit.shipName}</h3>
                      <p>{fit.name}</p>
                      <p>{fit.summary}</p>
                    </button>
                  );
                })}
              </div>

              {selectedFit && (
                <div className={styles.infoCard}>
                  <h3>Confirm the numbers ESI cannot safely infer</h3>
                  <p className={styles.description}>Open this ship in EVE. Enter the usable cargo capacity shown for your actual fit, then confirm whether the hauling fit is really ready. NEC will not pretend a generic hull&apos;s base capacity equals your fitted ship.</p>
                  <form className={styles.searchForm} onSubmit={(event) => event.preventDefault()}>
                    <label className={styles.searchBox}><input value={cargoCapacity} onChange={(event) => setCargoCapacity(event.target.value)} inputMode="decimal" placeholder={`${selectedFit.shipName} usable cargo capacity m³`} aria-label="Usable cargo capacity" /></label>
                  </form>
                  <div className={styles.productLinks}>
                    {(["unknown", "yes", "no"] as HaulingEvidenceState[]).map((state) => <button key={state} type="button" className={fitReady === state ? styles.secondaryLink : styles.pill} onClick={() => setFitReady(state)}>Fit ready: {state}</button>)}
                  </div>
                  <div className={styles.productLinks}>
                    {(["cargo-efficiency", "balanced", "survivability", "unknown"] as HaulingShipProfile[]).map((state) => <button key={state} type="button" className={profile === state ? styles.secondaryLink : styles.pill} onClick={() => setProfile(state)}>{state.replace("-", " ")}</button>)}
                  </div>
                  <div className={styles.productLinks}>
                    {(["affordable", "not-affordable", "unknown"] as ReplacementRiskState[]).map((state) => <button key={state} type="button" className={replacementRisk === state ? styles.secondaryLink : styles.pill} onClick={() => setReplacementRisk(state)}>Loss: {state.replace("-", " ")}</button>)}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Step 3</div><h2>Route and tolerance</h2></div>
            <p>Use Route Map + Nearby Action on the dashboard, then enter what you established.</p>
          </div>
          <div className={styles.notice}><Route size={16} /> Starting system from ESI: <strong>{data.character.solarSystem}</strong>. HAU-01 accepts the route facts you checked; HAU-02 will calculate alternate custom routes itself.</div>
          <form className={styles.searchForm} onSubmit={(event) => event.preventDefault()}>
            <label className={styles.searchBox}><Route size={17} /><input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Destination, e.g. Jita" aria-label="Hauling destination" /></label>
            <label className={styles.searchBox}><input value={routeJumps} onChange={(event) => setRouteJumps(event.target.value)} inputMode="numeric" placeholder="Route jumps" aria-label="Route jumps" /></label>
            <label className={styles.searchBox}><input value={maxJumps} onChange={(event) => setMaxJumps(event.target.value)} inputMode="numeric" placeholder="Max jumps you accept" aria-label="Maximum accepted jumps" /></label>
          </form>
          <div className={styles.productLinks}>
            {(["unknown", "low", "medium", "high"] as HaulRisk[]).map((state) => <button key={state} type="button" className={routeRisk === state ? styles.secondaryLink : styles.pill} onClick={() => setRouteRisk(state)}>Route exposure: {state}</button>)}
          </div>
          <div className={styles.productLinks}>
            {(["low", "medium", "high"] as const).map((state) => <button key={state} type="button" className={maxRisk === state ? styles.secondaryLink : styles.pill} onClick={() => setMaxRisk(state)}>Max exposure: {state}</button>)}
          </div>
        </section>

        {mode === "courier" && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div><div className={styles.eyebrow}>Courier terms</div><h2>Collateral before reward</h2></div>
              <p>Wallet tracked by NEC: {isk(walletIsk)}</p>
            </div>
            <div className={styles.notice}><WalletCards size={16} /> CCP documents that collateral is paid when you accept a courier contract and is returned after successful delivery; if the contract fails, the issuer can receive the collateral. Verify the live contract before accepting it.</div>
            <form className={styles.searchForm} onSubmit={(event) => event.preventDefault()}>
              <label className={styles.searchBox}><input value={collateral} onChange={(event) => setCollateral(event.target.value)} inputMode="decimal" placeholder="Collateral ISK" aria-label="Courier collateral" /></label>
              <label className={styles.searchBox}><input value={reward} onChange={(event) => setReward(event.target.value)} inputMode="decimal" placeholder="Reward ISK (optional)" aria-label="Courier reward" /></label>
            </form>
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Answer</div><h2>Can I sensibly make this move?</h2></div>
            {assessment && <span className={statusClass(assessment.readiness.technicalEligibility.status)}>{assessment.readiness.technicalEligibility.status.replace("-", " ")}</span>}
          </div>

          {!assessment ? (
            <div className={styles.emptyState}><Truck size={24} /><strong>Choose a hauling ship first.</strong>Load the ship catalog, then NEC can evaluate the move.</div>
          ) : (
            <>
              <div className={styles.notice}>
                {assessment.readiness.technicalEligibility.status === "eligible" ? <CheckCircle2 size={18} /> : assessment.readiness.technicalEligibility.status === "blocked" ? <AlertTriangle size={18} /> : <CircleHelp size={18} />}
                <div><strong>Next: {assessment.nextAction}</strong>{assessment.selectedShip?.tripCount !== null && assessment.selectedShip?.tripCount !== undefined ? <span>Calculated trips: {assessment.selectedShip.tripCount}</span> : null}</div>
              </div>
              <div className={styles.results}>
                {assessment.readiness.dimensions.filter((dimension) => dimension.findings.length > 0).map((dimension) => (
                  <article className={styles.infoCard} key={dimension.dimension}>
                    <div className={styles.resultTop}><span className={statusClass(dimension.status)}>{dimension.status.replace("-", " ")}</span></div>
                    <h3>{dimension.definition.label}</h3>
                    <ul className={styles.skillList}>
                      {dimension.findings.map((finding) => <li key={finding.id}><span>{finding.summary}</span><small>{finding.why}</small></li>)}
                    </ul>
                  </article>
                ))}
              </div>
              <div className={styles.notice}><ShieldCheck size={16} /><div><strong>What NEC is deliberately not claiming</strong><span>{assessment.notes.join(" ")}</span></div></div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
