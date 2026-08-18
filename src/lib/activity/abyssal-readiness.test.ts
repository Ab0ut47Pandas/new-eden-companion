import { describe, expect, it } from "vitest";

import {
  abyssalExperienceMilestoneKey,
  abyssalExperienceMilestoneLabel,
  buildAbyssalTierReadiness,
  priorTierExperienceState,
} from "./abyssal-readiness";

function readyInput(tier: 0 | 1 | 2 | 3 | 4 | 5 | 6) {
  return {
    tier,
    entryFormatEligible: "met" as const,
    fitSuitability: "met" as const,
    skillReadiness: "met" as const,
    suppliesReady: "met" as const,
    replacementCapacity: "met" as const,
    priorTierExperience: tier === 0 ? "not-applicable" as const : "met" as const,
    filamentAvailable: "met" as const,
  };
}

describe("Abyssal tier readiness", () => {
  it("is ready only when the evaluated entry, fit, skills, supplies, replacement, and experience inputs support it", () => {
    const result = buildAbyssalTierReadiness(readyInput(2));
    expect(result.explanation.status).toBe("ready");
    expect(result.explanation.technicalEligibility).toBe("eligible");
    expect(result.priorTierMilestoneKey).toBe("abyssal:t1:comfortable-clear");
  });

  it("does not treat possession of a higher-tier filament as readiness", () => {
    const result = buildAbyssalTierReadiness({
      ...readyInput(2),
      fitSuitability: "unknown",
      skillReadiness: "unknown",
      replacementCapacity: "unknown",
      priorTierExperience: "unknown",
      filamentAvailable: "met",
    });

    expect(result.explanation.status).toBe("unknown");
    expect(result.findings.find((finding) => finding.id === "abyss:t2:filament")).toMatchObject({
      requirement: "context",
      state: "met",
    });
    expect(result.explanation.unknowns.length).toBeGreaterThan(0);
  });

  it("keeps an explicitly not-yet prior-tier milestone as a preparation gap", () => {
    const result = buildAbyssalTierReadiness({ ...readyInput(1), priorTierExperience: "unmet" });
    expect(result.explanation.status).toBe("nearly-ready");
    expect(result.explanation.primaryIssue?.id).toBe("abyss:t1:experience");
    expect(result.explanation.nextAction).toMatch(/confirm the T0 experience milestone/i);
  });

  it("keeps a missing prior-tier milestone unknown instead of assuming experience from loot or ESI", () => {
    const result = buildAbyssalTierReadiness({ ...readyInput(3), priorTierExperience: "unknown" });
    expect(result.explanation.status).toBe("unknown");
    expect(result.explanation.primaryIssue?.id).toBe("abyss:t3:experience");
  });

  it("does not require a prior-tier milestone for T0", () => {
    const result = buildAbyssalTierReadiness(readyInput(0));
    expect(result.explanation.status).toBe("ready");
    expect(result.priorTierMilestoneKey).toBeNull();
    expect(result.findings.find((finding) => finding.id === "abyss:t0:experience")?.state).toBe("not-applicable");
  });

  it("blocks a run when the selected hull/entry format is technically invalid", () => {
    const result = buildAbyssalTierReadiness({ ...readyInput(1), entryFormatEligible: "unmet" });
    expect(result.explanation.status).toBe("not-recommended");
    expect(result.explanation.technicalEligibility).toBe("blocked");
    expect(result.explanation.primaryIssue?.id).toBe("abyss:t1:entry-format");
  });

  it("keeps replacement capacity separate from immediate access or filament ownership", () => {
    const result = buildAbyssalTierReadiness({ ...readyInput(4), replacementCapacity: "unmet" });
    expect(result.explanation.status).toBe("nearly-ready");
    expect(result.explanation.primaryIssue?.id).toBe("abyss:t4:replacement");
    expect(result.explanation.nextAction).toMatch(/reserve\/replacement capacity/i);
  });

  it("maps explicit local experience records without inferring missing records", () => {
    expect(priorTierExperienceState(0, null)).toBe("not-applicable");
    expect(priorTierExperienceState(1, null)).toBe("unknown");
    expect(priorTierExperienceState(1, {
      characterId: 7,
      milestoneKey: abyssalExperienceMilestoneKey(0),
      label: abyssalExperienceMilestoneLabel(0),
      state: "confirmed",
      updatedAt: 100,
      confirmedAt: 100,
    })).toBe("met");
    expect(priorTierExperienceState(2, {
      characterId: 7,
      milestoneKey: abyssalExperienceMilestoneKey(1),
      label: abyssalExperienceMilestoneLabel(1),
      state: "not-yet",
      updatedAt: 100,
      confirmedAt: null,
    })).toBe("unmet");
  });
});
