import "server-only";

import { esi, resolveNames } from "@/lib/esi/client";
import type { ShipActivity, ShipCatalogEntry, ShipCatalogResponse, ShipSize } from "@/lib/ships/model";

interface EsiCategory {
  groups: number[];
}

interface EsiGroup {
  group_id: number;
  name: string;
  published: boolean;
  types: number[];
}

interface EsiShipType {
  type_id: number;
  name: string;
  group_id: number;
  published: boolean;
  dogma_attributes?: Array<{ attribute_id: number; value: number }>;
}

const SKILL_ATTRIBUTES = [
  { skill: 182, level: 277 },
  { skill: 183, level: 278 },
  { skill: 184, level: 279 },
  { skill: 1285, level: 1286 },
  { skill: 1289, level: 1287 },
  { skill: 1290, level: 1288 },
];

const CAPITAL_GROUPS = new Set(["Capital Industrial Ship", "Carrier", "Command Carrier", "Dreadnought", "Force Auxiliary", "Lancer Dreadnought", "Supercarrier", "Titan"]);
const LARGE_GROUPS = new Set(["Battleship", "Black Ops", "Elite Battleship", "Freighter", "Jump Freighter", "Marauder"]);
const MEDIUM_GROUPS = new Set(["Attack Battlecruiser", "Combat Battlecruiser", "Command Ship", "Cruiser", "Flag Cruiser", "Heavy Assault Cruiser", "Heavy Interdiction Cruiser", "Industrial Command Ship", "Logistics", "Mining Barge", "Exhumer", "Strategic Cruiser", "Combat Recon Ship", "Force Recon Ship"]);
const HAULING_GROUPS = new Set(["Blockade Runner", "Deep Space Transport", "Freighter", "Hauler", "Jump Freighter"]);
const INDUSTRY_GROUPS = new Set(["Capital Industrial Ship", "Expedition Command Ship", "Expedition Frigate", "Exhumer", "Industrial Command Ship", "Mining Barge"]);
const EXPLORATION_GROUPS = new Set(["Covert Ops", "Prototype Exploration Ship", "Special Edition Yachts", "Strategic Cruiser"]);
const LOGISTICS_GROUPS = new Set(["Command Carrier", "Command Destroyer", "Command Ship", "Force Auxiliary", "Logistics", "Logistics Frigate"]);
const TRAVEL_GROUPS = new Set(["Capsule", "Shuttle"]);

function sizeFor(group: string): ShipSize {
  if (CAPITAL_GROUPS.has(group)) return "Capital";
  if (LARGE_GROUPS.has(group)) return "Large";
  if (MEDIUM_GROUPS.has(group)) return "Medium";
  return "Small";
}

function activityFor(group: string): ShipActivity {
  if (TRAVEL_GROUPS.has(group)) return "Travel";
  if (HAULING_GROUPS.has(group)) return "Hauling";
  if (INDUSTRY_GROUPS.has(group)) return "Industry";
  if (LOGISTICS_GROUPS.has(group)) return "Logistics";
  if (EXPLORATION_GROUPS.has(group)) return "Exploration";
  return "Combat";
}

async function mapInBatches<T, R>(items: T[], batchSize: number, operation: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let start = 0; start < items.length; start += batchSize) {
    results.push(...await Promise.all(items.slice(start, start + batchSize).map(operation)));
  }
  return results;
}

let catalogPromise: Promise<ShipCatalogResponse> | undefined;

async function buildCatalog(): Promise<ShipCatalogResponse> {
  const category = await esi<EsiCategory>("/universe/categories/6", { revalidate: 86_400 });
  const groups = (await mapInBatches(category.groups, 12, (groupId) =>
    esi<EsiGroup>(`/universe/groups/${groupId}`, { revalidate: 86_400 }),
  )).filter((group) => group.published);
  const groupById = new Map(groups.map((group) => [group.group_id, group]));
  const typeIds = [...new Set(groups.flatMap((group) => group.types))];
  const types = (await mapInBatches(typeIds, 24, async (typeId) => {
    try {
      return await esi<EsiShipType>(`/universe/types/${typeId}`, { revalidate: 86_400 });
    } catch (error) {
      console.warn(`Ship type ${typeId} could not be loaded`, error);
      return null;
    }
  })).filter((type): type is EsiShipType => Boolean(type?.published));

  const skillIds = new Set<number>();
  const rawRequirements = new Map<number, Array<{ skillId: number; level: number }>>();
  for (const type of types) {
    const attributes = new Map((type.dogma_attributes ?? []).map((attribute) => [attribute.attribute_id, attribute.value]));
    const requirements = SKILL_ATTRIBUTES.flatMap(({ skill, level }) => {
      const skillId = Math.trunc(attributes.get(skill) ?? 0);
      const requiredLevel = Math.trunc(attributes.get(level) ?? 0);
      if (!skillId || !requiredLevel) return [];
      skillIds.add(skillId);
      return [{ skillId, level: requiredLevel }];
    });
    rawRequirements.set(type.type_id, requirements);
  }
  const skillNames = await resolveNames([...skillIds]);

  const ships: ShipCatalogEntry[] = types
    .flatMap((type) => {
      const group = groupById.get(type.group_id);
      if (!group) return [];
      const requirements = (rawRequirements.get(type.type_id) ?? []).map((requirement) => ({
        ...requirement,
        skillName: skillNames.get(requirement.skillId) ?? `Skill ${requirement.skillId}`,
      }));
      if (!requirements.length) return [];
      return [{
        typeId: type.type_id,
        name: type.name,
        groupId: type.group_id,
        group: group.name,
        size: sizeFor(group.name),
        activity: activityFor(group.name),
        requirements,
      }];
    })
    .sort((left, right) => left.group.localeCompare(right.group) || left.name.localeCompare(right.name));

  return { fetchedAt: new Date().toISOString(), source: "ESI", ships };
}

export function getShipCatalog(): Promise<ShipCatalogResponse> {
  catalogPromise ??= buildCatalog().catch((error) => {
    catalogPromise = undefined;
    throw error;
  });
  return catalogPromise;
}
