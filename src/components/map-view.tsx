"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  LoaderCircle,
  MapPin,
  Navigation,
  RotateCcw,
  Route as RouteIcon,
  Search,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { OpportunityScanner } from "@/components/opportunity-scanner";
import type { DashboardData } from "@/lib/dashboard/model";
import { MARKET_HUBS } from "@/lib/map/hubs";
import type { MapSystem, PlannedRoute, RoutePreference } from "@/lib/map/model";
import { securityBand } from "@/lib/map/security";

const ROUTE_OPTIONS: Array<{ id: RoutePreference; label: string; note: string }> = [
  { id: "safer", label: "Safer", note: "Prefer high-sec" },
  { id: "shorter", label: "Shorter", note: "Fewest jumps" },
  { id: "less-secure", label: "Less secure", note: "Prefer low/null" },
];

function securityLabel(value: number): string {
  const band = securityBand(value);
  return band === "high" ? "High-sec" : band === "low" ? "Low-sec" : "Null-sec";
}

function securityClass(value: number): string {
  return securityBand(value);
}

function uniqueSystems(systems: MapSystem[]): MapSystem[] {
  return [...new Map(systems.map((system) => [system.id, system])).values()];
}

function errorMessage(payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }
  return "The EVE map request failed.";
}

export function MapView({ data, connected }: { data: DashboardData; connected: boolean }) {
  const current: MapSystem = useMemo(() => ({
    id: data.character.solarSystemId,
    name: data.character.solarSystem,
    securityStatus: data.character.systemSecurity,
    position: data.character.systemPosition,
  }), [data.character.solarSystem, data.character.solarSystemId, data.character.systemPosition, data.character.systemSecurity]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MapSystem[]>([]);
  const [selected, setSelected] = useState<MapSystem | null>(null);
  const [route, setRoute] = useState<PlannedRoute | null>(null);
  const [preference, setPreference] = useState<RoutePreference>("safer");
  const [replaceRoute, setReplaceRoute] = useState(false);
  const [searching, setSearching] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [settingWaypoint, setSettingWaypoint] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const mapSystems = useMemo(
    () => route?.systems.length
      ? route.systems
      : uniqueSystems([current, ...MARKET_HUBS, ...results.slice(0, 8), ...(selected ? [selected] : [])]),
    [current, results, route, selected],
  );

  const projected = useMemo(() => {
    const width = 920;
    const height = 520;
    const padding = 54;
    const xs = mapSystems.map((system) => system.position.x);
    const zs = mapSystems.map((system) => system.position.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const rangeX = maxX - minX || 1;
    const rangeZ = maxZ - minZ || 1;
    return mapSystems.map((system, index) => ({
      ...system,
      mapX: mapSystems.length === 1 ? width / 2 : padding + ((system.position.x - minX) / rangeX) * (width - padding * 2),
      mapY: mapSystems.length === 1 ? height / 2 : height - padding - ((system.position.z - minZ) / rangeZ) * (height - padding * 2),
      routeIndex: route ? index : -1,
    }));
  }, [mapSystems, route]);

  const minimumSecurity = route ? Math.min(...route.systems.map((system) => system.securityStatus)) : null;
  const riskyJumps = route?.systems.filter((system) => securityBand(system.securityStatus) !== "high").length ?? 0;

  async function searchSystems(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!connected) {
      setMessage({ tone: "error", text: "Connect your EVE character before searching New Eden." });
      return;
    }
    if (query.trim().length < 3) {
      setMessage({ tone: "error", text: "Type at least three characters, such as Jita or Amarr." });
      return;
    }
    setSearching(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/map/search?q=${encodeURIComponent(query.trim())}`);
      const payload = await response.json() as { results?: MapSystem[]; error?: string };
      if (!response.ok) throw new Error(errorMessage(payload));
      setResults(payload.results ?? []);
      if (!(payload.results ?? []).length) setMessage({ tone: "error", text: `No solar systems matched “${query.trim()}”.` });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Search failed." });
    } finally {
      setSearching(false);
    }
  }

  async function planTo(destination: MapSystem, nextPreference = preference) {
    setSelected(destination);
    setRoute(null);
    setMessage(null);
    if (!connected) {
      setMessage({ tone: "error", text: "Connect your EVE character to calculate a route from your live location." });
      return;
    }
    setPlanning(true);
    try {
      const response = await fetch("/api/map/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationId: destination.id, preference: nextPreference }),
      });
      const payload = await response.json() as PlannedRoute | { error: string };
      if (!response.ok) throw new Error(errorMessage(payload));
      setRoute(payload as PlannedRoute);
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Route planning failed." });
    } finally {
      setPlanning(false);
    }
  }

  function changePreference(nextPreference: RoutePreference) {
    setPreference(nextPreference);
    if (selected && connected) void planTo(selected, nextPreference);
  }

  async function setEveDestination() {
    if (!selected || !route) return;
    setSettingWaypoint(true);
    setMessage(null);
    try {
      const response = await fetch("/api/map/waypoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationId: selected.id, replaceRoute }),
      });
      const payload = await response.json() as { destination?: MapSystem; error?: string };
      if (!response.ok) throw new Error(errorMessage(payload));
      setMessage({
        tone: "success",
        text: `${selected.name} was ${replaceRoute ? "set as your new route" : "added to your EVE route"}. Press A in the EVE client if you want Autopilot to fly it.`,
      });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "EVE did not accept the destination." });
    } finally {
      setSettingWaypoint(false);
    }
  }

  return (
    <div className="page-view map-page">
      <section className="page-heading map-heading">
        <div>
          <div className="eyebrow">New Eden navigation</div>
          <h1>Route map</h1>
          <p>Search a solar system, inspect the security of every jump, then send the destination to your EVE client.</p>
        </div>
        <div className="map-origin"><Navigation size={15} /><span><small>Starting from</small><strong>{current.name} <b className={securityClass(current.securityStatus)}>{current.securityStatus.toFixed(1)}</b></strong></span></div>
      </section>

      <section className="map-workspace">
        <div className="map-canvas-panel panel">
          <div className="map-toolbar">
            <form onSubmit={searchSystems}>
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search solar systems…" aria-label="Search solar systems" />
              <button type="submit" disabled={searching || !connected}>{searching ? <LoaderCircle className="spin" size={15} /> : "Search"}</button>
            </form>
            {route && <button className="atlas-button" onClick={() => { setRoute(null); setSelected(null); setMessage(null); }}><RotateCcw size={14} /> Trade hubs</button>}
          </div>

          <div className="star-map" aria-label="Interactive New Eden route map">
            <svg viewBox="0 0 920 520" role="img">
              <defs>
                <radialGradient id="map-glow">
                  <stop offset="0" stopColor="#173b38" stopOpacity=".42" />
                  <stop offset="1" stopColor="#071015" stopOpacity="0" />
                </radialGradient>
                <filter id="star-glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              <rect width="920" height="520" fill="url(#map-glow)" />
              <g className="map-grid-lines">
                {[130, 260, 390].map((y) => <line key={`h-${y}`} x1="0" x2="920" y1={y} y2={y} />)}
                {[184, 368, 552, 736].map((x) => <line key={`v-${x}`} x1={x} x2={x} y1="0" y2="520" />)}
              </g>
              {route && projected.slice(1).map((system, index) => {
                const previous = projected[index];
                return <line className="route-link" key={`${previous.id}-${system.id}`} x1={previous.mapX} y1={previous.mapY} x2={system.mapX} y2={system.mapY} />;
              })}
              {projected.map((system, index) => {
                const isCurrent = system.id === route?.origin.id || (!route && system.id === current.id);
                const isSelected = system.id === selected?.id;
                const showLabel = isCurrent || isSelected || !route || index % Math.max(1, Math.ceil(projected.length / 9)) === 0;
                return (
                  <g
                    className={`map-system ${securityClass(system.securityStatus)} ${isCurrent ? "current" : ""} ${isSelected ? "selected" : ""}`}
                    key={`${system.id}-${index}`}
                    transform={`translate(${system.mapX} ${system.mapY})`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${system.name}, security ${system.securityStatus.toFixed(1)}`}
                    onClick={() => void planTo(system)}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") void planTo(system); }}
                  >
                    {isCurrent && <circle className="system-pulse" r="14" />}
                    <circle className="system-hit" r="15" />
                    <circle className="system-star" r={isSelected || isCurrent ? 5.5 : 3.5} filter="url(#star-glow)" />
                    {showLabel && <text x="9" y="-8">{system.name}</text>}
                    {showLabel && <text className="system-sec" x="9" y="5">{system.securityStatus.toFixed(1)}</text>}
                  </g>
                );
              })}
            </svg>
            {planning && <div className="map-loading"><LoaderCircle className="spin" size={24} /><span>Plotting route from your live location…</span></div>}
            {!route && <div className="map-caption"><MapPin size={13} /> Select a trade hub or search above. Star positions use New Eden coordinates.</div>}
          </div>

          <div className="security-legend">
            <span><i className="high" /> High-sec</span><span><i className="low" /> Low-sec</span><span><i className="null" /> Null-sec</span>
            <small>Map projection: X/Z plane</small>
          </div>
        </div>

        <aside className="map-side">
          <section className="panel route-options">
            <div className="panel-heading compact"><div><div className="eyebrow">Route policy</div><h2>Choose your path</h2></div><RouteIcon size={17} /></div>
            <div className="route-option-list">
              {ROUTE_OPTIONS.map((option) => <button key={option.id} className={preference === option.id ? "active" : ""} onClick={() => changePreference(option.id)}><span><strong>{option.label}</strong><small>{option.note}</small></span>{preference === option.id && <CheckCircle2 size={15} />}</button>)}
            </div>
          </section>

          {results.length > 0 && !route && (
            <section className="panel search-results">
              <div className="panel-heading compact"><div><div className="eyebrow">Search results</div><h2>{results.length} systems found</h2></div></div>
              <div>{results.map((system) => <button key={system.id} onClick={() => void planTo(system)}><i className={securityClass(system.securityStatus)} /><span><strong>{system.name}</strong><small>{securityLabel(system.securityStatus)}</small></span><b>{system.securityStatus.toFixed(1)}</b></button>)}</div>
            </section>
          )}

          {route ? (
            <section className="panel route-summary">
              <div className="route-destination"><div className="eyebrow">Destination resolved</div><h2>{route.destination.name}</h2><span>{route.origin.name} → {route.destination.name}</span></div>
              <div className="route-metrics">
                <div><RouteIcon size={16} /><span><strong>{route.jumps}</strong><small>jumps</small></span></div>
                <div><ShieldCheck size={16} /><span><strong className={minimumSecurity !== null ? securityClass(minimumSecurity) : ""}>{minimumSecurity?.toFixed(1)}</strong><small>lowest sec</small></span></div>
                <div><AlertTriangle size={16} /><span><strong className={riskyJumps ? "low" : "high"}>{riskyJumps}</strong><small>risky systems</small></span></div>
              </div>
              <div className="route-system-list">
                {route.systems.map((system, index) => <button key={`${system.id}-${index}`} onClick={() => void planTo(system)}><span>{index === 0 ? "START" : String(index).padStart(2, "0")}</span><i className={securityClass(system.securityStatus)} /><strong>{system.name}</strong><b>{system.securityStatus.toFixed(1)}</b></button>)}
              </div>
              <label className="replace-route"><input type="checkbox" checked={replaceRoute} onChange={(event) => setReplaceRoute(event.target.checked)} /><span><strong>Replace my existing EVE route</strong><small>Off keeps your current waypoints and adds this destination to the end.</small></span></label>
              <button className="set-destination" disabled={settingWaypoint} onClick={setEveDestination}>{settingWaypoint ? <LoaderCircle className="spin" size={17} /> : <Navigation size={17} />}{replaceRoute ? `Replace route with ${route.destination.name}` : `Add ${route.destination.name} to EVE route`}</button>
              <p className="autopilot-note"><Gauge size={14} /> This sets the destination in EVE. ESI cannot press Autopilot; press <kbd>A</kbd> in the game if you want it to fly.</p>
            </section>
          ) : (
            <section className="panel map-empty-route"><MapPin size={24} /><h2>No destination selected</h2><p>Pick a named system on the map or search for one. We will show every jump before anything is sent to EVE.</p></section>
          )}
        </aside>
      </section>

      {message && <div className={`map-message ${message.tone}`}>{message.tone === "success" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}<span>{message.text}</span></div>}
      <OpportunityScanner currentSystemId={current.id} connected={connected} routePreference={preference} onPlotRoute={(destination) => void planTo(destination)} />
    </div>
  );
}
