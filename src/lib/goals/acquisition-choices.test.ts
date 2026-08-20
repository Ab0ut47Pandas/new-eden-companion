import { describe, expect, it } from "vitest";

import { buildRequirementAcquisitionPlan } from "./acquisition-choices";
import type { FocusedRequirementCoverage } from "./owned-first-plan";

function itemCoverage(overrides: Partial<FocusedRequirementCoverage> = {}): FocusedRequirementCoverage {
  return {
    requirement: { id: "hull:587", kind: "hull", title: "Rifter", reason: "Required for the selected PvP hull goal.", typeId: 587, quantity: 1 },
    status: "missing",
    requiredQuantity: 1,
    accessibleOwnedQuantity: 0,
    inaccessibleOwnedQuantity: 0,
    missingQuantity: 1,
    requiredLevel: null,
    trainedLevel: null,
    explanation: "Missing.",
    ...overrides,
  };
}

describe("buildRequirementAcquisitionPlan", () => {
  it("shows build only when static evidence establishes an ordinary blueprint path", () => {
    const result = buildRequirementAcquisitionPlan(itemCoverage(), {
      sourceResolution: { typeId: 587, manufacturingBoundary: "ordinary-blueprint-available", sourceState: "unknown", sources: [] },
    });
    expect(result.choices.map((choice) => choice.kind)).toEqual(["build"]);
    expect(result.choices[0].provenance[0]).toContain("CCP Static Data Export");
  });

  it("preserves an explicit terminal source category instead of saying only not manufacturable", () => {
    const result = buildRequirementAcquisitionPlan(itemCoverage(), {
      sourceResolution: {
        typeId: 999,
        manufacturingBoundary: "no-ordinary-blueprint",
        sourceState: "known",
        sources: [{
          sourceKind: "loyalty-points",
          label: "Faction loyalty-point store",
          evidence: { kind: "curated", authority: "CCP", title: "Supported source", url: "https://www.eveonline.com/" },
        }],
      },
    });
    expect(result.choices).toEqual([expect.objectContaining({ kind: "source", label: "Faction loyalty-point store" })]);
    expect(result.choices[0].reason).toContain("loyalty-points");
  });

  it("does not invent market, haul, or substitute options without positive evidence", () => {
    const result = buildRequirementAcquisitionPlan(itemCoverage());
    expect(result.choices).toEqual([expect.objectContaining({ kind: "unknown", label: "Source not established" })]);
  });

  it("accepts buy, haul, and substitute choices only from explicit supported evidence", () => {
    const result = buildRequirementAcquisitionPlan(itemCoverage(), {
      market: { state: "available", summary: "Visible verified sell orders exist for this exact type.", provenance: ["verified market orders"] },
      haul: { state: "available", summary: "An accessible owned hull is established at another known location.", provenance: ["ESI assets + resolved location"] },
      substitutes: [{ title: "Slasher", reason: "A validated activity rule accepts this hull as an alternative.", provenance: ["validated activity requirement"] }],
    });
    expect(result.choices.map((choice) => choice.kind)).toEqual(["buy", "haul", "substitute"]);
  });

  it("keeps unknown ownership from turning into an acquisition order", () => {
    const result = buildRequirementAcquisitionPlan(itemCoverage({ status: "unknown", accessibleOwnedQuantity: null, inaccessibleOwnedQuantity: null, missingQuantity: null }));
    expect(result.choices[0]).toEqual(expect.objectContaining({ kind: "unknown", label: "Acquisition cannot be planned yet" }));
  });

  it("separates the shortest usable skill milestone from optional optimization levels", () => {
    const skill: FocusedRequirementCoverage = {
      requirement: { id: "skill:3327", kind: "skill", title: "Spaceship Command", reason: "Required by the selected hull.", typeId: 3327, requiredLevel: 3 },
      status: "missing",
      requiredQuantity: null,
      accessibleOwnedQuantity: null,
      inaccessibleOwnedQuantity: null,
      missingQuantity: null,
      requiredLevel: 3,
      trainedLevel: 1,
      explanation: "Level 3 required.",
    };
    const result = buildRequirementAcquisitionPlan(skill);
    expect(result.trainingMilestone).toEqual(expect.objectContaining({ shortestUsableLevel: 3, trainedLevel: 1, optionalOptimizationLevels: [4, 5] }));
    expect(result.choices).toEqual([]);
  });
});
