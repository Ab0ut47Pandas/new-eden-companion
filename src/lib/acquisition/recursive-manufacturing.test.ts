import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { expandManufacturingDependencies } from "./recursive-manufacturing";

let database: DatabaseSync | null = null;

function testDatabase(): DatabaseSync {
  database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE types (
      type_id INTEGER PRIMARY KEY,
      name TEXT,
      is_placeholder INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE blueprint_activities (
      blueprint_type_id INTEGER NOT NULL,
      activity TEXT NOT NULL,
      time_seconds INTEGER,
      PRIMARY KEY (blueprint_type_id, activity)
    );

    CREATE TABLE blueprint_products (
      blueprint_type_id INTEGER NOT NULL,
      activity TEXT NOT NULL,
      product_type_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      PRIMARY KEY (blueprint_type_id, activity, product_type_id)
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

describe("recursive manufacturing dependency expansion", () => {
  it("recursively expands manufacturable materials while preserving deterministic alternatives and terminal leaves", () => {
    const db = testDatabase();
    db.exec(`
      INSERT INTO types (type_id, name, is_placeholder) VALUES
        (100, 'Target Hull', 0),
        (200, 'Hull Blueprint', 0),
        (201, 'Alternate Hull Blueprint', 0),
        (300, 'Built Component', 0),
        (301, 'Raw A', 0),
        (302, 'Raw B', 0),
        (400, 'Component Blueprint', 0),
        (500, 'Industry', 0);

      INSERT INTO blueprint_activities VALUES
        (200, 'manufacturing', 60),
        (201, 'manufacturing', 90),
        (400, 'manufacturing', 30);

      INSERT INTO blueprint_products VALUES
        (200, 'manufacturing', 100, 1),
        (201, 'manufacturing', 100, 2),
        (400, 'manufacturing', 300, 1);

      INSERT INTO blueprint_materials VALUES
        (200, 'manufacturing', 300, 2),
        (200, 'manufacturing', 301, 5),
        (201, 'manufacturing', 302, 7),
        (400, 'manufacturing', 302, 3);

      INSERT INTO blueprint_skills VALUES
        (200, 'manufacturing', 500, 1),
        (400, 'manufacturing', 500, 2);
    `);

    const result = expandManufacturingDependencies(db, 100);

    expect(result.state).toBe("manufacturable");
    expect(result.alternatives.map((alternative) => alternative.blueprint.name)).toEqual([
      "Alternate Hull Blueprint",
      "Hull Blueprint",
    ]);

    const hullBlueprint = result.alternatives[1];
    expect(hullBlueprint.activity.materials.map((material) => material.requirement.name)).toEqual(["Built Component", "Raw A"]);
    expect(hullBlueprint.activity.materials[0].dependency).toMatchObject({
      typeId: 300,
      depth: 1,
      state: "manufacturable",
    });
    expect(hullBlueprint.activity.materials[0].dependency.alternatives[0].activity.materials[0].dependency).toMatchObject({
      typeId: 302,
      depth: 2,
      state: "not-manufacturable",
      alternatives: [],
    });
    expect(hullBlueprint.activity.materials[1].dependency).toMatchObject({
      typeId: 301,
      depth: 1,
      state: "not-manufacturable",
      alternatives: [],
    });
  });

  it("marks a repeated item on the active recursion path as a cycle", () => {
    const db = testDatabase();
    db.exec(`
      INSERT INTO types (type_id, name, is_placeholder) VALUES
        (100, 'Item A', 0),
        (200, 'A Blueprint', 0),
        (300, 'Item B', 0),
        (400, 'B Blueprint', 0);

      INSERT INTO blueprint_activities VALUES
        (200, 'manufacturing', 10),
        (400, 'manufacturing', 10);
      INSERT INTO blueprint_products VALUES
        (200, 'manufacturing', 100, 1),
        (400, 'manufacturing', 300, 1);
      INSERT INTO blueprint_materials VALUES
        (200, 'manufacturing', 300, 1),
        (400, 'manufacturing', 100, 1);
    `);

    const cycle = expandManufacturingDependencies(db, 100)
      .alternatives[0].activity.materials[0].dependency
      .alternatives[0].activity.materials[0].dependency;

    expect(cycle).toMatchObject({
      typeId: 100,
      depth: 2,
      state: "cycle",
      alternatives: [],
    });
  });

  it("stops expansion at the configured depth without mislabeling terminal materials", () => {
    const db = testDatabase();
    db.exec(`
      INSERT INTO types (type_id, name, is_placeholder) VALUES
        (100, 'Root', 0),
        (200, 'Root Blueprint', 0),
        (300, 'Component', 0),
        (400, 'Component Blueprint', 0),
        (500, 'Raw', 0);
      INSERT INTO blueprint_activities VALUES
        (200, 'manufacturing', 10),
        (400, 'manufacturing', 10);
      INSERT INTO blueprint_products VALUES
        (200, 'manufacturing', 100, 1),
        (400, 'manufacturing', 300, 1);
      INSERT INTO blueprint_materials VALUES
        (200, 'manufacturing', 300, 1),
        (400, 'manufacturing', 500, 1);
    `);

    const result = expandManufacturingDependencies(db, 100, { maxDepth: 1 });
    expect(result.state).toBe("manufacturable");
    expect(result.alternatives[0].activity.materials[0].dependency).toMatchObject({
      typeId: 300,
      depth: 1,
      state: "depth-limit",
      alternatives: [],
    });

    const terminalRoot = expandManufacturingDependencies(db, 500, { maxDepth: 0 });
    expect(terminalRoot.state).toBe("not-manufacturable");
  });

  it("preserves unknown root types explicitly and rejects invalid depth limits", () => {
    const db = testDatabase();

    expect(expandManufacturingDependencies(db, 999)).toEqual({
      item: null,
      typeId: 999,
      depth: 0,
      state: "unknown-type",
      alternatives: [],
    });
    expect(() => expandManufacturingDependencies(db, 999, { maxDepth: -1 })).toThrow(RangeError);
    expect(() => expandManufacturingDependencies(db, 999, { maxDepth: 1.5 })).toThrow(RangeError);
  });
});
