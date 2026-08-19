import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import {
  queryPlanetarySchematic,
  queryPlanetarySchematicsForOutput,
  queryPlanetarySchematicsUsingInput,
} from "./schematic-query";

let database: DatabaseSync | null = null;

function testDatabase(): DatabaseSync {
  database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE types (type_id INTEGER PRIMARY KEY, name TEXT, is_placeholder INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE planet_schematics (schematic_id INTEGER PRIMARY KEY, name TEXT, cycle_time_seconds INTEGER NOT NULL);
    CREATE TABLE planet_schematic_pins (schematic_id INTEGER NOT NULL, pin_type_id INTEGER NOT NULL, PRIMARY KEY (schematic_id, pin_type_id));
    CREATE TABLE planet_schematic_types (schematic_id INTEGER NOT NULL, type_id INTEGER NOT NULL, is_input INTEGER NOT NULL, quantity INTEGER NOT NULL, PRIMARY KEY (schematic_id, type_id));
  `);
  return database;
}

afterEach(() => {
  database?.close();
  database = null;
});

function seed(db: DatabaseSync): void {
  db.exec(`
    INSERT INTO types VALUES
      (100, 'Raw A', 0),
      (101, 'Raw B', 0),
      (200, 'Processed A', 0),
      (201, 'Processed B', 0),
      (300, 'Basic Industry Facility', 0),
      (301, 'Advanced Industry Facility', 0);
    INSERT INTO planet_schematics VALUES
      (65, 'Process A', 1800),
      (66, 'Process B', 3600);
    INSERT INTO planet_schematic_pins VALUES
      (65, 300),
      (66, 301);
    INSERT INTO planet_schematic_types VALUES
      (65, 100, 1, 40),
      (65, 101, 1, 40),
      (65, 200, 0, 5),
      (66, 200, 1, 10),
      (66, 201, 0, 3);
  `);
}

describe("Planetary Industry schematic queries", () => {
  it("returns one exact schematic with pin, inputs, output, quantities and cycle time", () => {
    const db = testDatabase();
    seed(db);
    expect(queryPlanetarySchematic(db, 65)).toEqual({
      schematicId: 65,
      name: 'Process A',
      cycleTimeSeconds: 1800,
      pins: [{ typeId: 300, name: 'Basic Industry Facility', isPlaceholder: false }],
      inputs: [
        { typeId: 100, name: 'Raw A', isPlaceholder: false, quantity: 40 },
        { typeId: 101, name: 'Raw B', isPlaceholder: false, quantity: 40 },
      ],
      outputs: [{ typeId: 200, name: 'Processed A', isPlaceholder: false, quantity: 5 }],
    });
  });

  it("resolves all SDE schematic alternatives that output a type", () => {
    const db = testDatabase();
    seed(db);
    expect(queryPlanetarySchematicsForOutput(db, 200).map((schematic) => schematic.schematicId)).toEqual([65]);
  });

  it("resolves reverse PI uses for an input", () => {
    const db = testDatabase();
    seed(db);
    expect(queryPlanetarySchematicsUsingInput(db, 200).map((schematic) => schematic.schematicId)).toEqual([66]);
  });

  it("returns explicit empty results when no PI relationship is present", () => {
    const db = testDatabase();
    seed(db);
    expect(queryPlanetarySchematic(db, 999)).toBeNull();
    expect(queryPlanetarySchematicsForOutput(db, 100)).toEqual([]);
    expect(queryPlanetarySchematicsUsingInput(db, 201)).toEqual([]);
  });
});
