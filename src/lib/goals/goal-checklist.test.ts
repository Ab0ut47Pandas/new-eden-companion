import { describe, expect, it } from "vitest";

import { buildRequirementAcquisitionPlan } from "./acquisition-choices";
import { buildGoalChecklist } from "./goal-checklist";
import { buildOwnedFirstGoalPlan, type FocusedGoalRequirement } from "./owned-first-plan";

const goal = { kind: "ship" as const, key: "ship:type:587", title: "Rifter", typeId: 587 };

function plan(requirements: readonly FocusedGoalRequirement[], ownedItems: { typeId: number; accessibleQuantity: number }[] | null = []) {
  return buildOwnedFirstGoalPlan({ goal, requirements, ownedItems, trainedSkills: [], ownershipProvenance: ["ESI assets"], skillProvenance: ["ESI skills"] });
}

describe("buildGoalChecklist", () => {
  it("shows one obvious next action and keeps the parent reason in every milestone", () => {
    const owned = plan([
      { id: "hull", kind: "hull", title: "Rifter", reason: "The PvP fit you chose needs this hull.", typeId: 587, quantity: 1 },
      { id: "ammo", kind: "charge", title: "EMP S", reason: "The PvP fit you chose needs ammunition.", typeId: 185, quantity: 1000 },
    ]);
    const acquisitions = owned.uncovered.map((coverage) => buildRequirementAcquisitionPlan(coverage, {
      market: { state: "available", summary: "Verified market evidence exists.", provenance: ["market"] },
    }));
    const result = buildGoalChecklist(owned, acquisitions);
    expect(result.nextAction).toBe("Buy it: Rifter");
    expect(result.nextActionReason).toBe("The PvP fit you chose needs this hull.");
    expect(result.milestones.map((entry) => entry.reason)).toEqual([
      "The PvP fit you chose needs this hull.",
      "The PvP fit you chose needs ammunition.",
    ]);
  });

  it("collapses already-owned requirements instead of turning them into chores", () => {
    const owned = plan([
      { id: "hull", kind: "hull", title: "Rifter", reason: "Selected hull.", typeId: 587, quantity: 1 },
      { id: "ammo", kind: "charge", title: "EMP S", reason: "Required ammunition.", typeId: 185, quantity: 1000 },
    ], [{ typeId: 587, accessibleQuantity: 1 }]);
    const acquisitions = owned.uncovered.map((coverage) => buildRequirementAcquisitionPlan(coverage));
    const result = buildGoalChecklist(owned, acquisitions);
    expect(result.milestones).toHaveLength(1);
    expect(result.milestones[0].label).toBe("Resolve how to obtain EMP S");
  });

  it("uses the shortest usable skill level and does not promote optimization levels into the main path", () => {
    const owned = buildOwnedFirstGoalPlan({
      goal: { kind: "skill", key: "skill:type:3327:level:3", title: "Spaceship Command III", typeId: 3327 },
      requirements: [{ id: "skill", kind: "skill", title: "Spaceship Command", reason: "The selected hull requires level III.", typeId: 3327, requiredLevel: 3 }],
      ownedItems: [],
      trainedSkills: [{ typeId: 3327, trainedLevel: 1 }],
      ownershipProvenance: [],
      skillProvenance: ["ESI skills"],
    });
    const acquisitions = owned.uncovered.map((coverage) => buildRequirementAcquisitionPlan(coverage));
    const result = buildGoalChecklist(owned, acquisitions);
    expect(result.nextAction).toBe("Train Spaceship Command to level 3");
    expect(result.nextAction).not.toContain("4");
    expect(result.nextAction).not.toContain("5");
  });

  it("keeps unknown evidence actionable without guessing an acquisition path", () => {
    const unknown = plan([{ id: "hull", kind: "hull", title: "Rifter", reason: "Selected hull.", typeId: 587, quantity: 1 }], null);
    const acquisitions = unknown.unknown.map((coverage) => buildRequirementAcquisitionPlan(coverage));
    const result = buildGoalChecklist(unknown, acquisitions);
    expect(result.nextAction).toBe("Resolve how to obtain Rifter");
    expect(result.milestones[0].state).toBe("cannot-verify");
  });

  it("caps default milestones without inventing padding chores", () => {
    const requirements = Array.from({ length: 8 }, (_, index) => ({
      id: `material:${index}`,
      kind: "material" as const,
      title: `Material ${index}`,
      reason: `Required by the selected build: part ${index}.`,
      typeId: 1000 + index,
      quantity: 1,
    }));
    const owned = plan(requirements);
    const acquisitions = owned.uncovered.map((coverage) => buildRequirementAcquisitionPlan(coverage));
    const result = buildGoalChecklist(owned, acquisitions);
    expect(result.milestones).toHaveLength(6);
    expect(result.hiddenMilestoneCount).toBe(2);
  });
});
