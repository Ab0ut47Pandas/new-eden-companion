"use client";

import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Clock3,
  Coins,
  Command,
  Copy,
  Database,
  Factory,
  GraduationCap,
  Info,
  Lightbulb,
  LocateFixed,
  LogOut,
  MapPinned,
  Menu,
  PackageSearch,
  RefreshCw,
  Search,
  Ship,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRoundCheck,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import { MapView } from "@/components/map-view";
import { IntelView } from "@/components/intel-view";
import { PreflightView } from "@/components/preflight-view";
import { ShipsView } from "@/components/ships-view";
import type { AdviceCard, DashboardData } from "@/lib/dashboard/model";
import { buildCombatTrainingPlan, stageClipboardText } from "@/lib/training/combat-plan";

type View = "welcome" | "command" | "preflight" | "intel" | "map" | "assets" | "activity" | "ships" | "skills" | "data";
type Goal = "balanced" | "wealth" | "combat" | "industry" | "exploration";

interface DashboardShellProps {
  data: DashboardData;
  configured: boolean;
  connected: boolean;
  authStatus?: string;
  authDetail?: string;
  liveError?: string;
}

const nav = [
  { id: "welcome" as const, label: "Setup", icon: BookOpen },
  { id: "command" as const, label: "Command", icon: Command },
  { id: "preflight" as const, label: "Preflight", icon: ClipboardCheck },
  { id: "intel" as const, label: "Nearby action", icon: Activity },
  { id: "map" as const, label: "Route map", icon: MapPinned },
  { id: "assets" as const, label: "Assets", icon: Boxes },
  { id: "activity" as const, label: "Activity", icon: Activity },
  { id: "ships" as const, label: "Ships", icon: Ship },
  { id: "skills" as const, label: "Skills", icon: GraduationCap },
  { id: "data" as const, label: "Data access", icon: ShieldCheck },
];

function isk(value: number, compact = true): string {
  return new Intl.NumberFormat("en-US", {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 2 : 0,
  }).format(value) + " ISK";
}

function number(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function date(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function timeUntil(value?: string): string {
  if (!value) return "No finish time";
  const milliseconds = new Date(value).getTime() - Date.now();
  if (milliseconds <= 0) return "Ready now";
  const hours = Math.floor(milliseconds / 3_600_000);
  if (hours < 24) return `${hours}h ${Math.floor((milliseconds % 3_600_000) / 60_000)}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function Advice({ card, index }: { card: AdviceCard; index: number }) {
  const Icon = card.priority === "now" ? Zap : card.priority === "next" ? Target : Lightbulb;
  return (
    <article className={`advice advice-${card.priority}`}>
      <div className="advice-rank">{String(index + 1).padStart(2, "0")}</div>
      <div className="advice-icon"><Icon size={17} /></div>
      <div className="advice-copy">
        <div className="eyebrow">{card.priority === "now" ? "Act now" : card.priority === "next" ? "Next move" : "Keep watch"}</div>
        <h3>{card.title}</h3>
        <p>{card.summary}</p>
        <details>
          <summary>Why this recommendation <ChevronRight size={14} /></summary>
          <div><strong>Evidence:</strong> {card.evidence}</div>
          <div><strong>Move:</strong> {card.action}</div>
        </details>
      </div>
    </article>
  );
}

function StatCard({ label, value, note, icon: Icon, tone = "mint" }: { label: string; value: string; note: string; icon: typeof Coins; tone?: "mint" | "amber" | "blue" | "plain" }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-top"><span>{label}</span><Icon size={17} /></div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

export function DashboardShell({ data, configured, connected, authStatus, authDetail, liveError }: DashboardShellProps) {
  const [view, setView] = useState<View>(connected ? "command" : "welcome");
  const [menuOpen, setMenuOpen] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [goal, setGoal] = useState<Goal>("balanced");
  const filteredAssets = useMemo(() => {
    const query = assetSearch.trim().toLowerCase();
    return data.assets.topItems.filter((asset) =>
      (!query || asset.name.toLowerCase().includes(query)) &&
      (selectedLocation === "all" || asset.location === selectedLocation),
    );
  }, [assetSearch, data.assets.topItems, selectedLocation]);

  const authMessage = liveError ?? (authStatus === "not-configured"
    ? authDetail ?? "Add your EVE application settings before connecting."
    : authStatus === "denied"
      ? "EVE authorization was cancelled. Nothing was connected."
      : authStatus === "invalid-state"
        ? "The login response could not be verified. Please try connecting again."
        : authStatus === "callback-failed"
          ? "EVE login completed, but the token could not be verified or saved."
          : undefined);

  const go = (next: View) => {
    setView(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle navigation">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <button className="brand" onClick={() => go("command")}>
          <Image src="/mark.svg" alt="" width={34} height={34} priority />
          <span><strong>New Eden</strong><small>Companion</small></span>
        </button>
        <div className="topbar-center">
          <span className={`status-dot ${connected ? "live" : "demo"}`} />
          {connected ? "ESI connected" : "Preview mode"}
        </div>
        <div className="topbar-actions">
          <button className="icon-button" onClick={() => window.location.reload()} title="Refresh ESI data"><RefreshCw size={17} /></button>
          {connected ? (
            <form action="/api/auth/logout" method="post"><button className="quiet-button"><LogOut size={16} /> Disconnect</button></form>
          ) : (
            <a className={`connect-small ${!configured ? "muted" : ""}`} href="/api/auth/login"><UserRoundCheck size={16} /> Connect EVE</a>
          )}
        </div>
      </header>

      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <nav>
          <div className="nav-label">Companion tools</div>
          {nav.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => go(item.id)}><Icon size={18} /><span>{item.label}</span>{view === item.id && <CircleDot size={11} />}</button>;
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="privacy-mark"><ShieldCheck size={18} /><span><strong>Private by design</strong><small>Local tokens · guarded writes</small></span></div>
          <span className="build-label">ALPHA 0.1</span>
        </div>
      </aside>

      <main className="main">
        {authMessage && <div className="alert-banner"><AlertTriangle size={18} /><span>{authMessage}</span><button onClick={() => window.history.replaceState({}, "", "/")}><X size={15} /></button></div>}
        {!connected && view !== "data" && view !== "welcome" && (
          <section className="demo-banner">
            <div><Sparkles size={18} /><span><strong>Demo data.</strong> Connect a character to load live ESI data.</span></div>
            <a href={configured ? "/api/auth/login" : "#setup"}>{configured ? "Connect character" : "Finish setup"}<ChevronRight size={16} /></a>
          </section>
        )}

        {view === "welcome" && <WelcomeView configured={configured} connected={connected} go={go} />}
        {view === "command" && <CommandView data={data} go={go} goal={goal} setGoal={setGoal} />}
        {view === "preflight" && <PreflightView data={data} connected={connected} />}
        {view === "intel" && <IntelView data={data} connected={connected} />}
        {view === "map" && <MapView data={data} connected={connected} />}
        {view === "assets" && <AssetsView data={data} search={assetSearch} setSearch={setAssetSearch} location={selectedLocation} setLocation={setSelectedLocation} filtered={filteredAssets} />}
        {view === "activity" && <ActivityView data={data} />}
        {view === "ships" && <ShipsView data={data} connected={connected} />}
        {view === "skills" && <SkillsView data={data} />}
        {view === "data" && <DataView data={data} configured={configured} connected={connected} />}
      </main>
    </div>
  );
}

function WelcomeView({ configured, connected, go }: { configured: boolean; connected: boolean; go: (view: View) => void }) {
  return (
    <section className="page-view setup-view">
      <div className="page-heading setup-heading">
        <div><div className="eyebrow">Local setup</div><h1>Setup</h1><p>Use the demo or connect an EVE character. The app runs on this computer.</p></div>
        <span className={`connection-pill ${connected ? "connected" : ""}`}>{connected ? <CheckCircle2 size={16} /> : <CircleDot size={16} />}{connected ? "Live data" : "Demo data"}</span>
      </div>

      <div className="setup-layout">
        <div className="panel setup-checklist">
          <div className="panel-heading"><div><div className="eyebrow">Connection</div><h2>Current status</h2></div></div>
          <div className="setup-status-list" aria-label="Setup status">
            <div><CheckCircle2 size={17} /><span><strong>App</strong><small>Running at localhost:3000</small></span><b>OK</b></div>
            <div className={configured ? "complete" : "pending"}>{configured ? <CheckCircle2 size={17} /> : <CircleDot size={17} />}<span><strong>EVE application</strong><small>{configured ? "Client ID and local encryption key found" : "Client ID not set; demo still works"}</small></span><b>{configured ? "OK" : "NOT SET"}</b></div>
            <div className={connected ? "complete" : "pending"}>{connected ? <CheckCircle2 size={17} /> : <CircleDot size={17} />}<span><strong>Character</strong><small>{connected ? "ESI session active" : "No character session"}</small></span><b>{connected ? "LIVE" : "OFF"}</b></div>
          </div>
          <div className="setup-actions">
            {connected ? (
              <button className="setup-primary" onClick={() => go("command")}><Command size={16} /> Open Command</button>
            ) : configured ? (
              <a className="setup-primary" href="/api/auth/login?profile=recommended"><UserRoundCheck size={16} /> Connect character</a>
            ) : (
              <button className="setup-primary" onClick={() => go("data")}><ShieldCheck size={16} /> Configure EVE access</button>
            )}
            {!connected && <button className="setup-secondary" onClick={() => go("command")}><Sparkles size={15} /> Use demo</button>}
          </div>
        </div>

        <div className="panel setup-tools">
          <div className="panel-heading"><div><div className="eyebrow">Quick reference</div><h2>Main tools</h2></div></div>
          <button onClick={() => go("command")}><span>01</span><div><strong>Command</strong><small>Location, wallet, assets, queue, and current recommendations.</small></div><ChevronRight size={15} /></button>
          <button onClick={() => go("preflight")}><span>02</span><div><strong>Preflight</strong><small>Fit, ammunition, drones, supplies, and activity checks.</small></div><ChevronRight size={15} /></button>
          <button onClick={() => go("ships")}><span>03</span><div><strong>Ships</strong><small>Hull ranking, roles, fits, and missing skills.</small></div><ChevronRight size={15} /></button>
        </div>
      </div>

      <div className="panel setup-security-note">
        <ShieldCheck size={19} />
        <span><strong>EVE SSO handles authentication.</strong><small>The refresh token is encrypted in the local database. Route and write actions require an explicit request.</small></span>
        <button onClick={() => go("data")}>Permissions <ChevronRight size={14} /></button>
      </div>
    </section>
  );
}

function CommandView({ data, go, goal, setGoal }: { data: DashboardData; go: (view: View) => void; goal: Goal; setGoal: (goal: Goal) => void }) {
  const liquidShare = data.summary.netWorth > 0 ? Math.round((data.summary.wallet / data.summary.netWorth) * 100) : 0;
  const goalBrief: Record<Goal, string> = {
    balanced: `Protect training continuity, keep enough liquid ISK, and clear the ${data.advice.filter((item) => item.priority === "now").length} urgent signal${data.advice.filter((item) => item.priority === "now").length === 1 ? "" : "s"} first.`,
    wealth: `${liquidShare}% of tracked wealth is liquid. Focus on expiring orders and high-value idle inventory before adding new purchases.`,
    combat: `You are in a ${data.character.shipType} in ${data.character.solarSystem} (${data.character.systemSecurity.toFixed(1)}). Prioritize queue continuity, replacement ISK, and route risk.`,
    industry: `${data.summary.activeJobs} jobs are active with ${data.activity.blueprints} blueprint records. Stage the next inputs before slots finish.`,
    exploration: `Your current system is ${data.character.systemSecurity.toFixed(1)} security. Keep the route, clone, cargo value, and escape plan in the decision—not just the destination.`,
  };
  return (
    <>
      <section className="character-hero">
        <div className="portrait-wrap">
          <Image src={data.mode === "demo" ? "/demo-portrait.svg" : data.character.portrait} alt={`${data.character.name} portrait`} fill sizes="112px" priority />
          <span className={data.character.online ? "online" : "offline"}>{data.character.online ? "ONLINE" : "OFFLINE"}</span>
        </div>
        <div className="character-copy">
          <div className="eyebrow">Character status</div>
          <h1>{data.character.name}</h1>
          <p>{data.character.corporation} <span>·</span> Security status {data.character.securityStatus.toFixed(1)}</p>
          <div className="whereabouts">
            <span><LocateFixed size={15} />{data.character.solarSystem} <b className={data.character.systemSecurity < 0.5 ? "danger" : "safe"}>{data.character.systemSecurity.toFixed(1)}</b></span>
            <span><Target size={15} />{data.character.shipName} <em>{data.character.shipType}</em></span>
          </div>
        </div>
        <div className="hero-time">
          <span>Snapshot</span>
          <strong>{new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(data.fetchedAt))}</strong>
          <small>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(data.fetchedAt))}</small>
        </div>
      </section>

      <section className="goal-strip">
        <div><Target size={16} /><span><strong>Focus</strong><small>{goalBrief[goal]}</small></span></div>
        <div className="goal-buttons">
          {(["balanced", "wealth", "combat", "industry", "exploration"] as Goal[]).map((item) => <button key={item} className={goal === item ? "active" : ""} onClick={() => setGoal(item)}>{item === "wealth" ? "Build ISK" : item[0].toUpperCase() + item.slice(1)}</button>)}
        </div>
      </section>

      <section className="stat-grid">
        <StatCard label="Tracked net worth" value={isk(data.summary.netWorth)} note={`${isk(data.summary.wallet)} liquid`} icon={TrendingUp} tone="mint" />
        <StatCard label="Assets" value={isk(data.summary.assetValue)} note={`${number(data.assets.itemCount)} items · ${data.assets.locations.length} locations`} icon={Boxes} tone="blue" />
        <StatCard label="Skill points" value={number(data.summary.totalSkillPoints)} note={`${data.skills.queue.length} skills queued`} icon={GraduationCap} tone="amber" />
        <StatCard label="Active work" value={`${data.summary.activeOrders + data.summary.activeJobs}`} note={`${data.summary.activeOrders} orders · ${data.summary.activeJobs} jobs`} icon={BriefcaseBusiness} tone="plain" />
      </section>

      <section className="command-grid">
        <div className="panel advisor-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">Recommendations</div><h2>Next actions</h2></div>
            <span className="explainable"><ShieldCheck size={14} /> Rule based</span>
          </div>
          <div className="advice-list">{data.advice.map((item, index) => <Advice card={item} index={index} key={item.id} />)}</div>
        </div>

        <div className="side-stack">
          <div className="panel queue-panel">
            <div className="panel-heading compact"><div><div className="eyebrow">Training</div><h2>Skill queue</h2></div><button onClick={() => go("skills")}>View all <ChevronRight size={14} /></button></div>
            {data.skills.queue.length ? data.skills.queue.slice(0, 3).map((skill, index) => (
              <div className="queue-row" key={`${skill.skillId}-${index}`}>
                <div className={`queue-index ${skill.active ? "active" : ""}`}>{skill.active ? <Zap size={13} /> : index + 1}</div>
                <div><strong>{skill.name} <span>V{skill.targetLevel}</span></strong><small>{skill.active ? "Training now" : "Queued"}</small></div>
                <time>{timeUntil(skill.finishDate)}</time>
              </div>
            )) : <div className="empty-state"><Clock3 size={22} /><span>No skills queued</span></div>}
          </div>

          <div className="panel locations-panel">
            <div className="panel-heading compact"><div><div className="eyebrow">Inventory map</div><h2>Asset concentration</h2></div><button onClick={() => go("assets")}>Inspect <ChevronRight size={14} /></button></div>
            <div className="location-bars">
              {data.assets.locations.slice(0, 4).map((location) => (
                <div className="location-bar" key={location.id}>
                  <div><strong>{location.name}</strong><span>{isk(location.estimatedValue)}</span></div>
                  <div className="bar"><i style={{ width: `${Math.max(2, location.share * 100)}%` }} /></div>
                </div>
              ))}
              {!data.assets.locations.length && <div className="empty-state"><Boxes size={22} /><span>No asset locations available</span></div>}
            </div>
          </div>
        </div>
      </section>

      <section className="context-strip">
        <div><Database size={17} /><span><strong>{data.dataQuality.unavailable.length ? `${data.dataQuality.unavailable.length} data gaps` : "All requested categories responded"}</strong><small>{data.dataQuality.valuationNote}</small></span></div>
        <button onClick={() => go("data")}>Inspect data quality <ChevronRight size={14} /></button>
      </section>
    </>
  );
}

function AssetsView({ data, search, setSearch, location, setLocation, filtered }: { data: DashboardData; search: string; setSearch: (value: string) => void; location: string; setLocation: (value: string) => void; filtered: DashboardData["assets"]["topItems"] }) {
  return (
    <section className="page-view">
      <div className="page-heading"><div><div className="eyebrow">Inventory</div><h1>Assets</h1><p>Locations, item counts, and estimated values from ESI.</p></div><div className="heading-stat"><span>Estimated total</span><strong>{isk(data.assets.estimatedValue)}</strong></div></div>
      <div className="asset-locations-grid">
        {data.assets.locations.slice(0, 6).map((item) => <button key={item.id} className={location === item.name ? "selected" : ""} onClick={() => setLocation(location === item.name ? "all" : item.name)}><span><LocateFixed size={15} />{item.name}</span><strong>{isk(item.estimatedValue)}</strong><small>{item.itemCount} item records · {Math.round(item.share * 100)}%</small></button>)}
      </div>
      <div className="panel asset-table-panel">
        <div className="table-tools">
          <label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your top 250 items" /></label>
          <select value={location} onChange={(event) => setLocation(event.target.value)}><option value="all">All locations</option>{data.assets.locations.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}</select>
          <span>{filtered.length} shown</span>
        </div>
        <div className="data-table">
          <div className="data-row table-header"><span>Item</span><span>Location</span><span>Qty</span><span>Est. value</span></div>
          {filtered.map((item) => <div className="data-row" key={item.itemId}><span><PackageSearch size={16} /><strong>{item.name}</strong><small>{item.locationFlag}</small></span><span>{item.location}</span><span>{number(item.quantity)}</span><span>{isk(item.estimatedValue)}</span></div>)}
          {!filtered.length && <div className="empty-state roomy"><Search size={24} /><span>No assets match this filter.</span></div>}
        </div>
        <p className="table-note">{data.dataQuality.valuationNote}{data.assets.truncated ? " Asset import reached the 50-page safety cap." : ""}</p>
      </div>
    </section>
  );
}

function ActivityView({ data }: { data: DashboardData }) {
  return (
    <section className="page-view">
      <div className="page-heading"><div><div className="eyebrow">Money in motion</div><h1>Activity</h1><p>Orders, industry work, contracts, and the commitments competing for your attention.</p></div></div>
      <section className="stat-grid mini"><StatCard label="Market orders" value={String(data.activity.orders.length)} note={`${data.activity.orders.filter((item) => item.side === "Buy").length} buy · ${data.activity.orders.filter((item) => item.side === "Sell").length} sell`} icon={WalletCards} tone="mint" /><StatCard label="Industry jobs" value={String(data.activity.jobs.length)} note={`${data.summary.activeJobs} currently active`} icon={Factory} tone="blue" /><StatCard label="Contracts" value={String(data.activity.contracts.active)} note={`${data.activity.contracts.attention} need attention`} icon={BriefcaseBusiness} tone="amber" /><StatCard label="Blueprints" value={String(data.activity.blueprints)} note="Personal library records" icon={Database} tone="plain" /></section>
      <div className="two-panels">
        <div className="panel"><div className="panel-heading"><div><div className="eyebrow">Market</div><h2>Open orders</h2></div></div><div className="activity-list">{data.activity.orders.map((order) => <div className="activity-row" key={order.id}><span className={order.side === "Buy" ? "buy" : "sell"}>{order.side === "Buy" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span><div><strong>{order.item}</strong><small>{order.remaining.toLocaleString()} / {order.total.toLocaleString()} remaining</small></div><div><strong>{isk(order.price, false)}</strong><small>Expires {date(order.expiresAt)}</small></div></div>)}{!data.activity.orders.length && <div className="empty-state roomy"><WalletCards size={23} /><span>No open orders</span></div>}</div></div>
        <div className="panel"><div className="panel-heading"><div><div className="eyebrow">Industry</div><h2>Jobs</h2></div></div><div className="activity-list">{data.activity.jobs.map((job) => <div className="activity-row" key={job.id}><span className="job"><Factory size={16} /></span><div><strong>{job.item}</strong><small>{job.runs} runs · {job.status}</small></div><div><strong>{timeUntil(job.endDate)}</strong><small>{date(job.endDate)}</small></div></div>)}{!data.activity.jobs.length && <div className="empty-state roomy"><Factory size={23} /><span>No industry jobs</span></div>}</div></div>
      </div>
      <div className="two-panels activity-secondary">
        <div className="panel"><div className="panel-heading"><div><div className="eyebrow">Wallet journal</div><h2>Recent movements</h2></div></div><div className="activity-list">{data.activity.walletEntries.slice(0, 12).map((entry) => <div className="activity-row wallet-row" key={entry.id}><span className={entry.amount >= 0 ? "buy" : "sell"}>{entry.amount >= 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span><div><strong>{entry.description}</strong><small>{entry.type.replaceAll("_", " ")}</small></div><div><strong className={entry.amount >= 0 ? "positive" : "negative"}>{entry.amount >= 0 ? "+" : ""}{isk(entry.amount, false)}</strong><small>{date(entry.date)}</small></div></div>)}{!data.activity.walletEntries.length && <div className="empty-state roomy"><Coins size={23} /><span>No recent wallet journal entries</span></div>}</div></div>
        <div className="panel operations-panel"><div className="panel-heading"><div><div className="eyebrow">Character operations</div><h2>Other tracked systems</h2></div></div><div className="operation-grid"><div><span>Planetary colonies</span><strong>{data.activity.colonies}</strong></div><div><span>Saved fittings</span><strong>{data.activity.fittings}</strong></div><div><span>Loyalty programs</span><strong>{data.activity.loyaltyPrograms}</strong></div><div><span>Mining records</span><strong>{data.activity.miningRecords}</strong></div><div><span>Jump clones</span><strong>{data.activity.jumpClones}</strong></div><div><span>Active implants</span><strong>{data.activity.implants}</strong></div></div></div>
      </div>
    </section>
  );
}

function SkillsView({ data }: { data: DashboardData }) {
  const plan = useMemo(() => buildCombatTrainingPlan(data), [data]);
  const [copiedStage, setCopiedStage] = useState<string | null>(null);

  async function copyStage(stageId: string) {
    const stage = plan.stages.find((item) => item.id === stageId);
    if (!stage) return;
    await navigator.clipboard.writeText(stageClipboardText(stage));
    setCopiedStage(stageId);
    window.setTimeout(() => setCopiedStage((current) => current === stageId ? null : current), 1_800);
  }

  return (
    <section className="page-view">
      <div className="page-heading"><div><div className="eyebrow">Character growth</div><h1>Skills</h1><p>Keep training continuous and see the plan ESI can verify.</p></div><div className="heading-stat"><span>Total trained</span><strong>{number(data.skills.totalSp)} SP</strong></div></div>
      <section className="panel training-library">
        <header>
          <div><div className="eyebrow">Training library</div><h2>Choose a training path</h2><p>Expand a general-purpose path to compare it with the connected character. The library reports progress without deciding what that character must train next.</p></div>
          <div className="foundation-badges"><span><strong>{plan.foundation.magic14AtFive}/14</strong>Magic 14 at V</span><span><strong>V{plan.foundation.advancedWeaponUpgrades}</strong>Advanced Weapon Upgrades</span></div>
        </header>
        <div className="training-stage-grid">
          {plan.stages.map((stage) => {
            const unfinished = stage.steps.filter((step) => step.status !== "trained");
            const completed = stage.steps.length - unfinished.length;
            return <details className={`training-stage ${stage.id}`} key={stage.id}>
              <summary className="training-stage-summary">
                <div><span>{stage.eyebrow}</span><h3>{stage.title}</h3><p>{stage.purpose}</p></div>
                <div className="training-stage-progress"><strong>{completed}/{stage.steps.length}</strong><span>complete</span><ChevronRight size={16} /></div>
              </summary>
              <div className="training-stage-toolbar">
                <div className="training-milestone"><Target size={14} /><span><small>Milestone</small><strong>{stage.milestone}</strong></span></div>
                <button type="button" onClick={() => copyStage(stage.id)} disabled={!unfinished.length}>{copiedStage === stage.id ? <CheckCircle2 size={14} /> : <Copy size={14} />}{copiedStage === stage.id ? "Copied" : unfinished.length ? "Copy remaining" : "Complete"}</button>
              </div>
              <div className="training-step-list">
                {stage.steps.map((step, index) => <div className={step.status} key={`${step.skill}-${step.level}-${index}`}>
                  <span>{step.status === "trained" ? <CheckCircle2 size={14} /> : step.status === "queued" ? <Clock3 size={14} /> : index + 1}</span>
                  <div><strong>{step.skill} {['', 'I', 'II', 'III', 'IV', 'V'][step.level]}</strong><small>{step.purpose}</small></div>
                  <em>{step.status === "trained" ? `V${step.currentLevel} trained` : step.status === "queued" ? "Queued" : step.currentLevel ? `V${step.currentLevel} now` : "Not trained"}</em>
                </div>)}
              </div>
            </details>;
          })}
        </div>
        <footer><Info size={15} /><span><strong>Training paths are reference checklists.</strong> Progress is calculated from the connected character. Copying a path does not alter the EVE training queue.</span></footer>
      </section>
      <section className="skills-layout">
        <details className="panel skill-queue-full collapsible-panel">
          <summary className="panel-heading skill-queue-summary"><div><div className="eyebrow">Current EVE queue</div><h2>Training queue</h2><small>{data.skills.queue[0] ? `${data.skills.queue[0].name} is training now` : "No skill is currently training"}</small></div><div className="queue-summary-meta"><span className="queue-count">{data.skills.queue.length} entries</span><ChevronRight size={16} /></div></summary>
          <div className="skill-queue-rows">{data.skills.queue.map((skill, index) => <div className="skill-row" key={`${skill.skillId}-${index}`}><span className={skill.active ? "active" : ""}>{skill.active ? <Zap size={15} /> : index + 1}</span><div><strong>{skill.name}</strong><small>Training to level {skill.targetLevel}</small></div><div className="skill-line"><i style={{ width: skill.active ? "62%" : "0%" }} /></div><time><strong>{timeUntil(skill.finishDate)}</strong><small>{skill.finishDate ? date(skill.finishDate) : "Pending"}</small></time></div>)}{!data.skills.queue.length && <div className="empty-state roomy"><Clock3 size={24} /><span>The skill queue is empty.</span></div>}</div>
        </details>
        <aside className="panel skill-summary"><div className="eyebrow">Training inventory</div><h2>{data.skills.trainedSkills}</h2><p>skills with trained points</p><hr /><div><span>Unallocated SP</span><strong>{number(data.skills.unallocatedSp)}</strong></div><div><span>Queue horizon</span><strong>{timeUntil(data.skills.queue.at(-1)?.finishDate)}</strong></div><div><span>Queue status</span><strong className={data.skills.queue.length ? "good" : "bad"}>{data.skills.queue.length ? "Active" : "Idle"}</strong></div></aside>
      </section>
    </section>
  );
}

function DataView({ data, configured, connected }: { data: DashboardData; configured: boolean; connected: boolean }) {
  const requested = ["Location, online state and active ship", "Assets, wallet, personal orders and contracts", "Skills, queue, clones, implants and fittings", "Personal industry, mining and killmail history", "Client information and market windows", "Confirmed autopilot waypoints"];
  return (
    <section className="page-view" id="setup">
      <div className="page-heading"><div><div className="eyebrow">Configuration</div><h1>Data access</h1><p>Requested scopes, local storage, and ESI limits.</p></div><span className={`connection-pill ${connected ? "connected" : ""}`}>{connected ? <CheckCircle2 size={16} /> : <CircleDot size={16} />}{connected ? "Character connected" : "Demo only"}</span></div>
      <div className="trust-grid">
        <div className="panel trust-card"><ShieldCheck size={24} /><h2>Write protection</h2><p>Waypoints, mail, contacts, fittings, calendar, and fleet changes require a resolved target and explicit intent.</p></div>
        <div className="panel trust-card"><Database size={24} /><h2>Local token storage</h2><p>Refresh tokens are AES-256-GCM encrypted in <code>data/eve-companion.db</code>. The browser receives an HTTP-only session cookie.</p></div>
        <div className="panel trust-card"><Lightbulb size={24} /><h2>Source notes</h2><p>Recommendations list the ESI values and rule used. Market values are estimates, not quoted sale prices.</p></div>
      </div>
      <div className="two-panels data-panels">
        <div className="panel"><div className="panel-heading"><div><div className="eyebrow">Default profile</div><h2>Personal character data</h2></div></div><ul className="permission-list">{requested.map((item) => <li key={item}><CheckCircle2 size={16} />{item}</li>)}</ul><p className="permission-note">Does not request mail, corporation management, contacts, calendar, fleet control, or fitting writes.</p></div>
        <div className="panel setup-panel"><div className="panel-heading"><div><div className="eyebrow">Local setup</div><h2>{configured ? "Configured" : "Not configured"}</h2></div></div>{configured ? <><p>EVE Client ID and encryption key found. Registered callback:</p><code>http://localhost:3000/api/auth/callback</code>{!connected && <><a className="primary-button" href="/api/auth/login?profile=recommended">Connect default profile <ChevronRight size={16} /></a><a className="secondary-access-button" href="/api/auth/login?profile=full">Connect full profile</a></>}</> : <><ol><li>Close the launcher and run it again.</li><li>Paste the Client ID from the EVE developer portal.</li><li>Restart the app.</li></ol><p className="setup-note"><AlertTriangle size={15} /> Register <code>http://localhost:3000/api/auth/callback</code> exactly.</p></>}</div>
      </div>
      <div className="panel limits-panel"><div><AlertTriangle size={21} /><span><h2>Important visibility limits</h2><p>ESI is delayed and cache-driven. It cannot see your client screen, cargo changes in real time, local chat, directional scan, hidden threats, market orders in arbitrary private structures, or intent. Treat guidance as decision support—not an autopilot or a safety guarantee.</p></span></div>{data.dataQuality.unavailable.length > 0 && <div className="missing-data"><strong>Unavailable in the latest snapshot</strong>{data.dataQuality.unavailable.map((item) => <span key={item}>{item}</span>)}</div>}</div>
    </section>
  );
}
