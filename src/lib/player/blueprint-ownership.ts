import { esiPaginated } from "@/lib/esi/client";
import type { EsiBlueprint } from "@/lib/esi/types";
import { buildBlueprintOwnershipIndex, type BlueprintOwnershipIndex } from "./blueprint-ownership-core";

export {
  blueprintOwnershipForType,
  buildBlueprintOwnershipIndex,
  type BlueprintInstanceKind,
  type BlueprintOwnershipIndex,
  type BlueprintOwnershipState,
  type BlueprintOwnershipSummary,
  type OwnedBlueprintInstance,
} from "./blueprint-ownership-core";

export async function loadCharacterBlueprintOwnership(characterId: number, token: string): Promise<BlueprintOwnershipIndex> {
  try {
    const blueprints = await esiPaginated<EsiBlueprint>(`/characters/${characterId}/blueprints`, token, 20);
    return buildBlueprintOwnershipIndex(blueprints);
  } catch (error) {
    console.warn("Unable to load character blueprints for Item Explorer ownership", error);
    return { visibility: "unavailable", reason: "esi-unavailable", byType: new Map() };
  }
}
