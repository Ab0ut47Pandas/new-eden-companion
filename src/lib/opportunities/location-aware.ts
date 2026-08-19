import "server-only";

import { esi, esiPaginated } from "@/lib/esi/client";
import type { EsiAsset, EsiLocation, EsiStructure } from "@/lib/esi/types";
import { MARKET_HUBS } from "@/lib/map/hubs";
import type { RoutePreference } from "@/lib/map/model";
import { calculateRoute, mapSystem, mapSystems } from "@/lib/map/service";
import { displayedSecurity } from "@/lib/map/security";
import { rankNearbyOpportunities } from "@/lib/opportunities/location-aware-core";
import type {
  LocationAwareOpportunityScan,
  NearbyOpportunity,
  NearbyRouteEvidence,
} from "@/lib/opportunities/location-aware-model";

interface EsiStation {
  name: string;
  system_id: number;
}

interface AssetRoot {
  id: number;
  type: EsiAsset["location_type"];
  itemCount: number;
}

function rootLocation(asset: EsiAsset, assetsById: Map<number, EsiAsset>): { id: number; type: EsiAsset["location_type"] } {
  let current = asset;
  const visited = new Set<number>([asset.item_id]);
  while (assetsById.has(current.location_id) && !visited.has(current.location_id)) {
    visited.add(current.location_id);
    current = assetsById.get(current.location_id)!;
  }
  return { id: current.location_id, type: current.location_type };
}

function groupAssetRoots(assets: EsiAsset[]): AssetRoot[] {
  const assetsById = new Map(assets.map((asset) => [asset.item_id, asset]));
  const roots = new Map<string, AssetRoot>();
  for (const asset of assets) {
    const root = rootLocation(asset, assetsById);
    const key = `${root.type}:${root.id}`;
    const existing = roots.get(key);
    if (existing) existing.itemCount += 1;
    else roots.set(key, { ...root, itemCount: 1 });
  }
  return [...roots.values()];
}

async function routeEvidence(
  originSystemId: number,
  destinationSystemId: number,
  preference: RoutePreference,
): Promise<NearbyRouteEvidence | null> {
  try {
    const route = await calculateRoute(originSystemId, destinationSystemId, preference);
    const systems = await mapSystems(route);
    const security = systems.map((system) => system.securityStatus);
    return {
      jumps: Math.max(0, route.length - 1),
      minimumSecurity: security.length ? Math.min(...security) : null,
      riskySystems: security.length ? security.filter((value) => displayedSecurity(value) < 0.5).length : null,
      preference,
    };
  } catch {
    return null;
  }
}

async function resolveAssetRoot(root: AssetRoot, token: string): Promise<{
  locationId: number;
  locationName: string;
  systemId: number;
  systemName: string;
  itemCount: number;
} | null> {
  try {
    if (root.type === "solar_system") {
      const system = await mapSystem(root.id);
      return { locationId: root.id, locationName: system.name, systemId: root.id, systemName: system.name, itemCount: root.itemCount };
    }
    if (root.type === "station") {
      const station = await esi<EsiStation>(`/universe/stations/${root.id}`, { revalidate: 86_400 });
      const system = await mapSystem(station.system_id);
      return { locationId: root.id, locationName: station.name, systemId: station.system_id, systemName: system.name, itemCount: root.itemCount };
    }
    if (root.id > 1_000_000_000_000) {
      const structure = await esi<EsiStructure>(`/universe/structures/${root.id}`, { token });
      const system = await mapSystem(structure.solar_system_id);
      return { locationId: root.id, locationName: structure.name, systemId: structure.solar_system_id, systemName: system.name, itemCount: root.itemCount };
    }
  } catch {
    return null;
  }
  return null;
}

export async function scanLocationAwareOpportunities(input: {
  characterId: number;
  token: string;
  routePreference?: RoutePreference;
}): Promise<LocationAwareOpportunityScan> {
  const routePreference = input.routePreference ?? "safer";
  const [location, assets] = await Promise.all([
    esi<EsiLocation>(`/characters/${input.characterId}/location`, { token: input.token }),
    esiPaginated<EsiAsset>(`/characters/${input.characterId}/assets`, input.token),
  ]);
  const currentSystem = await mapSystem(location.solar_system_id);

  const roots = groupAssetRoots(assets);
  const resolvedRoots = (await Promise.all(roots.map((root) => resolveAssetRoot(root, input.token))))
    .filter((root): root is NonNullable<typeof root> => Boolean(root));
  const unresolvedRootCount = roots.length - resolvedRoots.length;

  const destinationSystemIds = [...new Set([
    ...resolvedRoots.map((root) => root.systemId),
    ...MARKET_HUBS.map((hub) => hub.id),
  ])];
  const routes = new Map<number, NearbyRouteEvidence | null>();
  for (let start = 0; start < destinationSystemIds.length; start += 8) {
    const chunk = destinationSystemIds.slice(start, start + 8);
    const evidence = await Promise.all(chunk.map((systemId) => routeEvidence(location.solar_system_id, systemId, routePreference)));
    chunk.forEach((systemId, index) => routes.set(systemId, evidence[index]));
  }

  const assetCandidates: NearbyOpportunity[] = resolvedRoots.map((root) => ({
    id: `asset:${root.locationId}`,
    kind: "asset",
    title: `${root.itemCount} asset ${root.itemCount === 1 ? "entry" : "entries"} at ${root.locationName}`,
    detail: `ESI-visible character assets rooted in ${root.systemName}.`,
    destinationSystemId: root.systemId,
    destinationSystemName: root.systemName,
    locationId: root.locationId,
    itemCount: root.itemCount,
    route: routes.get(root.systemId) ?? null,
    evidence: ["Character asset inventory from ESI", "Universe location resolved by station, structure, or solar-system data"],
    limitations: ["Asset visibility is limited to what ESI exposes to the connected character.", "NEC does not know whether moving these assets is worthwhile or safe without additional valuation and hauling context."],
  }));

  const serviceCandidates: NearbyOpportunity[] = MARKET_HUBS.map((hub) => ({
    id: `market:${hub.stationId}`,
    kind: "service",
    title: `${hub.name} market hub`,
    detail: `${hub.stationName} in ${hub.regionName}.`,
    destinationSystemId: hub.id,
    destinationSystemName: hub.name,
    locationId: hub.stationId,
    route: routes.get(hub.id) ?? null,
    evidence: ["Known NEC market-hub catalog", "Route calculated from the character's ESI-visible current solar system"],
    limitations: ["A route is navigation evidence, not a safety guarantee.", "NEC does not infer docking access to arbitrary player-owned structures from this market-hub suggestion."],
  }));

  const activityCandidates: NearbyOpportunity[] = MARKET_HUBS.flatMap((hub) => {
    const route = routes.get(hub.id) ?? null;
    const shared = {
      destinationSystemId: hub.id,
      destinationSystemName: hub.name,
      locationId: hub.stationId,
      route,
      evidence: ["Character location from ESI", "Existing NEC market opportunity tools at a known hub"],
      limitations: ["This suggests an analysis workflow, not a claim that an in-space site or resource is currently spawned.", "Market conditions can change after the scan."],
    };
    return [
      {
        ...shared,
        id: `activity:trade:${hub.id}`,
        kind: "activity" as const,
        title: `Check trade opportunities from ${hub.name}`,
        detail: "Run NEC's station-order trade scan using this hub as the source.",
      },
      {
        ...shared,
        id: `activity:mining:${hub.id}`,
        kind: "activity" as const,
        title: `Check ore sale values at ${hub.name}`,
        detail: "Compare raw-ore immediate-buy value at this hub before choosing where to sell mined material.",
      },
    ];
  });

  return {
    current: {
      solarSystemId: location.solar_system_id,
      solarSystemName: currentSystem.name,
      securityStatus: currentSystem.securityStatus,
      stationId: location.station_id,
      structureId: location.structure_id,
    },
    routePreference,
    assets: rankNearbyOpportunities(assetCandidates),
    services: rankNearbyOpportunities(serviceCandidates),
    activities: rankNearbyOpportunities(activityCandidates),
    notes: [
      "Character location is the last location exposed by ESI; NEC does not watch the live game client.",
      "Routes and security status describe navigation, not whether travel is safe at this moment.",
      "Nearby activities are limited to NEC workflows with evidence-backed destinations; NEC does not invent nearby missions, anomalies, belts, or site spawns.",
      ...(unresolvedRootCount ? [`${unresolvedRootCount} asset location ${unresolvedRootCount === 1 ? "root was" : "roots were"} not resolvable with the character's current ESI visibility.`] : []),
    ],
  };
}
