import { describe, expect, it } from "vitest";

import {
  READINESS_DIMENSIONS,
  buildReadinessSnapshot,
  validateReadinessFindings,
  type ReadinessFinding,
} from "./model";

function finding(overrides: Partial<ReadinessFinding> & Pick<ReadinessFinding, "id" | "dimension">): ReadinessFinding {
  return {
    requirement: "soft",
    state: "met",
    summary: overrides.id,
    why: `Why ${overrides.id}`,
    ...overrides,
  };
}

describe("readiness model", () => {
  it("keeps a hard entry restriction separate from otherwise good readiness dimensions", () => {
    const snapshot = buildReadinessSnapshot([
      finding({
        id: "site-hull-gate",
        dimension: "ship-fit",
        requirement: "hard",
        state: "unmet",
        summary: "Selected hull cannot enter this site",
        why: "The activity has a hard ship-access restriction.",
      }),
      finding({ id: "skills-ok", dimension: "skills", requirement: "hard", state: "met" }),
      finding({ id: "supplies-ok", dimension: "supplies", state: "met" }),
    ]);

    expect(snapshot.technicalEligibility.status).toBe("blocked");
    expect(snapshot.technicalEligibility.blockers.map((entry) => entry.id)).toEqual(["site-hull-gate"]);
    expect(snapshot.dimensions.find((entry) => entry.dimension === "ship-fit")?.status).toBe("blocked");
    expect(snapshot.dimensions.find((entry) => entry.dimension === "skills")?.status).toBe("ready");
  });

  it("can be technically eligible while still needing experience or preparation", () => {
    const snapshot = buildReadinessSnapshot([
      finding({ id: "entry-skill", dimension: "skills", requirement: "hard", state: "met" }),
      finding({ id: "practice", dimension: "experience", requirement: "soft", state: "unmet" }),
      finding({ id: "briefing", dimension: "knowledge-preparation", requirement: "soft", state: "caution" }),
    ]);

    expect(snapshot.technicalEligibility.status).toBe("eligible");
    expect(snapshot.dimensions.find((entry) => entry.dimension === "experience")?.status).toBe("needs-work");
    expect(snapshot.dimensions.find((entry) => entry.dimension === "knowledge-preparation")?.status).toBe("caution");
  });

  it("does not convert unknown hard requirements into either pass or failure", () => {
    const snapshot = buildReadinessSnapshot([
      finding({ id: "access-unknown", dimension: "location-access", requirement: "hard", state: "unknown" }),
    ]);

    expect(snapshot.technicalEligibility.status).toBe("unknown");
    expect(snapshot.technicalEligibility.blockers).toHaveLength(0);
    expect(snapshot.technicalEligibility.unknowns).toHaveLength(1);
    expect(snapshot.dimensions.find((entry) => entry.dimension === "location-access")?.status).toBe("unknown");
  });

  it("does not claim technical eligibility when no hard entry requirements were assessed", () => {
    const snapshot = buildReadinessSnapshot([
      finding({ id: "wallet-context", dimension: "isk", requirement: "context", state: "met" }),
    ]);
    expect(snapshot.technicalEligibility.status).toBe("not-assessed");
  });

  it("always returns every standard dimension in stable order", () => {
    const snapshot = buildReadinessSnapshot([]);
    expect(snapshot.dimensions.map((entry) => entry.dimension)).toEqual(READINESS_DIMENSIONS);
    expect(snapshot.dimensions.every((entry) => entry.status === "not-assessed")).toBe(true);
  });

  it("distinguishes purchase ability from replacement capacity", () => {
    const snapshot = buildReadinessSnapshot([
      finding({ id: "can-buy", dimension: "isk", state: "met" }),
      finding({ id: "cannot-replace", dimension: "replacement-capacity", state: "unmet" }),
    ]);
    expect(snapshot.dimensions.find((entry) => entry.dimension === "isk")?.status).toBe("ready");
    expect(snapshot.dimensions.find((entry) => entry.dimension === "replacement-capacity")?.status).toBe("needs-work");
  });

  it("preserves explicit not-applicable assessments", () => {
    const snapshot = buildReadinessSnapshot([
      finding({ id: "no-supplies", dimension: "supplies", requirement: "context", state: "not-applicable" }),
    ]);
    expect(snapshot.dimensions.find((entry) => entry.dimension === "supplies")?.status).toBe("not-applicable");
  });

  it("rejects duplicate finding ids so explanations stay addressable", () => {
    const duplicates = [
      finding({ id: "same", dimension: "skills" }),
      finding({ id: "same", dimension: "supplies" }),
    ];
    expect(() => validateReadinessFindings(duplicates)).toThrow(/Duplicate readiness finding id/);
  });
});
