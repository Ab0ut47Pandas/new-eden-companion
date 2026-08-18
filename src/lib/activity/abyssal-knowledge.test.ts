import { describe, expect, it } from "vitest";

import {
  ABYSSAL_ENTRY_FORMATS,
  ABYSSAL_KNOWLEDGE_SOURCES,
  ABYSSAL_TIERS,
  ABYSSAL_WEATHERS,
  filamentDisplayName,
  getAbyssalEntryFormat,
  getAbyssalTier,
  getAbyssalWeather,
  validateAbyssalKnowledge,
} from "./abyssal-knowledge";

describe("Abyssal knowledge", () => {
  it("covers the current T0 through T6 naming sequence", () => {
    expect(ABYSSAL_TIERS).toEqual([
      { tier: 0, name: "Tranquil" },
      { tier: 1, name: "Calm" },
      { tier: 2, name: "Agitated" },
      { tier: 3, name: "Fierce" },
      { tier: 4, name: "Raging" },
      { tier: 5, name: "Chaotic" },
      { tier: 6, name: "Cataclysmic" },
    ]);
    expect(getAbyssalTier(7)).toBeNull();
  });

  it("covers all five filament weather families with a penalty, bonus, and explanation", () => {
    expect(ABYSSAL_WEATHERS.map((weather) => weather.id)).toEqual([
      "dark",
      "electrical",
      "exotic",
      "firestorm",
      "gamma",
    ]);
    for (const weather of ABYSSAL_WEATHERS) {
      expect(weather.penalty.length).toBeGreaterThan(0);
      expect(weather.bonus.length).toBeGreaterThan(0);
      expect(weather.whyItMatters.length).toBeGreaterThan(0);
    }
    expect(getAbyssalWeather("not-real")).toBeNull();
  });

  it("models one-cruiser, two-destroyer, and three-frigate entry consumption", () => {
    expect(ABYSSAL_ENTRY_FORMATS.map(({ hullClass, maxShips, filamentCount }) => ({ hullClass, maxShips, filamentCount }))).toEqual([
      { hullClass: "cruiser", maxShips: 1, filamentCount: 1 },
      { hullClass: "destroyer", maxShips: 2, filamentCount: 2 },
      { hullClass: "frigate", maxShips: 3, filamentCount: 3 },
    ]);
    expect(getAbyssalEntryFormat("battlecruiser")).toBeNull();
  });

  it("builds filament names from tier and weather knowledge", () => {
    expect(filamentDisplayName(0, "electrical")).toBe("Tranquil Electrical Filament");
    expect(filamentDisplayName(6, "gamma")).toBe("Cataclysmic Gamma Filament");
  });

  it("keeps source provenance attached to the curated mechanics", () => {
    expect(ABYSSAL_KNOWLEDGE_SOURCES.length).toBeGreaterThanOrEqual(3);
    for (const source of ABYSSAL_KNOWLEDGE_SOURCES) {
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.verifiedOn).toBe("2026-08-18");
      expect(source.supports.length).toBeGreaterThan(0);
    }
  });

  it("passes the complete curated-data validation", () => {
    expect(() => validateAbyssalKnowledge()).not.toThrow();
  });
});
