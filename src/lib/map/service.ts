import "server-only";

import { esi } from "@/lib/esi/client";
import type { EsiSystem } from "@/lib/esi/types";
import type { MapSystem, RoutePreference } from "@/lib/map/model";

const ESI_ROUTE_PREFERENCES: Record<RoutePreference, "Shorter" | "Safer" | "LessSecure"> = {
  shorter: "Shorter",
  safer: "Safer",
  "less-secure": "LessSecure",
};

function validSystemId(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
}

export async function mapSystem(id: number): Promise<MapSystem> {
  if (!validSystemId(id)) throw new Error("A valid solar-system ID is required.");
  const system = await esi<EsiSystem>(`/universe/systems/${id}`, { revalidate: 86_400 });
  return {
    id,
    name: system.name,
    securityStatus: system.security_status,
    position: system.position,
  };
}

export async function mapSystems(ids: number[]): Promise<MapSystem[]> {
  const unique = [...new Set(ids)].filter(validSystemId);
  const systems: MapSystem[] = [];
  for (let start = 0; start < unique.length; start += 12) {
    systems.push(...(await Promise.all(unique.slice(start, start + 12).map(mapSystem))));
  }
  const byId = new Map(systems.map((system) => [system.id, system]));
  return ids.map((id) => byId.get(id)).filter((system): system is MapSystem => Boolean(system));
}

export async function calculateRoute(
  originId: number,
  destinationId: number,
  preference: RoutePreference,
): Promise<number[]> {
  if (!validSystemId(originId) || !validSystemId(destinationId)) {
    throw new Error("A valid origin and destination are required.");
  }
  if (!(preference in ESI_ROUTE_PREFERENCES)) throw new Error("Unknown route preference.");
  if (originId === destinationId) return [originId];

  const result = await esi<{ route: number[] }>(`/route/${originId}/${destinationId}`, {
    method: "POST",
    body: { preference: ESI_ROUTE_PREFERENCES[preference] },
    revalidate: 300,
  });
  return result.route;
}

