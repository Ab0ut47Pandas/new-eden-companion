import { describe, expect, it } from "vitest";

import { buildOwnedFirstGoalPlan } from "./owned-first-plan";

describe("buildOwnedFirstGoalPlan", () => {
  it("reuses trained skills and accessible owned items before reporting the uncovered remainder", () => {
    const plan = buildOwnedFirstGoalPlan({
      goal: { kind: "fitting", key: "fit:rifter-brawl", title: "Rifter brawl fit" },
      requirements: [
        { id: "skill:frigate", kind: "skill", title: "Minmatar Frigate III", reason: "Required to use the chosen hull.", typeId: 3329, requiredLevel: 3 },
        { id: "hull", kind: "hull", title: "Rifter", reason: "Chosen hull for this fitting.", typeId: 587, quantity: 1 },
        { id: "guns", kind: "module", title: "200mm AutoCannon I", reason: "Required by the chosen fitting.", typeId: 478, quantity: 3 },
        { id: "ammo", kind: "charge", title: "EMP S", reason: "Ammunition required by the chosen fitting.", typeId: 185, quantity: 1000 },
      ],
      trainedSkills: [{ typeId: 3329, trainedLevel: 4 }],
      ownedItems: [
        { typeId: 587, accessibleQuantity: 1 },
        { typeId: 478, accessibleQuantity: 2 },
        { typeId: 185, accessibleQuantity: 1000 },
      ],
      ownershipProvenance: ["ESI character assets"],
      skillProvenance: ["ESI character skills"],
    });

    expect(plan.covered.map((entry) => entry.requirement.id)).toEqual(["skill:frigate", "hull", "ammo"]);
    expect(plan.uncovered).toHaveLength(1);
    expect(plan.uncovered[0].requirement.id).toBe("guns");
    expect(plan.uncovered[0].status).toBe("partial");
    expect(plan.uncovered[0].missingQuantity).toBe(1);
    expect(plan.provenance).toEqual(["ESI character assets", "ESI character skills"]);
  });

  it("keeps inaccessible ownership distinct from accessible coverage", () => {
    const plan = buildOwnedFirstGoalPlan({
      goal: { kind: "ship", key: "type:587", title: "Rifter", typeId: 587 },
      requirements: [
        { id: "hull", kind: "hull", title: "Rifter", reason: "This is the selected ship goal.", typeId: 587, quantity: 1 },
      ],
      ownedItems: [{ typeId: 587, accessibleQuantity: 0, inaccessibleQuantity: 1 }],
      trainedSkills: [],
      ownershipProvenance: ["ESI assets with location accessibility overlay"],
      skillProvenance: [],
    });

    expect(plan.covered).toEqual([]);
    expect(plan.uncovered[0].status).toBe("partial");
    expect(plan.uncovered[0].accessibleOwnedQuantity).toBe(0);
    expect(plan.uncovered[0].inaccessibleOwnedQuantity).toBe(1);
    expect(plan.uncovered[0].explanation).toContain("not established as accessible");
  });

  it("preserves unavailable ownership and skill evidence as unknown instead of assuming missing", () => {
    const plan = buildOwnedFirstGoalPlan({
      goal: { kind: "skill", key: "skill:3329:3", title: "Minmatar Frigate III", typeId: 3329 },
      requirements: [
        { id: "skill", kind: "skill", title: "Minmatar Frigate III", reason: "Selected skill goal.", typeId: 3329, requiredLevel: 3 },
        { id: "book", kind: "consumable", title: "Skillbook", reason: "Required if the skill is not already injected.", typeId: 3329, quantity: 1 },
      ],
      ownedItems: null,
      trainedSkills: null,
      ownershipProvenance: ["ESI assets unavailable"],
      skillProvenance: ["ESI skills unavailable"],
    });

    expect(plan.uncovered).toEqual([]);
    expect(plan.unknown).toHaveLength(2);
    expect(plan.unknown.every((entry) => entry.status === "unknown")).toBe(true);
  });

  it("requires every inserted dependency to retain a parent reason", () => {
    expect(() => buildOwnedFirstGoalPlan({
      goal: { kind: "activity", key: "activity:mining", title: "Go mining" },
      requirements: [
        { id: "miner", kind: "module", title: "Miner I", reason: "", typeId: 483, quantity: 1 },
      ],
      ownedItems: [],
      trainedSkills: [],
      ownershipProvenance: [],
      skillProvenance: [],
    })).toThrow("parent reason is required");
  });

  it("supports every focused-beta goal kind without creating a new activity category", () => {
    for (const kind of ["activity", "ship", "fitting", "skill"] as const) {
      const plan = buildOwnedFirstGoalPlan({
        goal: { kind, key: `${kind}:example`, title: `${kind} goal` },
        requirements: [],
        ownedItems: [],
        trainedSkills: [],
        ownershipProvenance: [],
        skillProvenance: [],
      });
      expect(plan.goal.kind).toBe(kind);
    }
  });
});
