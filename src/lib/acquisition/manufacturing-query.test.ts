import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { queryManufacturingDependenciesForProduct } from "./manufacturing-query";

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

describe("manufacturing dependency queries", () => {
  it("resolves alternative manufacturing blueprints with product quantity, time, materials, and activity skills", () => {
    const db = testDatabase();
    db.exec(`
      INSERT INTO types (type_id, name, is_placeholder) VALUES
        (100, 'Target Hull', 0),
        (200, 'Alpha Blueprint', 0),
        (201, 'Beta Blueprint', 0),
        (300, 'Tritanium', 0),
        (301, 'Pyerite', 0),
        (400, 'Industry', 0),
        (401, 'Advanced Industry', 0);

      INSERT INTO blueprint_activities VALUES
        (200, 'manufacturing', 60),
        (201, 'manufacturing', 90),
        (201, 'copying', 30);

      INSERT INTO blueprint_products VALUES
        (200, 'manufacturing', 100, 1),
        (201, 'manufacturing', 100, 2);

      INSERT INTO blueprint_materials VALUES
        (200, 'manufacturing', 300, 10),
        (200, 'manufacturing', 301, 5),
        (201, 'manufacturing', 300, 18),
        (201, 'copying', 301, 999);

      INSERT INTO blueprint_skills VALUES
        (200, 'manufacturing', 400, 1),
        (201, 'manufacturing', 400, 2),
        (201, 'manufacturing', 401, 3),
        (201, 'copying', 401, 5);
    `);

    expect(queryManufacturingDependenciesForProduct(db, 100)).toEqual([
      {
        blueprint: { typeId: 200, name: 'Alpha Blueprint', isPlaceholder: false },
        product: { typeId: 100, name: 'Target Hull', isPlaceholder: false, quantity: 1 },
        activity: {
          kind: 'manufacturing',
          timeSeconds: 60,
          materials: [
            { typeId: 301, name: 'Pyerite', isPlaceholder: false, quantity: 5 },
            { typeId: 300, name: 'Tritanium', isPlaceholder: false, quantity: 10 },
          ],
          skills: [{ typeId: 400, name: 'Industry', isPlaceholder: false, level: 1 }],
        },
      },
      {
        blueprint: { typeId: 201, name: 'Beta Blueprint', isPlaceholder: false },
        product: { typeId: 100, name: 'Target Hull', isPlaceholder: false, quantity: 2 },
        activity: {
          kind: 'manufacturing',
          timeSeconds: 90,
          materials: [{ typeId: 300, name: 'Tritanium', isPlaceholder: false, quantity: 18 }],
          skills: [
            { typeId: 401, name: 'Advanced Industry', isPlaceholder: false, level: 3 },
            { typeId: 400, name: 'Industry', isPlaceholder: false, level: 2 },
          ],
        },
      },
    ]);
  });

  it("preserves unresolved SDE type references instead of inventing labels", () => {
    const db = testDatabase();
    db.exec(`
      INSERT INTO types (type_id, name, is_placeholder) VALUES
        (100, 'Known Product', 0),
        (200, NULL, 1),
        (300, NULL, 1),
        (400, NULL, 1);
      INSERT INTO blueprint_activities VALUES (200, 'manufacturing', NULL);
      INSERT INTO blueprint_products VALUES (200, 'manufacturing', 100, 1);
      INSERT INTO blueprint_materials VALUES (200, 'manufacturing', 300, 4);
      INSERT INTO blueprint_skills VALUES (200, 'manufacturing', 400, 2);
    `);

    expect(queryManufacturingDependenciesForProduct(db, 100)).toEqual([
      {
        blueprint: { typeId: 200, name: null, isPlaceholder: true },
        product: { typeId: 100, name: 'Known Product', isPlaceholder: false, quantity: 1 },
        activity: {
          kind: 'manufacturing',
          timeSeconds: null,
          materials: [{ typeId: 300, name: null, isPlaceholder: true, quantity: 4 }],
          skills: [{ typeId: 400, name: null, isPlaceholder: true, level: 2 }],
        },
      },
    ]);
  });

  it("returns an empty list when the item has no manufacturing blueprint", () => {
    const db = testDatabase();
    db.exec("INSERT INTO types (type_id, name, is_placeholder) VALUES (100, 'Unmanufacturable', 0);");

    expect(queryManufacturingDependenciesForProduct(db, 100)).toEqual([]);
  });
});
