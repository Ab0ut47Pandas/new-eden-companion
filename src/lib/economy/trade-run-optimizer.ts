export interface MarketDepthLevel {
  price: number;
  quantity: number;
}

export interface TradeCandidate {
  typeId: number;
  name: string;
  unitVolumeM3: number;
  originSell: MarketDepthLevel[];
  destinationBuy: MarketDepthLevel[];
}

export type TradeOptimizationGoal = "profit" | "profit-per-m3" | "roi" | "balanced";

export interface TradeRunConstraints {
  cargoCapacityM3: number;
  capitalIsk: number;
  salesTaxRate: number;
  goal?: TradeOptimizationGoal;
}

export interface TradeRunLine {
  typeId: number;
  name: string;
  quantity: number;
  volumeM3: number;
  acquisitionCostIsk: number;
  grossRevenueIsk: number;
  salesTaxIsk: number;
  netRevenueIsk: number;
  profitIsk: number;
  roiPercent: number;
  profitPerM3: number;
}

export interface TradeRunPlan {
  lines: TradeRunLine[];
  cargoCapacityM3: number;
  cargoUsedM3: number;
  capitalAvailableIsk: number;
  capitalUsedIsk: number;
  grossRevenueIsk: number;
  salesTaxIsk: number;
  netRevenueIsk: number;
  profitIsk: number;
  remainingCargoM3: number;
  remainingCapitalIsk: number;
  goal: TradeOptimizationGoal;
  method: "bounded-marginal-multi-strategy";
  warnings: string[];
}

interface MarginalLot {
  typeId: number;
  name: string;
  unitVolumeM3: number;
  unitCost: number;
  unitGrossRevenue: number;
  unitTax: number;
  unitNetRevenue: number;
  unitProfit: number;
  maxQuantity: number;
}

function finiteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function validateConstraints(constraints: TradeRunConstraints): void {
  if (!finiteNonNegative(constraints.cargoCapacityM3) || constraints.cargoCapacityM3 <= 0) {
    throw new Error("Trade-run cargo capacity must be a positive finite number");
  }
  if (!finiteNonNegative(constraints.capitalIsk)) {
    throw new Error("Trade-run capital must be a finite non-negative number");
  }
  if (!Number.isFinite(constraints.salesTaxRate) || constraints.salesTaxRate < 0 || constraints.salesTaxRate >= 1) {
    throw new Error("Sales-tax rate must be between 0 and 1");
  }
}

function validLevel(level: MarketDepthLevel): boolean {
  return Number.isFinite(level.price)
    && level.price >= 0
    && Number.isSafeInteger(level.quantity)
    && level.quantity > 0;
}

function marginalLots(candidate: TradeCandidate, salesTaxRate: number): MarginalLot[] {
  if (!Number.isSafeInteger(candidate.typeId) || candidate.typeId <= 0) return [];
  if (!Number.isFinite(candidate.unitVolumeM3) || candidate.unitVolumeM3 <= 0) return [];

  const sells = candidate.originSell.filter(validLevel).sort((a, b) => a.price - b.price);
  const buys = candidate.destinationBuy.filter(validLevel).sort((a, b) => b.price - a.price);
  const lots: MarginalLot[] = [];
  let sellIndex = 0;
  let buyIndex = 0;
  let sellRemaining = sells[0]?.quantity ?? 0;
  let buyRemaining = buys[0]?.quantity ?? 0;

  while (sellIndex < sells.length && buyIndex < buys.length) {
    const sell = sells[sellIndex];
    const buy = buys[buyIndex];
    const quantity = Math.min(sellRemaining, buyRemaining);
    const gross = buy.price;
    const tax = gross * salesTaxRate;
    const net = gross - tax;
    const profit = net - sell.price;

    if (quantity > 0 && profit > 0) {
      lots.push({
        typeId: candidate.typeId,
        name: candidate.name,
        unitVolumeM3: candidate.unitVolumeM3,
        unitCost: sell.price,
        unitGrossRevenue: gross,
        unitTax: tax,
        unitNetRevenue: net,
        unitProfit: profit,
        maxQuantity: quantity,
      });
    }

    sellRemaining -= quantity;
    buyRemaining -= quantity;
    if (sellRemaining <= 0) {
      sellIndex += 1;
      sellRemaining = sells[sellIndex]?.quantity ?? 0;
    }
    if (buyRemaining <= 0) {
      buyIndex += 1;
      buyRemaining = buys[buyIndex]?.quantity ?? 0;
    }
  }
  return lots;
}

function lotScore(lot: MarginalLot, goal: TradeOptimizationGoal): number {
  if (goal === "profit-per-m3") return lot.unitProfit / lot.unitVolumeM3;
  if (goal === "roi") return lot.unitCost > 0 ? lot.unitProfit / lot.unitCost : Number.POSITIVE_INFINITY;
  if (goal === "balanced") {
    const perM3 = lot.unitProfit / lot.unitVolumeM3;
    const roi = lot.unitCost > 0 ? lot.unitProfit / lot.unitCost : lot.unitProfit;
    return Math.sqrt(Math.max(0, perM3) * Math.max(0, roi));
  }
  return lot.unitProfit;
}

function fillLots(
  lots: MarginalLot[],
  constraints: TradeRunConstraints,
  sortGoal: TradeOptimizationGoal,
): TradeRunPlan {
  let remainingCargo = constraints.cargoCapacityM3;
  let remainingCapital = constraints.capitalIsk;
  const allocations = new Map<string, { lot: MarginalLot; quantity: number }>();
  const sorted = [...lots].sort((left, right) => {
    const score = lotScore(right, sortGoal) - lotScore(left, sortGoal);
    if (score !== 0) return score;
    const profit = right.unitProfit - left.unitProfit;
    if (profit !== 0) return profit;
    return left.typeId - right.typeId;
  });

  for (const lot of sorted) {
    if (remainingCargo <= 0 || remainingCapital <= 0) break;
    const byCargo = Math.floor((remainingCargo + 1e-9) / lot.unitVolumeM3);
    const byCapital = lot.unitCost > 0 ? Math.floor((remainingCapital + 1e-6) / lot.unitCost) : lot.maxQuantity;
    const quantity = Math.max(0, Math.min(lot.maxQuantity, byCargo, byCapital));
    if (quantity <= 0) continue;
    const key = `${lot.typeId}:${lot.unitCost}:${lot.unitGrossRevenue}`;
    allocations.set(key, { lot, quantity });
    remainingCargo -= quantity * lot.unitVolumeM3;
    remainingCapital -= quantity * lot.unitCost;
  }

  const byType = new Map<number, TradeRunLine>();
  for (const { lot, quantity } of allocations.values()) {
    const current = byType.get(lot.typeId) ?? {
      typeId: lot.typeId,
      name: lot.name,
      quantity: 0,
      volumeM3: 0,
      acquisitionCostIsk: 0,
      grossRevenueIsk: 0,
      salesTaxIsk: 0,
      netRevenueIsk: 0,
      profitIsk: 0,
      roiPercent: 0,
      profitPerM3: 0,
    };
    current.quantity += quantity;
    current.volumeM3 += quantity * lot.unitVolumeM3;
    current.acquisitionCostIsk += quantity * lot.unitCost;
    current.grossRevenueIsk += quantity * lot.unitGrossRevenue;
    current.salesTaxIsk += quantity * lot.unitTax;
    current.netRevenueIsk += quantity * lot.unitNetRevenue;
    current.profitIsk += quantity * lot.unitProfit;
    byType.set(lot.typeId, current);
  }

  const lines = [...byType.values()].map((line) => ({
    ...line,
    roiPercent: line.acquisitionCostIsk > 0 ? (line.profitIsk / line.acquisitionCostIsk) * 100 : 0,
    profitPerM3: line.volumeM3 > 0 ? line.profitIsk / line.volumeM3 : 0,
  })).sort((a, b) => b.profitIsk - a.profitIsk || a.typeId - b.typeId);

  const totals = lines.reduce((sum, line) => ({
    cargo: sum.cargo + line.volumeM3,
    capital: sum.capital + line.acquisitionCostIsk,
    gross: sum.gross + line.grossRevenueIsk,
    tax: sum.tax + line.salesTaxIsk,
    net: sum.net + line.netRevenueIsk,
    profit: sum.profit + line.profitIsk,
  }), { cargo: 0, capital: 0, gross: 0, tax: 0, net: 0, profit: 0 });

  return {
    lines,
    cargoCapacityM3: constraints.cargoCapacityM3,
    cargoUsedM3: totals.cargo,
    capitalAvailableIsk: constraints.capitalIsk,
    capitalUsedIsk: totals.capital,
    grossRevenueIsk: totals.gross,
    salesTaxIsk: totals.tax,
    netRevenueIsk: totals.net,
    profitIsk: totals.profit,
    remainingCargoM3: Math.max(0, constraints.cargoCapacityM3 - totals.cargo),
    remainingCapitalIsk: Math.max(0, constraints.capitalIsk - totals.capital),
    goal: constraints.goal ?? "profit",
    method: "bounded-marginal-multi-strategy",
    warnings: [],
  };
}

function betterPlan(left: TradeRunPlan, right: TradeRunPlan, goal: TradeOptimizationGoal): TradeRunPlan {
  const metric = (plan: TradeRunPlan): number => {
    if (goal === "profit-per-m3") return plan.cargoUsedM3 > 0 ? plan.profitIsk / plan.cargoUsedM3 : 0;
    if (goal === "roi") return plan.capitalUsedIsk > 0 ? plan.profitIsk / plan.capitalUsedIsk : 0;
    if (goal === "balanced") {
      const perM3 = plan.cargoUsedM3 > 0 ? plan.profitIsk / plan.cargoUsedM3 : 0;
      const roi = plan.capitalUsedIsk > 0 ? plan.profitIsk / plan.capitalUsedIsk : 0;
      return Math.sqrt(Math.max(0, perM3) * Math.max(0, roi));
    }
    return plan.profitIsk;
  };
  const leftMetric = metric(left);
  const rightMetric = metric(right);
  if (rightMetric > leftMetric + 1e-6) return right;
  if (Math.abs(rightMetric - leftMetric) <= 1e-6 && right.profitIsk > left.profitIsk) return right;
  return left;
}

export function optimizeTradeRun(candidates: TradeCandidate[], constraints: TradeRunConstraints): TradeRunPlan {
  validateConstraints(constraints);
  const goal = constraints.goal ?? "profit";
  const lots = candidates.flatMap((candidate) => marginalLots(candidate, constraints.salesTaxRate));
  const strategies: TradeOptimizationGoal[] = [goal, "profit", "profit-per-m3", "roi", "balanced"];
  let best = fillLots(lots, { ...constraints, goal }, strategies[0]);
  for (const strategy of strategies.slice(1)) {
    best = betterPlan(best, fillLots(lots, { ...constraints, goal }, strategy), goal);
  }

  const warnings = [
    "This plan uses visible origin sell depth and destination buy depth only; market orders can change before you arrive.",
    "Sales tax is deducted from destination revenue. Immediate buys/sells do not create broker-fee-bearing orders; if you intend to place orders instead, this plan does not estimate fill time or relist costs.",
    "The bounded optimizer compares several marginal-fill strategies. It is deterministic and capacity/capital aware, but it does not claim a mathematically proven global optimum across every possible item in New Eden.",
  ];
  if (!best.lines.length) warnings.unshift("No candidate lot has a positive after-tax spread within the supplied market depth.");
  return { ...best, warnings };
}
