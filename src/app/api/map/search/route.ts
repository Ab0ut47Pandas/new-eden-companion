import { NextRequest, NextResponse } from "next/server";

import { esi } from "@/lib/esi/client";
import { mapApiError, mapSession, MapApiError } from "@/lib/map/api";
import { mapSystems } from "@/lib/map/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (query.length < 3) throw new MapApiError("Enter at least three characters.", 400);
    const { session, token } = await mapSession(request, "esi-search.search_structures.v1");
    const result = await esi<{ solar_system?: number[] }>(`/characters/${session.characterId}/search`, {
      token,
      query: { categories: "solar_system", search: query, strict: false },
    });
    const systems = await mapSystems((result.solar_system ?? []).slice(0, 12));
    systems.sort((left, right) => {
      const lowerQuery = query.toLowerCase();
      const leftExact = left.name.toLowerCase() === lowerQuery ? 0 : 1;
      const rightExact = right.name.toLowerCase() === lowerQuery ? 0 : 1;
      return leftExact - rightExact || left.name.localeCompare(right.name);
    });
    return NextResponse.json({ results: systems });
  } catch (error) {
    return mapApiError(error);
  }
}

