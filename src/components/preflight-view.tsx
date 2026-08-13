"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Factory,
  HeartPulse,
  Info,
  ListChecks,
  Pickaxe,
  Recycle,
  Route,
  ScanSearch,
  ShieldAlert,
  Square,
  SquareCheck,
  Swords,
  Truck,
  UsersRound,
} from "lucide-react";
import { useState } from "react";

import type { DashboardData } from "@/lib/dashboard/model";
import {
  ABYSSAL_TIERS,
  ABYSSAL_WEATHERS,
  ACTIVITIES,
  CHECK_SECTION_LABELS,
  detectAbyssalScenario,
  detectedFleetScale,
  evaluatePreflight,
  type ActivityId,
  type AbyssalTier,
  type AbyssalWeather,
  type CheckSection,
  type FleetScale,
  type TripProfile,
} from "@/lib/preflight/checker";

const activityIcons = {
  combat: Swords,
  exploration: ScanSearch,
  harvesting: Pickaxe,
  hauling: Truck,
  salvage: Recycle,
  support: HeartPulse,
  travel: Route,
  industry: Factory,
} satisfies Record<ActivityId, typeof Swords>;

const checkIcons = {
  pass: CheckCircle2,
  warning: AlertTriangle,
  danger: ShieldAlert,
  unknown: CircleHelp,
  manual: Square,
  info: Info,
};

const sectionOrder: CheckSection[] = ["ship", "fit", "supplies", "before-undock"];

function isk(value: number): string {
  return `${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)} ISK`;
}

export function PreflightView({ data, connected }: { data: DashboardData; connected: boolean }) {
  const [activity, setActivity] = useState<ActivityId>("combat");
  const initialActivity = ACTIVITIES.find((item) => item.id === activity)!;
  const [option, setOption] = useState(initialActivity.options[0].id);
  const [fleetScale, setFleetScale] = useState<FleetScale>(() => detectedFleetScale(data.character.fleet?.memberCount));
  const [tripProfile, setTripProfile] = useState<TripProfile>("session");
  const detectedAbyssal = detectAbyssalScenario(data.character.shipContents);
  const [abyssalTier, setAbyssalTier] = useState<AbyssalTier>(() => detectedAbyssal?.tier ?? 0);
  const [abyssalWeather, setAbyssalWeather] = useState<AbyssalWeather>(() => detectedAbyssal?.weather ?? "electrical");
  const [confirmedManual, setConfirmedManual] = useState<Set<string>>(() => new Set());

  const selectedActivity = ACTIVITIES.find((item) => item.id === activity)!;
  const selectedOption = selectedActivity.options.find((item) => item.id === option) ?? selectedActivity.options[0];
  const checks = evaluatePreflight({
    activity,
    option: selectedOption.id,
    fleetScale,
    tripProfile,
    shipName: data.character.shipName,
    shipType: data.character.shipType,
    shipGroupId: data.character.shipGroupId,
    docked: data.character.docked,
    systemName: data.character.solarSystem,
    systemSecurity: data.character.systemSecurity,
    inventoryReadable: data.character.shipInventoryReadable,
    activeImplants: data.activity.implants,
    fleetMemberCount: data.character.fleet?.memberCount,
    abyssalTier,
    abyssalWeather,
    contents: data.character.shipContents,
    storedSupplies: data.character.storedSupplies,
  });

  const counts = checks.reduce((result, check) => {
    result[check.status] += 1;
    return result;
  }, { pass: 0, warning: 0, danger: 0, unknown: 0, manual: 0, info: 0 });
  const remainingManual = checks.filter((check) => check.status === "manual" && !confirmedManual.has(check.id)).length;
  const carriedValue = data.character.shipContents
    .filter((item) => /^(Cargo|DroneBay|FighterBay|FleetHangar|ShipHangar|Specialized)/.test(item.locationFlag))
    .reduce((sum, item) => sum + item.estimatedValue, 0);

  function chooseActivity(next: ActivityId) {
    const nextActivity = ACTIVITIES.find((item) => item.id === next)!;
    setActivity(next);
    setOption(nextActivity.options[0].id);
    setConfirmedManual(new Set());
  }

  function changeOption(next: string) {
    setOption(next);
    setConfirmedManual(new Set());
  }

  function changeFleetScale(next: FleetScale) {
    setFleetScale(next);
    setConfirmedManual(new Set());
  }

  function changeTripProfile(next: TripProfile) {
    setTripProfile(next);
    setConfirmedManual(new Set());
  }

  function changeAbyssalTier(next: AbyssalTier) {
    setAbyssalTier(next);
    setConfirmedManual(new Set());
  }

  function changeAbyssalWeather(next: AbyssalWeather) {
    setAbyssalWeather(next);
    setConfirmedManual(new Set());
  }

  function toggleManual(id: string) {
    setConfirmedManual((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="page-view preflight-page">
      <div className="page-heading preflight-heading">
        <div>
          <div className="eyebrow">Before you undock</div>
          <h1>Preflight</h1>
          <p>Tell me what you are about to do. I&apos;ll compare that job with the ship and supplies ESI can actually see.</p>
        </div>
        <div className="preflight-ship-badge">
          <ClipboardCheck size={18} />
          <span><small>Active ship</small><strong>{data.character.shipType}</strong><em>{data.character.shipName}</em></span>
          <b className={data.character.docked ? "docked" : "space"}>{data.character.docked ? "Docked" : "In space"}</b>
        </div>
      </div>

      <div className="preflight-context-grid">
        <section className="panel preflight-context">
          <div className="preflight-context-copy">
            <UsersRound size={19} />
            <span>
              <strong>Who are you flying with?</strong>
              <small>{connected && data.character.fleet ? `ESI currently sees ${data.character.fleet.memberCount} pilot${data.character.fleet.memberCount === 1 ? "" : "s"} in your fleet.` : "No live fleet was detected. Choose the closest match."}</small>
            </span>
          </div>
          <div className="fleet-scale-buttons">
            <button className={fleetScale === "solo" ? "active" : ""} onClick={() => changeFleetScale("solo")}><strong>Solo</strong><small>Just me</small></button>
            <button className={fleetScale === "small" ? "active" : ""} onClick={() => changeFleetScale("small")}><strong>Small fleet</strong><small>2–9 pilots</small></button>
            <button className={fleetScale === "organized" ? "active" : ""} onClick={() => changeFleetScale("organized")}><strong>Organized fleet</strong><small>10+ / doctrine</small></button>
          </div>
        </section>
        <section className="panel preflight-context trip-context">
          <div className="preflight-context-copy"><ListChecks size={19} /><span><strong>How much are you doing?</strong><small>This changes how strongly I treat spares and field repairs.</small></span></div>
          <div className="fleet-scale-buttons">
            <button className={tripProfile === "one" ? "active" : ""} onClick={() => changeTripProfile("one")}><strong>One job</strong><small>Quick outing</small></button>
            <button className={tripProfile === "session" ? "active" : ""} onClick={() => changeTripProfile("session")}><strong>A session</strong><small>Several stops</small></button>
            <button className={tripProfile === "expedition" ? "active" : ""} onClick={() => changeTripProfile("expedition")}><strong>Far from home</strong><small>Bring spares</small></button>
          </div>
        </section>
      </div>

      <div className="preflight-layout">
        <section className="panel preflight-picker">
          <div className="panel-heading">
            <div><div className="eyebrow">Step one</div><h2>What are you doing?</h2></div>
          </div>
          <div className="activity-choice-grid">
            {ACTIVITIES.map((item) => {
              const Icon = activityIcons[item.id];
              return (
                <button key={item.id} className={activity === item.id ? "active" : ""} onClick={() => chooseActivity(item.id)}>
                  <span><Icon size={18} /></span>
                  <div><strong>{item.label}</strong><small>{item.description}</small></div>
                  {activity === item.id && <CheckCircle2 size={15} />}
                </button>
              );
            })}
          </div>
          <div className="preflight-specific">
            <div><span>Step two</span><strong>Which kind?</strong></div>
            <div className="preflight-option-buttons">
              {selectedActivity.options.map((item) => <button key={item.id} className={selectedOption.id === item.id ? "active" : ""} onClick={() => changeOption(item.id)}>{item.label}</button>)}
            </div>
            {selectedOption.id === "abyssal" && (
              <div className="abyssal-scenario-picker">
                <div>
                  <span>Exact tier</span>
                  <div className="preflight-option-buttons compact">
                    {ABYSSAL_TIERS.map((tier) => <button key={tier.id} className={abyssalTier === tier.id ? "active" : ""} onClick={() => changeAbyssalTier(tier.id)}>{tier.label}</button>)}
                  </div>
                </div>
                <div>
                  <span>Weather</span>
                  <div className="preflight-option-buttons compact">
                    {ABYSSAL_WEATHERS.map((weather) => <button key={weather.id} className={abyssalWeather === weather.id ? "active" : ""} onClick={() => changeAbyssalWeather(weather.id)}>{weather.label}</button>)}
                  </div>
                </div>
                {detectedAbyssal && <small>Auto-detected from a filament aboard; change it here if you intend to use another one.</small>}
              </div>
            )}
          </div>
        </section>

        <section className="panel preflight-report">
          <header className={counts.danger ? "no-go" : counts.warning || remainingManual ? "review" : counts.unknown ? "unknown" : "plausible"}>
            <div className="preflight-report-icon">{counts.danger ? <ShieldAlert size={23} /> : counts.warning || remainingManual ? <AlertTriangle size={23} /> : counts.unknown ? <CircleHelp size={23} /> : <CheckCircle2 size={23} />}</div>
            <div>
              <div className="eyebrow">{selectedActivity.shortLabel} check</div>
              <h2>{counts.danger ? "NO-GO — do not activate this yet" : counts.warning ? `${counts.warning} warning${counts.warning === 1 ? "" : "s"}${remainingManual ? ` · ${remainingManual} to confirm` : ""}` : remainingManual ? `${remainingManual} in-game check${remainingManual === 1 ? "" : "s"} left` : counts.unknown ? "Manual confirmation needed" : "Preflight complete"}</h2>
              <p>{counts.danger ? "At least one hard blocker or likely ship-loss mismatch was found. Read the red items before you change ships, fit or scenario." : counts.warning ? "Fix or consciously accept the warnings, then finish the in-game checks." : remainingManual ? "The supplies look reasonable. Tick off the things only the EVE client can prove." : "No obvious mismatch was found. This is still not a guarantee the fit will survive."}</p>
            </div>
            <span>{counts.pass} found <b>·</b> {counts.danger} no-go <b>·</b> {counts.warning} warnings <b>·</b> {remainingManual} manual</span>
          </header>
          <div className="preflight-check-list">
            {sectionOrder.map((section) => {
              const sectionChecks = checks.filter((check) => check.section === section);
              if (!sectionChecks.length) return null;
              return <div className="preflight-check-group" key={section}><h3>{CHECK_SECTION_LABELS[section]}<span>{sectionChecks.length}</span></h3>{sectionChecks.map((check) => {
                const confirmed = check.status === "manual" && confirmedManual.has(check.id);
                const Icon = confirmed ? SquareCheck : checkIcons[check.status];
                const content = <><div><Icon size={16} /></div><span><strong>{check.title}</strong><small>{check.detail}</small>{check.status === "manual" && <em>{confirmed ? "Confirmed" : "Click after checking in EVE"}</em>}</span></>;
                return check.status === "manual"
                  ? <button type="button" className={`manual ${confirmed ? "confirmed" : ""}`} key={check.id} onClick={() => toggleManual(check.id)}>{content}</button>
                  : <article className={check.status} key={check.id}>{content}</article>;
              })}</div>;
            })}
          </div>
          <footer>
            <Info size={15} />
            <span><strong>What the app cannot see</strong><small>ESI exposes the active hull and asset locations, but not live capacitor, exact cargo capacity, overheated stats, fleet doctrine, Local, d-scan or your piloting. Confirm those in EVE.</small></span>
          </footer>
        </section>
      </div>

      <details className="panel aboard-panel collapsible-panel">
        <summary className="panel-heading compact">
          <div><div className="eyebrow">Evidence used</div><h2>Detected aboard {data.character.shipName}</h2></div>
          <span>{data.character.shipContents.length} stacks · {isk(carriedValue)} carried estimate <ChevronRight size={16} /></span>
        </summary>
        {data.character.shipContents.length ? (
          <div className="aboard-grid">
            {data.character.shipContents.map((item) => <div key={item.itemId}><span>{item.locationFlag}</span><strong>{item.name}</strong><small>{item.quantity.toLocaleString()} {item.quantity === 1 ? "unit" : "units"}</small></div>)}
          </div>
        ) : (
          <div className="aboard-empty"><CircleHelp size={20} /><span><strong>No active-ship contents were returned.</strong><small>Use the warnings as a manual checklist and inspect the EVE fitting window before undocking.</small></span></div>
        )}
      </details>
    </section>
  );
}
