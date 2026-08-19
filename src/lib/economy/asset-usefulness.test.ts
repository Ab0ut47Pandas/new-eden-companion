import { describe, expect, it } from "vitest";

import {
  classifyAssetUsefulness,
  classifyOwnedAssets,
  type AssetUsefulnessContext,
} from "./asset-usefulness";

function baseContext(typeId = 34, name = "Tritanium"): AssetUsefulnessContext {
  return {
    asset: { typeId, name, quantity: 1000 },
  };
}

describe("asset usefulness classifier", () => {
  it("protects the direct target of an active saved goal", () => {
    const result = classifyAssetUsefulness({
      ...baseContext(587, "Rifter"),
      goals: [
        { id: "goal-rifter", title: "Own a Rifter", status: "active", targetTypeId: 587 },
        { id: "old-goal", title: "Old Rifter goal", status: "completed", targetTypeId: 587 },
      ],
    });

    expect(result.disposition).toBe("goal-critical");
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]).toMatchObject({ relationship: "goal-target", sourceId: "goal-rifter" });
    expect(result.why).toMatch(/direct target/i);
  });

  it("protects manufacturing inputs that support an active goal", () => {
    const result = classifyAssetUsefulness({
      ...baseContext(),
      manufacturingDependencies: [
        {
          goalId: "goal-ship",
          goalTitle: "Build the ship",
          goalStatus: "active",
          productTypeId: 587,
          productName: "Rifter",
          materialTypeId: 34,
          requiredQuantity: 2500,
        },
        {
          goalId: "goal-old",
          goalTitle: "Completed build",
          goalStatus: "completed",
          productTypeId: 587,
          productName: "Rifter",
          materialTypeId: 34,
          requiredQuantity: 2500,
        },
      ],
    });

    expect(result.disposition).toBe("goal-critical");
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]).toMatchObject({
      relationship: "manufacturing-input",
      requiredQuantity: 2500,
    });
  });

  it("keeps items used by active activities and recommended fittings", () => {
    const result = classifyAssetUsefulness({
      ...baseContext(178, "Carbonized Lead S"),
      activities: [
        {
          activityId: "mission:l3",
          activityTitle: "Level 3 security missions",
          status: "active",
          typeId: 178,
          why: "This ammunition is recorded as a supply for the active mission plan.",
        },
      ],
      fitRecommendations: [
        {
          fitId: "fit-rifter",
          fitName: "Mission Rifter",
          shipName: "Rifter",
          typeId: 178,
          recommended: true,
          role: "charge",
        },
      ],
    });

    expect(result.disposition).toBe("keep");
    expect(result.evidence.map((entry) => entry.relationship)).toEqual(["activity-supply", "fit-component"]);
  });

  it("ignores inactive activities and fittings that are not recommendations", () => {
    const result = classifyAssetUsefulness({
      ...baseContext(178, "Carbonized Lead S"),
      activities: [
        {
          activityId: "mission:l3",
          activityTitle: "Level 3 security missions",
          status: "inactive",
          typeId: 178,
          why: "No longer active.",
        },
      ],
      fitRecommendations: [
        {
          fitId: "fit-rifter",
          fitName: "Mission Rifter",
          shipName: "Rifter",
          typeId: 178,
          recommended: false,
          role: "charge",
        },
      ],
    });

    expect(result.disposition).toBe("unknown");
    expect(result.evidence).toHaveLength(0);
  });

  it("only marks an otherwise unused item as a sell candidate when explicit sale evidence is supplied", () => {
    const withoutSaleEvidence = classifyAssetUsefulness(baseContext());
    expect(withoutSaleEvidence.disposition).toBe("unknown");
    expect(withoutSaleEvidence.why).toMatch(/not safe to recommend selling/i);

    const withSaleEvidence = classifyAssetUsefulness({
      ...baseContext(),
      saleEvidence: {
        why: "A current market service established a liquid sale path.",
        estimatedUnitValueIsk: 5.25,
        asOf: 1_800_000_000_000,
        source: "market-service",
      },
    });
    expect(withSaleEvidence.disposition).toBe("sell-candidate");
  });

  it("lets supported usefulness outrank supplied sale evidence", () => {
    const result = classifyAssetUsefulness({
      ...baseContext(587, "Rifter"),
      goals: [{ id: "goal-rifter", title: "Own a Rifter", status: "active", targetTypeId: 587 }],
      saleEvidence: { why: "The ship has a market price." },
    });

    expect(result.disposition).toBe("goal-critical");
    expect(result.saleEvidence).not.toBeNull();
  });

  it("orders classifications by action priority and rejects duplicate type summaries", () => {
    const results = classifyOwnedAssets([
      baseContext(34, "Tritanium"),
      {
        ...baseContext(587, "Rifter"),
        goals: [{ id: "goal-rifter", title: "Own a Rifter", status: "active", targetTypeId: 587 }],
      },
      {
        ...baseContext(178, "Carbonized Lead S"),
        activities: [{
          activityId: "mission:l3",
          activityTitle: "Level 3 security missions",
          status: "active",
          typeId: 178,
          why: "Mission supply.",
        }],
      },
      {
        ...baseContext(35, "Pyerite"),
        saleEvidence: { why: "Explicit sale evidence." },
      },
    ]);

    expect(results.map((entry) => entry.disposition)).toEqual(["goal-critical", "keep", "sell-candidate", "unknown"]);

    expect(() => classifyOwnedAssets([baseContext(), baseContext()])).toThrow(/Duplicate asset type ID/);
  });

  it("rejects malformed asset and sale evidence instead of silently classifying it", () => {
    expect(() => classifyAssetUsefulness({ asset: { typeId: 0, name: "bad", quantity: 1 } })).toThrow(/positive integer/);
    expect(() => classifyAssetUsefulness({ asset: { typeId: 34, name: "Tritanium", quantity: 0 } })).toThrow(/quantity/);
    expect(() => classifyAssetUsefulness({
      ...baseContext(),
      saleEvidence: { why: "bad", estimatedUnitValueIsk: -1 },
    })).toThrow(/non-negative/);
  });
});
