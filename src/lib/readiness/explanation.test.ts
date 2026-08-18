import { describe, expect, it } from "vitest";

import { explainReadiness } from "./explanation";
import { buildReadinessSnapshot, type ReadinessFinding } from "./model";

function finding(overrides: Partial<ReadinessFinding> & Pick<ReadinessFinding, "id" | "dimension">): ReadinessFinding {
  return {
    requirement: "soft",
    state: "met",
    summary: overrides.id,
    why: `Why ${overrides.id}`,
    ...overrides,
  };
}

describe("readiness explanation engine", () => {
  it("explains a hard site/hull restriction as not recommended without calling soft gaps blockers", () => {
    const snapshot = buildReadinessSnapshot([
      finding({ id: "site-hull", dimension: "ship-fit", requirement: "hard", state: "unmet", summary: "Selected hull cannot enter this site", why: "The acceleration gate rejects this hull." }),
      finding({ id: "skills-ok", dimension: "skills", requirement: "hard", state: "met" }),
      finding({ id: "practice", dimension: "experience", requirement: "soft", state: "unmet", summary: "Practice the lower tier first" }),
    ]);

    const explanation = explainReadiness(snapshot, {
      actionHints: [{ findingId: "site-hull", action: "Switch to a hull allowed by this specific site." }],
    });

    expect(explanation.status).toBe("not-recommended");
    expect(explanation.technicalEligibility).toBe("blocked");
    expect(explanation.primaryIssue?.id).toBe("site-hull");
    expect(explanation.nextAction).toBe("Switch to a hull allowed by this specific site.");
    expect(explanation.blockers.map((entry) => entry.id)).toEqual(["site-hull"]);
    expect(explanation.gaps.map((entry) => entry.id)).toEqual(["practice"]);
    expect(explanation.why).toMatch(/hard requirement is unmet/i);
  });

  it("reports technically eligible but soft experience gap as nearly ready", () => {
    const snapshot = buildReadinessSnapshot([
      finding({ id: "entry", dimension: "skills", requirement: "hard", state: "met" }),
      finding({ id: "practice", dimension: "experience", requirement: "soft", state: "unmet", summary: "Practice one lower-tier run", why: "This activity assumes prior practice." }),
    ]);

    const explanation = explainReadiness(snapshot);
    expect(explanation.status).toBe("nearly-ready");
    expect(explanation.technicalEligibility).toBe("eligible");
    expect(explanation.primaryIssue?.id).toBe("practice");
    expect(explanation.nextAction).toBe("Resolve: Practice one lower-tier run");
    expect(explanation.blockers).toHaveLength(0);
    expect(explanation.gaps).toHaveLength(1);
  });

  it("treats cautions as nearly ready rather than a hard failure", () => {
    const snapshot = buildReadinessSnapshot([
      finding({ id: "entry", dimension: "skills", requirement: "hard", state: "met" }),
      finding({ id: "briefing", dimension: "knowledge-preparation", requirement: "soft", state: "caution", summary: "Review the failure conditions" }),
    ]);

    const explanation = explainReadiness(snapshot);
    expect(explanation.status).toBe("nearly-ready");
    expect(explanation.primaryIssue?.id).toBe("briefing");
    expect(explanation.nextAction).toBe("Review: Review the failure conditions");
    expect(explanation.warnings.map((entry) => entry.id)).toEqual(["briefing"]);
  });

  it("keeps a hard unknown as unknown rather than pass or fail", () => {
    const snapshot = buildReadinessSnapshot([
      finding({ id: "gate-access", dimension: "location-access", requirement: "hard", state: "unknown", summary: "Site access rule is unknown", why: "NEC does not have a verified access result." }),
    ]);

    const explanation = explainReadiness(snapshot);
    expect(explanation.status).toBe("unknown");
    expect(explanation.technicalEligibility).toBe("unknown");
    expect(explanation.primaryIssue?.id).toBe("gate-access");
    expect(explanation.nextAction).toBe("Verify: Site access rule is unknown");
  });

  it("does not claim ready when hard eligibility was never assessed", () => {
    const snapshot = buildReadinessSnapshot([
      finding({ id: "wallet-context", dimension: "isk", requirement: "context", state: "met" }),
    ]);

    const explanation = explainReadiness(snapshot);
    expect(explanation.status).toBe("unknown");
    expect(explanation.technicalEligibility).toBe("not-assessed");
    expect(explanation.primaryIssue).toBeNull();
    expect(explanation.nextAction).toBeNull();
    expect(explanation.why).toMatch(/not assessed enough hard entry information/i);
  });

  it("requires all relevant assessed facts to be known before declaring ready", () => {
    const snapshot = buildReadinessSnapshot([
      finding({ id: "entry", dimension: "skills", requirement: "hard", state: "met" }),
      finding({ id: "supplies", dimension: "supplies", requirement: "soft", state: "unknown", summary: "Supply coverage is unknown" }),
    ]);

    const explanation = explainReadiness(snapshot);
    expect(explanation.status).toBe("unknown");
    expect(explanation.primaryIssue?.id).toBe("supplies");
    expect(explanation.unknowns.map((entry) => entry.id)).toEqual(["supplies"]);
  });

  it("declares ready only when assessed hard and soft requirements are met", () => {
    const snapshot = buildReadinessSnapshot([
      finding({ id: "entry", dimension: "skills", requirement: "hard", state: "met" }),
      finding({ id: "fit", dimension: "ship-fit", requirement: "soft", state: "met" }),
      finding({ id: "supplies", dimension: "supplies", requirement: "soft", state: "met" }),
      finding({ id: "irrelevant", dimension: "location-access", requirement: "context", state: "not-applicable" }),
    ]);

    const explanation = explainReadiness(snapshot);
    expect(explanation.status).toBe("ready");
    expect(explanation.primaryIssue).toBeNull();
    expect(explanation.nextAction).toBeNull();
    expect(explanation.satisfied.map((entry) => entry.id)).toEqual(["entry", "fit", "supplies"]);
    expect(explanation.why).toMatch(/every assessed applicable requirement is met/i);
  });

  it("prioritizes hard blockers over earlier soft gaps and unknowns", () => {
    const snapshot = buildReadinessSnapshot([
      finding({ id: "soft-gap", dimension: "skills", requirement: "soft", state: "unmet" }),
      finding({ id: "unknown-soft", dimension: "supplies", requirement: "soft", state: "unknown" }),
      finding({ id: "hard-block", dimension: "location-access", requirement: "hard", state: "unmet" }),
    ]);

    const explanation = explainReadiness(snapshot);
    expect(explanation.primaryIssue?.id).toBe("hard-block");
    expect(explanation.status).toBe("not-recommended");
  });
});
