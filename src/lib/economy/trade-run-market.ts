import "server-only";

import { DatabaseSync } from "node:sqlite";

import { esiPaginatedPublic } from "@/lib/esi/client";
import { MARKET_HUBS, type MarketHub } from "@/lib/map/hubs";
import { staticDatabaseAvailable, staticDatabasePath } from "@/lib/sde/database";
import type { MarketDepthLevel, TradeCandidate } from "./trade-run-optimizer";

const MARKET_ORDER_CACHE_SECONDS = 300;
export const MAX_TRADE_CANDIDATES = 16;

interface EsiRegionalMarketOrder {
  is_buy_order: boolean;
  location_id: number;
  min_volume: number;
  price: number;
  type_id: number;
  volume_remain: number;
}

export interface TradeCandidateSearchResult {
  typeId: number;
  name: string;
  unitVolumeM3: number;
  groupName: string | null;
}

export interface LoadedTradeCandidate extends TradeCandidate {
  originOrderCount: number;
  destinationOrderCount: number;
  caveats: string[];
}

function finitePositive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function openStaticDatabase(): DatabaseSync {
  if (!staticDatabaseAvailable()) throw new Error("Static EVE data is unavailable.");
  return new DatabaseSync(staticDatabasePath(), { readOnly: true });
}

export function searchTradeCandidateItems(query: string, limit = 12): TradeCandidateSearchResult[] {
  const trimmed = query.trim();
  if (trimmed.length < 2 || !staticDatabaseAvailable()) return [];
  const db = openStaticDatabase();
  try {
    const rows = db.prepare(`
      SELECT type.type_id, type.name, type.volume, type.packaged_volume, groups.name AS group_name
      FROM types type
      LEFT JOIN groups ON groups.group_id = type.group_id
      WHERE type.published = 1
        AND type.market_group_id IS NOT NULL
        AND type.name IS NOT NULL
        AND lower(type.name) LIKE lower(?)
        AND COALESCE(NULLIF(type.packaged_volume, 0), NULLIF(type.volume, 0)) IS NOT NULL
      ORDER BY CASE WHEN lower(type.name) = lower(?) THEN 0 ELSE 1 END, length(type.name), type.name
      LIMIT ?
    `).all(`%${trimmed}%`, trimmed, Math.max(1, Math.min(50, Math.trunc(limit)))) as unknown as Array<{
      type_id: number;
      name: string;
      volume: number | null;
      packaged_volume: number | null;
      group_name: string | null;
    }>;
    return rows.flatMap((row) => {
      const unitVolumeM3 = finitePositive(row.packaged_volume) ? row.packaged_volume : row.volume;
      return finitePositive(unitVolumeM3) ? [{
        typeId: row.type_id,
        name: row.name,
        unitVolumeM3,
        groupName: row.group_name,
      }] : [];
    });
  } finally {
    db.close();
  }
}

function tradeType(typeId: number): TradeCandidateSearchResult | null {
  const db = openStaticDatabase();
  try {
    const row = db.prepare(`
      SELECT type.type_id, type.name, type.volume, type.packaged_volume, groups.name AS group_name
      FROM types type
      LEFT JOIN groups ON groups.group_id = type.group_id
      WHERE type.type_id = ? AND type.published = 1 AND type.market_group_id IS NOT NULL
    `).get(typeId) as unknown as {
      type_id: number;
      name: string | null;
      volume: number | null;
      packaged_volume: number | null;
      group_name: string | null;
    } | undefined;
    if (!row?.name) return null;
    const unitVolumeM3 = finitePositive(row.packaged_volume) ? row.packaged_volume : row.volume;
    if (!finitePositive(unitVolumeM3)) return null;
    return { typeId: row.type_id, name: row.name, unitVolumeM3, groupName: row.group_name };
  } finally {
    db.close();
  }
}

function aggregateDepth(orders: EsiRegionalMarketOrder[]): MarketDepthLevel[] {
  const byPrice = new Map<number, number>();
  for (const order of orders) {
    if (!Number.isFinite(order.price) || order.price < 0 || !Number.isSafeInteger(order.volume_remain) || order.volume_remain <= 0) continue;
    byPrice.set(order.price, (byPrice.get(order.price) ?? 0) + order.volume_remain);
  }
  return [...byPrice.entries()].map(([price, quantity]) => ({ price, quantity }));
}

async function regionOrders(regionId: number, typeId: number): Promise<EsiRegionalMarketOrder[]> {
  return esiPaginatedPublic<EsiRegionalMarketOrder>(`/markets/${regionId}/orders`, {
    query: { order_type: "all", type_id: typeId },
    revalidate: MARKET_ORDER_CACHE_SECONDS,
    maxPages: 50,
  });
}

export function marketHubBySystemId(systemId: number): MarketHub | null {
  return MARKET_HUBS.find((hub) => hub.id === systemId) ?? null;
}

export async function loadTradeCandidate(
  typeId: number,
  origin: MarketHub,
  destination: MarketHub,
): Promise<LoadedTradeCandidate | null> {
  const identity = tradeType(typeId);
  if (!identity) return null;
  const regionIds = [...new Set([origin.regionId, destination.regionId])];
  const regionEntries = await Promise.all(regionIds.map(async (regionId) => [regionId, await regionOrders(regionId, typeId)] as const));
  const byRegion = new Map(regionEntries);
  const originOrders = byRegion.get(origin.regionId) ?? [];
  const destinationOrders = byRegion.get(destination.regionId) ?? [];

  const originSellOrders = originOrders.filter((order) => !order.is_buy_order && order.location_id === origin.stationId);
  const destinationBuyOrders = destinationOrders.filter((order) =>
    order.is_buy_order
    && order.location_id === destination.stationId
    && (!Number.isFinite(order.min_volume) || order.min_volume <= 1));
  const excludedMinimumVolume = destinationOrders.filter((order) =>
    order.is_buy_order
    && order.location_id === destination.stationId
    && Number.isFinite(order.min_volume)
    && order.min_volume > 1).length;

  return {
    typeId: identity.typeId,
    name: identity.name,
    unitVolumeM3: identity.unitVolumeM3,
    originSell: aggregateDepth(originSellOrders),
    destinationBuy: aggregateDepth(destinationBuyOrders),
    originOrderCount: originSellOrders.length,
    destinationOrderCount: destinationBuyOrders.length,
    caveats: [
      ...(excludedMinimumVolume > 0 ? [`Excluded ${excludedMinimumVolume} destination buy order${excludedMinimumVolume === 1 ? "" : "s"} with a minimum-volume requirement above one unit because this first optimizer does not model order minimums.`] : []),
      "Origin cost uses visible sell orders at the exact station. Destination revenue uses visible buy orders posted at the exact station.",
    ],
  };
}

export async function loadTradeCandidates(
  typeIds: number[],
  origin: MarketHub,
  destination: MarketHub,
): Promise<{ candidates: LoadedTradeCandidate[]; fetchedAt: string; caveats: string[] }> {
  const ids = [...new Set(typeIds.filter((id) => Number.isSafeInteger(id) && id > 0))].slice(0, MAX_TRADE_CANDIDATES);
  const candidates: LoadedTradeCandidate[] = [];
  for (let start = 0; start < ids.length; start += 3) {
    const batch = await Promise.all(ids.slice(start, start + 3).map((id) => loadTradeCandidate(id, origin, destination)));
    candidates.push(...batch.filter((candidate): candidate is LoadedTradeCandidate => candidate !== null));
  }
  return {
    candidates,
    fetchedAt: new Date().toISOString(),
    caveats: [
      `Candidate scanning is intentionally bounded to ${MAX_TRADE_CANDIDATES} selected item types per plan to respect the shared ESI market service.`,
      "Market orders are CCP-cached and can move before purchase or arrival. NEC does not claim this candidate basket is every profitable trade in New Eden.",
    ],
  };
}
