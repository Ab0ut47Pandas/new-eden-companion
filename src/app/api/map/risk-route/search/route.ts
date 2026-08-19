import { NextRequest, NextResponse } from "next/server";

import { getStaticDatabaseMetadata, staticDatabaseAvailable } from "@/lib/sde/database";
import { searchStaticRouteSystems } from "@/lib/sde/route-topology";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) return NextResponse.json({ results: [] });
    if (!staticDatabaseAvailable()) {
      return NextResponse.json({ error: "Static EVE data is unavailable." }, { status: 503 });
    }
    const metadata = getStaticDatabaseMetadata();
    if (metadata.schemaVersion < 2) {
      return NextResponse.json({ error: "Update Static Data before using custom route search." }, { status: 503 });
    }
    return NextResponse.json({ results: searchStaticRouteSystems(query, 12) });
  } catch (error) {
    console.error("Route-system search failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Route-system search failed." }, { status: 500 });
  }
}
