import "server-only";

import { esiPaginatedPublic } from "@/lib/esi/client";
import {
  calculateMarketLocationValuation,
  type MarketLocationValuation,
  type MarketOrderInput,
  type MarketScope,
} from "./market-valuation-core";

const MARKET_ORDER_CACHE_SECONDS = 300;

interface EsiRegionalMarketOrder {
  duration: number;
  is_buy_order: boolean;
  issued: string;
  location_id: number;
  min_volume: number;
  order_id: number;
  price: number;
  range: string;
  system_id: number;
  type_id: number;
  volume_remain: number;
  volume_total: number;
}

export interface MarketValuationRequest {
  typeId: number;
  quantity: number;
  local: MarketScope;
  nearbyHub?: MarketScope;
}

export interface MarketValuationResult {
  typeId: number;
  quantity: number;
  fetchedAt: string;
  source: {
    authority: "CCP ESI";
    route: "/markets/{region_id}/orders";
    cacheSeconds: number;
  };
  local: MarketLocationValuation;
  nearbyHub: MarketLocationValuation | null;
  caveats: string[];
}

function validateRequest(request: MarketValuationRequest): void {
  if (!Number.isSafeInteger(request.typeId) || request.typeId <= 0) {
    throw new Error("Market valuation requires a positive integer typeId");
  }
  if (!Number.isSafeInteger(request.quantity) || request.quantity <= 0) {
    throw new Error("Market valuation requires a positive integer quantity");
  }
}

async function loadRegionOrders(regionId: number, typeId: number): Promise<MarketOrderInput[]> {
  const rows = await esiPaginatedPublic<EsiRegionalMarketOrder>(`/markets/${regionId}/orders`, {
    query: { order_type: "all", type_id: typeId },
    revalidate: MARKET_ORDER_CACHE_SECONDS,
    maxPages: 50,
  });

  return rows.map((order) => ({
    isBuyOrder: order.is_buy_order,
    locationId: order.location_id,
    price: order.price,
    volumeRemain: order.volume_remain,
  }));
}

export async function loadMarketValuation(request: MarketValuationRequest): Promise<MarketValuationResult> {
  validateRequest(request);

  const regionIds = [...new Set([
    request.local.regionId,
    request.nearbyHub?.regionId,
  ].filter((regionId): regionId is number => regionId !== undefined))];

  const regionEntries = await Promise.all(
    regionIds.map(async (regionId) => [regionId, await loadRegionOrders(regionId, request.typeId)] as const),
  );
  const byRegion = new Map(regionEntries);
  const fetchedAt = new Date().toISOString();

  const local = calculateMarketLocationValuation(
    byRegion.get(request.local.regionId) ?? [],
    request.local,
    request.quantity,
  );
  const nearbyHub = request.nearbyHub
    ? calculateMarketLocationValuation(
      byRegion.get(request.nearbyHub.regionId) ?? [],
      request.nearbyHub,
      request.quantity,
    )
    : null;

  return {
    typeId: request.typeId,
    quantity: request.quantity,
    fetchedAt,
    source: {
      authority: "CCP ESI",
      route: "/markets/{region_id}/orders",
      cacheSeconds: MARKET_ORDER_CACHE_SECONDS,
    },
    local,
    nearbyHub,
    caveats: [
      "CCP market-order data is cached; the timestamp records when NEC assembled this valuation, not when every underlying order last changed.",
      "Replacement value walks visible sell-order depth from cheapest upward; immediate-sale value walks visible buy-order depth from highest downward.",
      "No value is extrapolated beyond visible depth. Missing or insufficient orders remain unavailable or partial instead of being treated as zero.",
      ...(request.nearbyHub ? [] : ["No nearby-hub scope was supplied, so NEC leaves the hub comparison unavailable rather than guessing which market the user means."]),
    ],
  };
}

export {
  calculateMarketLocationValuation,
  type MarketLocationValuation,
  type MarketOrderInput,
  type MarketScope,
} from "./market-valuation-core";
