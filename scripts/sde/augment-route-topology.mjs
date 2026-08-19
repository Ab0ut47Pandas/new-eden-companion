import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { DatabaseSync } from "node:sqlite";

export const ROUTE_TOPOLOGY_SCHEMA_VERSION = 2;
export const ROUTE_TOPOLOGY_DATASETS = ["mapSolarSystems.jsonl", "mapStargates.jsonl"];

function integer(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function number(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function localizedText(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  for (const key of ["en", "en-us", "en_US", "en-US"]) {
    if (typeof value[key] === "string") return value[key];
  }
  const first = Object.values(value).find((candidate) => typeof candidate === "string");
  return typeof first === "string" ? first : null;
}

function recordObject(record) {
  if (record?._value && !Array.isArray(record._value) && typeof record._value === "object") {
    return { ...record._value, _key: record._key };
  }
  return record;
}

async function readJsonLines(filename, visitor) {
  if (!existsSync(filename)) throw new Error(`Required SDE route dataset is missing: ${filename}`);
  const stream = createReadStream(filename, { encoding: "utf8" });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lineNumber = 0;
  for await (const line of lines) {
    lineNumber += 1;
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      await visitor(JSON.parse(trimmed));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${path.basename(filename)}:${lineNumber}: ${message}`);
    }
  }
}

export async function augmentRouteTopology({ sourceDir, databasePath }) {
  for (const dataset of ROUTE_TOPOLOGY_DATASETS) {
    const filename = path.join(sourceDir, dataset);
    if (!existsSync(filename)) throw new Error(`Required SDE route dataset is missing: ${filename}`);
  }

  const db = new DatabaseSync(databasePath);
  const counts = { solarSystems: 0, stargates: 0 };
  try {
    db.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS solar_systems (
        system_id INTEGER PRIMARY KEY,
        name TEXT,
        security_status REAL NOT NULL,
        x REAL,
        y REAL,
        z REAL
      );
      CREATE TABLE IF NOT EXISTS stargates (
        stargate_id INTEGER PRIMARY KEY,
        system_id INTEGER NOT NULL,
        destination_system_id INTEGER NOT NULL,
        FOREIGN KEY (system_id) REFERENCES solar_systems(system_id),
        FOREIGN KEY (destination_system_id) REFERENCES solar_systems(system_id)
      );
      CREATE INDEX IF NOT EXISTS idx_stargates_system ON stargates(system_id);
      CREATE INDEX IF NOT EXISTS idx_stargates_destination ON stargates(destination_system_id);
    `);

    const insertSystem = db.prepare(`
      INSERT OR REPLACE INTO solar_systems (system_id, name, security_status, x, y, z)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertGate = db.prepare(`
      INSERT OR REPLACE INTO stargates (stargate_id, system_id, destination_system_id)
      VALUES (?, ?, ?)
    `);
    const meta = db.prepare("INSERT OR REPLACE INTO sde_meta (key, value) VALUES (?, ?)");

    db.exec("BEGIN IMMEDIATE;");
    try {
      await readJsonLines(path.join(sourceDir, "mapSolarSystems.jsonl"), (raw) => {
        const record = recordObject(raw);
        const id = integer(record?._key ?? record?.solarSystemID ?? record?.solarSystemId);
        const security = number(record?.securityStatus ?? record?.security_status);
        if (id === null || security === null) throw new Error("solar system is missing ID or security status");
        const position = record?.position && typeof record.position === "object" ? record.position : {};
        insertSystem.run(
          id,
          localizedText(record?.name),
          security,
          number(position.x),
          number(position.y),
          number(position.z),
        );
        counts.solarSystems += 1;
      });

      await readJsonLines(path.join(sourceDir, "mapStargates.jsonl"), (raw) => {
        const record = recordObject(raw);
        const gateId = integer(record?._key ?? record?.stargateID ?? record?.stargateId);
        const systemId = integer(record?.solarSystemID ?? record?.solarSystemId ?? record?.systemID ?? record?.systemId);
        const destination = record?.destination && typeof record.destination === "object" ? record.destination : {};
        const destinationSystemId = integer(destination.solarSystemID ?? destination.solarSystemId ?? record?.destinationSystemID ?? record?.destinationSystemId);
        if (gateId === null || systemId === null || destinationSystemId === null) {
          throw new Error("stargate is missing gate, origin-system, or destination-system ID");
        }
        insertGate.run(gateId, systemId, destinationSystemId);
        counts.stargates += 1;
      });

      const existing = db.prepare("SELECT value FROM sde_meta WHERE key = 'datasets'").get();
      const datasets = new Set(String(existing?.value ?? "").split(",").filter(Boolean));
      for (const dataset of ROUTE_TOPOLOGY_DATASETS) datasets.add(dataset);
      meta.run("datasets", [...datasets].join(","));
      meta.run("schema_version", String(ROUTE_TOPOLOGY_SCHEMA_VERSION));
      meta.run("route_topology_systems", String(counts.solarSystems));
      meta.run("route_topology_stargates", String(counts.stargates));
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }

    if (counts.solarSystems <= 0 || counts.stargates <= 0) {
      throw new Error("SDE route topology import produced an empty system or stargate table");
    }
    db.exec("PRAGMA optimize;");
    return counts;
  } finally {
    db.close();
  }
}
