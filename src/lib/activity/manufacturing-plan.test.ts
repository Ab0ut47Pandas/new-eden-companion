import { describe, expect, it } from "vitest";

import {
  buildManufacturingPlan,
  manufacturingMaterialQuantity,
  planBlueprintUse,
  type ManufacturingPlanInput,
} from "./manufacturing-plan";

const baseInput: ManufacturingPlanInput = {
  productName: "Example Frigate",
  blueprintName: "Example Frigate Blueprint",
  productQuantityPerRun: 1,
  runs: 2,
  baseTimeSeconds: 600,
  inputLocationId: 60000001,
  inputLocationLabel: "Example Station",
  facilityAvailable: "yes",
  blueprintVisibility: "available",
  blueprints: [{
    itemId: 10,
    kind: "original",
    runs: -1,
    materialEfficiency: 10,
    timeEfficiency: 20,
    locationId: 60000001,
  }],
  materials: [{
    typeId: 34,
    name: "Tritanium",
    baseQuantityPerRun: 100,
    ownedAtInputLocation: 180,
    ownedAnywhere: 180,
  }],
  skills: [{
    typeId: 3380,
    name: "Industry",
    requiredLevel: 1,
    trainedLevel: 5,
    visibility: "available",
  }],
};

describe("manufacturingMaterialQuantity", () => {
  it("applies blueprint ME to a whole job and rounds up", () => {
    expect(manufacturingMaterialQuantity(100, 2, 10)).toBe(180);
  });

  it("does not reduce a one-per-run component below one per run", () => {
    expect(manufacturingMaterialQuantity(1, 10, 10)).toBe(10);
  });
});

describe("planBlueprintUse", () => {
  it("prefers an original at the selected input location", () => {
    const plan = planBlueprintUse("available", baseInput.blueprints, 60000001, 5);
    expect(plan.state).toBe("bpo");
    expect(plan.allocations).toEqual([expect.objectContaining({ itemId: 10, runs: 5, materialEfficiency: 10 })]);
  });

  it("can combine multiple BPCs when their licensed runs cover the job", () => {
    const plan = planBlueprintUse("available", [
      { itemId: 1, kind: "copy", runs: 2, materialEfficiency: 10, timeEfficiency: 20, locationId: 7 },
      { itemId: 2, kind: "copy", runs: 3, materialEfficiency: 5, timeEfficiency: 10, locationId: 7 },
    ], 7, 4);
    expect(plan.state).toBe("split-bpc");
    expect(plan.allocations.map((allocation) => allocation.runs)).toEqual([2, 2]);
  });
});

describe("buildManufacturingPlan", () => {
  it("can reach ready-to-verify without claiming the EVE job is already valid", () => {
    const plan = buildManufacturingPlan(baseInput);
    expect(plan.status).toBe("ready-to-verify");
    expect(plan.materials[0]).toEqual(expect.objectContaining({ requiredQuantity: 180, status: "ready" }));
    expect(plan.nextAction).toContain("EVE Industry window");
  });

  it("prioritizes acquiring a missing blueprint before materials", () => {
    const plan = buildManufacturingPlan({
      ...baseInput,
      blueprints: [],
      materials: [{ ...baseInput.materials[0], ownedAtInputLocation: 0, ownedAnywhere: 0 }],
    });
    expect(plan.status).toBe("blocked");
    expect(plan.blueprint.state).toBe("not-owned");
    expect(plan.nextAction).toBe("Obtain a usable Example Frigate Blueprint.");
  });

  it("distinguishes material acquisition from moving owned stock", () => {
    const plan = buildManufacturingPlan({
      ...baseInput,
      materials: [{ ...baseInput.materials[0], ownedAtInputLocation: 20, ownedAnywhere: 180 }],
    });
    expect(plan.status).toBe("needs-inputs");
    expect(plan.materials[0].status).toBe("move");
    expect(plan.nextAction).toContain("Move 160 Tritanium");
  });

  it("keeps facility availability unknown instead of declaring the job ready", () => {
    const plan = buildManufacturingPlan({ ...baseInput, facilityAvailable: "unknown" });
    expect(plan.status).toBe("unknown");
    expect(plan.nextAction).toContain("offers Manufacturing");
  });
});
