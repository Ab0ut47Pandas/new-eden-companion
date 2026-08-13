import "server-only";

import { config } from "@/lib/config";
import { esi, resolveNames } from "@/lib/esi/client";
import type { EsiSystem } from "@/lib/esi/types";
import type { NearbyIntelResponse, NearbyKill, NearbySystemIntel } from "@/lib/intel/model";
import { intelHeadline, intelLevel, rankSystems } from "@/lib/intel/ranking";

const R2Z2_BASE = "https://r2z2.zkillboard.com/ephemeral/";
const ZKILL_BASE = "https://zkillboard.com/api/";
const HOUR_MS = 3_600_000;

interface TopologySystem extends EsiSystem {
  stargates?: number[];
}

interface Stargate {
  destination: { system_id: number };
}

interface Constellation {
  region_id: number;
}

interface SystemKills {
  system_id: number;
  npc_kills: number;
  pod_kills: number;
  ship_kills: number;
}

interface SystemJumps {
  system_id: number;
  ship_jumps: number;
}

interface RawAttacker {
  character_id?: number;
  final_blow?: boolean;
}

interface RawKillmail {
  killmail_id: number;
  killmail_time: string;
  solar_system_id: number;
  attackers?: RawAttacker[];
  victim: {
    character_id?: number;
    ship_type_id: number;
  };
  zkb?: {
    totalValue?: number;
    solo?: boolean;
    npc?: boolean;
    attackerCount?: number;
  };
}

interface R2Z2Package {
  killmail_id: number;
  esi: RawKillmail;
  zkb?: RawKillmail["zkb"];
}

interface KillSummary {
  killmailId: number;
  time: string;
  systemId: number;
  victimCharacterId?: number;
  victimShipTypeId: number;
  finalBlowCharacterId?: number;
  attackerCount: number;
  totalValue: number;
  solo: boolean;
  npc: boolean;
}

interface TopologyResult {
  systems: Array<{
    id: number;
    name: string;
    securityStatus: number;
    distance: number;
    regionId: number;
  }>;
}

interface KillStreamState {
  nextSequence?: number;
  lastPollAt: number;
  kills: Map<number, KillSummary>;
  inflight?: Promise<void>;
}

declare global {
  var __newEdenKillStream: KillStreamState | undefined;
}

const topologyCache = new Map<string, { expiresAt: number; value: Promise<TopologyResult> }>();

function userAgent(): string {
  return `NewEdenCompanion/0.1 (${config.esiContact})`;
}

async function inChunks<T, R>(items: T[], size: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let start = 0; start < items.length; start += size) {
    results.push(...(await Promise.all(items.slice(start, start + size).map(work))));
  }
  return results;
}

async function topology(originId: number, radius: number): Promise<TopologyResult> {
  const key = `${originId}:${radius}`;
  const cached = topologyCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = (async () => {
    const distances = new Map<number, number>([[originId, 0]]);
    const details = new Map<number, TopologySystem>();
    let frontier = [originId];

    for (let depth = 0; depth < radius; depth += 1) {
      const frontierSystems = await inChunks(frontier, 10, async (id) => {
        const system = await esi<TopologySystem>(`/universe/systems/${id}`, { revalidate: 86_400 });
        details.set(id, system);
        return system;
      });
      const gateIds = [...new Set(frontierSystems.flatMap((system) => system.stargates ?? []))];
      const gates = await inChunks(gateIds, 12, (id) => esi<Stargate>(`/universe/stargates/${id}`, { revalidate: 86_400 }));
      const next: number[] = [];
      for (const gate of gates) {
        const destination = gate.destination.system_id;
        if (!distances.has(destination)) {
          distances.set(destination, depth + 1);
          next.push(destination);
        }
      }
      frontier = next;
      if (!frontier.length) break;
    }

    const ids = [...distances.keys()];
    const missing = ids.filter((id) => !details.has(id));
    const missingDetails = await inChunks(missing, 10, (id) => esi<TopologySystem>(`/universe/systems/${id}`, { revalidate: 86_400 }));
    missing.forEach((id, index) => details.set(id, missingDetails[index]));

    const constellationIds = [...new Set([...details.values()].map((system) => system.constellation_id))];
    const constellations = await inChunks(constellationIds, 12, (id) => esi<Constellation>(`/universe/constellations/${id}`, { revalidate: 86_400 }));
    const regionByConstellation = new Map(constellationIds.map((id, index) => [id, constellations[index].region_id]));

    return {
      systems: ids.map((id) => {
        const system = details.get(id);
        if (!system) throw new Error(`EVE did not return topology for system ${id}.`);
        return {
          id,
          name: system.name,
          securityStatus: system.security_status,
          distance: distances.get(id) ?? radius,
          regionId: regionByConstellation.get(system.constellation_id) ?? 0,
        };
      }),
    };
  })();

  topologyCache.set(key, { expiresAt: Date.now() + 86_400_000, value });
  try {
    return await value;
  } catch (error) {
    topologyCache.delete(key);
    throw error;
  }
}

function normalizeKill(raw: RawKillmail, zkb = raw.zkb): KillSummary | null {
  if (!raw.victim?.ship_type_id || !raw.victim.character_id) return null;
  const finalBlow = raw.attackers?.find((attacker) => attacker.final_blow);
  return {
    killmailId: raw.killmail_id,
    time: raw.killmail_time,
    systemId: raw.solar_system_id,
    victimCharacterId: raw.victim.character_id,
    victimShipTypeId: raw.victim.ship_type_id,
    finalBlowCharacterId: finalBlow?.character_id,
    attackerCount: zkb?.attackerCount ?? raw.attackers?.filter((attacker) => attacker.character_id).length ?? 0,
    totalValue: zkb?.totalValue ?? 0,
    solo: zkb?.solo ?? false,
    npc: zkb?.npc ?? false,
  };
}

function streamState(): KillStreamState {
  globalThis.__newEdenKillStream ??= { lastPollAt: 0, kills: new Map<number, KillSummary>() };
  return globalThis.__newEdenKillStream;
}

async function pumpR2Z2(): Promise<void> {
  const state = streamState();
  if (Date.now() - state.lastPollAt < 6_000) return;
  if (state.inflight) return state.inflight;

  state.inflight = (async () => {
    if (!state.nextSequence) {
      const sequenceResponse = await fetch(`${R2Z2_BASE}sequence.json`, {
        cache: "no-store",
        headers: { Accept: "application/json", "User-Agent": userAgent() },
      });
      if (!sequenceResponse.ok) throw new Error(`zKillboard sequence request failed (${sequenceResponse.status}).`);
      const sequence = await sequenceResponse.json() as { sequence: number };
      state.nextSequence = sequence.sequence;
    }

    for (let fetched = 0; fetched < 80; fetched += 1) {
      const response = await fetch(`${R2Z2_BASE}${state.nextSequence}.json`, {
        cache: "no-store",
        headers: { Accept: "application/json", "User-Agent": userAgent() },
      });
      if (response.status === 404) break;
      if (!response.ok) throw new Error(`zKillboard R2Z2 request failed (${response.status}).`);
      const item = await response.json() as R2Z2Package;
      const normalized = normalizeKill(item.esi, item.zkb);
      if (normalized) state.kills.set(normalized.killmailId, normalized);
      state.nextSequence += 1;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const oldest = Date.now() - 2 * HOUR_MS;
    for (const [id, kill] of state.kills) {
      if (new Date(kill.time).getTime() < oldest) state.kills.delete(id);
    }
    state.lastPollAt = Date.now();
  })().finally(() => {
    state.inflight = undefined;
  });

  return state.inflight;
}

async function regionKillSnapshot(regionId: number): Promise<KillSummary[]> {
  if (!regionId) return [];
  const response = await fetch(`${ZKILL_BASE}kills/regionID/${regionId}/pastSeconds/3600/`, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "User-Agent": userAgent(),
    },
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`zKillboard region request failed (${response.status}).`);
  const rows = await response.json() as RawKillmail[];
  return rows.map((row) => normalizeKill(row)).filter((kill): kill is KillSummary => Boolean(kill));
}

async function publicKills(regionIds: number[]): Promise<KillSummary[]> {
  try {
    await pumpR2Z2();
  } catch (error) {
    console.warn("The live zKillboard stream was unavailable", error);
  }

  let snapshots: KillSummary[] = [];
  try {
    snapshots = (await inChunks(regionIds, 2, regionKillSnapshot)).flat();
  } catch (error) {
    console.warn("The zKillboard regional snapshot was unavailable", error);
  }

  const merged = new Map<number, KillSummary>();
  for (const kill of [...snapshots, ...streamState().kills.values()]) merged.set(kill.killmailId, kill);
  return [...merged.values()];
}

export async function nearbyIntel(originId: number, radius: number): Promise<NearbyIntelResponse> {
  const nearby = await topology(originId, radius);
  const systemIds = new Set(nearby.systems.map((system) => system.id));
  const regionIds = [...new Set(nearby.systems.map((system) => system.regionId).filter(Boolean))];
  const [killTotals, jumpTotals, published] = await Promise.all([
    esi<SystemKills[]>("/universe/system_kills", { revalidate: 300 }),
    esi<SystemJumps[]>("/universe/system_jumps", { revalidate: 300 }),
    publicKills(regionIds),
  ]);

  const oneHourAgo = Date.now() - HOUR_MS;
  const nearbyPublished = published
    .filter((kill) => systemIds.has(kill.systemId) && new Date(kill.time).getTime() >= oneHourAgo)
    .sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime());
  const latestBySystem = new Map<number, string>();
  for (const kill of nearbyPublished) {
    if (!latestBySystem.has(kill.systemId)) latestBySystem.set(kill.systemId, kill.time);
  }

  const killsBySystem = new Map(killTotals.map((entry) => [entry.system_id, entry]));
  const jumpsBySystem = new Map(jumpTotals.map((entry) => [entry.system_id, entry.ship_jumps]));
  const systems: NearbySystemIntel[] = nearby.systems.map((system) => {
    const totals = killsBySystem.get(system.id);
    return {
      id: system.id,
      name: system.name,
      securityStatus: system.securityStatus,
      distance: system.distance,
      shipKills: totals?.ship_kills ?? 0,
      podKills: totals?.pod_kills ?? 0,
      npcKills: totals?.npc_kills ?? 0,
      jumps: jumpsBySystem.get(system.id) ?? 0,
      latestPublishedKill: latestBySystem.get(system.id),
    };
  });

  const systemById = new Map(systems.map((system) => [system.id, system]));
  const nameIds = [...new Set(nearbyPublished.flatMap((kill) => [
    kill.victimShipTypeId,
    kill.victimCharacterId,
    kill.finalBlowCharacterId,
  ].filter((id): id is number => Boolean(id))))];
  const names = await resolveNames(nameIds);
  const kills: NearbyKill[] = nearbyPublished.slice(0, 50).map((kill) => {
    const system = systemById.get(kill.systemId);
    return {
      killmailId: kill.killmailId,
      time: kill.time,
      systemId: kill.systemId,
      systemName: system?.name ?? `System ${kill.systemId}`,
      securityStatus: system?.securityStatus ?? 0,
      distance: system?.distance ?? radius,
      victimName: kill.victimCharacterId ? names.get(kill.victimCharacterId) ?? "Unknown capsuleer" : "Unknown capsuleer",
      victimShip: names.get(kill.victimShipTypeId) ?? `Ship type ${kill.victimShipTypeId}`,
      attackerName: kill.finalBlowCharacterId ? names.get(kill.finalBlowCharacterId) ?? "Unknown attacker" : "NPC or unknown attacker",
      attackerCount: kill.attackerCount,
      totalValue: kill.totalValue,
      solo: kill.solo,
      npc: kill.npc,
      url: `https://zkillboard.com/kill/${kill.killmailId}/`,
    };
  });

  const level = intelLevel(systems);
  const origin = systems.find((system) => system.id === originId) ?? systems[0];
  const summary = systems.reduce((totals, system) => ({
    systems: totals.systems + 1,
    shipKills: totals.shipKills + system.shipKills,
    podKills: totals.podKills + system.podKills,
    npcKills: totals.npcKills + system.npcKills,
    jumps: totals.jumps + system.jumps,
    publishedKills: nearbyPublished.length,
  }), { systems: 0, shipKills: 0, podKills: 0, npcKills: 0, jumps: 0, publishedKills: 0 });

  return {
    origin: { id: origin.id, name: origin.name, securityStatus: origin.securityStatus },
    radius,
    generatedAt: new Date().toISOString(),
    level,
    headline: intelHeadline(level, radius),
    summary,
    systems: rankSystems(systems),
    kills,
    sources: {
      officialSnapshot: "CCP ESI hourly system totals",
      publicFeed: "zKillboard public submissions plus R2Z2 live updates",
    },
  };
}
