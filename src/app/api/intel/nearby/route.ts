import { NextRequest, NextResponse } from "next/server";

import { mapApiError, mapSession, MapApiError } from "@/lib/map/api";
import { esi } from "@/lib/esi/client";
import type { EsiLocation } from "@/lib/esi/types";
import { nearbyIntel } from "@/lib/intel/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const requestedRadius = Number(request.nextUrl.searchParams.get("radius") ?? "3");
    if (!Number.isInteger(requestedRadius) || requestedRadius < 1 || requestedRadius > 4) {
      throw new MapApiError("Choose a nearby range from one to four jumps.", 400);
    }
    const { session, token } = await mapSession(request, "esi-location.read_location.v1");
    const location = await esi<EsiLocation>(`/characters/${session.characterId}/location`, { token });
    return NextResponse.json(await nearbyIntel(location.solar_system_id, requestedRadius));
  } catch (error) {
    return mapApiError(error);
  }
}
