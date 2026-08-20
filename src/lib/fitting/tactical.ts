import type { FittingCoreResult } from "./core";
import type { FitCombatRole, FitIdentityResult, FitTankRole } from "./identity";
import type { FitWeaknessFinding, FitWeaknessResult } from "./weakness";

export interface TacticalExplanationCard {
  id: string;
  title: string;
  summary: string;
  why: string[];
  evidence: string[];
  tone: "info" | "caution" | "warning";
}

export interface FitTacticalBriefing {
  headline: string;
  whatThisFitWants: TacticalExplanationCard[];
  howToFlyIt: TacticalExplanationCard[];
  whatRuinsItsPlan: TacticalExplanationCard[];
  unknowns: string[];
  provenance: string[];
}

export interface FitTacticalBriefingInput {
  identity: FitIdentityResult;
  weaknesses: FitWeaknessResult;
  fitting?: FittingCoreResult | null;
  provenance: readonly string[];
}

const ROLE_LABELS: Record<FitCombatRole, string> = {
  brawler: "Brawler",
  "scram-kiter": "Scram-kiter",
  kiter: "Kiter",
  sniper: "Sniper",
  tackle: "Tackle",
  ewar: "EWAR",
  neut: "Cap warfare",
  logi: "Logistics",
  other: "Unclassified",
};

const TANK_LABELS: Record<FitTankRole, string> = {
  active: "active tank",
  buffer: "buffer tank",
  passive: "passive-recharge tank",
  hybrid: "hybrid tank",
  unknown: "unknown tank style",
};

function roleGuidance(role: FitCombatRole): Pick<TacticalExplanationCard, "title" | "summary"> {
  switch (role) {
    case "brawler":
      return { title: "Close-range pressure", summary: "The supported role evidence points toward fighting inside the fit's established short-range control envelope." };
    case "scram-kiter":
      return { title: "Scram-kite envelope", summary: "The supported role evidence points toward fighting outside the established web envelope while remaining inside the established scram envelope." };
    case "kiter":
      return { title: "Long-point range control", summary: "The supported role evidence points toward fighting outside the established short-tackle envelope while remaining inside the fit's established disruptor envelope." };
    case "sniper":
      return { title: "Stand-off damage", summary: "The supported role evidence places the preferred weapon range beyond the fit's established tackle envelope." };
    case "tackle":
      return { title: "Hold the target", summary: "Supported warp-tackle evidence is present, so preventing escape is one established capability of the fit." };
    case "ewar":
      return { title: "Electronic warfare", summary: "Supported EWAR evidence is present; the exact effect and target interaction must come from separately validated module data." };
    case "neut":
      return { title: "Capacitor pressure", summary: "Supported neutralizer evidence is present; NEC does not assume the opponent's capacitor state or a guaranteed shutdown." };
    case "logi":
      return { title: "Remote support", summary: "Supported remote-repair evidence is present; this establishes a support capability, not fleet context or a guaranteed survival outcome." };
    case "other":
      return { title: "Role not established", summary: "Current evidence does not establish a more specific tactical identity for this fit." };
  }
}

function roleCard(identity: FitIdentityResult): TacticalExplanationCard {
  const role = identity.primaryCombatRole ?? "other";
  const guidance = roleGuidance(role);
  const scoreEntry = identity.combatRoles.find((entry) => entry.role === role);
  return {
    id: `role-${role}`,
    title: guidance.title,
    summary: guidance.summary,
    why: scoreEntry?.reasons.map((reason) => reason.summary) ?? ["No single supported role won the classifier without a tie or evidence gap."],
    evidence: scoreEntry?.reasons.map((reason) => `${reason.code}: weight ${reason.weight}`) ?? [],
    tone: role === "other" ? "caution" : "info",
  };
}

function tankCard(identity: FitIdentityResult): TacticalExplanationCard | null {
  if (identity.tankRole === "unknown") return null;
  return {
    id: `tank-${identity.tankRole}`,
    title: `Supported ${TANK_LABELS[identity.tankRole]}`,
    summary: `The classifier has enough explicit evidence to describe this as a ${TANK_LABELS[identity.tankRole]}.`,
    why: identity.tankReasons.length ? identity.tankReasons : ["Tank style was established from supported fit evidence."],
    evidence: [],
    tone: "info",
  };
}

function rangeCard(fitting: FittingCoreResult | null | undefined): TacticalExplanationCard | null {
  if (!fitting) return null;
  const evidence: string[] = [];
  const optimal = fitting.metrics.optimalRange;
  const falloff = fitting.metrics.falloffRange;
  const missile = fitting.metrics.missileRange;
  if (typeof optimal === "number") evidence.push(`Modeled turret optimal: ${Math.round(optimal).toLocaleString()} m`);
  if (typeof falloff === "number") evidence.push(`Modeled turret falloff: ${Math.round(falloff).toLocaleString()} m`);
  if (typeof missile === "number") evidence.push(`Modeled missile range primitive: ${Math.round(missile).toLocaleString()} m`);
  if (evidence.length === 0) return null;
  return {
    id: "modeled-weapon-envelope",
    title: "Use the modeled weapon envelope as a reference",
    summary: "The deterministic calculator establishes raw range primitives, but those numbers do not by themselves establish the correct tactical range against a specific target.",
    why: ["Target speed, signature, angular motion, tackle, application, and live positioning are separate facts. NEC does not convert raw range statistics into a guaranteed engagement plan."],
    evidence,
    tone: "info",
  };
}

function validityCard(fitting: FittingCoreResult | null | undefined): TacticalExplanationCard | null {
  if (!fitting || fitting.fitValid !== false) return null;
  return {
    id: "invalid-modeled-fit",
    title: "Fix modeled fitting legality first",
    summary: "The deterministic fitting core marks this fit invalid for at least one modeled fitting check.",
    why: fitting.legality.issues.length ? fitting.legality.issues.map((issue) => issue.summary) : ["At least one modeled resource or legality check failed."],
    evidence: fitting.legality.issues.map((issue) => issue.code),
    tone: "warning",
  };
}

function weaknessCard(finding: FitWeaknessFinding): TacticalExplanationCard {
  return {
    id: `weakness-${finding.code}`,
    title: finding.summary,
    summary: finding.why,
    why: [finding.why],
    evidence: finding.evidence,
    tone: finding.severity,
  };
}

export function buildFitTacticalBriefing(input: FitTacticalBriefingInput): FitTacticalBriefing {
  if (input.provenance.length === 0) throw new Error("Tactical briefing requires provenance");

  const whatThisFitWants = [roleCard(input.identity)];
  const tank = tankCard(input.identity);
  if (tank) whatThisFitWants.push(tank);

  const howToFlyIt: TacticalExplanationCard[] = [];
  const range = rangeCard(input.fitting);
  if (range) howToFlyIt.push(range);
  if (input.identity.primaryCombatRole && input.identity.primaryCombatRole !== "other") {
    howToFlyIt.unshift({
      id: "follow-supported-role",
      title: `Fly around the supported ${ROLE_LABELS[input.identity.primaryCombatRole].toLowerCase()} plan`,
      summary: roleGuidance(input.identity.primaryCombatRole).summary,
      why: input.identity.combatRoles.find((entry) => entry.role === input.identity.primaryCombatRole)?.reasons.map((reason) => reason.summary) ?? [],
      evidence: [],
      tone: "info",
    });
  }
  if (howToFlyIt.length === 0) {
    howToFlyIt.push({
      id: "flight-plan-unknown",
      title: "Flight plan not established",
      summary: "The currently modeled evidence is not enough to tell you a specific engagement range or maneuver plan without guessing.",
      why: ["FIT-06 only translates supported FIT-02/FIT-04/FIT-05 evidence. It does not infer live target state or unsupported module behavior."],
      evidence: [],
      tone: "caution",
    });
  }

  const whatRuinsItsPlan = input.weaknesses.findings.map(weaknessCard);
  const invalid = validityCard(input.fitting);
  if (invalid) whatRuinsItsPlan.unshift(invalid);
  if (whatRuinsItsPlan.length === 0) {
    whatRuinsItsPlan.push({
      id: "no-supported-contradiction",
      title: "No supported contradiction detected",
      summary: "The current rule set did not establish a specific weakness from the evidence it received. That is not a claim that the fit is safe, optimal, or favored in a matchup.",
      why: ["Unknown target state and unsupported mechanics remain outside the conclusion."],
      evidence: [],
      tone: "info",
    });
  }

  const unknowns = [...new Set([
    ...input.identity.unknowns,
    ...input.weaknesses.unknowns,
    ...(input.fitting?.fitValid == null ? ["overall fitting validity is not fully established"] : []),
  ])].sort();
  const provenance = [...new Set([...input.provenance, ...input.identity.provenance, ...input.weaknesses.provenance])];
  const headlineRole = input.identity.primaryCombatRole ? ROLE_LABELS[input.identity.primaryCombatRole] : "Mixed / unresolved role";

  return {
    headline: `${headlineRole} - ${TANK_LABELS[input.identity.tankRole]}`,
    whatThisFitWants,
    howToFlyIt,
    whatRuinsItsPlan,
    unknowns,
    provenance,
  };
}
