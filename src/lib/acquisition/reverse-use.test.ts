import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { queryReverseUsesForType } from "./reverse-use";

let database: DatabaseSync | null = null;

function testDatabase(): DatabaseSync {
  database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE types (
      type_id INTEGER PRIMARY KEY,
      name TEXT,
      is_placeholder INTEGER NOT NULL DEFAULT 0
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
  `);
  return database;
}

afterEach(() => {
  database?.close();
  database = null;
});

describe("reverse-use queries", () => {
  it("finds every product-producing blueprint activity that consumes a material", () => {
    const db = testDatabase();
    db.exec(`
      INSERT INTO types VALUES
        (34, 'Tritanium', 0),
        (100, 'Alpha Blueprint', 0),
        (101, 'Beta Blueprint', 0),
        (200, 'Alpha Product', 0),
        (201, 'Beta Product', 0),
        (202, 'Beta Byproduct', 0);

      INSERT INTO blueprint_materials VALUES
        (100, 'manufacturing', 34, 10),
        (101, 'reaction', 34, 5);

      INSERT INTO blueprint_products VALUES
        (100, 'manufacturing', 200, 1),
        (101, 'reaction', 201, 2),
        (101, 'reaction', 202, 3);
    `);

    expect(queryReverseUsesForType(db, 34)).toEqual([
      {
        role: 'material',
        blueprint: { typeId: 100, name: 'Alpha Blueprint', isPlaceholder: false },
        activity: 'manufacturing',
        inputQuantity: 10,
        products: [{ typeId: 200, name: 'Alpha Product', isPlaceholder: false, quantity: 1 }],
      },
      {
        role: 'material',
        blueprint: { typeId: 101, name: 'Beta Blueprint', isPlaceholder: false },
        activity: 'reaction',
        inputQuantity: 5,
        products: [
          { typeId: 202, name: 'Beta Byproduct', isPlaceholder: false, quantity: 3 },
          { typeId: 201, name: 'Beta Product', isPlaceholder: false, quantity: 2 },
        ],
      },
    ]);
  });

  it("answers what a blueprint is used for by returning its product activities", () => {
    const db = testDatabase();
    db.exec(`
      INSERT INTO types VALUES
        (100, 'Example Blueprint', 0),
        (200, 'Manufactured Item', 0),
        (201, 'Invented Item', 0);

      INSERT INTO blueprint_products VALUES
        (100, 'manufacturing', 200, 1),
        (100, 'invention', 201, 10);
    `);

    expect(queryReverseUsesForType(db, 100)).toEqual([
      {
        role: 'blueprint',
        blueprint: { typeId: 100, name: 'Example Blueprint', isPlaceholder: false },
        activity: 'invention',
        inputQuantity: null,
        products: [{ typeId: 201, name: 'Invented Item', isPlaceholder: false, quantity: 10 }],
      },
      {
        role: 'blueprint',
        blueprint: { typeId: 100, name: 'Example Blueprint', isPlaceholder: false },
        activity: 'manufacturing',
        inputQuantity: null,
        products: [{ typeId: 200, name: 'Manufactured Item', isPlaceholder: false, quantity: 1 }],
      },
    ]);
  });

  it("preserves unresolved type references and ignores material relationships with no product", () => {
    const db = testDatabase();
    db.exec(`
      INSERT INTO types VALUES
        (34, 'Known Material', 0),
        (100, NULL, 1),
        (101, 'Productless Blueprint', 0),
        (200, NULL, 1);

      INSERT INTO blueprint_materials VALUES
        (100, 'manufacturing', 34, 7),
        (101, 'research_material', 34, 1);
      INSERT INTO blueprint_products VALUES
        (100, 'manufacturing', 200, 1);
    `);

    expect(queryReverseUsesForType(db, 34)).toEqual([
      {
        role: 'material',
        blueprint: { typeId: 100, name: null, isPlaceholder: true },
        activity: 'manufacturing',
        inputQuantity: 7,
        products: [{ typeId: 200, name: null, isPlaceholder: true, quantity: 1 }],
      },
    ]);
  });

  it("returns an empty list when the SDE has no supported reverse-use relationship", () => {
    const db = testDatabase();
    db.exec("INSERT INTO types VALUES (999, 'Unused Item', 0);");

    expect(queryReverseUsesForType(db, 999)).toEqual([]);
  });
});
