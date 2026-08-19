import { NextRequest, NextResponse } from "next/server";

import { esi } from "@/lib/esi/client";
import { mapApiError, mapSession, MapApiError } from "@/lib/map/api";
import { loadStaticRouteTopology } from "@/lib/sde/route-topology";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { systemIds?: number[]; replaceRoute?: boolean };
    const systemIds = Array.isArray(body.systemIds)
      ? body.systemIds.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0)
      : [];
    if (systemIds.length < 2) throw new MapApiError("A custom route needs at least an origin and destination.", 400);
    if (systemIds.length > 100) throw new MapApiError("Custom route waypoint writes are limited to 100 systems at a time.", 400);

    const topology = loadStaticRouteTopology();
    if (!topology.available || !topology.graph) {
      throw new MapApiError(topology.reason ?? "Static route topology is unavailable.", 503);
    }
    for (const id of systemIds) {
      if (!topology.graph.systems.has(id)) throw new MapApiError(`System ${id} is not in the installed static stargate graph.`, 400);
    }
    for (let index = 1; index < systemIds.length; index += 1) {
      const previous = systemIds[index - 1];
      const current = systemIds[index];
      if (!(topology.graph.neighbours.get(previous) ?? []).includes(current)) {
        throw new MapApiError(`The custom route contains a non-stargate hop between systems ${previous} and ${current}.`, 400);
      }
    }

    const { token } = await mapSession(request, "esi-ui.write_waypoint.v1");
    const replaceRoute = body.replaceRoute !== false;
    for (let index = 0; index < systemIds.length; index += 1) {
      await esi("/ui/autopilot/waypoint", {
        method: "POST",
        token,
        query: {
          destination_id: systemIds[index],
          clear_other_waypoints: index === 0 ? replaceRoute : false,
          add_to_beginning: false,
        },
      });
    }

    return NextResponse.json({
      written: systemIds.length,
      replaceRoute,
      originId: systemIds[0],
      destinationId: systemIds[systemIds.length - 1],
    });
  } catch (error) {
    return mapApiError(error);
  }
}
