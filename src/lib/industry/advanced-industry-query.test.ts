import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import {
  queryAdvancedIndustryActivitiesForProduct,
  queryAdvancedIndustryActivitiesForSource,
} from "./advanced-industry-query";

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
    CREATE TABLE blueprint_products (
      blueprint_type_id INTEGER NOT NULL,
      activity TEXT NOT NULL,
      product_type_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      probability REAL,
      PRIMARY KEY (blueprint_type_id, activity, product_type_id)
    );
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
      (100, 'Base Item Blueprint', 0),
      (101, 'Reaction Formula', 0),
      (200, 'Invented Blueprint', 0),
      (201, 'Reacted Material', 0),
      (300, 'Datacore A', 0),
      (301, 'Datacore B', 0),
      (302, 'Moon Material', 0),
      (303, 'Fuel Input', 0),
      (400, 'Encryption Method', 0),
      (401, 'Reaction Skill', 0);
    INSERT INTO blueprints VALUES (100, 10), (101, 100);
    INSERT INTO blueprint_activities VALUES
      (100, 'manufacturing', 50),
      (100, 'invention', 600),
      (101, 'reaction', 1200);
    INSERT INTO blueprint_materials VALUES
      (100, 'invention', 300, 2),
      (100, 'invention', 301, 2),
      (101, 'reaction', 302, 100),
      (101, 'reaction', 303, 5);
    INSERT INTO blueprint_skills VALUES
      (100, 'invention', 400, 1),
      (101, 'reaction', 401, 3);
    INSERT INTO blueprint_products VALUES
      (100, 'invention', 200, 1, 0.34),
      (101, 'reaction', 201, 20, NULL);
  `);
}

describe("advanced industry queries", () => {
  it("reads invention and reaction activities for a source without mixing ordinary manufacturing", () => {
    const db = testDatabase();
    seed(db);

    expect(queryAdvancedIndustryActivitiesForSource(db, 100)).toEqual([
      {
        source: { typeId: 100, name: 'Base Item Blueprint', isPlaceholder: false, maxProductionLimit: 10 },
        kind: 'invention',
        timeSeconds: 600,
        materials: [
          { typeId: 300, name: 'Datacore A', isPlaceholder: false, quantity: 2 },
          { typeId: 301, name: 'Datacore B', isPlaceholder: false, quantity: 2 },
        ],
        skills: [{ typeId: 400, name: 'Encryption Method', isPlaceholder: false, level: 1 }],
        products: [{ typeId: 200, name: 'Invented Blueprint', isPlaceholder: false, quantity: 1, probability: 0.34 }],
      },
    ]);
  });

  it("finds reaction alternatives from the resulting product", () => {
    const db = testDatabase();
    seed(db);

    expect(queryAdvancedIndustryActivitiesForProduct(db, 201)).toEqual([
      {
        source: { typeId: 101, name: 'Reaction Formula', isPlaceholder: false, maxProductionLimit: 100 },
        kind: 'reaction',
        timeSeconds: 1200,
        materials: [
          { typeId: 303, name: 'Fuel Input', isPlaceholder: false, quantity: 5 },
          { typeId: 302, name: 'Moon Material', isPlaceholder: false, quantity: 100 },
        ],
        skills: [{ typeId: 401, name: 'Reaction Skill', isPlaceholder: false, level: 3 }],
        products: [{ typeId: 201, name: 'Reacted Material', isPlaceholder: false, quantity: 20, probability: null }],
      },
    ]);
  });

  it("preserves multiple invention alternatives and source probability independently", () => {
    const db = testDatabase();
    seed(db);
    db.exec(`
      INSERT INTO types VALUES (102, 'Alternate Relic', 0);
      INSERT INTO blueprints VALUES (102, 5);
      INSERT INTO blueprint_activities VALUES (102, 'invention', 900);
      INSERT INTO blueprint_products VALUES (102, 'invention', 200, 20, 0.14);
    `);

    const alternatives = queryAdvancedIndustryActivitiesForProduct(db, 200);
    expect(alternatives).toHaveLength(2);
    expect(alternatives.map((activity) => ({ source: activity.source.typeId, probability: activity.products[0].probability }))).toEqual([
      { source: 102, probability: 0.14 },
      { source: 100, probability: 0.34 },
    ]);
  });

  it("returns no advanced activity for unrelated types", () => {
    const db = testDatabase();
    seed(db);
    expect(queryAdvancedIndustryActivitiesForSource(db, 300)).toEqual([]);
    expect(queryAdvancedIndustryActivitiesForProduct(db, 300)).toEqual([]);
  });
});
