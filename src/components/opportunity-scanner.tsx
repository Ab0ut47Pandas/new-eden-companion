"use client";

import { AlertTriangle, ArrowRight, LoaderCircle, Pickaxe, RefreshCw, Route, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MARKET_HUBS, marketHub } from "@/lib/map/hubs";
import type { MapSystem, RoutePreference } from "@/lib/map/model";
import type { OpportunityScan, TradeOpportunity } from "@/lib/opportunities/model";

type ScanMode = "trade" | "mining";
type TradeSort = "balanced" | "profit" | "speed" | "safety";

function isk(value: number): string {
  return `${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value)} ISK`;
}

function number(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: value < 10 ? 2 : 0 }).format(value);
}

function errorMessage(payload: unknown): string {
  return payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
    ? payload.error
    : "The opportunity scan failed.";
}

function sortedTrade(rows: TradeOpportunity[], sort: TradeSort): TradeOpportunity[] {
  return [...rows].sort((left, right) => {
    if (sort === "profit") return right.estimatedProfit - left.estimatedProfit;
    if (sort === "speed") return right.profitPerJump - left.profitPerJump;
    if (sort === "safety") {
      return left.route.riskySystems - right.route.riskySystems
        || right.route.minimumSecurity - left.route.minimumSecurity
        || right.estimatedProfit - left.estimatedProfit;
    }
    const leftScore = left.profitPerJump * (left.route.riskySystems ? 0.2 : 1) * Math.min(1, left.returnPercent / 5);
    const rightScore = right.profitPerJump * (right.route.riskySystems ? 0.2 : 1) * Math.min(1, right.returnPercent / 5);
    return rightScore - leftScore;
  });
}

export function OpportunityScanner({
  currentSystemId,
  connected,
  routePreference,
  onPlotRoute,
}: {
  currentSystemId: number;
  connected: boolean;
  routePreference: RoutePreference;
  onPlotRoute: (destination: MapSystem) => void;
}) {
  const startingHub = marketHub(currentSystemId) ?? MARKET_HUBS[0];
  const [mode, setMode] = useState<ScanMode>("trade");
  const [sourceSystemId, setSourceSystemId] = useState(startingHub.id);
  const [cargoM3, setCargoM3] = useState(300);
  const [budgetMillions, setBudgetMillions] = useState(50);
  const [feePercent, setFeePercent] = useState(4);
  const [sort, setSort] = useState<TradeSort>("balanced");
  const [scan, setScan] = useState<OpportunityScan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoScanned = useRef(false);

  const runScan = useCallback(async (nextMode: ScanMode) => {
    if (!connected) {
      setError("Connect your EVE character to run a live opportunity scan.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: nextMode,
          sourceSystemId,
          cargoM3,
          budget: budgetMillions * 1_000_000,
          feeRate: feePercent / 100,
          routePreference,
        }),
      });
      const payload = await response.json() as OpportunityScan | { error: string };
      if (!response.ok) throw new Error(errorMessage(payload));
      setScan(payload as OpportunityScan);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The opportunity scan failed.");
    } finally {
      setLoading(false);
    }
  }, [budgetMillions, cargoM3, connected, feePercent, routePreference, sourceSystemId]);

  useEffect(() => {
    if (!connected || autoScanned.current) return;
    autoScanned.current = true;
    void runScan("trade");
  }, [connected, runScan]);

  const trade = useMemo(() => sortedTrade(scan?.trade ?? [], sort), [scan?.trade, sort]);
  const topTrade = trade[0];
  const topOre = scan?.ores[0];
  const sourceHub = MARKET_HUBS.find((hub) => hub.id === sourceSystemId) ?? MARKET_HUBS[0];

  function switchMode(nextMode: ScanMode) {
    setMode(nextMode);
    void runScan(nextMode);
  }

  return (
    <section className="panel opportunity-scanner">
      <div className="opportunity-heading">
        <div>
          <div className="eyebrow">What is worth doing from here?</div>
          <h2>Opportunity scanner</h2>
          <p>Compare executable market orders with cargo limits, fees, jump count, and route security.</p>
        </div>
        <div className="opportunity-tabs">
          <button className={mode === "trade" ? "active" : ""} onClick={() => switchMode("trade")}><TrendingUp size={15} /> Trade runs</button>
          <button className={mode === "mining" ? "active" : ""} onClick={() => switchMode("mining")}><Pickaxe size={15} /> Ore value</button>
        </div>
      </div>

      <div className="opportunity-controls">
        <label><span>Starting market</span><select value={sourceSystemId} onChange={(event) => setSourceSystemId(Number(event.target.value))}>{MARKET_HUBS.map((hub) => <option value={hub.id} key={hub.id}>{hub.name}</option>)}</select></label>
        <label><span>Cargo capacity</span><div><input type="number" min="1" max="1000000" value={cargoM3} onChange={(event) => setCargoM3(Number(event.target.value))} /><b>m³</b></div></label>
        {mode === "trade" && <label><span>Spending limit</span><div><input type="number" min="1" value={budgetMillions} onChange={(event) => setBudgetMillions(Number(event.target.value))} /><b>M ISK</b></div></label>}
        {mode === "trade" && <label><span>Fees + slippage buffer</span><div><input type="number" min="0" max="25" step="0.5" value={feePercent} onChange={(event) => setFeePercent(Number(event.target.value))} /><b>%</b></div></label>}
        <button className="scan-button" onClick={() => void runScan(mode)} disabled={loading}>{loading ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={15} />}{loading ? "Scanning live orders…" : "Refresh scan"}</button>
      </div>

      {!marketHub(currentSystemId) && <div className="opportunity-callout"><AlertTriangle size={15} /> You are not in a supported major hub, so this scan is staged from {sourceHub.name}. Add the trip there before buying anything.</div>}
      {error && <div className="opportunity-callout error"><AlertTriangle size={15} />{error}</div>}

      {loading && !scan ? (
        <div className="opportunity-loading"><LoaderCircle className="spin" size={25} /><strong>Checking live orders in five trade hubs</strong><span>The first scan can take several seconds; later scans reuse ESI’s five-minute cache.</span></div>
      ) : mode === "trade" && scan?.mode === "trade" ? (
        <>
          <div className="opportunity-summary">
            <div className="opportunity-best">
              <span className="best-badge"><Sparkles size={13} /> Best {sort}</span>
              {topTrade ? <><h3>{topTrade.name}</h3><p>Buy in <strong>{topTrade.sourceName}</strong>, haul {topTrade.units.toLocaleString()} units, then sell to the visible buy order in <strong>{topTrade.destinationName}</strong>.</p></> : <><h3>No positive spread found</h3><p>With these limits and fee buffer, none of the starter-basket orders are worth hauling right now.</p></>}
            </div>
            {topTrade && <div className="best-metrics"><div><span>Estimated profit</span><strong>{isk(topTrade.estimatedProfit)}</strong></div><div><span>Route</span><strong>{topTrade.route.jumps} jumps <b className={topTrade.route.riskySystems ? "low" : "high"}>{topTrade.route.minimumSecurity.toFixed(1)} min</b></strong></div><button onClick={() => { const hub = marketHub(topTrade.destinationSystemId); if (hub) onPlotRoute(hub); }}>Plot this run <ArrowRight size={14} /></button></div>}
          </div>
          <div className="opportunity-sort"><span>Rank by</span>{(["balanced", "profit", "speed", "safety"] as TradeSort[]).map((item) => <button key={item} className={sort === item ? "active" : ""} onClick={() => setSort(item)}>{item}</button>)}<small>Scans 20 liquid starter goods—not every item in New Eden.</small></div>
          <div className="trade-opportunity-list">
            {trade.slice(0, 10).map((item, index) => (
              <article key={`${item.typeId}-${item.destinationSystemId}`}>
                <span className="opportunity-rank">{String(index + 1).padStart(2, "0")}</span>
                <div className="opportunity-item"><strong>{item.name}</strong><small>{item.units.toLocaleString()} units · {number(item.cargoUsed)} m³ · {isk(item.investment)} invested</small></div>
                <div><span>Buy → sell</span><strong>{isk(item.buyPrice)} → {isk(item.sellPrice)}</strong></div>
                <div><span>Profit</span><strong className="high">{isk(item.estimatedProfit)}</strong><small>{number(item.returnPercent)}% after buffer</small></div>
                <div><span>Route</span><strong>{item.sourceName} → {item.destinationName}</strong><small>{item.route.jumps} jumps · <b className={item.route.riskySystems ? "low" : "high"}>{item.route.riskySystems ? `${item.route.riskySystems} risky` : "high-sec route"}</b></small></div>
                <button onClick={() => { const hub = marketHub(item.destinationSystemId); if (hub) onPlotRoute(hub); }} aria-label={`Plot ${item.name} route to ${item.destinationName}`}><Route size={15} /></button>
              </article>
            ))}
          </div>
        </>
      ) : mode === "mining" && scan?.mode === "mining" ? (
        <>
          <div className="opportunity-summary ore-summary">
            <div className="opportunity-best"><span className="best-badge"><Pickaxe size={13} /> Highest raw-ore value per m³</span>{topOre ? <><h3>{topOre.name}</h3><p>The strongest immediate buy in {scan.source.name} is {isk(topOre.immediateBuyPrice)} per unit, or <strong>{isk(topOre.iskPerM3)} per m³</strong>.</p></> : <><h3>No local ore buy orders</h3><p>The selected station has no visible immediate-buy orders for the tracked raw ores.</p></>}</div>
            {topOre && <div className="best-metrics"><div><span>Your {number(cargoM3)} m³ hold</span><strong>{isk(topOre.estimatedHoldValue)}</strong></div><div><span>Visible demand</span><strong>{topOre.demandUnits.toLocaleString()} units</strong></div></div>}
          </div>
          <div className="ore-value-grid">
            {(scan?.ores ?? []).map((ore, index) => <article key={ore.typeId}><span>{String(index + 1).padStart(2, "0")}</span><Pickaxe size={15} /><div><strong>{ore.name}</strong><small>{isk(ore.immediateBuyPrice)} each · {ore.unitVolume} m³</small></div><div><strong>{isk(ore.iskPerM3)}</strong><small>per m³</small></div><div><strong>{isk(ore.estimatedHoldValue)}</strong><small>{number(cargoM3)} m³ hold</small></div></article>)}
          </div>
        </>
      ) : null}

      {scan && <footer className="opportunity-notes"><div><ShieldCheck size={15} /><span><strong>What these numbers mean</strong>{scan.notes.map((note) => <small key={note}>{note}</small>)}</span></div><time>Market snapshot {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(scan.fetchedAt))}</time></footer>}
    </section>
  );
}
