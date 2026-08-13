"use client";

import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Compass,
  Copy,
  Crosshair,
  HeartPulse,
  Info,
  LockKeyhole,
  Pickaxe,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { DashboardData } from "@/lib/dashboard/model";
import type { ShipCatalogResponse } from "@/lib/ships/model";
import { rankShips } from "@/lib/ships/ranking";
import { recommendFits, SHIP_TASKS, type FitRecommendation, type ShipTaskRole } from "@/lib/ships/task-planner";

const ROMAN = ["0", "I", "II", "III", "IV", "V"];
const ROLES: ShipTaskRole[] = ["Combat", "Mining", "Exploration", "Hauling", "Fleet support"];

function roleIcon(role: ShipTaskRole) {
  if (role === "Mining") return <Pickaxe size={17} />;
  if (role === "Exploration") return <Compass size={17} />;
  if (role === "Hauling") return <Truck size={17} />;
  if (role === "Fleet support") return <HeartPulse size={17} />;
  return <Crosshair size={17} />;
}

function fitChecklist(fit: FitRecommendation): string {
  return [
    `${fit.shipName} — ${fit.name}`,
    fit.summary,
    "",
    ...fit.loadout.flatMap((section) => [section.slot, ...section.items.map((item) => `- ${item}`), ""]),
    "Bring",
    ...fit.supplies.map((item) => `- ${item}`),
    "",
    "Simulate this template in EVE before buying or undocking.",
  ].join("\n");
}

function FitCard({ fit, position }: { fit: FitRecommendation; position: number }) {
  const [copied, setCopied] = useState(false);
  const blocked = fit.status === "Train hull first" || fit.status === "Hull ready; fit blocked";

  async function copy() {
    await navigator.clipboard.writeText(fitChecklist(fit));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_800);
  }

  return (
    <article className={`task-fit-card ${blocked ? "blocked" : fit.status === "Ready for task" ? "ready" : "improve"}`}>
      <header>
        <span className="fit-position">#{position}</span>
        <Image src={`https://images.evetech.net/types/${fit.ship.typeId}/render?size=128`} alt="" width={116} height={116} unoptimized />
        <div className="fit-title">
          <span>{fit.ship.group}{fit.owned ? " · You own one" : ""}</span>
          <h2>{fit.shipName}</h2>
          <p>{fit.name}</p>
        </div>
        <b>{fit.status}</b>
      </header>

      <p className="fit-summary">{fit.summary}</p>

      <div className="fit-claims">
        <span className={fit.canBoard ? "pass" : "fail"}>{fit.canBoard ? <CheckCircle2 size={15} /> : <LockKeyhole size={15} />}<small>Can board</small><strong>{fit.canBoard ? "Yes" : "No"}</strong></span>
        <span className={fit.canUseTemplate ? "pass" : "fail"}>{fit.canUseTemplate ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}<small>Template skills</small><strong>{fit.canUseTemplate ? "Usable" : `${fit.requiredGaps.length} blocked`}</strong></span>
        <span><Target size={15} /><small>Task targets</small><strong>{fit.targetsMet}/{fit.targetTotal} met</strong></span>
      </div>

      {(fit.boardingGaps.length > 0 || fit.requiredGaps.length > 0) && (
        <div className="fit-blockers">
          <strong>Before this exact template</strong>
          {fit.boardingGaps.map((gap) => <span key={`board-${gap.skillId}`}><LockKeyhole size={12} />{gap.skillName} {ROMAN[gap.current]} → {ROMAN[gap.level]} <em>board hull</em></span>)}
          {fit.requiredGaps.map((gap) => <span key={`fit-${gap.name}`}><AlertTriangle size={12} />{gap.name} {ROMAN[gap.current]} → {ROMAN[gap.required]} <em>use fit family</em></span>)}
        </div>
      )}

      <details className="fit-loadout" open={position === 1}>
        <summary><span><ClipboardCheck size={15} />Loadout template</span><ChevronDown size={15} /></summary>
        <div>
          {fit.loadout.map((section) => <section key={section.slot}><strong>{section.slot}</strong><ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></section>)}
          <section className="fit-supplies"><strong>Bring</strong><ul>{fit.supplies.map((item) => <li key={item}>{item}</li>)}</ul></section>
        </div>
        <button type="button" onClick={copy}>{copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy checklist"}</button>
      </details>

      <details className="fit-training">
        <summary><span><Target size={15} />Training behind this fit</span><small>{fit.targetsMet}/{fit.targetTotal} at recommended level</small><ChevronDown size={15} /></summary>
        <div>
          {fit.skillAssessments.map((skill) => <span className={skill.targetMet ? "complete" : skill.requiredMet ? "improve" : "missing"} key={skill.name}>
            {skill.targetMet ? <CheckCircle2 size={13} /> : skill.requiredMet ? <Target size={13} /> : <AlertTriangle size={13} />}
            <b>{skill.name}</b><small>{skill.area}</small><em>{ROMAN[skill.current]} now · {ROMAN[skill.target]} target</em>
          </span>)}
        </div>
      </details>
    </article>
  );
}

export function ShipsView({ data, connected }: { data: DashboardData; connected: boolean }) {
  const [catalog, setCatalog] = useState<ShipCatalogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState("security-l3");
  const [hullSearch, setHullSearch] = useState("");
  const [hullFilter, setHullFilter] = useState<"all" | "boardable" | "locked">("all");
  const [hullVisible, setHullVisible] = useState(60);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ships")
      .then(async (response) => {
        const body = await response.json() as ShipCatalogResponse | { error?: string };
        if (!response.ok || !("ships" in body)) throw new Error("error" in body ? body.error : "Ship catalog request failed");
        return body;
      })
      .then((result) => { if (!cancelled) setCatalog(result); })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "The ship catalog could not be loaded."); });
    return () => { cancelled = true; };
  }, [requestKey]);

  const selectedTask = SHIP_TASKS.find((task) => task.id === selectedTaskId) ?? SHIP_TASKS[0];
  const ownedShipNames = useMemo(() => new Set([data.character.shipType, ...data.assets.topItems.map((item) => item.name)]), [data.assets.topItems, data.character.shipType]);
  const fits = useMemo(() => catalog ? recommendFits(selectedTask, catalog.ships, data.skills.trained, ownedShipNames) : [], [catalog, data.skills.trained, ownedShipNames, selectedTask]);
  const allHulls = useMemo(() => rankShips(catalog?.ships ?? [], data.skills.trained), [catalog, data.skills.trained]);
  const trainedById = useMemo(() => new Map(data.skills.trained.map((skill) => [skill.skillId, skill.activeLevel])), [data.skills.trained]);
  const filteredHulls = useMemo(() => {
    const query = hullSearch.trim().toLowerCase();
    return allHulls.filter((ship) =>
      (!query || ship.name.toLowerCase().includes(query) || ship.group.toLowerCase().includes(query)) &&
      (hullFilter === "all" || (hullFilter === "boardable" && ship.canFly) || (hullFilter === "locked" && !ship.canFly)),
    );
  }, [allHulls, hullFilter, hullSearch]);

  function chooseRole(role: ShipTaskRole) {
    const first = SHIP_TASKS.find((task) => task.role === role);
    if (first) setSelectedTaskId(first.id);
  }

  return (
    <section className="page-view ships-page task-planner-page">
      <div className="page-heading ships-heading">
        <div><div className="eyebrow">Training → ship → fit → task</div><h1>What should I fly?</h1><p>Choose the job first. The companion compares usable loadout templates against the connected character&apos;s actual training.</p></div>
        <div className="heading-stat"><span>Best answer for this task</span><strong>{fits[0]?.shipName ?? "Loading…"}</strong></div>
      </div>

      {!connected && <div className="ships-demo-note"><Sparkles size={16} /><span>These answers use the fictional preview character. Connect EVE to compare the templates against the current character.</span></div>}

      {error ? (
        <div className="panel ships-error"><AlertTriangle size={24} /><h2>Ship catalog unavailable</h2><p>{error}</p><button type="button" onClick={() => { setError(null); setRequestKey((value) => value + 1); }}><RefreshCw size={15} /> Try again</button></div>
      ) : !catalog ? (
        <div className="panel ships-loading"><RefreshCw size={24} /><strong>Comparing training with New Eden&apos;s hulls</strong><span>The first load checks current boarding requirements and prepares the task fits.</span></div>
      ) : (
        <>
          <section className="panel task-picker">
            <div className="role-picker">
              <span>1 · Pick a role</span>
              <div>{ROLES.map((role) => <button type="button" className={selectedTask.role === role ? "active" : ""} onClick={() => chooseRole(role)} key={role}>{roleIcon(role)}{role}</button>)}</div>
            </div>
            <div className="task-picker-row">
              <span>2 · Pick the actual job</span>
              <div>{SHIP_TASKS.filter((task) => task.role === selectedTask.role).map((task) => <button type="button" className={task.id === selectedTask.id ? "active" : ""} onClick={() => setSelectedTaskId(task.id)} key={task.id}><strong>{task.title}</strong><small>{task.environment}</small></button>)}</div>
            </div>
          </section>

          <section className="task-brief">
            <div><span>{roleIcon(selectedTask.role)}{selectedTask.role} · {selectedTask.environment}</span><h2>{selectedTask.title}</h2><p>{selectedTask.description}</p></div>
            <aside><AlertTriangle size={17} /><span><strong>Before undocking</strong><small>{selectedTask.caution}</small></span></aside>
          </section>

          <div className="fit-answer-heading"><div><div className="eyebrow">Best trained answers</div><h2>Ship and loadout recommendations</h2></div><span><ShieldCheck size={14} /> Ranked for this character and task</span></div>
          <section className="task-fit-grid">{fits.map((fit, index) => <FitCard fit={fit} position={index + 1} key={fit.id} />)}</section>

          <div className="fit-verification-note"><Info size={15} /><span><strong>These are starter templates, not magic fits.</strong> “Usable” means the character meets the minimum skill families represented here. Before spending ISK, import or reproduce the template in EVE&apos;s fitting simulator and check CPU, power grid, capacitor, damage, tank, range, and ammunition for the exact modules chosen.</span></div>

          <details className="panel all-hulls-panel">
            <summary><span><div className="eyebrow">Reference library</div><h2>Browse all {allHulls.length} hulls</h2><small>This section answers only “can I board it?”—not whether it is good for a task.</small></span><ChevronDown size={17} /></summary>
            <div className="all-hull-controls">
              <label><Search size={14} /><input value={hullSearch} onChange={(event) => { setHullSearch(event.target.value); setHullVisible(60); }} placeholder="Search hull or class…" /></label>
              <div>{(["all", "boardable", "locked"] as const).map((filter) => <button type="button" className={hullFilter === filter ? "active" : ""} onClick={() => { setHullFilter(filter); setHullVisible(60); }} key={filter}>{filter === "all" ? "All hulls" : filter === "boardable" ? "Can board" : "Training required"}</button>)}</div>
              <span>{filteredHulls.length} matches</span>
            </div>
            <div className="all-hull-list">
              {filteredHulls.slice(0, hullVisible).map((ship) => <article key={ship.typeId}>
                <Image src={`https://images.evetech.net/types/${ship.typeId}/icon?size=64`} alt="" width={38} height={38} unoptimized />
                <span><strong>{ship.name}</strong><small>{ship.group} · {ship.size}</small></span>
                <div>{ship.requirements.map((requirement) => { const current = trainedById.get(requirement.skillId) ?? 0; return <span className={current >= requirement.level ? "met" : "missing"} key={requirement.skillId}>{requirement.skillName} {ROMAN[current]}/{ROMAN[requirement.level]}</span>; })}</div>
                <b className={ship.canFly ? "yes" : "no"}>{ship.canFly ? <CheckCircle2 size={13} /> : <LockKeyhole size={13} />}{ship.canFly ? "Can board" : "Locked"}</b>
              </article>)}
            </div>
            {hullVisible < filteredHulls.length && <button className="ships-show-more" type="button" onClick={() => setHullVisible((value) => value + 60)}>Show more hulls <ChevronDown size={15} /></button>}
          </details>
        </>
      )}
    </section>
  );
}
