import "server-only";

import { esi } from "@/lib/esi/client";
import type { EsiOrder } from "@/lib/esi/types";
import { MARKET_HUBS, type MarketHub } from "@/lib/map/hubs";
import type { RoutePreference } from "@/lib/map/model";
import { calculateRoute, mapSystems } from "@/lib/map/service";
import { displayedSecurity } from "@/lib/map/security";
import { ORE_TYPES, TRADE_TYPES, type OpportunityType } from "@/lib/opportunities/catalog";
import type { OpportunityRoute, OpportunityScan, OreOpportunity, TradeOpportunity } from "@/lib/opportunities/model";
import { bestStationBuy, bestStationSell, estimateTrade } from "@/lib/opportunities/ranking";

const MARKET_CACHE_SECONDS = 300;

function orderKey(regionId: number, typeId: number): string {
  return `${regionId}:${typeId}`;
}

async function marketOrders(regionId: number, typeId: number): Promise<EsiOrder[]> {
  return esi<EsiOrder[]>(`/markets/${regionId}/orders`, {
    query: { order_type: "all", type_id: typeId },
    revalidate: MARKET_CACHE_SECONDS,
  });
}

async function loadOrderBooks(hubs: MarketHub[], types: OpportunityType[]): Promise<Map<string, EsiOrder[]>> {
  const requests = hubs.flatMap((hub) => types.map((type) => ({ hub, type })));
  const books = new Map<string, EsiOrder[]>();
  for (let start = 0; start < requests.length; start += 12) {
    const chunk = requests.slice(start, start + 12);
    const results = await Promise.all(chunk.map(({ hub, type }) => marketOrders(hub.regionId, type.id)));
    results.forEach((orders, index) => books.set(orderKey(chunk[index].hub.regionId, chunk[index].type.id), orders));
  }
  return books;
}

async function routeOptions(source: MarketHub, preference: RoutePreference): Promise<Map<number, OpportunityRoute>> {
  const destinations = MARKET_HUBS.filter((hub) => hub.id !== source.id);
  const routes = await Promise.all(destinations.map(async (destination) => ({
    destination,
    ids: await calculateRoute(source.id, destination.id, preference),
  })));
  const details = await mapSystems([...new Set(routes.flatMap((route) => route.ids))]);
  const security = new Map(details.map((system) => [system.id, system.securityStatus]));
  return new Map(routes.map(({ destination, ids }) => {
    const securityValues = ids.map((id) => security.get(id) ?? -1);
    return [destination.id, {
      destinationSystemId: destination.id,
      destinationName: destination.name,
      jumps: Math.max(0, ids.length - 1),
      minimumSecurity: Math.min(...securityValues),
      riskySystems: securityValues.filter((value) => displayedSecurity(value) < 0.5).length,
    }];
  }));
}

export async function scanTradeOpportunities(input: {
  source: MarketHub;
  cargoM3: number;
  budget: number;
  feeRate: number;
  routePreference: RoutePreference;
}): Promise<OpportunityScan> {
  const destinations = MARKET_HUBS.filter((hub) => hub.id !== input.source.id);
  const [books, routes] = await Promise.all([
    loadOrderBooks([input.source, ...destinations], TRADE_TYPES),
    routeOptions(input.source, input.routePreference),
  ]);
  const trade: TradeOpportunity[] = [];
  for (const type of TRADE_TYPES) {
    const sourceOrders = books.get(orderKey(input.source.regionId, type.id)) ?? [];
    const sourceSell = bestStationSell(sourceOrders, input.source.stationId);
    if (!sourceSell) continue;
    for (const destination of destinations) {
      const destinationOrders = books.get(orderKey(destination.regionId, type.id)) ?? [];
      const destinationBuy = bestStationBuy(destinationOrders, destination.stationId);
      const route = routes.get(destination.id);
      if (!destinationBuy || !route) continue;
      const opportunity = estimateTrade({
        type,
        source: input.source,
        destination,
        sourceSell,
        destinationBuy,
        route,
        cargoM3: input.cargoM3,
        budget: input.budget,
        feeRate: input.feeRate,
      });
      if (opportunity) trade.push(opportunity);
    }
  }
  trade.sort((left, right) => {
    const leftScore = left.profitPerJump * (left.route.riskySystems ? 0.25 : 1);
    const rightScore = right.profitPerJump * (right.route.riskySystems ? 0.25 : 1);
    return rightScore - leftScore;
  });
  return {
    mode: "trade",
    source: { systemId: input.source.id, name: input.source.name, stationId: input.source.stationId, stationName: input.source.stationName },
    fetchedAt: new Date().toISOString(),
    marketCacheSeconds: MARKET_CACHE_SECONDS,
    assumptions: input,
    trade: trade.slice(0, 30),
    ores: [],
    notes: [
      "Uses the cheapest visible sell order at the source station and highest visible buy order at the destination station.",
      "Profit includes your selected fee buffer but not hauling collateral, losses, price movement, or a return cargo.",
      "Each estimate is capped by the visible top-order quantity, your cargo size, and your budget.",
      "High-sec is safer, not safe: valuable cargo can still attract suicide ganks.",
    ],
  };
}

export async function scanOreValues(input: {
  source: MarketHub;
  cargoM3: number;
  budget: number;
  feeRate: number;
  routePreference: RoutePreference;
}): Promise<OpportunityScan> {
  const books = await loadOrderBooks([input.source], ORE_TYPES);
  const ores: OreOpportunity[] = [];
  for (const type of ORE_TYPES) {
    const orders = books.get(orderKey(input.source.regionId, type.id)) ?? [];
    const buy = bestStationBuy(orders, input.source.stationId);
    const sell = bestStationSell(orders, input.source.stationId);
    if (!buy) continue;
    const holdUnits = Math.floor(Math.min(input.cargoM3 / type.volume, buy.volume_remain));
    ores.push({
      typeId: type.id,
      name: type.name,
      unitVolume: type.volume,
      immediateBuyPrice: buy.price,
      lowestSellPrice: sell?.price,
      iskPerM3: buy.price / type.volume,
      demandUnits: buy.volume_remain,
      holdUnits,
      estimatedHoldValue: holdUnits * buy.price,
    });
  }
  ores.sort((left, right) => right.iskPerM3 - left.iskPerM3);
  return {
    mode: "mining",
    source: { systemId: input.source.id, name: input.source.name, stationId: input.source.stationId, stationName: input.source.stationName },
    fetchedAt: new Date().toISOString(),
    marketCacheSeconds: MARKET_CACHE_SECONDS,
    assumptions: input,
    trade: [],
    ores,
    notes: [
      "Ranks raw ore by immediate-buy ISK per cubic metre at the selected market hub.",
      "This is sale value, not mining yield per hour or refined mineral value; skills, travel, crystals, and compression can change the real result.",
      "ESI cannot see which asteroids are currently spawned in a belt or anomaly.",
    ],
  };
}
