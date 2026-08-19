import { describe, expect, it } from "vitest";

import {
  EXPLORATION_FIRST_RUN,
  EXPLORATION_LOOT_GUIDANCE,
  EXPLORATION_PREP,
  EXPLORATION_RISK_BANDS,
  EXPLORATION_SITE_GUIDES,
  EXPLORATION_SOURCES,
  validateExplorationGuide,
} from "./exploration-guide";

describe("beginner exploration guide", () => {
  it("covers the main scanner-result and signature families without treating scanning as readiness", () => {
    expect(EXPLORATION_SITE_GUIDES.map((site) => site.kind)).toEqual([
      "anomaly",
      "data",
      "relic",
      "gas",
      "combat",
      "wormhole",
      "special",
    ]);
    expect(EXPLORATION_SITE_GUIDES.find((site) => site.kind === "combat")?.beginnerNote).toContain("combat-ready");
  });

  it("teaches the minimum probe and analyzer preparation loop", () => {
    expect(EXPLORATION_PREP.join(" ")).toContain("Core Probe Launcher");
    expect(EXPLORATION_PREP.join(" ")).toContain("eight Core Scanner Probes");
    expect(EXPLORATION_PREP.join(" ")).toContain("Data Analyzer");
    expect(EXPLORATION_PREP.join(" ")).toContain("Relic Analyzer");
  });

  it("keeps live risk and unknown site mechanics outside NEC's claimed visibility", () => {
    expect(EXPLORATION_RISK_BANDS).toHaveLength(4);
    expect(EXPLORATION_RISK_BANDS.every((risk) => /not|cannot|no normal|manually|possible/i.test(risk.guidance))).toBe(true);
    expect(EXPLORATION_SITE_GUIDES.find((site) => site.kind === "special")?.beginnerNote).toContain("Unknown means stop and check");
  });

  it("provides an actionable first-run sequence that ends with conservative loot review", () => {
    expect(EXPLORATION_FIRST_RUN[0]).toContain("Probe Scanner");
    expect(EXPLORATION_FIRST_RUN.some((step) => step.includes("100%"))).toBe(true);
    expect(EXPLORATION_FIRST_RUN.at(-1)).toContain("review unfamiliar loot");
  });

  it("does not convert marketable exploration loot into an automatic sell recommendation", () => {
    expect(EXPLORATION_LOOT_GUIDANCE.find((loot) => loot.label === "Datacores")?.disposition).toContain("Review");
    expect(EXPLORATION_LOOT_GUIDANCE.some((loot) => loot.disposition.includes("Sell only with positive evidence"))).toBe(true);
  });

  it("keeps source provenance and validates the curated model", () => {
    expect(EXPLORATION_SOURCES.length).toBeGreaterThanOrEqual(4);
    expect(EXPLORATION_SOURCES.every((source) => source.verifiedOn === "2026-08-20")).toBe(true);
    expect(() => validateExplorationGuide()).not.toThrow();
  });
});
