import { NextRequest, NextResponse } from "next/server";

import { searchTradeCandidateItems } from "@/lib/economy/trade-run-market";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) return NextResponse.json({ results: [] });
    return NextResponse.json({ results: searchTradeCandidateItems(query, 12) });
  } catch (error) {
    console.error("Trade candidate search failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Trade candidate search failed." }, { status: 500 });
  }
}
