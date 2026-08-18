import { explainReadiness, type ReadinessExplanation } from "../readiness/explanation";
import { buildReadinessSnapshot, type ReadinessFinding, type ReadinessFindingState } from "../readiness/model";
import { milestoneRequirementResult, type ExperienceMilestoneRecord } from "../readiness/milestones-store-core";
import type { AbyssalTier } from "./abyssal-knowledge";

export interface AbyssalTierReadinessInput {
  tier: AbyssalTier;
  entryFormatEligible: ReadinessFindingState;
  fitSuitability: ReadinessFindingState;
  skillReadiness: ReadinessFindingState;
  suppliesReady: ReadinessFindingState;
  replacementCapacity: ReadinessFindingState;
  priorTierExperience?: ReadinessFindingState;
  filamentAvailable: ReadinessFindingState;
}

export interface AbyssalTierReadinessResult {
  tier: AbyssalTier;
  priorTierMilestoneKey: string | null;
  findings: readonly ReadinessFinding[];
  explanation: ReadinessExplanation;
}

function validateState(state: ReadinessFindingState, label: string): void {
  if (state === "not-applicable") return;
  if (!["met", "caution", "unmet", "unknown"].includes(state)) {
    throw new Error(`${label} has an invalid readiness state.`);
  }
}

export function abyssalExperienceMilestoneKey(tier: AbyssalTier): string {
  return `abyssal:t${tier}:comfortable-clear`;
}

export function abyssalExperienceMilestoneLabel(tier: AbyssalTier): string {
  return `Comfortable completing T${tier} with time margin and understood room flow`;
}

export function priorTierExperienceState(
  targetTier: AbyssalTier,
  record: ExperienceMilestoneRecord | null,
): ReadinessFindingState {
  if (targetTier === 0) return "not-applicable";
  const result = milestoneRequirementResult("prior-tier-experience", record);
  return result.state;
}

function finding(
  id: string,
  dimension: ReadinessFinding["dimension"],
  requirement: ReadinessFinding["requirement"],
  state: ReadinessFindingState,
  summary: string,
  why: string,
): ReadinessFinding {
  return { id, dimension, requirement, state, summary, why };
}

export function buildAbyssalTierReadiness(input: AbyssalTierReadinessInput): AbyssalTierReadinessResult {
  if (!Number.isInteger(input.tier) || input.tier < 0 || input.tier > 6) throw new Error("Abyssal tier must be T0 through T6.");
  validateState(input.entryFormatEligible, "Entry eligibility");
  validateState(input.fitSuitability, "Fit suitability");
  validateState(input.skillReadiness, "Skill readiness");
  validateState(input.suppliesReady, "Supplies readiness");
  validateState(input.replacementCapacity, "Replacement capacity");
  validateState(input.filamentAvailable, "Filament availability");

  const tier = input.tier;
  const priorTier = tier > 0 ? (tier - 1) as AbyssalTier : null;
  const priorExperience = tier === 0 ? "not-applicable" : (input.priorTierExperience ?? "unknown");
  validateState(priorExperience, "Prior-tier experience");

  const findings: ReadinessFinding[] = [
    finding(
      `abyss:t${tier}:entry-format`,
      "ship-fit",
      "hard",
      input.entryFormatEligible,
      `Selected hull/entry format is valid for T${tier}`,
      "Abyssal entry has real hull/trace restrictions. This finding represents technical entry eligibility only; it does not claim the fit can survive the site.",
    ),
    finding(
      `abyss:t${tier}:fit`,
      "ship-fit",
      "soft",
      input.fitSuitability,
      `Selected fit is validated for T${tier}`,
      "Being able to enter the trace is not the same as using a fit that NEC has validated for this tier and weather.",
    ),
    finding(
      `abyss:t${tier}:skills`,
      "skills",
      "soft",
      input.skillReadiness,
      `Fit-required skills are ready for T${tier}`,
      "The selected fit's required skills and meaningful support-skill floor must be evaluated separately from hull ownership.",
    ),
    finding(
      `abyss:t${tier}:supplies`,
      "supplies",
      "soft",
      input.suppliesReady,
      `Required filaments, charges, drones, and consumables are ready for T${tier}`,
      "The run should not be recommended when the selected fit's required supplies are missing or their availability is unknown.",
    ),
    finding(
      `abyss:t${tier}:replacement`,
      "replacement-capacity",
      "soft",
      input.replacementCapacity,
      `Replacement capacity is acceptable for the selected T${tier} exposure`,
      "Abyssal ship loss can be total. Immediate purchase ability is not enough; NEC keeps loss/replacement capacity as a separate readiness dimension.",
    ),
    finding(
      `abyss:t${tier}:experience`,
      "experience",
      "soft",
      priorExperience,
      priorTier === null
        ? "No prior-tier experience is required for T0"
        : `Prior T${priorTier} experience milestone is confirmed`,
      priorTier === null
        ? "T0 is the first Abyssal tier, so no lower-tier experience milestone applies."
        : `Higher-tier progression uses the player's explicit “${abyssalExperienceMilestoneLabel(priorTier)}” milestone. NEC does not infer experience from ESI, loot, or filament ownership.`,
    ),
    finding(
      `abyss:t${tier}:filament`,
      "supplies",
      "context",
      input.filamentAvailable,
      `A T${tier} filament is available`,
      "Filament possession establishes supply availability only. Finding or buying a higher-tier filament does not satisfy fit, skill, replacement-capacity, or experience readiness.",
    ),
  ];

  const snapshot = buildReadinessSnapshot(findings);
  const explanation = explainReadiness(snapshot, {
    actionHints: [
      { findingId: `abyss:t${tier}:entry-format`, action: "Choose a hull and entry format that are technically permitted for this Abyssal run." },
      { findingId: `abyss:t${tier}:fit`, action: `Choose a vetted fit whose validated tier includes T${tier}.` },
      { findingId: `abyss:t${tier}:skills`, action: "Train or verify the selected fit's required skills before advancing." },
      { findingId: `abyss:t${tier}:supplies`, action: "Load the selected fit's required filaments, ammunition, drones, and consumables." },
      { findingId: `abyss:t${tier}:replacement`, action: "Reduce the ship exposure or build enough reserve/replacement capacity before risking this tier." },
      { findingId: `abyss:t${tier}:experience`, action: priorTier === null ? "Review the T0 first-run briefing." : `Complete and explicitly confirm the T${priorTier} experience milestone before advancing.` },
    ],
  });

  return {
    tier,
    priorTierMilestoneKey: priorTier === null ? null : abyssalExperienceMilestoneKey(priorTier),
    findings,
    explanation,
  };
}
