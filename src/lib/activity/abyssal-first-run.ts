import type { ReadinessExplanation } from "../readiness/explanation";
import type { FitTemplate } from "../ships/task-planner";
import { listVettedAbyssalFits, type VettedAbyssalFitProfile } from "./abyssal-fit-catalog";
import { buildActivityBriefing, type ActivityBriefingDefinition, type ActivityBriefingView } from "./briefing";
import { buildActivityCheatSheet, type ActivityCheatSheetView } from "./cheat-sheet";

export type AbyssalFirstRunTier = 0 | 1;
export type AbyssalFirstRunWeather = "dark" | "electrical";

export interface AbyssalFirstRunOption {
  id: string;
  tier: AbyssalFirstRunTier;
  weather: AbyssalFirstRunWeather;
  shipName: string;
  fitName: string;
  summary: string;
  loadout: FitTemplate["loadout"];
  supplies: string[];
  sourceUrl: string | null;
  validation: string | null;
}

export interface AbyssalFirstRunPackage {
  option: AbyssalFirstRunOption;
  briefing: ActivityBriefingView;
  cheatSheet: ActivityCheatSheetView;
}

function isFirstRunProfile(profile: VettedAbyssalFitProfile): profile is VettedAbyssalFitProfile & {
  primaryTier: AbyssalFirstRunTier;
  weather: AbyssalFirstRunWeather;
} {
  return (profile.primaryTier === 0 || profile.primaryTier === 1)
    && (profile.weather === "dark" || profile.weather === "electrical")
    && profile.hullClass === "frigate";
}

function firstRunProfiles(): Array<VettedAbyssalFitProfile & { primaryTier: AbyssalFirstRunTier; weather: AbyssalFirstRunWeather }> {
  return listVettedAbyssalFits().filter(isFirstRunProfile);
}

function toOption(profile: VettedAbyssalFitProfile & { primaryTier: AbyssalFirstRunTier; weather: AbyssalFirstRunWeather }): AbyssalFirstRunOption {
  return {
    id: profile.fit.id,
    tier: profile.primaryTier,
    weather: profile.weather,
    shipName: profile.fit.shipName,
    fitName: profile.fit.name,
    summary: profile.fit.summary,
    loadout: profile.fit.loadout,
    supplies: [...profile.fit.supplies],
    sourceUrl: profile.metadata.sourceUrl,
    validation: `${profile.metadata.validation} ${profile.validationNote}`,
  };
}

export function listAbyssalFirstRunOptions(): AbyssalFirstRunOption[] {
  return firstRunProfiles()
    .map(toOption)
    .sort((left, right) => left.tier - right.tier || left.shipName.localeCompare(right.shipName) || left.id.localeCompare(right.id));
}

export function getAbyssalFirstRunOption(id: string): AbyssalFirstRunOption | null {
  const profile = firstRunProfiles().find((candidate) => candidate.fitId === id);
  return profile ? toOption(profile) : null;
}

function tierName(tier: AbyssalFirstRunTier): string {
  return tier === 0 ? "Tranquil (T0)" : "Calm (T1)";
}

function weatherName(weather: AbyssalFirstRunWeather): string {
  return weather === "dark" ? "Dark" : "Electrical";
}

function securityGuidance(tier: AbyssalFirstRunTier): string {
  return tier === 0
    ? "For a simple first run, activate in 0.8 security or lower. T0 filaments are also currently permitted in 0.9 and 1.0 systems, but using 0.8 keeps the same location rule when you later move to T1."
    : "Activate in 0.8 security or lower. Current rules do not permit filaments above T0 in 0.9 security systems.";
}

export function buildAbyssalFirstRunDefinition(option: AbyssalFirstRunOption): ActivityBriefingDefinition {
  const tier = tierName(option.tier);
  const weather = weatherName(option.weather);
  const loadoutSummary = option.loadout.map((slot) => `${slot.slot}: ${slot.items.join(", ")}`).join(" | ");

  return {
    id: `abyssal-first-run:${option.id}`,
    title: `${tier} ${weather} first-run briefing`,
    subtitle: `${option.shipName} — ${option.fitName}`,
    whatItIs: "Abyssal Deadspace is a timed three-pocket PvE encounter entered with Abyssal filaments. Each combat pocket must be cleared to open the next gate, and the Origin Gate in the third pocket returns you to the entry system.",
    whyCare: `This is the low-tier learning path for the selected vetted ${option.shipName} fit. The briefing keeps the fit, filament weather, supplies, room flow, timer, and failure conditions together so you are not piecing the run together from separate screens.`,
    whatToBring: [
      {
        id: "selected-fit",
        label: `${option.shipName}: ${option.fitName}`,
        detail: loadoutSummary,
        why: option.validation ?? "This fit is part of NEC's vetted low-tier Abyssal catalog.",
        tone: "required",
      },
      ...option.supplies.map((supply, index) => ({
        id: `supply-${index + 1}`,
        label: supply,
        detail: "Carry the fit-specific supply amount before activating the trace.",
        tone: "required" as const,
      })),
    ],
    howToStart: [
      {
        id: "location",
        label: securityGuidance(option.tier),
        detail: "Do not assume every high-security system accepts every Abyssal tier.",
        tone: "required",
      },
      {
        id: "fleet",
        label: "Use the frigate cooperative-trace workflow: be in a fleet and carry three matching filaments.",
        detail: "The selected starter options are frigates. Cooperative frigate traces use matching filaments of the same type and tier and allow up to three frigates.",
        tone: "required",
      },
      {
        id: "activate",
        label: `Activate the matching ${tier} ${weather} filament set and enter the Abyssal Trace.`,
        detail: "The collapse timer starts when the first ship enters the cooperative trace.",
        tone: "required",
      },
    ],
    whatToDo: [
      {
        id: "timer",
        label: "Treat 20 minutes as an absolute site-wide deadline.",
        detail: "The Abyssal expiration timer does not pause between pockets or because you disconnect.",
        tone: "warning",
      },
      {
        id: "room-one",
        label: "Pocket 1: eliminate the opposition, then take the opened gate.",
        detail: "Do not drift outside the pocket boundary while fighting or looting.",
        tone: "required",
      },
      {
        id: "room-two",
        label: "Pocket 2: clear the opposition and continue through the next gate.",
        detail: "Keep enough time in reserve for the final pocket rather than treating each room as an isolated fight.",
        tone: "required",
      },
      {
        id: "room-three",
        label: "Pocket 3: clear the opposition and leave through the Origin Gate.",
        detail: "The Origin Gate is the normal exit back to the point of entry.",
        tone: "required",
      },
    ],
    lootKeepSell: [
      {
        id: "loot-with-time",
        label: "Take caches only when doing so will not compromise the timer or your survival.",
        detail: "Use the detailed loot guide on this activity page for Bioadaptive Cache, optional side-node, red-loot, and keep/sell guidance. Unfamiliar drops remain unknown unless NEC has evidence for a use or sale path.",
        tone: "recommended",
      },
    ],
    failureConditions: [
      {
        id: "timeout",
        label: "The 20-minute timer expires.",
        detail: "The ship is destroyed when the Abyssal Deadspace timer runs out.",
        tone: "warning",
      },
      {
        id: "boundary",
        label: "You stray beyond the pocket boundary.",
        detail: "The surrounding particles damage ships that travel too far out and can eventually destroy them.",
        tone: "warning",
      },
      {
        id: "ship-loss",
        label: "Your ship is destroyed inside the Abyss.",
        detail: "Abyssal ship loss also destroys the capsule; there is no normal pod escape from the pocket.",
        tone: "warning",
      },
      {
        id: "disconnect",
        label: "You disconnect and assume the run pauses.",
        detail: "The ship remains in space, NPCs can continue attacking it, and the expiration timer continues.",
        tone: "warning",
      },
    ],
    unlocksNext: [
      {
        id: "record-clear",
        label: `Record successful ${tier} clears as explicit experience rather than inferring mastery from owning a higher-tier filament.`,
        detail: "ABY-05 uses explicit experience milestones together with validated fit tier, skills, supplies, and replacement capacity before recommending a higher tier.",
        tone: "positive",
      },
    ],
  };
}

export function buildAbyssalFirstRunPackage(
  option: AbyssalFirstRunOption,
  readiness: ReadinessExplanation | null = null,
): AbyssalFirstRunPackage {
  const briefing = buildActivityBriefing(buildAbyssalFirstRunDefinition(option), readiness);
  return {
    option,
    briefing,
    cheatSheet: buildActivityCheatSheet(briefing),
  };
}
