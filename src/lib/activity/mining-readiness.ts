import type { TrainedSkillView } from "@/lib/dashboard/model";
import { buildReadinessSnapshot, type ReadinessFinding, type ReadinessSnapshot } from "@/lib/readiness/model";
import type { ShipCatalogEntry } from "@/lib/ships/model";
import { MINING_TASKS } from "@/lib/ships/mining-fits";
import { recommendFits, type FitRecommendation, type FitSkillAssessment, type ShipTask } from "@/lib/ships/task-planner";

export type MiningSupplyState = "available" | "missing" | "unknown";
export type MiningLocationState = "reachable" | "unreachable" | "unknown";

export interface MiningSupplyEvidence { label: string; state: MiningSupplyState; detail?: string }
export interface MiningLocationEvidence { state: MiningLocationState; label?: string; detail?: string }

export interface MiningReadinessInput {
  taskId: string;
  catalog: readonly ShipCatalogEntry[];
  trained: readonly TrainedSkillView[];
  ownedShipNames: ReadonlySet<string>;
  supplies?: readonly MiningSupplyEvidence[];
  location?: MiningLocationEvidence;
  goalReasons?: readonly string[];
}

export interface MiningReadinessAssessment {
  task: ShipTask;
  recommendedFit: FitRecommendation | null;
  alternatives: readonly FitRecommendation[];
  processingSkills: readonly FitSkillAssessment[];
  goalReasons: readonly string[];
  readiness: ReadinessSnapshot;
  nextAction: string;
  notes: readonly string[];
}

const CCP_MINING_SOURCE = "https://support.eveonline.com/hc/en-us/articles/23655785488668-Introduction-to-Mining";

function key(value: string): string { return value.trim().toLowerCase(); }

function supplyFor(label: string, evidence?: readonly MiningSupplyEvidence[]): MiningSupplyEvidence {
  return evidence?.find((entry) => key(entry.label) === key(label)) ?? { label, state: "unknown" };
}

function fitAndSkillFindings(fit: FitRecommendation | null): ReadinessFinding[] {
  if (!fit) return [{
    id: "mining-fit-unresolved", dimension: "ship-fit", requirement: "hard", state: "unknown",
    summary: "No mining fit can be mapped to the current ship catalog.",
    why: "A known hull is required before NEC can verify boarding and fit-skill requirements.",
  }];

  const findings: ReadinessFinding[] = [{
    id: "mining-fit", dimension: "ship-fit", requirement: "hard",
    state: fit.canUseTemplate ? "met" : "unmet",
    summary: fit.canUseTemplate
      ? `${fit.shipName} and the recommended fit are usable.`
      : fit.canBoard ? `${fit.shipName} is boardable, but the fit is not fully usable yet.` : `${fit.shipName} cannot be boarded yet.`,
    why: fit.canUseTemplate ? "Hull and required fit skills are met." : fit.status,
    evidence: [{ source: "derived", label: fit.name }],
  }];

  if (fit.requiredGaps.length === 0) findings.push({
    id: "mining-required-skills", dimension: "skills", requirement: "hard", state: "met",
    summary: "Required mining and fit skills are met.", why: "No required skill in the selected template is below its minimum level.",
  });
  else for (const gap of fit.requiredGaps) findings.push({
    id: `mining-skill-${key(gap.name).replace(/[^a-z0-9]+/g, "-")}`,
    dimension: "skills", requirement: "hard", state: "unmet",
    summary: `${gap.name} ${gap.required} is required.`,
    why: `Current level ${gap.current}; required by ${fit.name}.`,
    evidence: [{ source: "derived", label: `${gap.name} ${gap.current}/${gap.required}` }],
  });

  const improvements = fit.targetGaps.filter((gap) => gap.requiredMet);
  if (improvements.length) findings.push({
    id: "mining-support-targets", dimension: "skills", requirement: "soft", state: "caution",
    summary: `${improvements.length} support-skill target${improvements.length === 1 ? " is" : "s are"} below the recommended level.`,
    why: improvements.map((gap) => `${gap.name} ${gap.current}/${gap.target}`).join(", "),
  });
  return findings;
}

function supplyFindings(fit: FitRecommendation | null, evidence?: readonly MiningSupplyEvidence[]): ReadinessFinding[] {
  if (!fit) return [];
  return fit.supplies.map((label, index) => {
    const item = supplyFor(label, evidence);
    return {
      id: `mining-supply-${index + 1}`, dimension: "supplies", requirement: "soft",
      state: item.state === "available" ? "met" : item.state === "missing" ? "unmet" : "unknown",
      summary: item.state === "available" ? `${label} is accounted for.` : item.state === "missing" ? `${label} is missing.` : `${label} has not been verified.`,
      why: item.detail ?? "Supply state stays unknown unless reliable inventory evidence is provided.",
    };
  });
}

function locationFinding(task: ShipTask, location?: MiningLocationEvidence): ReadinessFinding {
  const state = location?.state ?? "unknown";
  return {
    id: "mining-location", dimension: "location-access", requirement: "hard",
    state: state === "reachable" ? "met" : state === "unreachable" ? "unmet" : "unknown",
    summary: state === "reachable" ? `A location for ${task.title} is reachable.` : state === "unreachable" ? `The supplied location for ${task.title} is not reachable.` : `A reachable location for ${task.title} has not been established.`,
    why: location?.detail ?? `Expected environment: ${task.environment}. NEC does not infer a live asteroid or site from ESI.`,
    evidence: location?.label ? [{ source: "user", label: location.label }] : undefined,
  };
}

function contextFindings(task: ShipTask, reasons: readonly string[]): ReadinessFinding[] {
  const goal: ReadinessFinding = reasons.length ? {
    id: "mining-goal", dimension: "knowledge-preparation", requirement: "context", state: "met",
    summary: "The selected resource has a supplied goal reason.", why: reasons.join(" · "),
    evidence: reasons.map((reason) => ({ source: "user" as const, label: reason })),
  } : {
    id: "mining-goal", dimension: "knowledge-preparation", requirement: "context", state: "unknown",
    summary: "No active goal explains why this resource is needed.",
    why: "NEC will not invent goal relevance; the mining task can still be evaluated independently.",
  };
  const briefing: ReadinessFinding = {
    id: "mining-briefing", dimension: "knowledge-preparation", requirement: "context", state: "met",
    summary: "Mining setup guidance is available for this resource task.", why: task.caution,
    evidence: [{ source: "curated", label: "CCP Introduction to Mining", detail: CCP_MINING_SOURCE }],
  };
  return [goal, briefing];
}

function nextAction(task: ShipTask, fit: FitRecommendation | null, supplies?: readonly MiningSupplyEvidence[], location?: MiningLocationEvidence): string {
  if (!fit) return "Refresh ship data so NEC can map this mining task to a known hull.";
  const boarding = fit.boardingGaps[0];
  if (!fit.canBoard && boarding) return `Train ${boarding.skillName} ${boarding.level} to board ${fit.shipName}.`;
  const skill = fit.requiredGaps[0];
  if (skill) return `Train ${skill.name} ${skill.required} to use ${fit.name}.`;
  const missing = fit.supplies.map((label) => supplyFor(label, supplies)).find((item) => item.state === "missing");
  if (missing) return `Get ${missing.label} before starting this mining run.`;
  const unknown = fit.supplies.map((label) => supplyFor(label, supplies)).find((item) => item.state === "unknown");
  if (unknown) return `Verify ${unknown.label} before starting this mining run.`;
  if (!location || location.state === "unknown") return `Confirm a reachable location for ${task.title}.`;
  if (location.state === "unreachable") return `Choose or reach a location that provides ${task.title}.`;
  return `Use ${fit.shipName} with ${fit.name} for ${task.title}.`;
}

export function assessMiningReadiness(input: MiningReadinessInput): MiningReadinessAssessment {
  const task = MINING_TASKS.find((candidate) => candidate.id === input.taskId);
  if (!task) throw new Error(`Unknown mining task: ${input.taskId}`);
  const recommendations = recommendFits(task, [...input.catalog], [...input.trained], new Set(input.ownedShipNames));
  const recommendedFit = recommendations[0] ?? null;
  const goalReasons = [...new Set((input.goalReasons ?? []).map((reason) => reason.trim()).filter(Boolean))];
  const findings = [
    ...fitAndSkillFindings(recommendedFit),
    ...supplyFindings(recommendedFit, input.supplies),
    locationFinding(task, input.location),
    ...contextFindings(task, goalReasons),
  ];
  return {
    task,
    recommendedFit,
    alternatives: recommendations.slice(1),
    processingSkills: recommendedFit?.skillAssessments.filter((skill) => /processing$/i.test(skill.name)) ?? [],
    goalReasons,
    readiness: buildReadinessSnapshot(findings),
    nextAction: nextAction(task, recommendedFit, input.supplies, input.location),
    notes: [
      `Resource context: ${task.description}`,
      "Fit readiness reuses the existing mining catalog and task-planner skill/hull evaluation.",
      "Supply and location state remain unknown until reliable evidence is provided; NEC does not claim live belt/site awareness.",
    ],
  };
}
