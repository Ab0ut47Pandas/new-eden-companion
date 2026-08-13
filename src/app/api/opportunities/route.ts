import { NextRequest, NextResponse } from "next/server";

import { MARKET_HUBS } from "@/lib/map/hubs";
import { mapApiError, mapSession, MapApiError } from "@/lib/map/api";
import type { RoutePreference } from "@/lib/map/model";
import { scanOreValues, scanTradeOpportunities } from "@/lib/opportunities/service";

export const runtime = "nodejs";

const PREFERENCES = new Set<RoutePreference>(["shorter", "safer", "less-secure"]);

function finiteWithin(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await mapSession(request);
    const body = await request.json() as {
      mode?: "trade" | "mining";
      sourceSystemId?: number;
      cargoM3?: number;
      budget?: number;
      feeRate?: number;
      routePreference?: RoutePreference;
    };
    const source = MARKET_HUBS.find((hub) => hub.id === Number(body.sourceSystemId)) ?? MARKET_HUBS[0];
    const routePreference = body.routePreference ?? "safer";
    if (!PREFERENCES.has(routePreference)) throw new MapApiError("Choose a valid route preference.", 400);
    const input = {
      source,
      cargoM3: finiteWithin(body.cargoM3, 300, 1, 1_000_000),
      budget: finiteWithin(body.budget, 50_000_000, 10_000, 10_000_000_000_000),
      feeRate: finiteWithin(body.feeRate, 0.04, 0, 0.25),
      routePreference,
    };
    const result = body.mode === "mining"
      ? await scanOreValues(input)
      : await scanTradeOpportunities(input);
    return NextResponse.json(result);
  } catch (error) {
    return mapApiError(error);
  }
}

