import { NextRequest, NextResponse } from "next/server";

import { esi } from "@/lib/esi/client";
import type { EsiLocation } from "@/lib/esi/types";
import { mapApiError, mapSession, MapApiError } from "@/lib/map/api";
import type { PlannedRoute, RoutePreference } from "@/lib/map/model";
import { calculateRoute, mapSystems } from "@/lib/map/service";

export const runtime = "nodejs";

const PREFERENCES = new Set<RoutePreference>(["shorter", "safer", "less-secure"]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { destinationId?: number; preference?: RoutePreference };
    const destinationId = Number(body.destinationId);
    const preference = body.preference ?? "safer";
    if (!Number.isSafeInteger(destinationId) || destinationId <= 0) {
      throw new MapApiError("Choose a valid destination first.", 400);
    }
    if (!PREFERENCES.has(preference)) throw new MapApiError("Choose a valid route preference.", 400);

    const { session, token } = await mapSession(request, "esi-location.read_location.v1");
    const location = await esi<EsiLocation>(`/characters/${session.characterId}/location`, { token });
    const routeIds = await calculateRoute(location.solar_system_id, destinationId, preference);
    const systems = await mapSystems(routeIds);
    if (!systems.length) throw new MapApiError("EVE returned an empty route.", 502);
    const planned: PlannedRoute = {
      preference,
      origin: systems[0],
      destination: systems[systems.length - 1],
      jumps: Math.max(0, systems.length - 1),
      systems,
    };
    return NextResponse.json(planned);
  } catch (error) {
    return mapApiError(error);
  }
}

