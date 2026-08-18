import { describe, expect, it } from "vitest";

import type { EsiBlueprint } from "@/lib/esi/types";
import { blueprintOwnershipForType, buildBlueprintOwnershipIndex } from "./blueprint-ownership-core";

function blueprint(overrides: Partial<EsiBlueprint> & Pick<EsiBlueprint, "item_id" | "type_id" | "runs">): EsiBlueprint {
  return {
    location_flag: "Hangar",
    location_id: 60000001,
    material_efficiency: 0,
    quantity: 1,
    time_efficiency: 0,
    ...overrides,
  };
}

describe("blueprint ownership", () => {
  it("distinguishes originals from copies and keeps research state", () => {
    const index = buildBlueprintOwnershipIndex([
      blueprint({ item_id: 1, type_id: 1000, runs: -1, material_efficiency: 10, time_efficiency: 20 }),
      blueprint({ item_id: 2, type_id: 1000, runs: 5, material_efficiency: 5, time_efficiency: 10 }),
      blueprint({ item_id: 3, type_id: 1000, runs: 2, material_efficiency: 8, time_efficiency: 16 }),
    ]);

    expect(blueprintOwnershipForType(index, 1000)).toMatchObject({
      state: "owned",
      totalCopyRuns: 7,
      originals: [{ kind: "original", runs: -1, materialEfficiency: 10, timeEfficiency: 20 }],
      copies: [
        { kind: "copy", runs: 2, materialEfficiency: 8, timeEfficiency: 16 },
        { kind: "copy", runs: 5, materialEfficiency: 5, timeEfficiency: 10 },
      ],
      unknown: [],
    });
  });

  it("reports no owned blueprint when the visible list has no matching type", () => {
    const index = buildBlueprintOwnershipIndex([]);
    expect(blueprintOwnershipForType(index, 1000)).toEqual({
      typeId: 1000,
      state: "not-owned",
      originals: [],
      copies: [],
      unknown: [],
      totalCopyRuns: 0,
    });
  });

  it("preserves unexpected negative runs as unknown rather than forcing BPO/BPC", () => {
    const index = buildBlueprintOwnershipIndex([
      blueprint({ item_id: 1, type_id: 1000, runs: -7, material_efficiency: 1, time_efficiency: 2 }),
    ]);
    expect(blueprintOwnershipForType(index, 1000)).toMatchObject({
      state: "owned",
      originals: [],
      copies: [],
      unknown: [{ kind: "unknown", runs: -7 }],
    });
  });

  it("keeps unavailable blueprint visibility distinct from not owned", () => {
    expect(blueprintOwnershipForType(
      { visibility: "unavailable", reason: "esi-unavailable", byType: new Map() },
      1000,
    )).toMatchObject({ state: "unavailable", originals: [], copies: [], unknown: [] });
  });
});
