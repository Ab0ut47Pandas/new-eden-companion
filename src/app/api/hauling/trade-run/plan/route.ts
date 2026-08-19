import { NextRequest, NextResponse } from "next/server";

import {
  loadTradeCandidates,
  marketHubBySystemId,
  MAX_TRADE_CANDIDATES,
} from "@/lib/economy/trade-run-market";
import {
  optimizeTradeRun,
  type TradeOptimizationGoal,
} from "@/lib/economy/trade-run-optimizer";

export const runtime = "nodejs";

const GOALS = new Set<TradeOptimizationGoal>(["profit", "profit-per-m3", "roi", "balanced"]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      originSystemId?: number;
      destinationSystemId?: number;
      typeIds?: number[];
      cargoCapacityM3?: number;
      capitalIsk?: number;
      salesTaxPercent?: number;
      goal?: TradeOptimizationGoal;
    };
    const originSystemId = Number(body.originSystemId);
    const destinationSystemId = Number(body.destinationSystemId);
    const origin = marketHubBySystemId(originSystemId);
    const destination = marketHubBySystemId(destinationSystemId);
    if (!origin || !destination || origin.id === destination.id) {
      return NextResponse.json({ error: "Choose two different supported trade hubs." }, { status: 400 });
    }

    const typeIds = Array.isArray(body.typeIds)
      ? [...new Set(body.typeIds.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))]
      : [];
    if (typeIds.length === 0) return NextResponse.json({ error: "Add at least one candidate item." }, { status: 400 });
    if (typeIds.length > MAX_TRADE_CANDIDATES) {
      return NextResponse.json({ error: `Choose at most ${MAX_TRADE_CANDIDATES} candidate item types per plan.` }, { status: 400 });
    }

    const cargoCapacityM3 = Number(body.cargoCapacityM3);
    const capitalIsk = Number(body.capitalIsk);
    const salesTaxPercent = Number(body.salesTaxPercent);
    const goal = body.goal ?? "profit";
    if (!Number.isFinite(cargoCapacityM3) || cargoCapacityM3 <= 0) {
      return NextResponse.json({ error: "Enter your fitted cargo capacity in m³." }, { status: 400 });
    }
    if (!Number.isFinite(capitalIsk) || capitalIsk < 0) {
      return NextResponse.json({ error: "Enter the amount of ISK you are willing to invest." }, { status: 400 });
    }
    if (!Number.isFinite(salesTaxPercent) || salesTaxPercent < 0 || salesTaxPercent >= 100) {
      return NextResponse.json({ error: "Enter a valid sales-tax percentage." }, { status: 400 });
    }
    if (!GOALS.has(goal)) return NextResponse.json({ error: "Choose a valid optimization goal." }, { status: 400 });

    const market = await loadTradeCandidates(typeIds, origin, destination);
    const plan = optimizeTradeRun(market.candidates, {
      cargoCapacityM3,
      capitalIsk,
      salesTaxRate: salesTaxPercent / 100,
      goal,
    });
    return NextResponse.json({
      origin,
      destination,
      marketFetchedAt: market.fetchedAt,
      candidates: market.candidates.map((candidate) => ({
        typeId: candidate.typeId,
        name: candidate.name,
        unitVolumeM3: candidate.unitVolumeM3,
        originOrderCount: candidate.originOrderCount,
        destinationOrderCount: candidate.destinationOrderCount,
        caveats: candidate.caveats,
      })),
      plan: { ...plan, warnings: [...market.caveats, ...plan.warnings] },
    });
  } catch (error) {
    console.error("Trade-run planning failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Trade-run planning failed." }, { status: 500 });
  }
}
