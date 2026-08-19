import type { ReadinessFindingState } from "../readiness/model";
import { ABYSSAL_FIT_METADATA, ABYSSAL_TASKS, type AbyssalFitMetadata } from "../ships/abyssal-fits";
import type { FitTemplate } from "../ships/task-planner";
import { buildAbyssalTierReadiness, type AbyssalTierReadinessResult } from "./abyssal-readiness";
import type { AbyssalTier, AbyssalWeatherId, AbyssalEntryHullClass } from "./abyssal-knowledge";

export interface VettedAbyssalFitRule {
  fitId: string;
  shipTypeId: number;
  primaryTier: AbyssalTier;
  validatedTiers: readonly AbyssalTier[];
  weather: AbyssalWeatherId;
  hullClass: AbyssalEntryHullClass;
  filamentCount: number;
  validationNote: string;
}

export interface VettedAbyssalFitProfile extends VettedAbyssalFitRule {
  fit: FitTemplate;
  metadata: AbyssalFitMetadata;
}

export interface VettedAbyssalFitReadinessInput {
  fitId: string;
  targetTier: AbyssalTier;
  weather: AbyssalWeatherId;
  skillReadiness: ReadinessFindingState;
  suppliesReady: ReadinessFindingState;
  replacementCapacity: ReadinessFindingState;
  priorTierExperience?: ReadinessFindingState;
  filamentAvailable: ReadinessFindingState;
}

export const VETTED_ABYSSAL_FIT_RULES: readonly VettedAbyssalFitRule[] = [
  {
    fitId: "abyss-kestrel-t0-dark-community",
    shipTypeId: 602,
    primaryTier: 0,
    validatedTiers: [0],
    weather: "dark",
    hullClass: "frigate",
    filamentCount: 3,
    validationNote: "Vetted for Tranquil Dark only; do not promote this starter fit to Calm based on T0 success.",
  },
  {
    fitId: "abyss-punisher-t0-electrical-community",
    shipTypeId: 597,
    primaryTier: 0,
    validatedTiers: [0],
    weather: "electrical",
    hullClass: "frigate",
    filamentCount: 3,
    validationNote: "Vetted for Tranquil Electrical only; higher tiers require a separately validated progression fit.",
  },
  {
    fitId: "abyss-rifter-t0-electrical-community",
    shipTypeId: 587,
    primaryTier: 0,
    validatedTiers: [0],
    weather: "electrical",
    hullClass: "frigate",
    filamentCount: 3,
    validationNote: "Vetted for Tranquil Electrical only.",
  },
  {
    fitId: "abyss-tristan-t0-electrical-a2o",
    shipTypeId: 593,
    primaryTier: 0,
    validatedTiers: [0],
    weather: "electrical",
    hullClass: "frigate",
    filamentCount: 3,
    validationNote: "Vetted for Tranquil Electrical only as the A2O starter step.",
  },
  {
    fitId: "abyss-hookbill-t1-dark",
    shipTypeId: 17619,
    primaryTier: 1,
    validatedTiers: [1],
    weather: "dark",
    hullClass: "frigate",
    filamentCount: 3,
    validationNote: "Vetted for Calm Dark progression; it is not evidence for Agitated readiness.",
  },
  {
    fitId: "abyss-worm-t1-electrical-a2o",
    shipTypeId: 17930,
    primaryTier: 1,
    validatedTiers: [1],
    weather: "electrical",
    hullClass: "frigate",
    filamentCount: 3,
    validationNote: "Vetted for Calm Electrical after the T0 learning step.",
  },
  {
    fitId: "abyss-gila-t3-gamma-passive",
    shipTypeId: 17715,
    primaryTier: 3,
    validatedTiers: [2, 3],
    weather: "gamma",
    hullClass: "cruiser",
    filamentCount: 1,
    validationNote: "Source usage supports Agitated/Fierce Gamma, with an explicit cap at T3 rather than assuming T4 safety.",
  },
  {
    fitId: "abyss-gila-t4-electrical-active",
    shipTypeId: 17715,
    primaryTier: 4,
    validatedTiers: [4],
    weather: "electrical",
    hullClass: "cruiser",
    filamentCount: 1,
    validationNote: "Vetted as the Raging Electrical active-Gila archetype; no higher tier is implied.",
  },
] as const;

function allVettedFits(): FitTemplate[] {
  const byId = new Map<string, FitTemplate>();
  for (const task of ABYSSAL_TASKS) {
    for (const fit of task.fits) byId.set(fit.id, fit);
  }
  return [...byId.values()];
}

export function listVettedAbyssalFits(): VettedAbyssalFitProfile[] {
  const fitById = new Map(allVettedFits().map((fit) => [fit.id, fit]));
  return VETTED_ABYSSAL_FIT_RULES.map((rule) => {
    const fit = fitById.get(rule.fitId);
    const metadata = ABYSSAL_FIT_METADATA[rule.fitId];
    if (!fit) throw new Error(`Vetted Abyssal fit rule references missing fit ${rule.fitId}.`);
    if (!metadata) throw new Error(`Vetted Abyssal fit ${rule.fitId} is missing source metadata.`);
    return { ...rule, fit, metadata };
  }).sort((left, right) =>
    left.primaryTier - right.primaryTier
    || left.fit.shipName.localeCompare(right.fit.shipName)
    || left.fitId.localeCompare(right.fitId));
}

export function getVettedAbyssalFit(fitId: string): VettedAbyssalFitProfile | null {
  return listVettedAbyssalFits().find((profile) => profile.fitId === fitId) ?? null;
}

export function vettedFitSuitabilityState(
  fitId: string,
  targetTier: AbyssalTier,
  weather: AbyssalWeatherId,
): ReadinessFindingState {
  const profile = getVettedAbyssalFit(fitId);
  if (!profile) return "unknown";
  if (profile.weather !== weather) return "unmet";
  return profile.validatedTiers.includes(targetTier) ? "met" : "unmet";
}

export function vettedFitEntryEligibilityState(fitId: string): ReadinessFindingState {
  const profile = getVettedAbyssalFit(fitId);
  if (!profile) return "unknown";
  if (profile.hullClass === "frigate" && profile.filamentCount === 3) return "met";
  if (profile.hullClass === "cruiser" && profile.filamentCount === 1) return "met";
  return "unmet";
}

export function buildVettedAbyssalFitReadiness(
  input: VettedAbyssalFitReadinessInput,
): AbyssalTierReadinessResult {
  return buildAbyssalTierReadiness({
    tier: input.targetTier,
    entryFormatEligible: vettedFitEntryEligibilityState(input.fitId),
    fitSuitability: vettedFitSuitabilityState(input.fitId, input.targetTier, input.weather),
    skillReadiness: input.skillReadiness,
    suppliesReady: input.suppliesReady,
    replacementCapacity: input.replacementCapacity,
    priorTierExperience: input.priorTierExperience,
    filamentAvailable: input.filamentAvailable,
  });
}

export function validateVettedAbyssalFitCatalog(): void {
  const profiles = listVettedAbyssalFits();
  const ids = new Set<string>();
  for (const profile of profiles) {
    if (ids.has(profile.fitId)) throw new Error(`Duplicate vetted Abyssal fit rule: ${profile.fitId}`);
    ids.add(profile.fitId);
    if (!Number.isInteger(profile.shipTypeId) || profile.shipTypeId <= 0) throw new Error(`Missing ship type ID for ${profile.fitId}.`);
    if (!profile.validatedTiers.includes(profile.primaryTier)) {
      throw new Error(`Primary tier T${profile.primaryTier} is outside validated tiers for ${profile.fitId}.`);
    }
    if (profile.validatedTiers.some((tier) => tier < 0 || tier > 6)) {
      throw new Error(`Invalid tier boundary on ${profile.fitId}.`);
    }
    if (!profile.validationNote.trim()) throw new Error(`Missing validation note for ${profile.fitId}.`);
    if (!profile.metadata.sourceUrl.trim() || !profile.metadata.validation.trim() || !profile.metadata.eft.trim()) {
      throw new Error(`Incomplete source metadata for ${profile.fitId}.`);
    }
  }
}
