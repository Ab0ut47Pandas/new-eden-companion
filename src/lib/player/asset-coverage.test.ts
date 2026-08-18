import { describe, expect, it } from "vitest";

import type { EsiAsset } from "@/lib/esi/types";
import { buildAssetCoverageIndex, coverageForRequirement } from "./asset-coverage-core";

function asset(overrides: Partial<EsiAsset> & Pick<EsiAsset, "item_id" | "location_id" | "type_id">): EsiAsset {
  return {
    is_singleton: false,
    location_flag: "Hangar",
    location_type: "station",
    quantity: 1,
    ...overrides,
  };
}

describe("player asset coverage", () => {
  it("aggregates nested assets by type and known root location", () => {
    const index = buildAssetCoverageIndex([
      asset({ item_id: 10, location_id: 60000001, type_id: 100, quantity: 1, location_type: "station" }),
      asset({ item_id: 11, location_id: 10, type_id: 34, quantity: 700, location_type: "item" }),
      asset({ item_id: 12, location_id: 60000001, type_id: 34, quantity: 300, location_type: "station" }),
    ]);

    expect(index.byType.get(34)).toEqual({
      typeId: 34,
      totalQuantity: 1000,
      knownLocationQuantity: 1000,
      unknownLocationQuantity: 0,
    });
    expect(coverageForRequirement(index, 34, 900)).toMatchObject({
      status: "owned",
      requiredQuantity: 900,
      usableQuantity: 900,
      missingQuantity: 0,
    });
  });

  it("distinguishes partial and missing requirements", () => {
    const index = buildAssetCoverageIndex([
      asset({ item_id: 1, location_id: 60000001, type_id: 34, quantity: 250 }),
    ]);

    expect(coverageForRequirement(index, 34, 1000)).toMatchObject({ status: "partial", totalQuantity: 250, missingQuantity: 750 });
    expect(coverageForRequirement(index, 35, 20)).toMatchObject({ status: "missing", totalQuantity: 0, missingQuantity: 20 });
  });

  it("does not treat enough quantity at an unresolved root as confidently usable", () => {
    const index = buildAssetCoverageIndex([
      asset({ item_id: 1, location_id: 1_000_000_000_001, type_id: 34, quantity: 1200, location_type: "other" }),
    ]);

    expect(coverageForRequirement(index, 34, 1000)).toMatchObject({
      status: "location-unknown",
      totalQuantity: 1200,
      knownLocationQuantity: 0,
      unknownLocationQuantity: 1200,
      missingQuantity: 0,
    });
  });

  it("keeps unavailable asset visibility distinct from zero owned", () => {
    const coverage = coverageForRequirement(
      { visibility: "unavailable", reason: "esi-unavailable", byType: new Map() },
      34,
      1000,
    );

    expect(coverage).toMatchObject({ status: "unavailable", totalQuantity: 0, requiredQuantity: 1000 });
  });
});
