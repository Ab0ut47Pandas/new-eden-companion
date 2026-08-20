import type { AcquisitionSourceResolution } from "../acquisition/source-boundaries";
import type { FocusedRequirementCoverage } from "./owned-first-plan";

export type GoalAcquisitionChoiceKind = "buy" | "build" | "haul" | "substitute" | "source" | "unknown";

export interface GoalAcquisitionChoice {
  kind: GoalAcquisitionChoiceKind;
  label: string;
  reason: string;
  provenance: readonly string[];
}

export interface ExplicitMarketEvidence {
  state: "available" | "unavailable" | "unknown";
  summary?: string;
  provenance: readonly string[];
}

export interface ExplicitHaulEvidence {
  state: "available" | "unavailable" | "unknown";
  summary?: string;
  provenance: readonly string[];
}

export interface ExplicitSubstituteEvidence {
  title: string;
  reason: string;
  provenance: readonly string[];
}

export interface RequirementAcquisitionEvidence {
  sourceResolution?: AcquisitionSourceResolution | null;
  market?: ExplicitMarketEvidence | null;
  haul?: ExplicitHaulEvidence | null;
  substitutes?: readonly ExplicitSubstituteEvidence[];
}

export interface SkillTrainingMilestone {
  shortestUsableLevel: number;
  trainedLevel: number;
  optionalOptimizationLevels: readonly number[];
  reason: string;
}

export interface RequirementAcquisitionPlan {
  coverage: FocusedRequirementCoverage;
  choices: readonly GoalAcquisitionChoice[];
  trainingMilestone: SkillTrainingMilestone | null;
}

function cleanProvenance(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function sourceChoices(resolution: AcquisitionSourceResolution | null | undefined): GoalAcquisitionChoice[] {
  if (!resolution) return [];
  const choices: GoalAcquisitionChoice[] = [];

  if (resolution.manufacturingBoundary === "ordinary-blueprint-available") {
    choices.push({
      kind: "build",
      label: "Build it",
      reason: "Current static data establishes an ordinary manufacturing blueprint path for this type.",
      provenance: ["CCP Static Data Export: blueprint manufacturing relationship"],
    });
  }

  for (const source of resolution.sources) {
    choices.push({
      kind: "source",
      label: source.label,
      reason: `Established acquisition source category: ${source.sourceKind}.`,
      provenance: source.evidence.kind === "sde"
        ? [`CCP Static Data Export: ${source.evidence.dataset}${source.evidence.sdeBuild ? ` build ${source.evidence.sdeBuild}` : ""}`]
        : [`${source.evidence.authority}: ${source.evidence.title}`],
    });
  }

  if (resolution.manufacturingBoundary === "unknown-type" || (resolution.manufacturingBoundary === "no-ordinary-blueprint" && resolution.sourceState === "unknown")) {
    choices.push({
      kind: "unknown",
      label: "Source not established",
      reason: resolution.manufacturingBoundary === "unknown-type"
        ? "The static type is unresolved, so NEC cannot establish an acquisition path."
        : "No ordinary manufacturing blueprint exists in the current static evidence and NEC does not have a supported terminal source for this type yet.",
      provenance: ["NEC acquisition-source resolution"],
    });
  }

  return choices;
}

function explicitChoices(evidence: RequirementAcquisitionEvidence): GoalAcquisitionChoice[] {
  const choices: GoalAcquisitionChoice[] = [];
  if (evidence.market?.state === "available") {
    choices.push({
      kind: "buy",
      label: "Buy it",
      reason: evidence.market.summary?.trim() || "Current market evidence establishes an available purchase path.",
      provenance: cleanProvenance(evidence.market.provenance),
    });
  }
  if (evidence.haul?.state === "available") {
    choices.push({
      kind: "haul",
      label: "Haul an owned copy",
      reason: evidence.haul.summary?.trim() || "Supported location/access evidence establishes an owned item that can be moved for this requirement.",
      provenance: cleanProvenance(evidence.haul.provenance),
    });
  }
  for (const substitute of evidence.substitutes ?? []) {
    const title = substitute.title.trim();
    const reason = substitute.reason.trim();
    const provenance = cleanProvenance(substitute.provenance);
    if (!title || !reason || provenance.length === 0) continue;
    choices.push({ kind: "substitute", label: `Use ${title}`, reason, provenance });
  }
  return choices;
}

function trainingMilestone(coverage: FocusedRequirementCoverage): SkillTrainingMilestone | null {
  if (coverage.requirement.kind !== "skill" || coverage.status === "covered" || coverage.status === "unknown") return null;
  const required = coverage.requiredLevel;
  const trained = coverage.trainedLevel;
  if (required == null || trained == null) return null;
  return {
    shortestUsableLevel: required,
    trainedLevel: trained,
    optionalOptimizationLevels: [1, 2, 3, 4, 5].filter((level) => level > required),
    reason: `Level ${required} is the selected requirement. Higher levels are optional optimization for this plan unless another requirement separately establishes them.`,
  };
}

export function buildRequirementAcquisitionPlan(
  coverage: FocusedRequirementCoverage,
  evidence: RequirementAcquisitionEvidence = {},
): RequirementAcquisitionPlan {
  if (coverage.status === "covered") return { coverage, choices: [], trainingMilestone: null };
  if (coverage.requirement.kind === "skill") {
    return { coverage, choices: [], trainingMilestone: trainingMilestone(coverage) };
  }
  if (coverage.status === "unknown") {
    return {
      coverage,
      choices: [{
        kind: "unknown",
        label: "Acquisition cannot be planned yet",
        reason: "Ownership or type evidence is unresolved, so NEC will not guess that this item must be acquired.",
        provenance: ["BETA-08 owned-first coverage"],
      }],
      trainingMilestone: null,
    };
  }

  const choices = [...explicitChoices(evidence), ...sourceChoices(evidence.sourceResolution)];
  return {
    coverage,
    choices: choices.length > 0 ? choices : [{
      kind: "unknown",
      label: "Source not established",
      reason: "NEC has not been given positive evidence for a buy, build, haul, substitute, or terminal-source path for this uncovered requirement.",
      provenance: ["NEC acquisition-choice boundary"],
    }],
    trainingMilestone: null,
  };
}
