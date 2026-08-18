import { buildActivityBriefing, type ActivityBriefingDefinition, type ActivityBriefingView } from "./briefing";
import { buildActivityCheatSheet, type ActivityCheatSheetView } from "./cheat-sheet";
import { ABYSSAL_TASKS, ABYSSAL_FIT_METADATA } from "../ships/abyssal-fits";
import type { FitTemplate } from "../ships/task-planner";

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

const FIRST_RUN_FITS: Readonly<Record<string, { tier: AbyssalFirstRunTier; weather: AbyssalFirstRunWeather }>> = {
  "abyss-kestrel-t0-dark-community": { tier: 0, weather: "dark" },
  "abyss-punisher-t0-electrical-community": { tier: 0, weather: "electrical" },
  "abyss-rifter-t0-electrical-community": { tier: 0, weather: "electrical" },
  "abyss-tristan-t0-electrical-a2o": { tier: 0, weather: "electrical" },
  "abyss-hookbill-t1-dark": { tier: 1, weather: "dark" },
  "abyss-worm-t1-electrical-a2o": { tier: 1, weather: "electrical" },
};

function firstRunFits(): FitTemplate[] {
  const seen = new Set<string>();
  const fits: FitTemplate[] = [];
  for (const task of ABYSSAL_TASKS) {
    for (const fit of task.fits) {
      if (!FIRST_RUN_FITS[fit.id] || seen.has(fit.id)) continue;
      seen.add(fit.id);
      fits.push(fit);
    }
  }
  return fits;
}

function toOption(fit: FitTemplate): AbyssalFirstRunOption {
  const rules = FIRST_RUN_FITS[fit.id];
  if (!rules) throw new Error(`Fit ${fit.id} is not a supported T0/T1 first-run option.`);
  const metadata = ABYSSAL_FIT_METADATA[fit.id];
  return {
    id: fit.id,
    tier: rules.tier,
    weather: rules.weather,
    shipName: fit.shipName,
    fitName: fit.name,
    summary: fit.summary,
    loadout: fit.loadout,
    supplies: [...fit.supplies],
    sourceUrl: metadata?.sourceUrl ?? null,
    validation: metadata?.validation ?? null,
  };
}

export function listAbyssalFirstRunOptions(): AbyssalFirstRunOption[] {
  return firstRunFits()
    .map(toOption)
    .sort((left, right) => left.tier - right.tier || left.shipName.localeCompare(right.shipName) || left.id.localeCompare(right.id));
}

export function getAbyssalFirstRunOption(id: string): AbyssalFirstRunOption | null {
  const fit = firstRunFits().find((candidate) => candidate.id === id);
  return fit ? toOption(fit) : null;
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
        why: option.validation ?? "This fit is part of NEC's existing vetted low-tier Abyssal library.",
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
        detail: "Abyssal pockets contain caches, but ABY-04 owns the detailed Bioadaptive Cache, side-node, and keep/sell teaching. Until then NEC should not invent a liquidation recommendation for unfamiliar drops.",
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
        detail: "ABY-05 will use explicit experience milestones together with fit, skills, supplies, and replacement capacity before recommending a higher tier.",
        tone: "positive",
      },
    ],
  };
}

export function buildAbyssalFirstRunPackage(option: AbyssalFirstRunOption): AbyssalFirstRunPackage {
  const briefing = buildActivityBriefing(buildAbyssalFirstRunDefinition(option));
  return {
    option,
    briefing,
    cheatSheet: buildActivityCheatSheet(briefing),
  };
}
