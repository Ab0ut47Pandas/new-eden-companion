import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { resolveAcquisitionSources, type CuratedAcquisitionSource } from "./source-boundaries";

let database: DatabaseSync | null = null;

function testDatabase(): DatabaseSync {
  database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE sde_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE types (type_id INTEGER PRIMARY KEY);
    CREATE TABLE blueprint_products (
      blueprint_type_id INTEGER NOT NULL,
      activity TEXT NOT NULL,
      product_type_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      PRIMARY KEY (blueprint_type_id, activity, product_type_id)
    );
    INSERT INTO sde_meta (key, value) VALUES ('sde_build', '3470007');
  `);
  return database;
}

afterEach(() => {
  database?.close();
  database = null;
});

describe("non-manufacturing acquisition source boundaries", () => {
  it("explicitly preserves an unknown source when an item has no ordinary blueprint and no sourced acquisition record", () => {
    const db = testDatabase();
    db.exec("INSERT INTO types (type_id) VALUES (100)");

    expect(resolveAcquisitionSources(db, 100)).toEqual({
      typeId: 100,
      manufacturingBoundary: "no-ordinary-blueprint",
      sourceState: "unknown",
      sources: [],
    });
  });

  it("distinguishes ordinary manufacturing from non-manufacturing boundaries", () => {
    const db = testDatabase();
    db.exec(`
      INSERT INTO types (type_id) VALUES (100);
      INSERT INTO blueprint_products VALUES (200, 'manufacturing', 100, 1);
    `);

    expect(resolveAcquisitionSources(db, 100)).toMatchObject({
      manufacturingBoundary: "ordinary-blueprint-available",
      sourceState: "unknown",
    });
  });

  it("uses non-manufacturing SDE blueprint products as sourced alternatives and recognizes reaction activity without guessing other activity semantics", () => {
    const db = testDatabase();
    db.exec(`
      INSERT INTO types (type_id) VALUES (100);
      INSERT INTO blueprint_products VALUES
        (200, 'reaction', 100, 1),
        (201, 'invention', 100, 1);
    `);

    expect(resolveAcquisitionSources(db, 100)).toEqual({
      typeId: 100,
      manufacturingBoundary: "no-ordinary-blueprint",
      sourceState: "known",
      sources: [
        {
          sourceKind: "other",
          label: "SDE blueprint activity: invention",
          evidence: {
            kind: "sde",
            dataset: "blueprints",
            sdeBuild: "3470007",
            detail: "blueprint_products records product 100 under activity invention",
          },
        },
        {
          sourceKind: "reaction",
          label: "Reaction industry activity",
          evidence: {
            kind: "sde",
            dataset: "blueprints",
            sdeBuild: "3470007",
            detail: "blueprint_products records product 100 under activity reaction",
          },
        },
      ],
    });
  });

  it("accepts cited curated source kinds without hard-coding unsupported item claims", () => {
    const db = testDatabase();
    db.exec("INSERT INTO types (type_id) VALUES (100)");
    const curated: CuratedAcquisitionSource[] = [
      {
        typeId: 100,
        sourceKind: "loyalty-points",
        label: "Example LP store source",
        evidence: {
          kind: "curated",
          authority: "CCP Games",
          title: "Example authoritative source",
          url: "https://developers.eveonline.com/",
        },
      },
      {
        typeId: 100,
        sourceKind: "loot-drop",
        label: "Example drop source",
        evidence: {
          kind: "curated",
          authority: "CCP Games",
          title: "Example authoritative source",
          url: "https://www.eveonline.com/",
        },
      },
    ];

    const result = resolveAcquisitionSources(db, 100, curated);
    expect(result.sourceState).toBe("known");
    expect(result.sources.map((source) => source.sourceKind)).toEqual(["loot-drop", "loyalty-points"]);
  });

  it("supports the complete source taxonomy while requiring evidence for curated claims", () => {
    const db = testDatabase();
    db.exec("INSERT INTO types (type_id) VALUES (100)");
    const kinds = [
      "npc-seeded",
      "loot-drop",
      "loyalty-points",
      "exploration",
      "planetary-industry",
      "reaction",
      "salvage",
      "market",
      "other",
    ] as const;
    const curated: CuratedAcquisitionSource[] = kinds.map((sourceKind) => ({
      typeId: 100,
      sourceKind,
      label: sourceKind,
      evidence: {
        kind: "curated",
        authority: "Test authority",
        title: "Test evidence",
        url: "https://example.com/source",
      },
    }));

    expect(resolveAcquisitionSources(db, 100, curated).sources.map((source) => source.sourceKind).sort()).toEqual([...kinds].sort());

    expect(() =>
      resolveAcquisitionSources(db, 100, [
        {
          typeId: 100,
          sourceKind: "salvage",
          label: "Unsupported claim",
          evidence: { kind: "curated", authority: "", title: "", url: "" },
        },
      ]),
    ).toThrow(TypeError);
  });

  it("keeps unknown type IDs explicit", () => {
    const db = testDatabase();
    expect(resolveAcquisitionSources(db, 999)).toEqual({
      typeId: 999,
      manufacturingBoundary: "unknown-type",
      sourceState: "unknown",
      sources: [],
    });
  });
});
