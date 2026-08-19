import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { augmentRouteTopology, ROUTE_TOPOLOGY_SCHEMA_VERSION } from "./augment-route-topology.mjs";

const tempRoots = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function writeJsonl(directory, filename, records) {
  writeFileSync(path.join(directory, filename), `${records.map((record) => JSON.stringify(record)).join("\n")}\n`, "utf8");
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "nec-route-sde-test-"));
  tempRoots.push(root);
  const sourceDir = path.join(root, "jsonl");
  mkdirSync(sourceDir);
  const databasePath = path.join(root, "eve-static.db");
  const db = new DatabaseSync(databasePath);
  db.exec("CREATE TABLE sde_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
  db.prepare("INSERT INTO sde_meta (key, value) VALUES (?, ?)").run("schema_version", "1");
  db.prepare("INSERT INTO sde_meta (key, value) VALUES (?, ?)").run("datasets", "types.jsonl");
  db.close();

  writeJsonl(sourceDir, "mapSolarSystems.jsonl", [
    { _key: 30000001, name: { en: "Alpha" }, securityStatus: 0.9, position: { x: 1, y: 2, z: 3 } },
    { _key: 30000002, name: { en: "Beta" }, securityStatus: 0.5, position: { x: 4, y: 5, z: 6 } },
  ]);
  writeJsonl(sourceDir, "mapStargates.jsonl", [
    { _key: 50000001, solarSystemID: 30000001, destination: { solarSystemID: 30000002 } },
    { _key: 50000002, solarSystemID: 30000002, destination: { solarSystemID: 30000001 } },
  ]);
  return { sourceDir, databasePath };
}

describe("SDE route topology augmentation", () => {
  it("adds systems, stargates, indexes, and schema-v2 metadata", async () => {
    const { sourceDir, databasePath } = fixture();
    const counts = await augmentRouteTopology({ sourceDir, databasePath });
    expect(counts).toEqual({ solarSystems: 2, stargates: 2 });

    const db = new DatabaseSync(databasePath, { readOnly: true });
    try {
      expect(db.prepare("SELECT COUNT(*) AS count FROM solar_systems").get()).toEqual({ count: 2 });
      expect(db.prepare("SELECT COUNT(*) AS count FROM stargates").get()).toEqual({ count: 2 });
      expect(db.prepare("SELECT name, security_status FROM solar_systems WHERE system_id = 30000001").get())
        .toEqual({ name: "Alpha", security_status: 0.9 });
      expect(db.prepare("SELECT destination_system_id FROM stargates WHERE stargate_id = 50000001").get())
        .toEqual({ destination_system_id: 30000002 });
      expect(db.prepare("SELECT value FROM sde_meta WHERE key = 'schema_version'").get())
        .toEqual({ value: String(ROUTE_TOPOLOGY_SCHEMA_VERSION) });
      expect(String(db.prepare("SELECT value FROM sde_meta WHERE key = 'datasets'").get()?.value))
        .toContain("mapSolarSystems.jsonl");
    } finally {
      db.close();
    }
  });

  it("fails without the CCP route datasets", async () => {
    const { sourceDir, databasePath } = fixture();
    rmSync(path.join(sourceDir, "mapStargates.jsonl"));
    await expect(augmentRouteTopology({ sourceDir, databasePath })).rejects.toThrow("mapStargates.jsonl");
  });
});
