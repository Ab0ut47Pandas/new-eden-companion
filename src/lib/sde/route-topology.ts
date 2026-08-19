import "server-only";

import { DatabaseSync } from "node:sqlite";

import type { RouteGraph, RouteGraphSystem } from "@/lib/map/risk-route-core";
import { getStaticDatabaseMetadata, staticDatabaseAvailable, staticDatabasePath } from "./database";

export interface StaticRouteTopologyResult {
  available: boolean;
  graph: RouteGraph | null;
  reason: string | null;
  schemaVersion: number | null;
  sdeBuild: number | null;
}

let cached: { key: string; result: StaticRouteTopologyResult } | null = null;

function tableExists(db: DatabaseSync, name: string): boolean {
  const row = db.prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1").get(name) as { present?: number } | undefined;
  return row?.present === 1;
}

export function loadStaticRouteTopology(): StaticRouteTopologyResult {
  if (!staticDatabaseAvailable()) {
    return { available: false, graph: null, reason: "The static EVE database is not installed.", schemaVersion: null, sdeBuild: null };
  }

  const metadata = getStaticDatabaseMetadata();
  const key = `${staticDatabasePath()}:${metadata.schemaVersion}:${metadata.sdeBuild}`;
  if (cached?.key === key) return cached.result;

  const db = new DatabaseSync(staticDatabasePath(), { readOnly: true });
  try {
    if (!tableExists(db, "solar_systems") || !tableExists(db, "stargates")) {
      const result: StaticRouteTopologyResult = {
        available: false,
        graph: null,
        reason: "This static database predates NEC route-topology support. Update Static Data to rebuild it with the CCP stargate graph.",
        schemaVersion: metadata.schemaVersion,
        sdeBuild: metadata.sdeBuild,
      };
      cached = { key, result };
      return result;
    }

    const systemRows = db.prepare(`
      SELECT DISTINCT system.system_id, system.name, system.security_status
      FROM solar_systems system
      JOIN stargates gate
        ON gate.system_id = system.system_id OR gate.destination_system_id = system.system_id
      ORDER BY system.system_id
    `).all() as unknown as Array<{ system_id: number; name: string | null; security_status: number }>;
    const gateRows = db.prepare(`
      SELECT system_id, destination_system_id
      FROM stargates
      ORDER BY system_id, destination_system_id
    `).all() as unknown as Array<{ system_id: number; destination_system_id: number }>;

    const systems = new Map<number, RouteGraphSystem>();
    for (const row of systemRows) {
      systems.set(row.system_id, {
        id: row.system_id,
        name: row.name ?? `System ${row.system_id}`,
        securityStatus: row.security_status,
      });
    }

    const neighbourSets = new Map<number, Set<number>>();
    const connect = (from: number, to: number) => {
      if (!systems.has(from) || !systems.has(to) || from === to) return;
      const set = neighbourSets.get(from) ?? new Set<number>();
      set.add(to);
      neighbourSets.set(from, set);
    };
    for (const gate of gateRows) {
      connect(gate.system_id, gate.destination_system_id);
      connect(gate.destination_system_id, gate.system_id);
    }

    const neighbours = new Map<number, number[]>();
    for (const id of systems.keys()) {
      neighbours.set(id, [...(neighbourSets.get(id) ?? [])].sort((a, b) => a - b));
    }

    if (systems.size === 0 || gateRows.length === 0) {
      throw new Error("Static route topology is present but empty.");
    }

    const result: StaticRouteTopologyResult = {
      available: true,
      graph: { systems, neighbours },
      reason: null,
      schemaVersion: metadata.schemaVersion,
      sdeBuild: metadata.sdeBuild,
    };
    cached = { key, result };
    return result;
  } finally {
    db.close();
  }
}

export function searchStaticRouteSystems(query: string, limit = 12): RouteGraphSystem[] {
  const trimmed = query.trim();
  if (trimmed.length < 2 || !staticDatabaseAvailable()) return [];
  const db = new DatabaseSync(staticDatabasePath(), { readOnly: true });
  try {
    if (!tableExists(db, "solar_systems") || !tableExists(db, "stargates")) return [];
    const rows = db.prepare(`
      SELECT DISTINCT system.system_id, system.name, system.security_status
      FROM solar_systems system
      JOIN stargates gate
        ON gate.system_id = system.system_id OR gate.destination_system_id = system.system_id
      WHERE lower(system.name) LIKE lower(?)
      ORDER BY CASE WHEN lower(system.name) = lower(?) THEN 0 ELSE 1 END, length(system.name), system.name
      LIMIT ?
    `).all(`%${trimmed}%`, trimmed, Math.max(1, Math.min(50, Math.trunc(limit)))) as unknown as Array<{
      system_id: number;
      name: string | null;
      security_status: number;
    }>;
    return rows.map((row) => ({
      id: row.system_id,
      name: row.name ?? `System ${row.system_id}`,
      securityStatus: row.security_status,
    }));
  } finally {
    db.close();
  }
}
