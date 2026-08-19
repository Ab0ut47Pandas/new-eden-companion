import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";

import { buildPlanetaryIndustryAcquisitionGraph } from "./acquisition-graph";

function fixture(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE types (type_id INTEGER PRIMARY KEY, name TEXT, is_placeholder INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE planet_schematics (schematic_id INTEGER PRIMARY KEY, name TEXT, cycle_time_seconds INTEGER NOT NULL);
    CREATE TABLE planet_schematic_pins (schematic_id INTEGER NOT NULL, pin_type_id INTEGER NOT NULL, PRIMARY KEY (schematic_id, pin_type_id));
    CREATE TABLE planet_schematic_types (schematic_id INTEGER NOT NULL, type_id INTEGER NOT NULL, is_input INTEGER NOT NULL, quantity INTEGER NOT NULL, PRIMARY KEY (schematic_id, type_id));
    INSERT INTO types VALUES (1001, 'Reactive Metals', 0), (1002, 'Precious Metals', 0), (2001, 'Mechanical Parts', 0), (3001, 'Advanced Industry Facility', 0);
    INSERT INTO planet_schematics VALUES (42, 'Mechanical Parts', 3600);
    INSERT INTO planet_schematic_pins VALUES (42, 3001);
    INSERT INTO planet_schematic_types VALUES (42, 1001, 1, 40), (42, 1002, 1, 40), (42, 2001, 0, 5);
  `);
  return db;
}

describe("buildPlanetaryIndustryAcquisitionGraph", () => {
  it("models SDE schematic inputs and output as a PI acquisition option", () => {
    const db = fixture();
    try {
      const graph = buildPlanetaryIndustryAcquisitionGraph(db, 2001);
      expect(graph.rootNodeId).toBe("item:2001");
      expect(graph.options).toEqual([
        expect.objectContaining({ kind: "planetary-industry", targetNodeId: "item:2001" }),
      ]);
      expect(graph.nodes).toContainEqual(expect.objectContaining({
        kind: "planetary-industry-activity",
        schematicId: 42,
        cycleTimeSeconds: 3600,
      }));
      expect(graph.edges).toContainEqual(expect.objectContaining({
        kind: "produces-item",
        to: "item:2001",
        quantity: 5,
      }));
      expect(graph.edges).toContainEqual(expect.objectContaining({
        kind: "requires-material",
        to: "material:1001",
        quantity: 40,
      }));
      expect(graph.edges).toContainEqual(expect.objectContaining({
        kind: "requires-material",
        to: "material:1002",
        quantity: 40,
      }));
    } finally {
      db.close();
    }
  });

  it("preserves absence of a PI relationship as unknown instead of inventing production", () => {
    const db = fixture();
    try {
      db.exec("INSERT INTO types VALUES (9999, 'Not a PI product', 0)");
      const graph = buildPlanetaryIndustryAcquisitionGraph(db, 9999);
      expect(graph.options).toEqual([
        expect.objectContaining({ kind: "source", targetNodeId: "item:9999" }),
      ]);
      expect(graph.nodes).toContainEqual(expect.objectContaining({
        kind: "source",
        sourceState: "unknown",
      }));
    } finally {
      db.close();
    }
  });
});
