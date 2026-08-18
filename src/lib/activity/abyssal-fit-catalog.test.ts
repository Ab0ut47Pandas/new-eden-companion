import { describe, expect, it } from "vitest";

import {
  buildVettedAbyssalFitReadiness,
  getVettedAbyssalFit,
  listVettedAbyssalFits,
  validateVettedAbyssalFitCatalog,
  vettedFitSuitabilityState,
} from "./abyssal-fit-catalog";

describe("vetted Abyssal fit catalog", () => {
  it("contains the eight sourced fits from the dedicated Abyssal fit library", () => {
    const profiles = listVettedAbyssalFits();
    expect(profiles).toHaveLength(8);
    expect(profiles.map((profile) => profile.primaryTier)).toEqual([0, 0, 0, 0, 1, 1, 3, 4]);
    expect(profiles.every((profile) => profile.metadata.sourceUrl && profile.metadata.eft)).toBe(true);
  });

  it("preserves exact weather and tier limits instead of promoting fits by difficulty alone", () => {
    expect(vettedFitSuitabilityState("abyss-kestrel-t0-dark-community", 0, "dark")).toBe("met");
    expect(vettedFitSuitabilityState("abyss-kestrel-t0-dark-community", 1, "dark")).toBe("unmet");
    expect(vettedFitSuitabilityState("abyss-kestrel-t0-dark-community", 0, "electrical")).toBe("unmet");
    expect(vettedFitSuitabilityState("abyss-gila-t3-gamma-passive", 2, "gamma")).toBe("met");
    expect(vettedFitSuitabilityState("abyss-gila-t3-gamma-passive", 3, "gamma")).toBe("met");
    expect(vettedFitSuitabilityState("abyss-gila-t3-gamma-passive", 4, "gamma")).toBe("unmet");
    expect(vettedFitSuitabilityState("abyss-gila-t4-electrical-active", 5, "electrical")).toBe("unmet");
  });

  it("keeps unknown fit IDs unknown instead of substituting a similar hull", () => {
    expect(getVettedAbyssalFit("not-real")).toBeNull();
    expect(vettedFitSuitabilityState("not-real", 0, "electrical")).toBe("unknown");
  });

  it("feeds validated fit limits into the ABY-05 readiness policy", () => {
    const result = buildVettedAbyssalFitReadiness({
      fitId: "abyss-hookbill-t1-dark",
      targetTier: 2,
      weather: "dark",
      skillReadiness: "met",
      suppliesReady: "met",
      replacementCapacity: "met",
      priorTierExperience: "met",
      filamentAvailable: "met",
    });

    expect(result.explanation.status).toBe("nearly-ready");
    expect(result.explanation.primaryIssue?.id).toBe("abyss:t2:fit");
    expect(result.explanation.nextAction).toMatch(/vetted fit.*T2/i);
  });

  it("can produce ready when the exact vetted fit tier/weather and the other readiness inputs are met", () => {
    const result = buildVettedAbyssalFitReadiness({
      fitId: "abyss-worm-t1-electrical-a2o",
      targetTier: 1,
      weather: "electrical",
      skillReadiness: "met",
      suppliesReady: "met",
      replacementCapacity: "met",
      priorTierExperience: "met",
      filamentAvailable: "met",
    });
    expect(result.explanation.status).toBe("ready");
  });

  it("passes catalog integrity validation", () => {
    expect(() => validateVettedAbyssalFitCatalog()).not.toThrow();
  });
});
