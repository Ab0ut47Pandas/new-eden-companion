"use client";

import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Crosshair,
  ExternalLink,
  LoaderCircle,
  Navigation,
  Orbit,
  Radio,
  RefreshCw,
  ShieldCheck,
  Skull,
  Swords,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { DashboardData } from "@/lib/dashboard/model";
import type { NearbyIntelResponse, NearbySystemIntel } from "@/lib/intel/model";

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function isk(value: number): string {
  return `${compact(value)} ISK`;
}

function age(value: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1_000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3_600)}h ago`;
}

function distance(value: number): string {
  return value === 0 ? "here" : `${value} jump${value === 1 ? "" : "s"}`;
}

function securityClass(value: number): string {
  return value >= 0.45 ? "high" : value > 0 ? "low" : "null";
}

function apiError(payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") return payload.error;
  return "The nearby activity feed did not answer.";
}

function SystemRow({ system, maximumScore }: { system: NearbySystemIntel; maximumScore: number }) {
  const lethal = system.shipKills * 2 + system.podKills * 5;
  const width = maximumScore ? Math.max(2, Math.min(100, (lethal / maximumScore) * 100)) : 2;
  return (
    <article className="intel-system-row">
      <div className="intel-system-distance">{system.distance === 0 ? <Crosshair size={13} /> : system.distance}</div>
      <div className="intel-system-name">
        <strong>{system.name} <b className={securityClass(system.securityStatus)}>{system.securityStatus.toFixed(1)}</b></strong>
        <small>{distance(system.distance)} · {compact(system.jumps)} jumps through</small>
        <span><i style={{ width: `${width}%` }} /></span>
      </div>
      <div className="intel-system-counts">
        <strong>{system.shipKills}<small>ships</small></strong>
        <strong className={system.podKills ? "danger" : ""}>{system.podKills}<small>pods</small></strong>
      </div>
    </article>
  );
}

export function IntelView({ data, connected }: { data: DashboardData; connected: boolean }) {
  const [radius, setRadius] = useState(3);
  const [intel, setIntel] = useState<NearbyIntelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (quiet = false) => {
    if (!connected) return;
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/intel/nearby?radius=${radius}`, { cache: "no-store" });
      const payload = await response.json() as NearbyIntelResponse | { error: string };
      if (!response.ok) throw new Error(apiError(payload));
      setIntel(payload as NearbyIntelResponse);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The nearby activity feed failed.");
    } finally {
      setLoading(false);
    }
  }, [connected, radius]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(true), 15_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const maximumSystemScore = useMemo(() => Math.max(0, ...(intel?.systems.map((system) => system.shipKills * 2 + system.podKills * 5) ?? [])), [intel]);

  if (!connected) {
    return (
      <section className="page-view intel-page">
        <div className="page-heading"><div><div className="eyebrow">Local threat picture</div><h1>Nearby action</h1><p>Connect your character so the feed can center itself on your current EVE system.</p></div></div>
        <div className="panel intel-connect"><Radio size={30} /><h2>No live location yet</h2><p>ESI location access is required to find systems within a few gates of you.</p><a href="/api/auth/login">Connect EVE <ChevronRight size={15} /></a></div>
      </section>
    );
  }

  return (
    <section className="page-view intel-page">
      <div className="page-heading intel-heading">
        <div><div className="eyebrow">Local threat picture</div><h1>Nearby action</h1><p>Player losses and traffic around {data.character.solarSystem}, refreshed while this page is open.</p></div>
        <div className="intel-controls">
          <span>Range</span>
          {[2, 3, 4].map((value) => <button key={value} className={radius === value ? "active" : ""} onClick={() => setRadius(value)}>{value} jumps</button>)}
          <button className="intel-refresh" onClick={() => void refresh()} disabled={loading} aria-label="Refresh nearby activity"><RefreshCw className={loading ? "spin" : ""} size={15} /></button>
        </div>
      </div>

      {error && <div className="map-message error"><AlertTriangle size={17} /><span>{error}</span></div>}
      {!intel && loading ? (
        <div className="panel intel-loading"><LoaderCircle className="spin" size={28} /><strong>Building the gate-radius picture…</strong><span>The first scan maps every connected system; later refreshes are much faster.</span></div>
      ) : intel && (
        <>
          <div className={`intel-alert ${intel.level}`}>
            <div className="intel-alert-icon">{intel.level === "hot" ? <AlertTriangle size={22} /> : intel.level === "watch" ? <Activity size={22} /> : <ShieldCheck size={22} />}</div>
            <div><div className="eyebrow">{intel.level === "hot" ? "Close activity" : intel.level === "watch" ? "Activity reported" : "No reported losses"}</div><strong>{intel.headline}</strong></div>
            <span><i className="live-pulse" /> Live polling</span>
          </div>

          <section className="stat-grid intel-stats">
            <article className="stat-card tone-red"><div className="stat-top"><span>Player ships lost</span><Swords size={17} /></div><strong>{intel.summary.shipKills}</strong><small>Official hourly count · {intel.summary.systems} systems</small></article>
            <article className="stat-card tone-amber"><div className="stat-top"><span>Capsules lost</span><Skull size={17} /></div><strong>{intel.summary.podKills}</strong><small>Pod deaths are the sharper danger signal</small></article>
            <article className="stat-card tone-blue"><div className="stat-top"><span>Traffic</span><Navigation size={17} /></div><strong>{compact(intel.summary.jumps)}</strong><small>Ship jumps in the official snapshot</small></article>
            <article className="stat-card tone-plain"><div className="stat-top"><span>PvE activity</span><Orbit size={17} /></div><strong>{compact(intel.summary.npcKills)}</strong><small>NPC kills · activity, not necessarily danger</small></article>
          </section>

          <div className="intel-grid">
            <section className="panel intel-feed">
              <div className="panel-heading">
                <div><div className="eyebrow">Public kill feed</div><h2>{intel.kills.length ? `${intel.kills.length} published nearby` : "No nearby killmails published"}</h2></div>
                <span className="intel-updated"><i /> Updated {age(intel.generatedAt)}</span>
              </div>
              <div className="kill-list">
                {intel.kills.map((kill) => (
                  <a className="kill-row" href={kill.url} target="_blank" rel="noreferrer" key={kill.killmailId}>
                    <div className={`kill-icon ${kill.distance <= 1 ? "close" : ""}`}><Skull size={17} /></div>
                    <div className="kill-main">
                      <strong>{kill.victimShip} destroyed</strong>
                      <small>{kill.victimName} · final blow: {kill.attackerName}</small>
                    </div>
                    <div className="kill-place"><strong>{kill.systemName} <b className={securityClass(kill.securityStatus)}>{kill.securityStatus.toFixed(1)}</b></strong><small>{distance(kill.distance)} · {kill.attackerCount || "?"} attacker{kill.attackerCount === 1 ? "" : "s"}</small></div>
                    <div className="kill-value"><strong>{isk(kill.totalValue)}</strong><small>{age(kill.time)}{kill.solo ? " · solo" : ""}</small></div>
                    <ExternalLink size={14} />
                  </a>
                ))}
                {!intel.kills.length && <div className="intel-empty"><Radio size={26} /><strong>The receiver is listening</strong><span>No public killmail from these systems has appeared in the past hour. Official totals above may still show unshared or delayed losses.</span></div>}
              </div>
            </section>

            <aside className="panel intel-systems">
              <div className="panel-heading"><div><div className="eyebrow">System heat</div><h2>Where it is happening</h2></div></div>
              <div>{intel.systems.slice(0, 12).map((system) => <SystemRow key={system.id} system={system} maximumScore={maximumSystemScore} />)}</div>
            </aside>
          </div>

          <footer className="intel-sources">
            <Radio size={15} /><span><strong>{intel.sources.publicFeed}.</strong> Public killmails can arrive late or never be shared. {intel.sources.officialSnapshot} is broader but cache-delayed. Always check Local and d-scan before entering a gate.</span>
          </footer>
        </>
      )}
    </section>
  );
}
