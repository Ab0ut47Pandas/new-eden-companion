import { NextRequest, NextResponse } from "next/server";

import { mapApiError, mapSession, MapApiError } from "@/lib/map/api";
import type { RoutePreference } from "@/lib/map/model";
import { scanLocationAwareOpportunities } from "@/lib/opportunities/location-aware";

export const runtime = "nodejs";

const PREFERENCES = new Set<RoutePreference>(["shorter", "safer", "less-secure"]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { session, token } = await mapSession(request, "esi-location.read_location.v1");
    if (!session.scopes.includes("esi-assets.read_assets.v1")) {
      throw new MapApiError("Reconnect EVE to grant asset read permission.", 403);
    }
    const body = await request.json().catch(() => ({})) as { routePreference?: RoutePreference };
    const routePreference = body.routePreference ?? "safer";
    if (!PREFERENCES.has(routePreference)) throw new MapApiError("Choose a valid route preference.", 400);

    return NextResponse.json(await scanLocationAwareOpportunities({
      characterId: session.characterId,
      token,
      routePreference,
    }));
  } catch (error) {
    return mapApiError(error);
  }
}
