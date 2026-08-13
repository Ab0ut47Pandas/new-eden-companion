import { NextRequest, NextResponse } from "next/server";

import { esi } from "@/lib/esi/client";
import { mapApiError, mapSession, MapApiError } from "@/lib/map/api";
import { mapSystem } from "@/lib/map/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { destinationId?: number; replaceRoute?: boolean };
    const destinationId = Number(body.destinationId);
    if (!Number.isSafeInteger(destinationId) || destinationId <= 0) {
      throw new MapApiError("Choose a valid destination first.", 400);
    }

    const { token } = await mapSession(request, "esi-ui.write_waypoint.v1");
    const destination = await mapSystem(destinationId);
    const replaceRoute = body.replaceRoute === true;
    await esi("/ui/autopilot/waypoint", {
      method: "POST",
      token,
      query: {
        destination_id: destination.id,
        clear_other_waypoints: replaceRoute,
        add_to_beginning: false,
      },
    });
    return NextResponse.json({ destination, replaceRoute });
  } catch (error) {
    return mapApiError(error);
  }
}

