export const ABYSSAL_TIERS = [
  { tier: 0, name: "Tranquil" },
  { tier: 1, name: "Calm" },
  { tier: 2, name: "Agitated" },
  { tier: 3, name: "Fierce" },
  { tier: 4, name: "Raging" },
  { tier: 5, name: "Chaotic" },
  { tier: 6, name: "Cataclysmic" },
] as const;

export type AbyssalTier = (typeof ABYSSAL_TIERS)[number]["tier"];
export type AbyssalWeatherId = "dark" | "electrical" | "exotic" | "firestorm" | "gamma";
export type AbyssalEntryHullClass = "cruiser" | "destroyer" | "frigate";

export interface AbyssalWeatherKnowledge {
  id: AbyssalWeatherId;
  filamentName: string;
  environmentName: string;
  penalty: string;
  bonus: string;
  whyItMatters: string;
}

export interface AbyssalEntryFormat {
  hullClass: AbyssalEntryHullClass;
  maxShips: number;
  filamentCount: number;
  cooperative: boolean;
  rule: string;
}

export interface AbyssalKnowledgeSource {
  id: string;
  title: string;
  url: string;
  verifiedOn: string;
  supports: readonly string[];
}

export const ABYSSAL_WEATHERS: readonly AbyssalWeatherKnowledge[] = [
  {
    id: "dark",
    filamentName: "Dark",
    environmentName: "Dark Matter Field",
    penalty: "Reduces weapon ranges.",
    bonus: "Enhances ship velocity.",
    whyItMatters: "Engagement geometry changes for every affected ship: ships move faster while weapon reach is reduced, so range control and application assumptions need to be reconsidered.",
  },
  {
    id: "electrical",
    filamentName: "Electrical",
    environmentName: "Electrical Storm",
    penalty: "Reduces EM resistance.",
    bonus: "Enhances capacitor recharging.",
    whyItMatters: "EM damage benefits from the resistance penalty while capacitor-dependent ships receive more recharge, so both damage choice and capacitor stability can change.",
  },
  {
    id: "exotic",
    filamentName: "Exotic",
    environmentName: "Exotic Particle Storm",
    penalty: "Reduces kinetic resistance.",
    bonus: "Enhances scan resolution.",
    whyItMatters: "Kinetic damage benefits from the resistance penalty and higher scan resolution changes target-locking speed for affected ships.",
  },
  {
    id: "firestorm",
    filamentName: "Firestorm",
    environmentName: "Plasma Firestorm",
    penalty: "Reduces thermal resistance.",
    bonus: "Enhances ship armor strength.",
    whyItMatters: "Thermal damage benefits from the resistance penalty while increased armor strength changes the effective durability of armor-heavy ships.",
  },
  {
    id: "gamma",
    filamentName: "Gamma",
    environmentName: "Gamma-Ray Afterglow",
    penalty: "Reduces explosive resistance.",
    bonus: "Enhances ship shield strength.",
    whyItMatters: "Explosive damage benefits from the resistance penalty while increased shield strength changes the effective durability of shield-heavy ships.",
  },
] as const;

export const ABYSSAL_ENTRY_FORMATS: readonly AbyssalEntryFormat[] = [
  {
    hullClass: "cruiser",
    maxShips: 1,
    filamentCount: 1,
    cooperative: false,
    rule: "A single cruiser uses one Abyssal filament.",
  },
  {
    hullClass: "destroyer",
    maxShips: 2,
    filamentCount: 2,
    cooperative: true,
    rule: "A cooperative destroyer trace allows up to two destroyers and requires two matching Abyssal filaments.",
  },
  {
    hullClass: "frigate",
    maxShips: 3,
    filamentCount: 3,
    cooperative: true,
    rule: "A cooperative frigate trace allows up to three frigates and requires three matching Abyssal filaments.",
  },
] as const;

export const ABYSSAL_KNOWLEDGE_SOURCES: readonly AbyssalKnowledgeSource[] = [
  {
    id: "ccp-support-abyssal-deadspace",
    title: "Abyssal Deadspace — EVE Online Help Center",
    url: "https://support.eveonline.com/hc/en-us/articles/360000852629-Abyssal-Deadspace",
    verifiedOn: "2026-08-18",
    supports: ["tier names", "weather families", "qualitative weather effects", "cruiser/frigate/destroyer entry formats"],
  },
  {
    id: "ccp-depths-18-09",
    title: "Patch Notes for Version 18.09 — EVE Online",
    url: "https://www.eveonline.com/news/view/patch-notes-for-version-18-09",
    verifiedOn: "2026-08-18",
    supports: ["Tranquil T0", "Cataclysmic T6", "two-destroyer entry", "two-filament destroyer consumption"],
  },
  {
    id: "ccp-onslaught-frigate-coop",
    title: "Patch Notes For EVE Online: Onslaught — EVE Online",
    url: "https://www.eveonline.com/news/view/patch-notes-for-eve-online-onslaught",
    verifiedOn: "2026-08-18",
    supports: ["three-frigate cooperative entry", "three matching filament consumption"],
  },
] as const;

export function getAbyssalTier(tier: number) {
  return ABYSSAL_TIERS.find((entry) => entry.tier === tier) ?? null;
}

export function getAbyssalWeather(id: string): AbyssalWeatherKnowledge | null {
  return ABYSSAL_WEATHERS.find((weather) => weather.id === id) ?? null;
}

export function getAbyssalEntryFormat(hullClass: string): AbyssalEntryFormat | null {
  return ABYSSAL_ENTRY_FORMATS.find((format) => format.hullClass === hullClass) ?? null;
}

export function filamentDisplayName(tier: AbyssalTier, weather: AbyssalWeatherId): string {
  const tierKnowledge = getAbyssalTier(tier);
  const weatherKnowledge = getAbyssalWeather(weather);
  if (!tierKnowledge || !weatherKnowledge) throw new Error(`Unknown Abyssal filament combination: tier ${tier}, weather ${weather}.`);
  return `${tierKnowledge.name} ${weatherKnowledge.filamentName} Filament`;
}

export function validateAbyssalKnowledge(): void {
  if (ABYSSAL_TIERS.length !== 7) throw new Error("Abyssal tier knowledge must cover T0 through T6.");
  ABYSSAL_TIERS.forEach((entry, index) => {
    if (entry.tier !== index) throw new Error(`Abyssal tier ordering is incomplete at T${index}.`);
    if (!entry.name.trim()) throw new Error(`Abyssal tier T${entry.tier} has no name.`);
  });

  const weatherIds = new Set<string>();
  for (const weather of ABYSSAL_WEATHERS) {
    if (weatherIds.has(weather.id)) throw new Error(`Duplicate Abyssal weather: ${weather.id}`);
    weatherIds.add(weather.id);
    if (!weather.penalty.trim() || !weather.bonus.trim() || !weather.whyItMatters.trim()) {
      throw new Error(`Abyssal weather ${weather.id} is missing an effect explanation.`);
    }
  }
  if (weatherIds.size !== 5) throw new Error("Abyssal weather knowledge must cover all five filament families.");

  const hulls = new Set<string>();
  for (const format of ABYSSAL_ENTRY_FORMATS) {
    if (hulls.has(format.hullClass)) throw new Error(`Duplicate Abyssal entry format: ${format.hullClass}`);
    hulls.add(format.hullClass);
    if (format.maxShips <= 0 || format.filamentCount <= 0) throw new Error(`Invalid Abyssal entry format for ${format.hullClass}.`);
  }

  if (ABYSSAL_KNOWLEDGE_SOURCES.some((source) => !source.url.startsWith("https://"))) {
    throw new Error("Abyssal knowledge sources must use HTTPS URLs.");
  }
}
