import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { buildAdvancedIndustryAcquisitionGraph } from "./advanced-industry-graph";

let database: DatabaseSync | null = null;

function testDatabase(): DatabaseSync {
  database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE sde_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE types (type_id INTEGER PRIMARY KEY, name TEXT, is_placeholder INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE blueprints (blueprint_type_id INTEGER PRIMARY KEY, max_production_limit INTEGER);
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
    CREATE TABLE blueprint_products (
      blueprint_type_id INTEGER NOT NULL,
      activity TEXT NOT NULL,
      product_type_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      probability REAL,
      PRIMARY KEY (blueprint_type_id, activity, product_type_id)
    );
    INSERT INTO sde_meta VALUES ('sde_build', '999');
  `);
  return database;
}

afterEach(() => {
  database?.close();
  database = null;
});

describe("advanced industry acquisition graph", () => {
  it("represents invention as a chance-based acquisition option with requirements and unknown terminals", () => {
    const db = testDatabase();
    db.exec(`
      INSERT INTO types VALUES
        (100, 'Base Blueprint', 0),
        (200, 'Invented Blueprint', 0),
        (300, 'Datacore A', 0),
        (301, 'Datacore B', 0),
        (400, 'Encryption', 0);
      INSERT INTO blueprints VALUES (100, 10);
      INSERT INTO blueprint_activities VALUES (100, 'invention', 600);
      INSERT INTO blueprint_materials VALUES (100, 'invention', 300, 2), (100, 'invention', 301, 2);
      INSERT INTO blueprint_skills VALUES (100, 'invention', 400, 1);
      INSERT INTO blueprint_products VALUES (100, 'invention', 200, 1, 0.34);
    `);

    const graph = buildAdvancedIndustryAcquisitionGraph(db, 200);
    expect(graph.options.map((option) => option.kind)).toEqual(['invention']);
    expect(graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'invention-activity', sourceTypeId: 100 }),
      expect.objectContaining({ kind: 'material', typeId: 300 }),
      expect.objectContaining({ kind: 'skill', typeId: 400 }),
      expect.objectContaining({ kind: 'source', sourceState: 'unknown' }),
    ]));
    expect(graph.edges).toContainEqual(expect.objectContaining({
      kind: 'produces-item',
      quantity: 1,
      probability: 0.34,
    }));
  });

  it("represents reaction as a deterministic option and preserves a reaction source for an input when SDE proves it", () => {
    const db = testDatabase();
    db.exec(`
      INSERT INTO types VALUES
        (101, 'Target Formula', 0),
        (102, 'Input Formula', 0),
        (201, 'Target Reaction Material', 0),
        (202, 'Intermediate Material', 0),
        (203, 'Raw Input', 0),
        (401, 'Reaction Skill', 0);
      INSERT INTO blueprints VALUES (101, 100), (102, 100);
      INSERT INTO blueprint_activities VALUES (101, 'reaction', 1200), (102, 'reaction', 600);
      INSERT INTO blueprint_materials VALUES (101, 'reaction', 202, 10), (102, 'reaction', 203, 5);
      INSERT INTO blueprint_skills VALUES (101, 'reaction', 401, 3), (102, 'reaction', 401, 1);
      INSERT INTO blueprint_products VALUES (101, 'reaction', 201, 20, NULL), (102, 'reaction', 202, 10, NULL);
    `);

    const graph = buildAdvancedIndustryAcquisitionGraph(db, 201);
    expect(graph.options.map((option) => option.kind)).toEqual(['reaction']);
    expect(graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'reaction-activity', formulaTypeId: 101 }),
      expect.objectContaining({ kind: 'source', sourceState: 'known', label: 'Reaction industry activity' }),
    ]));
    expect(graph.edges).toContainEqual(expect.objectContaining({
      kind: 'produces-item',
      quantity: 20,
      probability: null,
    }));
  });

  it("leaves a target with no invention/reaction path at an explicit unknown advanced source", () => {
    const db = testDatabase();
    db.exec("INSERT INTO types VALUES (999, 'Unrelated', 0);");
    const graph = buildAdvancedIndustryAcquisitionGraph(db, 999);
    expect(graph.options).toEqual([
      expect.objectContaining({ kind: 'source' }),
    ]);
    expect(graph.nodes).toContainEqual(expect.objectContaining({
      kind: 'source',
      sourceState: 'unknown',
      label: 'No invention or reaction path is recorded in the installed SDE',
    }));
  });
});
