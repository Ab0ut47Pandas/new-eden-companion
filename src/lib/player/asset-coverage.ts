import "server-only";

import { esiPaginated } from "@/lib/esi/client";
import type { EsiAsset } from "@/lib/esi/types";

export type AssetCoverageStatus =
  | "owned"
  | "partial"
  | "missing"
  | "location-unknown"
  | "unavailable";

export interface AssetTypeQuantity {
  typeId: number;
  totalQuantity: number;
  knownLocationQuantity: number;
  unknownLocationQuantity: number;
}

export interface AssetCoverageIndex {
  visibility: "available" | "unavailable";
  reason?: "esi-unavailable";
  byType: Map<number, AssetTypeQuantity>;
}

export interface AssetRequirementCoverage extends AssetTypeQuantity {
  requiredQuantity: number;
  usableQuantity: number;
  missingQuantity: number;
  status: AssetCoverageStatus;
}

function rootAsset(asset: EsiAsset, assetsById: ReadonlyMap<number, EsiAsset>): EsiAsset {
  let current = asset;
  const visited = new Set<number>([asset.item_id]);
  while (assetsById.has(current.location_id) && !visited.has(current.location_id)) {
    visited.add(current.location_id);
    current = assetsById.get(current.location_id)!;
  }
  return current;
}

function hasKnownRootLocation(asset: EsiAsset): boolean {
  return asset.location_type === "station" || asset.location_type === "solar_system";
}

export function buildAssetCoverageIndex(assets: readonly EsiAsset[]): AssetCoverageIndex {
  const assetsById = new Map(assets.map((asset) => [asset.item_id, asset]));
  const byType = new Map<number, AssetTypeQuantity>();

  for (const asset of assets) {
    const quantity = Math.max(0, asset.quantity);
    if (quantity === 0) continue;

    const root = rootAsset(asset, assetsById);
    const current = byType.get(asset.type_id) ?? {
      typeId: asset.type_id,
      totalQuantity: 0,
      knownLocationQuantity: 0,
      unknownLocationQuantity: 0,
    };

    current.totalQuantity += quantity;
    if (hasKnownRootLocation(root)) current.knownLocationQuantity += quantity;
    else current.unknownLocationQuantity += quantity;
    byType.set(asset.type_id, current);
  }

  return { visibility: "available", byType };
}

export async function loadCharacterAssetCoverage(characterId: number, token: string): Promise<AssetCoverageIndex> {
  try {
    const assets = await esiPaginated<EsiAsset>(`/characters/${characterId}/assets`, token);
    return buildAssetCoverageIndex(assets);
  } catch (error) {
    console.warn("Unable to load character assets for dependency coverage", error);
    return { visibility: "unavailable", reason: "esi-unavailable", byType: new Map() };
  }
}

export function coverageForRequirement(
  index: AssetCoverageIndex,
  typeId: number,
  requiredQuantity: number,
): AssetRequirementCoverage {
  if (!Number.isInteger(requiredQuantity) || requiredQuantity < 0) {
    throw new RangeError("requiredQuantity must be a non-negative integer.");
  }

  const quantity = index.byType.get(typeId) ?? {
    typeId,
    totalQuantity: 0,
    knownLocationQuantity: 0,
    unknownLocationQuantity: 0,
  };

  if (index.visibility === "unavailable") {
    return {
      ...quantity,
      requiredQuantity,
      usableQuantity: 0,
      missingQuantity: requiredQuantity,
      status: "unavailable",
    };
  }

  const usableQuantity = Math.min(quantity.knownLocationQuantity, requiredQuantity);
  const missingQuantity = Math.max(0, requiredQuantity - quantity.totalQuantity);

  let status: AssetCoverageStatus;
  if (requiredQuantity === 0 || quantity.knownLocationQuantity >= requiredQuantity) status = "owned";
  else if (quantity.totalQuantity >= requiredQuantity) status = "location-unknown";
  else if (quantity.totalQuantity > 0) status = "partial";
  else status = "missing";

  return {
    ...quantity,
    requiredQuantity,
    usableQuantity,
    missingQuantity,
    status,
  };
}
