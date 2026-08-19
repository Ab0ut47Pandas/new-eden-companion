import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { queryBlueprintScienceProfile } from "./blueprint-activity-query";

let database: DatabaseSync | null = null;

function testDatabase(): DatabaseSync {
  database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE types (
      type_id INTEGER PRIMARY KEY,
      name TEXT,
      is_placeholder INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE blueprints (
      blueprint_type_id INTEGER PRIMARY KEY,
      max_production_limit INTEGER
    );
    CREATE TABLE blueprint_activities (
      blueprint_type_id INTEGER NOT NULL,
      activity TEXT NOT NULL,
      time_seconds INTEGER,
      PRIMARY KEY (blueprint_type_id, activity)
    );
    CREATE TABLE blueprint_materials (
      blueprint_type_id INTEGER NOT NULL,
      activity TEXT NOT NULL,
      material_type_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      PRIMARY KEY (blueprint_type_id, activity, material_type_id)
    );
    CREATE TABLE blueprint_skills (
      blueprint_type_id INTEGER NOT NULL,
      activity TEXT NOT NULL,
      skill_type_id INTEGER NOT NULL,
      level INTEGER NOT NULL,
      PRIMARY KEY (blueprint_type_id, activity, skill_type_id)
    );
  `);
  return database;
}

afterEach(() => {
  database?.close();
  database = null;
});

describe("blueprint science activity query", () => {
  it("returns only copying and research activities with SDE materials, skills, time, and copy limit", () => {
    const db = testDatabase();
    db.exec(`
      INSERT INTO types VALUES
        (100, 'Test Hull Blueprint', 0),
        (200, 'Reports', 0),
        (201, 'Data Sheets', 0),
        (300, 'Metallurgy', 0),
        (301, 'Science', 0);
      INSERT INTO blueprints VALUES (100, 30);
      INSERT INTO blueprint_activities VALUES
        (100, 'manufacturing', 60),
        (100, 'research_material', 120),
        (100, 'research_time', 180),
        (100, 'copying', 240),
        (100, 'invention', 300);
      INSERT INTO blueprint_materials VALUES
        (100, 'research_material', 200, 2),
        (100, 'copying', 201, 3);
      INSERT INTO blueprint_skills VALUES
        (100, 'research_material', 300, 2),
        (100, 'research_time', 301, 1),
        (100, 'copying', 301, 3);
    `);

    expect(queryBlueprintScienceProfile(db, 100)).toEqual({
      blueprint: {
        typeId: 100,
        name: 'Test Hull Blueprint',
        isPlaceholder: false,
        maxProductionLimit: 30,
      },
      activities: [
        {
          kind: 'research_material',
          timeSeconds: 120,
          materials: [{ typeId: 200, name: 'Reports', isPlaceholder: false, quantity: 2 }],
          skills: [{ typeId: 300, name: 'Metallurgy', isPlaceholder: false, level: 2 }],
        },
        {
          kind: 'research_time',
          timeSeconds: 180,
          materials: [],
          skills: [{ typeId: 301, name: 'Science', isPlaceholder: false, level: 1 }],
        },
        {
          kind: 'copying',
          timeSeconds: 240,
          materials: [{ typeId: 201, name: 'Data Sheets', isPlaceholder: false, quantity: 3 }],
          skills: [{ typeId: 301, name: 'Science', isPlaceholder: false, level: 3 }],
        },
      ],
    });
  });

  it("preserves placeholder references and missing time", () => {
    const db = testDatabase();
    db.exec(`
      INSERT INTO types VALUES (100, NULL, 1), (200, NULL, 1), (300, NULL, 1);
      INSERT INTO blueprints VALUES (100, NULL);
      INSERT INTO blueprint_activities VALUES (100, 'copying', NULL);
      INSERT INTO blueprint_materials VALUES (100, 'copying', 200, 1);
      INSERT INTO blueprint_skills VALUES (100, 'copying', 300, 4);
    `);

    expect(queryBlueprintScienceProfile(db, 100)).toEqual({
      blueprint: { typeId: 100, name: null, isPlaceholder: true, maxProductionLimit: null },
      activities: [{
        kind: 'copying',
        timeSeconds: null,
        materials: [{ typeId: 200, name: null, isPlaceholder: true, quantity: 1 }],
        skills: [{ typeId: 300, name: null, isPlaceholder: true, level: 4 }],
      }],
    });
  });

  it("returns null for a type that is not an SDE blueprint", () => {
    const db = testDatabase();
    db.exec("INSERT INTO types VALUES (100, 'Not a blueprint', 0);");
    expect(queryBlueprintScienceProfile(db, 100)).toBeNull();
  });
});
