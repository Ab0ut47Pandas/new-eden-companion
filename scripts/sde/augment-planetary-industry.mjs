import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { DatabaseSync } from "node:sqlite";

export const PLANETARY_INDUSTRY_SCHEMA_VERSION = 3;
export const PLANETARY_INDUSTRY_DATASETS = ["planetSchematics.jsonl"];

function integer(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function booleanInteger(value) {
  if (value === null || value === undefined) return null;
  if (value === true || value === 1 || value === "1") return 1;
  if (value === false || value === 0 || value === "0") return 0;
  return null;
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

function nestedObject(record) {
  if (record?._value && !Array.isArray(record._value) && typeof record._value === "object") {
    return { ...record._value, _key: record._key };
  }
  return record;
}

function keyedEntries(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).map(([key, entry]) => {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) return { ...entry, _key: entry._key ?? key };
    return { _key: key, _value: entry };
  });
}

function referencedTypeId(record, ...keys) {
  const value = nestedObject(record);
  const candidates = [
    value,
    value?._key,
    value?._value,
    ...keys.map((key) => value?.[key]),
  ];
  for (const candidate of candidates) {
    const parsed = integer(candidate);
    if (parsed !== null && parsed > 0) return parsed;
  }
  return null;
}

async function readJsonLines(filename, visitor) {
  if (!existsSync(filename)) throw new Error(`Required SDE Planetary Industry dataset is missing: ${filename}`);
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

export async function augmentPlanetaryIndustry({ sourceDir, databasePath }) {
  const datasetPath = path.join(sourceDir, "planetSchematics.jsonl");
  if (!existsSync(datasetPath)) throw new Error(`Required SDE Planetary Industry dataset is missing: ${datasetPath}`);

  const db = new DatabaseSync(databasePath);
  const counts = {
    planetSchematics: 0,
    planetSchematicPins: 0,
    planetSchematicInputs: 0,
    planetSchematicOutputs: 0,
  };
  try {
    db.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS planet_schematics (
        schematic_id INTEGER PRIMARY KEY,
        name TEXT,
        cycle_time_seconds INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS planet_schematic_pins (
        schematic_id INTEGER NOT NULL,
        pin_type_id INTEGER NOT NULL,
        PRIMARY KEY (schematic_id, pin_type_id),
        FOREIGN KEY (schematic_id) REFERENCES planet_schematics(schematic_id),
        FOREIGN KEY (pin_type_id) REFERENCES types(type_id)
      );
      CREATE TABLE IF NOT EXISTS planet_schematic_types (
        schematic_id INTEGER NOT NULL,
        type_id INTEGER NOT NULL,
        is_input INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        PRIMARY KEY (schematic_id, type_id),
        FOREIGN KEY (schematic_id) REFERENCES planet_schematics(schematic_id),
        FOREIGN KEY (type_id) REFERENCES types(type_id)
      );
      CREATE INDEX IF NOT EXISTS idx_planet_schematic_types_type ON planet_schematic_types(type_id);
      CREATE INDEX IF NOT EXISTS idx_planet_schematic_types_output ON planet_schematic_types(is_input, type_id);
      CREATE INDEX IF NOT EXISTS idx_planet_schematic_pins_type ON planet_schematic_pins(pin_type_id);
    `);

    const insertPlaceholder = db.prepare(`
      INSERT INTO types (
        type_id, group_id, name, description, published, market_group_id,
        volume, packaged_volume, mass, portion_size, base_price, is_placeholder
      ) VALUES (?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1)
      ON CONFLICT(type_id) DO NOTHING
    `);
    const insertSchematic = db.prepare(`
      INSERT OR REPLACE INTO planet_schematics (schematic_id, name, cycle_time_seconds)
      VALUES (?, ?, ?)
    `);
    const insertPin = db.prepare(`
      INSERT OR REPLACE INTO planet_schematic_pins (schematic_id, pin_type_id)
      VALUES (?, ?)
    `);
    const insertType = db.prepare(`
      INSERT OR REPLACE INTO planet_schematic_types (schematic_id, type_id, is_input, quantity)
      VALUES (?, ?, ?, ?)
    `);
    const meta = db.prepare("INSERT OR REPLACE INTO sde_meta (key, value) VALUES (?, ?)");

    let additionalPlaceholders = 0;
    const ensureType = (typeId) => {
      const result = insertPlaceholder.run(typeId);
      if (Number(result.changes) > 0) additionalPlaceholders += 1;
    };

    db.exec("BEGIN IMMEDIATE;");
    try {
      await readJsonLines(datasetPath, (raw) => {
        const record = recordObject(raw);
        const schematicId = integer(record?._key ?? record?.schematicID ?? record?.schematicId);
        const cycleTime = integer(record?.cycleTime ?? record?.cycle_time ?? record?.cycleTimeSeconds);
        if (schematicId === null || schematicId <= 0) throw new Error("planet schematic is missing a positive schematic ID");
        if (cycleTime === null || cycleTime <= 0) throw new Error(`planet schematic ${schematicId} is missing a positive cycle time`);
        insertSchematic.run(schematicId, localizedText(record?.name), cycleTime);
        counts.planetSchematics += 1;

        const pins = keyedEntries(record?.pins);
        for (const rawPin of pins) {
          const pin = nestedObject(rawPin);
          const pinTypeId = referencedTypeId(pin, "typeID", "typeId", "pinTypeID", "pinTypeId");
          if (pinTypeId === null) throw new Error(`planet schematic ${schematicId} contains a pin without a type ID`);
          ensureType(pinTypeId);
          insertPin.run(schematicId, pinTypeId);
          counts.planetSchematicPins += 1;
        }

        const types = keyedEntries(record?.types);
        if (types.length === 0) throw new Error(`planet schematic ${schematicId} contains no input/output type rows`);
        let outputRows = 0;
        for (const rawType of types) {
          const value = nestedObject(rawType);
          const typeId = referencedTypeId(value, "typeID", "typeId");
          const isInput = booleanInteger(value?.isInput ?? value?.is_input);
          const quantity = integer(value?.quantity);
          if (typeId === null || isInput === null || quantity === null || quantity <= 0) {
            throw new Error(`planet schematic ${schematicId} has an invalid type row`);
          }
          ensureType(typeId);
          insertType.run(schematicId, typeId, isInput, quantity);
          if (isInput === 1) counts.planetSchematicInputs += 1;
          else {
            counts.planetSchematicOutputs += 1;
            outputRows += 1;
          }
        }
        if (outputRows === 0) throw new Error(`planet schematic ${schematicId} has no output row`);
      });

      if (counts.planetSchematics <= 0 || counts.planetSchematicOutputs <= 0) {
        throw new Error("Planetary Industry schematic import produced no schematics or outputs");
      }

      const existingDatasets = db.prepare("SELECT value FROM sde_meta WHERE key = 'datasets'").get();
      const datasets = new Set(String(existingDatasets?.value ?? "").split(",").filter(Boolean));
      for (const dataset of PLANETARY_INDUSTRY_DATASETS) datasets.add(dataset);
      const existingPlaceholderRow = db.prepare("SELECT value FROM sde_meta WHERE key = 'placeholder_types'").get();
      const existingPlaceholderCount = integer(existingPlaceholderRow?.value) ?? 0;
      meta.run("datasets", [...datasets].join(","));
      meta.run("schema_version", String(PLANETARY_INDUSTRY_SCHEMA_VERSION));
      meta.run("placeholder_types", String(existingPlaceholderCount + additionalPlaceholders));
      meta.run("planetary_schematics", String(counts.planetSchematics));
      meta.run("planetary_schematic_pins", String(counts.planetSchematicPins));
      meta.run("planetary_schematic_inputs", String(counts.planetSchematicInputs));
      meta.run("planetary_schematic_outputs", String(counts.planetSchematicOutputs));
      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }

    db.exec("PRAGMA optimize;");
    return counts;
  } finally {
    db.close();
  }
}
