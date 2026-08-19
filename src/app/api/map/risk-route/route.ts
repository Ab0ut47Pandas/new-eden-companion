import { NextRequest, NextResponse } from "next/server";

import { planLiveRiskAwareRoute } from "@/lib/map/risk-route";
import type { RiskRouteMode } from "@/lib/map/risk-route-core";

export const runtime = "nodejs";

const MODES = new Set<RiskRouteMode>(["fastest", "balanced", "lower-exposure"]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      originId?: number;
      destinationId?: number;
      mode?: RiskRouteMode;
      avoidSystemIds?: number[];
      maxExtraJumps?: number;
      highSecOnly?: boolean;
    };
    const originId = Number(body.originId);
    const destinationId = Number(body.destinationId);
    const mode = body.mode ?? "balanced";
    if (!Number.isSafeInteger(originId) || originId <= 0 || !Number.isSafeInteger(destinationId) || destinationId <= 0) {
      return NextResponse.json({ error: "Choose valid origin and destination systems." }, { status: 400 });
    }
    if (!MODES.has(mode)) return NextResponse.json({ error: "Choose a valid route mode." }, { status: 400 });
    const avoidSystemIds = Array.isArray(body.avoidSystemIds)
      ? [...new Set(body.avoidSystemIds.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))].slice(0, 100)
      : [];
    const maxExtraJumps = Number.isFinite(Number(body.maxExtraJumps))
      ? Math.max(0, Math.min(100, Math.trunc(Number(body.maxExtraJumps))))
      : 10;

    const result = await planLiveRiskAwareRoute(originId, destinationId, {
      mode,
      avoidSystemIds,
      maxExtraJumps,
      highSecOnly: body.highSecOnly === true,
    });
    if (!result.topologyAvailable) {
      return NextResponse.json({ error: result.topologyReason ?? "Static route topology is unavailable.", ...result }, { status: 503 });
    }
    if (!result.route) {
      return NextResponse.json({ error: "No route satisfies the selected avoid/security/detour policy.", ...result }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Risk-aware route planning failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Risk-aware route planning failed." }, { status: 500 });
  }
}
