import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { queryStaticItemIdentity, searchStaticItems } from "./item-search";

let database: DatabaseSync | null = null;

function testDatabase(): DatabaseSync {
  database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE categories (
      category_id INTEGER PRIMARY KEY,
      name TEXT,
      published INTEGER
    );

    CREATE TABLE groups (
      group_id INTEGER PRIMARY KEY,
      category_id INTEGER NOT NULL,
      name TEXT,
      published INTEGER
    );

    CREATE TABLE types (
      type_id INTEGER PRIMARY KEY,
      group_id INTEGER,
      name TEXT,
      published INTEGER,
      market_group_id INTEGER,
      is_placeholder INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE blueprints (
      blueprint_type_id INTEGER PRIMARY KEY
    );

    CREATE TABLE blueprint_materials (
      blueprint_type_id INTEGER NOT NULL,
      activity TEXT NOT NULL,
      material_type_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL
    );

    CREATE TABLE type_materials (
      type_id INTEGER NOT NULL,
      material_type_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL
    );
  `);

  database.exec(`
    INSERT INTO categories VALUES
      (4, 'Material', 1),
      (6, 'Ship', 1),
      (7, 'Module', 1),
      (9, 'Blueprint', 1),
      (16, 'Skill', 1),
      (17, 'Commodity', 1);

    INSERT INTO groups VALUES
      (18, 4, 'Mineral', 1),
      (25, 6, 'Frigate', 1),
      (46, 7, 'Propulsion Module', 1),
      (105, 9, 'Frigate Blueprint', 1),
      (257, 16, 'Spaceship Command', 1),
      (500, 17, 'Planetary Commodity', 1);

    INSERT INTO types VALUES
      (34, 18, 'Tritanium', 1, 20, 0),
      (587, 25, 'Rifter', 1, 4, 0),
      (1000, 105, 'Rifter Blueprint', 1, NULL, 0),
      (3328, 257, 'Minmatar Frigate', 1, NULL, 0),
      (2000, 46, 'Test Afterburner', 1, 14, 0),
      (2001, 46, 'Test Hidden Module', 0, NULL, 0),
      (3000, 500, 'Test Planetary Commodity', 1, 1336, 0),
      (9999, NULL, NULL, NULL, NULL, 1);

    INSERT INTO blueprints VALUES (1000);
    INSERT INTO blueprint_materials VALUES (1000, 'manufacturing', 34, 1000);
    INSERT INTO type_materials VALUES (587, 34, 1000);
  `);

  return database;
}

afterEach(() => {
  database?.close();
  database = null;
});

describe("static item search and identity", () => {
  it("classifies ships, blueprints, materials, modules, skills, commodities, and placeholders", () => {
    const db = testDatabase();

    expect(queryStaticItemIdentity(db, 587)).toMatchObject({
      name: "Rifter",
      categoryName: "Ship",
      published: true,
      kinds: ["ship"],
    });
    expect(queryStaticItemIdentity(db, 1000)).toMatchObject({
      name: "Rifter Blueprint",
      categoryName: "Blueprint",
      kinds: ["blueprint"],
    });
    expect(queryStaticItemIdentity(db, 34)).toMatchObject({
      name: "Tritanium",
      categoryName: "Material",
      kinds: ["material"],
    });
    expect(queryStaticItemIdentity(db, 2000)).toMatchObject({
      name: "Test Afterburner",
      categoryName: "Module",
      kinds: ["module"],
    });
    expect(queryStaticItemIdentity(db, 3328)).toMatchObject({
      name: "Minmatar Frigate",
      categoryName: "Skill",
      kinds: ["skill"],
    });
    expect(queryStaticItemIdentity(db, 3000)).toMatchObject({
      name: "Test Planetary Commodity",
      categoryName: "Commodity",
      kinds: ["commodity"],
    });
    expect(queryStaticItemIdentity(db, 9999)).toEqual({
      typeId: 9999,
      name: null,
      groupId: null,
      groupName: null,
      categoryId: null,
      categoryName: null,
      published: null,
      marketGroupId: null,
      isPlaceholder: true,
      kinds: ["placeholder"],
    });
  });

  it("searches by item name, group, and category while keeping publication state visible", () => {
    const db = testDatabase();

    expect(searchStaticItems(db, "rifter").map((item) => item.name)).toEqual([
      "Rifter",
      "Rifter Blueprint",
    ]);

    expect(searchStaticItems(db, "frigate").map((item) => item.name)).toEqual([
      "Rifter",
      "Minmatar Frigate",
      "Rifter Blueprint",
    ]);

    const modules = searchStaticItems(db, "module");
    expect(modules.map((item) => [item.name, item.published])).toEqual([
      ["Test Afterburner", true],
      ["Test Hidden Module", false],
    ]);
  });

  it("treats SQL LIKE wildcard characters literally and caps the result limit", () => {
    const db = testDatabase();
    db.exec("INSERT INTO types VALUES (4000, 46, 'Literal 100% Module_Name', 1, NULL, 0);");

    expect(searchStaticItems(db, "100% Module_").map((item) => item.name)).toEqual([
      "Literal 100% Module_Name",
    ]);
    expect(searchStaticItems(db, "test", { limit: 1 })).toHaveLength(1);
  });

  it("returns no results for blank searches or unknown type IDs", () => {
    const db = testDatabase();
    expect(searchStaticItems(db, "   ")).toEqual([]);
    expect(queryStaticItemIdentity(db, 123456789)).toBeNull();
  });
});
