import { esiPaginated } from "@/lib/esi/client";
import type { EsiAsset } from "@/lib/esi/types";
import { buildAssetCoverageIndex, type AssetCoverageIndex } from "./asset-coverage-core";

export {
  buildAssetCoverageIndex,
  coverageForRequirement,
  type AssetCoverageIndex,
  type AssetCoverageStatus,
  type AssetRequirementCoverage,
  type AssetTypeQuantity,
} from "./asset-coverage-core";

export async function loadCharacterAssetCoverage(characterId: number, token: string): Promise<AssetCoverageIndex> {
  try {
    const assets = await esiPaginated<EsiAsset>(`/characters/${characterId}/assets`, token);
    return buildAssetCoverageIndex(assets);
  } catch (error) {
    console.warn("Unable to load character assets for dependency coverage", error);
    return { visibility: "unavailable", reason: "esi-unavailable", byType: new Map() };
  }
}
