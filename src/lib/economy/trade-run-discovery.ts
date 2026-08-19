import "server-only";

import { DatabaseSync } from "node:sqlite";

import { config } from "@/lib/config";
import type { MarketHub } from "@/lib/map/hubs";
import { staticDatabaseAvailable, staticDatabasePath } from "@/lib/sde/database";
import { loadTradeCandidates, MAX_TRADE_CANDIDATES } from "./trade-run-market";
import { optimizeTradeRun, type TradeOptimizationGoal, type TradeRunPlan } from "./trade-run-optimizer";

const FUZZWORK_AGGREGATE_CSV = "https://market.fuzzwork.co.uk/aggregatecsv.csv.gz";
const FUZZWORK_AGGREGATES = "https://market.fuzzwork.co.uk/aggregates/";
const SNAPSHOT_TTL_MS = 30 * 60 * 1_000;
const REGION_SHORTLIST = 240;

interface MarketTypeInfo {
  typeId: number;
  name: string;
  unitVolumeM3: number;
}

interface AggregateSide {
  price: number;
  volume: number;
  orderCount: number;
}

interface RegionPair {
  originSell?: AggregateSide;
  destinationBuy?: AggregateSide;
}

interface FuzzworkSide {
  max?: string | number;
  min?: string | number;
  volume?: string | number;
  orderCount?: string | number;
}

interface FuzzworkAggregate {
  buy?: FuzzworkSide;
  sell?: FuzzworkSide;
}

interface DiscoveryCandidate {
  typeId: number;
  name: string;
  unitVolumeM3: number;
  originSell: number;
  destinationBuy: number;
  originVolume: number;
  destinationVolume: number;
  roughProfitIsk: number;
  roughScore: number;
}

export interface TradeDiscoveryResult {
  plan: TradeRunPlan;
  verifiedTypeIds: number[];
  discovered: Array<{
    typeId: number;
    name: string;
    unitVolumeM3: number;
    discoveryOriginSell: number;
    discoveryDestinationBuy: number;
  }>;
  source: {
    discovery: "Fuzzwork regional snapshot + station aggregates";
    verification: "CCP ESI exact-station order depth";
    discoveryFetchedAt: string;
    verificationFetchedAt: string;
  };
  warnings: string[];
}

interface RegionSnapshotCache {
  expiresAt: number;
  fetchedAt: string;
  pairs: Map<string, RegionPair>;
}

declare global {
  var __necTradeRegionSnapshot: RegionSnapshotCache | undefined;
}

function marketTypes(): Map<number, MarketTypeInfo> {
  if (!staticDatabaseAvailable()) throw new Error("Static EVE data is unavailable.");
  const db = new DatabaseSync(staticDatabasePath(), { readOnly: true });
  try {
    const rows = db.prepare(`
      SELECT type_id, name, volume, packaged_volume
      FROM types
      WHERE published = 1
        AND market_group_id IS NOT NULL
        AND name IS NOT NULL
        AND COALESCE(NULLIF(packaged_volume, 0), NULLIF(volume, 0)) IS NOT NULL
    `).all() as unknown as Array<{
      type_id: number;
      name: string;
      volume: number | null;
      packaged_volume: number | null;
    }>;
    const result = new Map<number, MarketTypeInfo>();
    for (const row of rows) {
      const volume = Number(row.packaged_volume && row.packaged_volume > 0 ? row.packaged_volume : row.volume);
      if (!Number.isFinite(volume) || volume <= 0) continue;
      result.set(row.type_id, { typeId: row.type_id, name: row.name, unitVolumeM3: volume });
    }
    return result;
  } finally {
    db.close();
  }
}

async function* decodedLines(response: Response): AsyncGenerator<string> {
  if (!response.body) return;
  const decoded = response.body
    .pipeThrough(new DecompressionStream("gzip"))
    .pipeThrough(new TextDecoderStream());
  const reader = decoded.getReader();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        yield buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
    }
    if (buffer) yield buffer.replace(/\r$/, "");
  } finally {
    reader.releaseLock();
  }
}

function finite(value: string | undefined): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function regionSnapshot(originRegionId: number, destinationRegionId: number): Promise<RegionSnapshotCache> {
  const current = globalThis.__necTradeRegionSnapshot;
  const keyPrefix = `${originRegionId}:${destinationRegionId}:`;
  if (current && current.expiresAt > Date.now() && [...current.pairs.keys()].some((key) => key.startsWith(keyPrefix))) return current;

  const response = await fetch(FUZZWORK_AGGREGATE_CSV, {
    headers: { "User-Agent": `NewEdenCompanion/0.1 (${config.esiContact})` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Fuzzwork aggregate snapshot failed (${response.status}).`);

  const pairs = new Map<string, RegionPair>();
  let header: string[] | null = null;
  for await (const line of decodedLines(response)) {
    if (!line) continue;
    const columns = line.split(",");
    if (!header) {
      header = columns.map((column) => column.trim());
      continue;
    }
    const index = (name: string) => header!.indexOf(name);
    const what = columns[index("what")] ?? "";
    const [locationText, typeText, buyText] = what.split("|");
    const locationId = Number(locationText);
    const typeId = Number(typeText);
    const isBuy = buyText === "true";
    if (!Number.isSafeInteger(typeId) || (locationId !== originRegionId && locationId !== destinationRegionId)) continue;
    const price = isBuy ? finite(columns[index("maxval")]) : finite(columns[index("minval")]);
    const volume = finite(columns[index("volume")]);
    const orderCount = finite(columns[index("numorders")]);
    if (price === null || volume === null || orderCount === null || price <= 0 || volume <= 0 || orderCount <= 0) continue;

    const key = `${originRegionId}:${destinationRegionId}:${typeId}`;
    const pair = pairs.get(key) ?? {};
    if (locationId === originRegionId && !isBuy) pair.originSell = { price, volume, orderCount };
    if (locationId === destinationRegionId && isBuy) pair.destinationBuy = { price, volume, orderCount };
    pairs.set(key, pair);
  }

  const cache: RegionSnapshotCache = {
    expiresAt: Date.now() + SNAPSHOT_TTL_MS,
    fetchedAt: new Date().toISOString(),
    pairs,
  };
  globalThis.__necTradeRegionSnapshot = cache;
  return cache;
}

function capacityQuantity(info: MarketTypeInfo, sell: AggregateSide, buy: AggregateSide, cargoM3: number, capitalIsk: number): number {
  const byCargo = Math.floor(cargoM3 / info.unitVolumeM3);
  const byCapital = Math.floor(capitalIsk / sell.price);
  return Math.max(0, Math.min(byCargo, byCapital, Math.floor(sell.volume), Math.floor(buy.volume)));
}

function scoreCandidate(candidate: DiscoveryCandidate, goal: TradeOptimizationGoal): number {
  const unitProfit = candidate.destinationBuy - candidate.originSell;
  if (goal === "profit-per-m3") return unitProfit / candidate.unitVolumeM3;
  if (goal === "roi") return candidate.originSell > 0 ? unitProfit / candidate.originSell : 0;
  if (goal === "balanced") {
    const density = unitProfit / candidate.unitVolumeM3;
    const roi = candidate.originSell > 0 ? unitProfit / candidate.originSell : 0;
    return Math.sqrt(Math.max(0, density) * Math.max(0, roi));
  }
  return candidate.roughProfitIsk;
}

function regionShortlist(
  snapshot: RegionSnapshotCache,
  origin: MarketHub,
  destination: MarketHub,
  types: Map<number, MarketTypeInfo>,
  cargoM3: number,
  capitalIsk: number,
  salesTaxRate: number,
  goal: TradeOptimizationGoal,
): DiscoveryCandidate[] {
  const candidates: DiscoveryCandidate[] = [];
  for (const info of types.values()) {
    const pair = snapshot.pairs.get(`${origin.regionId}:${destination.regionId}:${info.typeId}`);
    if (!pair?.originSell || !pair.destinationBuy) continue;
    const afterTaxBuy = pair.destinationBuy.price * (1 - salesTaxRate);
    const unitProfit = afterTaxBuy - pair.originSell.price;
    if (unitProfit <= 0) continue;
    const quantity = capacityQuantity(info, pair.originSell, pair.destinationBuy, cargoM3, capitalIsk);
    if (quantity <= 0) continue;
    const candidate: DiscoveryCandidate = {
      ...info,
      originSell: pair.originSell.price,
      destinationBuy: pair.destinationBuy.price,
      originVolume: pair.originSell.volume,
      destinationVolume: pair.destinationBuy.volume,
      roughProfitIsk: unitProfit * quantity,
      roughScore: 0,
    };
    candidate.roughScore = scoreCandidate(candidate, goal);
    candidates.push(candidate);
  }
  return candidates.sort((left, right) => right.roughScore - left.roughScore || right.roughProfitIsk - left.roughProfitIsk || left.typeId - right.typeId).slice(0, REGION_SHORTLIST);
}

async function fuzzworkStationAggregates(stationId: number, typeIds: number[]): Promise<Map<number, FuzzworkAggregate>> {
  const result = new Map<number, FuzzworkAggregate>();
  for (let start = 0; start < typeIds.length; start += 100) {
    const chunk = typeIds.slice(start, start + 100);
    const url = new URL(FUZZWORK_AGGREGATES);
    url.searchParams.set("station", String(stationId));
    url.searchParams.set("types", chunk.join(","));
    const response = await fetch(url, {
      headers: { "User-Agent": `NewEdenCompanion/0.1 (${config.esiContact})` },
      next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error(`Fuzzwork station aggregate request failed (${response.status}).`);
    const payload = await response.json() as Record<string, FuzzworkAggregate>;
    for (const [typeId, aggregate] of Object.entries(payload)) result.set(Number(typeId), aggregate);
  }
  return result;
}

function sideNumber(value: string | number | undefined): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function stationShortlist(
  rough: DiscoveryCandidate[],
  origin: MarketHub,
  destination: MarketHub,
  cargoM3: number,
  capitalIsk: number,
  salesTaxRate: number,
  goal: TradeOptimizationGoal,
): Promise<DiscoveryCandidate[]> {
  const ids = rough.map((candidate) => candidate.typeId);
  const [originAggregates, destinationAggregates] = await Promise.all([
    fuzzworkStationAggregates(origin.stationId, ids),
    fuzzworkStationAggregates(destination.stationId, ids),
  ]);
  const refined: DiscoveryCandidate[] = [];
  for (const candidate of rough) {
    const originAggregate = originAggregates.get(candidate.typeId);
    const destinationAggregate = destinationAggregates.get(candidate.typeId);
    const originSell = sideNumber(originAggregate?.sell?.min);
    const destinationBuy = sideNumber(destinationAggregate?.buy?.max);
    const originVolume = sideNumber(originAggregate?.sell?.volume);
    const destinationVolume = sideNumber(destinationAggregate?.buy?.volume);
    if (originSell === null || destinationBuy === null || originVolume === null || destinationVolume === null) continue;
    const afterTaxBuy = destinationBuy * (1 - salesTaxRate);
    const unitProfit = afterTaxBuy - originSell;
    if (unitProfit <= 0) continue;
    const quantity = Math.max(0, Math.min(
      Math.floor(cargoM3 / candidate.unitVolumeM3),
      Math.floor(capitalIsk / originSell),
      Math.floor(originVolume),
      Math.floor(destinationVolume),
    ));
    if (quantity <= 0) continue;
    const updated: DiscoveryCandidate = {
      ...candidate,
      originSell,
      destinationBuy,
      originVolume,
      destinationVolume,
      roughProfitIsk: unitProfit * quantity,
      roughScore: 0,
    };
    updated.roughScore = scoreCandidate(updated, goal);
    refined.push(updated);
  }
  return refined.sort((left, right) => right.roughScore - left.roughScore || right.roughProfitIsk - left.roughProfitIsk || left.typeId - right.typeId);
}

export async function discoverTradeRun(
  origin: MarketHub,
  destination: MarketHub,
  constraints: {
    cargoCapacityM3: number;
    capitalIsk: number;
    salesTaxRate: number;
    goal: TradeOptimizationGoal;
  },
): Promise<TradeDiscoveryResult> {
  if (!Number.isFinite(constraints.cargoCapacityM3) || constraints.cargoCapacityM3 <= 0) throw new Error("Enter a positive cargo capacity before discovering trades.");
  if (!Number.isFinite(constraints.capitalIsk) || constraints.capitalIsk <= 0) throw new Error("Enter positive investment capital before discovering trades.");
  if (!Number.isFinite(constraints.salesTaxRate) || constraints.salesTaxRate < 0 || constraints.salesTaxRate >= 1) throw new Error("Enter a valid sales-tax rate before discovering trades.");

  const types = marketTypes();
  const snapshot = await regionSnapshot(origin.regionId, destination.regionId);
  const rough = regionShortlist(snapshot, origin, destination, types, constraints.cargoCapacityM3, constraints.capitalIsk, constraints.salesTaxRate, constraints.goal);
  const refined = await stationShortlist(rough, origin, destination, constraints.cargoCapacityM3, constraints.capitalIsk, constraints.salesTaxRate, constraints.goal);
  const finalists = refined.slice(0, MAX_TRADE_CANDIDATES);
  const verified = await loadTradeCandidates(finalists.map((candidate) => candidate.typeId), origin, destination);
  const plan = optimizeTradeRun(verified.candidates, constraints);

  return {
    plan,
    verifiedTypeIds: verified.candidates.map((candidate) => candidate.typeId),
    discovered: finalists.map((candidate) => ({
      typeId: candidate.typeId,
      name: candidate.name,
      unitVolumeM3: candidate.unitVolumeM3,
      discoveryOriginSell: candidate.originSell,
      discoveryDestinationBuy: candidate.destinationBuy,
    })),
    source: {
      discovery: "Fuzzwork regional snapshot + station aggregates",
      verification: "CCP ESI exact-station order depth",
      discoveryFetchedAt: snapshot.fetchedAt,
      verificationFetchedAt: verified.fetchedAt,
    },
    warnings: [
      "Fuzzwork is used only to discover and shortlist candidate spreads. Final cargo quantities and profit use CCP ESI exact-station order depth.",
      "A market snapshot can become stale before you purchase or arrive. Recheck the live orders in EVE before committing substantial ISK.",
      ...verified.caveats,
      ...plan.warnings,
    ],
  };
}
