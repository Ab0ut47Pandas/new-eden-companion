import { ArrowLeft, CheckCircle2, Circle, ExternalLink, Search, Target } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import { getSession } from "@/lib/auth/session-store";
import { validAccessToken } from "@/lib/auth/sso";
import { buildRequirementAcquisitionPlan, type RequirementAcquisitionPlan } from "@/lib/goals/acquisition-choices";
import { buildGoalChecklist } from "@/lib/goals/goal-checklist";
import { buildOwnedFirstGoalPlan, type OwnedFirstGoalPlan } from "@/lib/goals/owned-first-plan";
import { getGoalStore, type SavedGoal } from "@/lib/goals/store";
import { loadCharacterAssetCoverage } from "@/lib/player/asset-coverage";
import { loadCharacterSkillReadiness } from "@/lib/player/skill-readiness";
import { getRecursiveManufacturingDependencies, searchStaticItems, staticDatabaseAvailable } from "@/lib/sde/database";

import {
  addGoalStepAction,
  saveActivityGoalAction,
  saveFittingGoalAction,
  saveItemGoalAction,
  setGoalCompletedAction,
  setGoalStepCompletedAction,
} from "./actions";
import { GoalChecklistSummary } from "./goal-checklist-summary";
import styles from "../items/item-explorer.module.css";

export const dynamic = "force-dynamic";

interface GoalsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type GoalCoveragePlan = ReturnType<typeof buildOwnedFirstGoalPlan>;

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

async function viewer(): Promise<{ characterId: number; characterName: string; token: string } | null> {
  const sessionId = (await cookies()).get("eve_session")?.value;
  if (!sessionId) return null;
  const session = getSession(sessionId);
  if (!session) return null;
  try {
    return { characterId: session.characterId, characterName: session.characterName, token: await validAccessToken(session) };
  } catch {
    return { characterId: session.characterId, characterName: session.characterName, token: "" };
  }
}

function progressLabel(goal: SavedGoal): string {
  if (goal.steps.length === 0) return "No manual checklist yet";
  const complete = goal.steps.filter((step) => step.completed).length;
  return `${complete}/${goal.steps.length} checklist steps complete`;
}

function semanticGoalKind(goal: SavedGoal): "activity" | "ship" | "fitting" | "skill" | "item" {
  if (goal.targetKey.startsWith("ship:type:")) return "ship";
  if (goal.targetKey.startsWith("skill:type:")) return "skill";
  if (goal.targetKey.startsWith("fitting:")) return "fitting";
  return goal.kind;
}

function skillGoalLevel(goal: SavedGoal): number {
  const match = goal.targetKey.match(/:level:([1-5])$/);
  return match ? Number(match[1]) : 1;
}

function requirementSummary(plan: GoalCoveragePlan | null): string {
  if (!plan) return "Dependency details are not established for this goal yet.";
  if (plan.unknown.length > 0) return `${plan.unknown.length} requirement${plan.unknown.length === 1 ? "" : "s"} cannot be verified yet.`;
  if (plan.uncovered.length > 0) return `${plan.uncovered.length} requirement${plan.uncovered.length === 1 ? "" : "s"} remain uncovered after reusing what you already have.`;
  if (plan.covered.length > 0) return "The currently established requirements are already covered.";
  return "No structured requirements have been established for this goal yet.";
}

function GoalCard({ goal, plan, acquisitionPlans }: { goal: SavedGoal; plan: GoalCoveragePlan | null; acquisitionPlans: readonly RequirementAcquisitionPlan[] }) {
  const semanticKind = semanticGoalKind(goal);
  const checklist = plan ? buildGoalChecklist(plan, acquisitionPlans) : null;
  return (
    <article className={styles.infoCard}>
      <div className={styles.resultTop}>
        <span className={goal.status === "completed" ? styles.kindPill : styles.pill}>{goal.status}</span>
        <span className={styles.mutedPill}>{semanticKind}</span>
      </div>
      <h3>{goal.targetTypeId ? <Link className={styles.itemLink} href={`/items/${goal.targetTypeId}`}>{goal.title} <ExternalLink size={12} /></Link> : goal.title}</h3>
      <p className={styles.description}>{progressLabel(goal)}</p>
      {checklist && <GoalChecklistSummary checklist={checklist} />}
      <details className={styles.terminal}>
        <summary><strong>Dependency details</strong> - owned/trained coverage, acquisition choices, and evidence</summary>
        <div className={styles.alternatives}>
          <strong>Owned/trained first:</strong> {requirementSummary(plan)}
          {plan && plan.covered.length > 0 && <ul className={styles.skillList}>{plan.covered.map((entry) => <li key={entry.requirement.id}>Covered - {entry.requirement.title}: {entry.explanation}</li>)}</ul>}
          {plan && plan.uncovered.length > 0 && <ul className={styles.skillList}>{plan.uncovered.map((entry) => <li key={entry.requirement.id}>Uncovered - {entry.requirement.title}: {entry.explanation}</li>)}</ul>}
          {plan && plan.unknown.length > 0 && <ul className={styles.skillList}>{plan.unknown.map((entry) => <li key={entry.requirement.id}>Cannot verify - {entry.requirement.title}: {entry.explanation}</li>)}</ul>}
          {acquisitionPlans.length > 0 && (
            <div className={styles.alternatives}>
              <strong>Acquire or train:</strong>
              <ul className={styles.skillList}>{acquisitionPlans.map((acquisition) => (
                <li key={acquisition.coverage.requirement.id}>
                  <strong>{acquisition.coverage.requirement.title}</strong> - because {acquisition.coverage.requirement.reason}
                  {acquisition.trainingMilestone && <div className={styles.description}>Shortest usable training milestone: level {acquisition.trainingMilestone.shortestUsableLevel} (currently {acquisition.trainingMilestone.trainedLevel}).{acquisition.trainingMilestone.optionalOptimizationLevels.length > 0 ? ` Optional optimization after that: levels ${acquisition.trainingMilestone.optionalOptimizationLevels.join(", ")}.` : " No higher optimization level is available."}</div>}
                  {acquisition.choices.length > 0 && <ul className={styles.skillList}>{acquisition.choices.map((choice, index) => <li key={`${choice.kind}:${choice.label}:${index}`}>{choice.label} - {choice.reason} {choice.provenance.length > 0 ? `Evidence: ${choice.provenance.join("; ")}.` : ""}</li>)}</ul>}
                </li>
              ))}</ul>
            </div>
          )}
          {(semanticKind === "activity" || semanticKind === "fitting") && !plan && <p className={styles.description}>NEC will not invent a dependency list from a free-text activity or fitting name. A structured activity or selected/imported fit must supply the actual requirements first.</p>}
        </div>
      </details>
      <div className={styles.alternatives}>
        {goal.steps.length === 0 ? <div className={styles.terminal}>Manual checklist steps remain optional and separate from the NEC evidence-backed compact path.</div> : (
          <ul className={styles.skillList}>{goal.steps.map((step) => (
            <li key={step.id}><form action={setGoalStepCompletedAction}><input type="hidden" name="goalId" value={goal.id} /><input type="hidden" name="stepId" value={step.id} /><input type="hidden" name="completed" value={step.completed ? "false" : "true"} /><button className={styles.secondaryLink} type="submit">{step.completed ? <CheckCircle2 size={15} /> : <Circle size={15} />}{step.label}</button></form></li>
          ))}</ul>
        )}
        <form className={styles.searchForm} action={addGoalStepAction}><input type="hidden" name="goalId" value={goal.id} /><label className={styles.searchBox}><input type="text" name="label" placeholder="Add a checklist step..." maxLength={240} aria-label={`Add checklist step for ${goal.title}`} /></label><button className={styles.searchButton} type="submit">Add step</button></form>
        <form action={setGoalCompletedAction}><input type="hidden" name="goalId" value={goal.id} /><input type="hidden" name="completed" value={goal.status === "completed" ? "false" : "true"} /><button className={styles.secondaryLink} type="submit">{goal.status === "completed" ? <Circle size={15} /> : <CheckCircle2 size={15} />}{goal.status === "completed" ? "Reopen goal" : "Mark goal complete"}</button></form>
      </div>
    </article>
  );
}

export default async function GoalsPage({ searchParams }: GoalsPageProps) {
  const params = await searchParams;
  const itemQuery = single(params.item).trim();
  const current = await viewer();
  const goals = current ? getGoalStore().listGoals(current.characterId) : [];
  const activeGoals = goals.filter((goal) => goal.status === "active");
  const completedGoals = goals.filter((goal) => goal.status === "completed");
  const itemResults = current && itemQuery && staticDatabaseAvailable() ? searchStaticItems(itemQuery, { limit: 12 }).filter((item) => !item.isPlaceholder) : [];
  const [assetCoverage, skillCoverage] = current && current.token ? await Promise.all([loadCharacterAssetCoverage(current.characterId, current.token), loadCharacterSkillReadiness(current.characterId, current.token)]) : [null, null];
  const ownedItems = assetCoverage?.visibility === "available" ? [...assetCoverage.byType.values()].map((entry) => ({ typeId: entry.typeId, accessibleQuantity: entry.knownLocationQuantity, inaccessibleQuantity: entry.unknownLocationQuantity })) : null;
  const trainedSkills = skillCoverage?.visibility === "available" ? [...skillCoverage.bySkill.values()].map((entry) => ({ typeId: entry.skillTypeId, trainedLevel: entry.trainedLevel })) : null;
  const plans = new Map<string, OwnedFirstGoalPlan>();
  const acquisitionPlansByGoal = new Map<string, RequirementAcquisitionPlan[]>();
  for (const goal of goals) {
    const semanticKind = semanticGoalKind(goal);
    if (!goal.targetTypeId || (semanticKind !== "ship" && semanticKind !== "skill")) continue;
    const requirements = semanticKind === "ship" ? [{ id: `hull:${goal.targetTypeId}`, kind: "hull" as const, title: goal.title, reason: "This hull is the selected ship goal.", typeId: goal.targetTypeId, quantity: 1 }] : [{ id: `skill:${goal.targetTypeId}`, kind: "skill" as const, title: goal.title, reason: "This trained skill level is the selected skill goal.", typeId: goal.targetTypeId, requiredLevel: skillGoalLevel(goal) }];
    const plan = buildOwnedFirstGoalPlan({ goal: { kind: semanticKind, key: goal.targetKey, title: goal.title, typeId: goal.targetTypeId }, requirements, ownedItems, trainedSkills, ownershipProvenance: assetCoverage?.visibility === "available" ? ["ESI character assets"] : ["ESI character assets unavailable"], skillProvenance: skillCoverage?.visibility === "available" ? ["ESI character skills"] : ["ESI character skills unavailable"] });
    plans.set(goal.id, plan);
    const acquisitionPlans = [...plan.unknown, ...plan.uncovered].map((coverage) => {
      if (coverage.requirement.kind === "skill") return buildRequirementAcquisitionPlan(coverage);
      if (coverage.status === "unknown" || !coverage.requirement.typeId || !staticDatabaseAvailable()) return buildRequirementAcquisitionPlan(coverage);
      const dependency = getRecursiveManufacturingDependencies(coverage.requirement.typeId, { maxDepth: 1 });
      const sourceResolution = dependency.state === "manufacturable" ? { typeId: coverage.requirement.typeId, manufacturingBoundary: "ordinary-blueprint-available" as const, sourceState: "unknown" as const, sources: [] } : dependency.sourceResolution ?? (dependency.state === "unknown-type" ? { typeId: coverage.requirement.typeId, manufacturingBoundary: "unknown-type" as const, sourceState: "unknown" as const, sources: [] } : null);
      return buildRequirementAcquisitionPlan(coverage, { sourceResolution });
    });
    acquisitionPlansByGoal.set(goal.id, acquisitionPlans);
  }

  return (
    <main className={styles.shell}><div className={styles.container}>
      <div className={styles.topbar}><Link className={styles.backLink} href="/"><ArrowLeft size={15} /> Back to companion</Link><Link className={styles.secondaryLink} href="/items"><Target size={15} /> Item Explorer</Link></div>
      <section className={styles.hero}><div className={styles.eyebrow}>Focused beta goal planning</div><h1>Goals & plans</h1><p>Choose an activity, ship, fitting, or skill goal. NEC reuses established owned/trained requirements first and keeps unknown ownership separate from genuinely missing parts.</p></section>
      {!current ? <div className={styles.notice}>Connect an EVE character first. Goals are stored per character so progress does not bleed between alts.</div> : <>
        <div className={styles.notice}>Showing goals for {current.characterName}. Asset and skill coverage comes from authorized ESI data when available; inaccessible or unavailable state is not silently treated as missing.</div>
        <section className={styles.section}><div className={styles.sectionHeader}><div><div className={styles.eyebrow}>Ship or skill</div><h2>Choose a resolved EVE target</h2></div><p>Search the installed CCP static database. Ship and skill targets retain their exact type identity.</p></div>
          <form className={styles.searchForm} action="/goals" method="get"><label className={styles.searchBox}><Search size={17} aria-hidden="true" /><input type="search" name="item" defaultValue={itemQuery} placeholder="Rifter, Minmatar Frigate..." aria-label="Search ship or skill goals" /></label><button className={styles.searchButton} type="submit">Find target</button></form>
          {itemQuery && !staticDatabaseAvailable() && <div className={styles.error}>Static EVE data is unavailable, so NEC cannot safely resolve that goal target.</div>}
          {itemQuery && staticDatabaseAvailable() && itemResults.length === 0 && <div className={styles.emptyState}><strong>No matching item found.</strong>Try the exact name or a broader group/category.</div>}
          {itemResults.length > 0 && <div className={styles.results}>{itemResults.map((item) => <article className={styles.infoCard} key={item.typeId}><div className={styles.resultTop}>{item.kinds.map((kind) => <span className={styles.kindPill} key={kind}>{kind}</span>)}</div><h3><Link className={styles.itemLink} href={`/items/${item.typeId}`}>{item.name ?? `Type ${item.typeId}`}</Link></h3><p className={styles.description}>{item.categoryName ?? "Unknown category"} · {item.groupName ?? "Unknown group"} · Type {item.typeId}</p>{item.kinds.includes("ship") && <form action={saveItemGoalAction}><input type="hidden" name="typeId" value={item.typeId} /><input type="hidden" name="goalKind" value="ship" /><button className={styles.secondaryLink} type="submit"><Target size={15} /> Choose ship goal</button></form>}{item.kinds.includes("skill") && <form className={styles.searchForm} action={saveItemGoalAction}><input type="hidden" name="typeId" value={item.typeId} /><input type="hidden" name="goalKind" value="skill" /><label className={styles.searchBox}>Target level <select name="level" defaultValue="1" aria-label={`Target level for ${item.name ?? `Type ${item.typeId}`}`}><option value="1">I</option><option value="2">II</option><option value="3">III</option><option value="4">IV</option><option value="5">V</option></select></label><button className={styles.secondaryLink} type="submit"><Target size={15} /> Choose skill goal</button></form>}</article>)}</div>}
        </section>
        <section className={styles.section}><div className={styles.sectionHeader}><div><div className={styles.eyebrow}>Activity</div><h2>Choose an activity goal</h2></div><p>Use an existing NEC activity direction; a free-text name does not authorize NEC to invent requirements.</p></div><form className={styles.searchForm} action={saveActivityGoalAction}><label className={styles.searchBox}><Target size={17} aria-hidden="true" /><input type="text" name="title" placeholder="Learn exploration, run T1 Abyssals..." maxLength={160} aria-label="Activity goal" /></label><button className={styles.searchButton} type="submit">Choose activity goal</button></form></section>
        <section className={styles.section}><div className={styles.sectionHeader}><div><div className={styles.eyebrow}>Fitting</div><h2>Choose a fitting goal</h2></div><p>Name the fit you want to assemble. NEC will only materialize modules, rigs, charges, drones, and consumables after a structured fit supplies those exact requirements.</p></div><form className={styles.searchForm} action={saveFittingGoalAction}><label className={styles.searchBox}><Target size={17} aria-hidden="true" /><input type="text" name="title" placeholder="Rifter brawl fit..." maxLength={160} aria-label="Fitting goal" /></label><button className={styles.searchButton} type="submit">Choose fitting goal</button></form><Link className={styles.secondaryLink} href="/fitting">Open Fitting Builder <ExternalLink size={12} /></Link></section>
        <section className={styles.section}><div className={styles.sectionHeader}><div><div className={styles.eyebrow}>In progress</div><h2>Active goals</h2></div><p>{activeGoals.length} active goal{activeGoals.length === 1 ? "" : "s"}</p></div>{activeGoals.length === 0 ? <div className={styles.emptyState}><strong>No active goals yet.</strong>Choose an activity, ship, fitting, or skill above.</div> : <div className={styles.results}>{activeGoals.map((goal) => <GoalCard goal={goal} plan={plans.get(goal.id) ?? null} acquisitionPlans={acquisitionPlansByGoal.get(goal.id) ?? []} key={goal.id} />)}</div>}</section>
        {completedGoals.length > 0 && <section className={styles.section}><div className={styles.sectionHeader}><div><div className={styles.eyebrow}>History</div><h2>Completed goals</h2></div><p>{completedGoals.length} completed</p></div><div className={styles.results}>{completedGoals.map((goal) => <GoalCard goal={goal} plan={plans.get(goal.id) ?? null} acquisitionPlans={acquisitionPlansByGoal.get(goal.id) ?? []} key={goal.id} />)}</div></section>}
      </>}
    </div></main>
  );
}
