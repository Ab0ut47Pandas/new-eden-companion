import { NextRequest, NextResponse } from "next/server";

import { discoverTradeRun } from "@/lib/economy/trade-run-discovery";
import { marketHubBySystemId } from "@/lib/economy/trade-run-market";
import type { TradeOptimizationGoal } from "@/lib/economy/trade-run-optimizer";

export const runtime = "nodejs";

const GOALS = new Set<TradeOptimizationGoal>(["profit", "profit-per-m3", "roi", "balanced"]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      originSystemId?: number;
      destinationSystemId?: number;
      cargoCapacityM3?: number;
      capitalIsk?: number;
      salesTaxPercent?: number;
      goal?: TradeOptimizationGoal;
    };
    const origin = marketHubBySystemId(Number(body.originSystemId));
    const destination = marketHubBySystemId(Number(body.destinationSystemId));
    if (!origin || !destination || origin.id === destination.id) {
      return NextResponse.json({ error: "Choose two different supported trade hubs." }, { status: 400 });
    }
    const cargoCapacityM3 = Number(body.cargoCapacityM3);
    const capitalIsk = Number(body.capitalIsk);
    const salesTaxPercent = Number(body.salesTaxPercent);
    const goal = body.goal ?? "profit";
    if (!Number.isFinite(cargoCapacityM3) || cargoCapacityM3 <= 0) return NextResponse.json({ error: "Enter your actual fitted cargo capacity in m³." }, { status: 400 });
    if (!Number.isFinite(capitalIsk) || capitalIsk <= 0) return NextResponse.json({ error: "Enter how much ISK you are willing to invest." }, { status: 400 });
    if (!Number.isFinite(salesTaxPercent) || salesTaxPercent < 0 || salesTaxPercent >= 100) return NextResponse.json({ error: "Enter a valid sales-tax percentage." }, { status: 400 });
    if (!GOALS.has(goal)) return NextResponse.json({ error: "Choose a valid optimization goal." }, { status: 400 });

    const result = await discoverTradeRun(origin, destination, {
      cargoCapacityM3,
      capitalIsk,
      salesTaxRate: salesTaxPercent / 100,
      goal,
    });
    return NextResponse.json({ origin, destination, ...result });
  } catch (error) {
    console.error("Trade-run discovery failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Trade-run discovery failed." }, { status: 500 });
  }
}
