import type { EsiOrder } from "@/lib/esi/types";
import type { MarketHub } from "@/lib/map/hubs";
import type { OpportunityRoute, TradeOpportunity } from "@/lib/opportunities/model";
import type { OpportunityType } from "@/lib/opportunities/catalog";

export function bestStationSell(orders: EsiOrder[], stationId: number): EsiOrder | undefined {
  return orders
    .filter((order) => !order.is_buy_order && order.location_id === stationId && order.volume_remain > 0)
    .sort((left, right) => left.price - right.price)[0];
}

export function bestStationBuy(orders: EsiOrder[], stationId: number): EsiOrder | undefined {
  return orders
    .filter((order) => order.is_buy_order && order.location_id === stationId && order.volume_remain > 0)
    .sort((left, right) => right.price - left.price)[0];
}

export function estimateTrade(input: {
  type: OpportunityType;
  source: MarketHub;
  destination: MarketHub;
  sourceSell: EsiOrder;
  destinationBuy: EsiOrder;
  route: OpportunityRoute;
  cargoM3: number;
  budget: number;
  feeRate: number;
}): TradeOpportunity | null {
  const { type, source, destination, sourceSell, destinationBuy, route, cargoM3, budget, feeRate } = input;
  const profitPerUnit = destinationBuy.price * (1 - feeRate) - sourceSell.price;
  if (profitPerUnit <= 0 || type.volume <= 0 || sourceSell.price <= 0) return null;

  const units = Math.floor(Math.min(
    sourceSell.volume_remain,
    destinationBuy.volume_remain,
    cargoM3 / type.volume,
    budget / sourceSell.price,
  ));
  if (units < 1 || units < destinationBuy.min_volume) return null;

  const investment = units * sourceSell.price;
  const grossRevenue = units * destinationBuy.price;
  const estimatedProfit = units * profitPerUnit;
  const cargoUsed = units * type.volume;
  return {
    typeId: type.id,
    name: type.name,
    unitVolume: type.volume,
    sourceName: source.name,
    destinationName: destination.name,
    destinationSystemId: destination.id,
    buyPrice: sourceSell.price,
    sellPrice: destinationBuy.price,
    units,
    cargoUsed,
    investment,
    grossRevenue,
    estimatedProfit,
    returnPercent: investment > 0 ? (estimatedProfit / investment) * 100 : 0,
    profitPerM3: cargoUsed > 0 ? estimatedProfit / cargoUsed : 0,
    profitPerJump: estimatedProfit / Math.max(1, route.jumps),
    route,
  };
}

