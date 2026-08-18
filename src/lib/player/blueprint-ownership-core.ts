import type { EsiBlueprint } from "@/lib/esi/types";

export type BlueprintInstanceKind = "original" | "copy" | "unknown";

export interface OwnedBlueprintInstance {
  itemId: number;
  typeId: number;
  kind: BlueprintInstanceKind;
  runs: number;
  materialEfficiency: number;
  timeEfficiency: number;
  locationId: number;
  locationFlag: string;
}

export interface BlueprintOwnershipIndex {
  visibility: "available" | "unavailable";
  reason?: "esi-unavailable";
  byType: Map<number, OwnedBlueprintInstance[]>;
}

export type BlueprintOwnershipState = "owned" | "not-owned" | "unavailable";

export interface BlueprintOwnershipSummary {
  typeId: number;
  state: BlueprintOwnershipState;
  originals: OwnedBlueprintInstance[];
  copies: OwnedBlueprintInstance[];
  unknown: OwnedBlueprintInstance[];
  totalCopyRuns: number;
}

function blueprintKind(blueprint: EsiBlueprint): BlueprintInstanceKind {
  if (blueprint.runs === -1) return "original";
  if (blueprint.runs >= 0) return "copy";
  return "unknown";
}

export function buildBlueprintOwnershipIndex(blueprints: readonly EsiBlueprint[]): BlueprintOwnershipIndex {
  const byType = new Map<number, OwnedBlueprintInstance[]>();

  for (const blueprint of blueprints) {
    const instance: OwnedBlueprintInstance = {
      itemId: blueprint.item_id,
      typeId: blueprint.type_id,
      kind: blueprintKind(blueprint),
      runs: blueprint.runs,
      materialEfficiency: blueprint.material_efficiency,
      timeEfficiency: blueprint.time_efficiency,
      locationId: blueprint.location_id,
      locationFlag: blueprint.location_flag,
    };
    const instances = byType.get(blueprint.type_id) ?? [];
    instances.push(instance);
    byType.set(blueprint.type_id, instances);
  }

  for (const instances of byType.values()) {
    instances.sort((left, right) => {
      const kindOrder = { original: 0, copy: 1, unknown: 2 } as const;
      if (kindOrder[left.kind] !== kindOrder[right.kind]) return kindOrder[left.kind] - kindOrder[right.kind];
      if (left.materialEfficiency !== right.materialEfficiency) return right.materialEfficiency - left.materialEfficiency;
      if (left.timeEfficiency !== right.timeEfficiency) return right.timeEfficiency - left.timeEfficiency;
      if (left.runs !== right.runs) return right.runs - left.runs;
      return left.itemId - right.itemId;
    });
  }

  return { visibility: "available", byType };
}

export function blueprintOwnershipForType(index: BlueprintOwnershipIndex, typeId: number): BlueprintOwnershipSummary {
  if (index.visibility === "unavailable") {
    return { typeId, state: "unavailable", originals: [], copies: [], unknown: [], totalCopyRuns: 0 };
  }

  const instances = index.byType.get(typeId) ?? [];
  const originals = instances.filter((blueprint) => blueprint.kind === "original");
  const copies = instances.filter((blueprint) => blueprint.kind === "copy");
  const unknown = instances.filter((blueprint) => blueprint.kind === "unknown");

  return {
    typeId,
    state: instances.length > 0 ? "owned" : "not-owned",
    originals,
    copies,
    unknown,
    totalCopyRuns: copies.reduce((sum, blueprint) => sum + Math.max(0, blueprint.runs), 0),
  };
}
