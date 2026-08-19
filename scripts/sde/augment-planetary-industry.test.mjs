import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import {
  augmentPlanetaryIndustry,
  PLANETARY_INDUSTRY_SCHEMA_VERSION,
} from "./augment-planetary-industry.mjs";

const tempRoots = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function writeJsonl(directory, filename, records) {
  writeFileSync(path.join(directory, filename), `${records.map((record) => JSON.stringify(record)).join("\n")}\n`, "utf8");
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "nec-pi-sde-test-"));
  tempRoots.push(root);
  const sourceDir = path.join(root, "jsonl");
  mkdirSync(sourceDir);
  const databasePath = path.join(root, "eve-static.db");
  const db = new DatabaseSync(databasePath);
  db.exec(`
    CREATE TABLE sde_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE types (
      type_id INTEGER PRIMARY KEY,
      group_id INTEGER,
      name TEXT,
      description TEXT,
      published INTEGER,
      market_group_id INTEGER,
      volume REAL,
      packaged_volume REAL,
      mass REAL,
      portion_size INTEGER,
      base_price REAL,
      is_placeholder INTEGER NOT NULL DEFAULT 0
    );
  `);
  db.prepare("INSERT INTO sde_meta (key, value) VALUES (?, ?)").run("schema_version", "2");
  db.prepare("INSERT INTO sde_meta (key, value) VALUES (?, ?)").run("datasets", "types.jsonl,mapSolarSystems.jsonl,mapStargates.jsonl");
  db.prepare("INSERT INTO sde_meta (key, value) VALUES (?, ?)").run("placeholder_types", "0");
  db.prepare(`
    INSERT INTO types (type_id, name, is_placeholder)
    VALUES (2396, 'Biofuels', 0), (2397, 'Industrial Fibers', 0), (2400, 'Biocells', 0), (2254, 'Advanced Industry Facility', 0)
  `).run();
  db.close();

  return { sourceDir, databasePath };
}

describe("SDE Planetary Industry augmentation", () => {
  it("imports schematic inputs, outputs, processor pins, and schema-v3 metadata", async () => {
    const { sourceDir, databasePath } = fixture();
    writeJsonl(sourceDir, "planetSchematics.jsonl", [
      {
        _key: 65,
        name: { en: "Test Biocells" },
        cycleTime: 1800,
        pins: [2254],
        types: [
          { _key: 2396, isInput: true, quantity: 40 },
          { _key: 2397, isInput: true, quantity: 40 },
          { _key: 2400, isInput: false, quantity: 5 },
        ],
      },
    ]);

    const counts = await augmentPlanetaryIndustry({ sourceDir, databasePath });
    expect(counts).toEqual({
      planetSchematics: 1,
      planetSchematicPins: 1,
      planetSchematicInputs: 2,
      planetSchematicOutputs: 1,
    });

    const db = new DatabaseSync(databasePath, { readOnly: true });
    try {
      expect(db.prepare("SELECT name, cycle_time_seconds FROM planet_schematics WHERE schematic_id = 65").get())
        .toEqual({ name: "Test Biocells", cycle_time_seconds: 1800 });
      expect(db.prepare("SELECT pin_type_id FROM planet_schematic_pins WHERE schematic_id = 65").all())
        .toEqual([{ pin_type_id: 2254 }]);
      expect(db.prepare("SELECT type_id, is_input, quantity FROM planet_schematic_types WHERE schematic_id = 65 ORDER BY type_id").all())
        .toEqual([
          { type_id: 2396, is_input: 1, quantity: 40 },
          { type_id: 2397, is_input: 1, quantity: 40 },
          { type_id: 2400, is_input: 0, quantity: 5 },
        ]);
      expect(db.prepare("SELECT value FROM sde_meta WHERE key = 'schema_version'").get())
        .toEqual({ value: String(PLANETARY_INDUSTRY_SCHEMA_VERSION) });
      expect(String(db.prepare("SELECT value FROM sde_meta WHERE key = 'datasets'").get()?.value))
        .toContain("planetSchematics.jsonl");
    } finally {
      db.close();
    }
  });

  it("accepts JSONL keyed-object forms and creates placeholders for referenced types absent from the base types dataset", async () => {
    const { sourceDir, databasePath } = fixture();
    writeJsonl(sourceDir, "planetSchematics.jsonl", [
      {
        _key: 66,
        _value: {
          name: { en: "Flexible shape" },
          cycleTime: 3600,
          pins: { 999001: {} },
          types: {
            999002: { isInput: true, quantity: 3 },
            999003: { isInput: false, quantity: 1 },
          },
        },
      },
    ]);

    await augmentPlanetaryIndustry({ sourceDir, databasePath });
    const db = new DatabaseSync(databasePath, { readOnly: true });
    try {
      expect(db.prepare("SELECT type_id, is_placeholder FROM types WHERE type_id IN (999001, 999002, 999003) ORDER BY type_id").all())
        .toEqual([
          { type_id: 999001, is_placeholder: 1 },
          { type_id: 999002, is_placeholder: 1 },
          { type_id: 999003, is_placeholder: 1 },
        ]);
      expect(db.prepare("SELECT value FROM sde_meta WHERE key = 'placeholder_types'").get()).toEqual({ value: "3" });
    } finally {
      db.close();
    }
  });

  it("rejects schematics without a positive output row", async () => {
    const { sourceDir, databasePath } = fixture();
    writeJsonl(sourceDir, "planetSchematics.jsonl", [
      { _key: 67, cycleTime: 1800, pins: [2254], types: [{ _key: 2396, isInput: true, quantity: 40 }] },
    ]);
    await expect(augmentPlanetaryIndustry({ sourceDir, databasePath })).rejects.toThrow("has no output row");
  });
});
