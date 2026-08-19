import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import type { PlanetaryColonyEvidence } from "./production-plan";
import { buildPlanetaryProductionPlan } from "./production-plan";

let database: DatabaseSync | null = null;

function testDatabase(): DatabaseSync {
  database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE types (type_id INTEGER PRIMARY KEY, name TEXT, is_placeholder INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE planet_schematics (schematic_id INTEGER PRIMARY KEY, name TEXT, cycle_time_seconds INTEGER NOT NULL);
    CREATE TABLE planet_schematic_pins (schematic_id INTEGER NOT NULL, pin_type_id INTEGER NOT NULL, PRIMARY KEY (schematic_id, pin_type_id));
    CREATE TABLE planet_schematic_types (schematic_id INTEGER NOT NULL, type_id INTEGER NOT NULL, is_input INTEGER NOT NULL, quantity INTEGER NOT NULL, PRIMARY KEY (schematic_id, type_id));
  `);
  database.exec(`
    INSERT INTO types VALUES
      (100, 'Raw A', 0),
      (101, 'Raw B', 0),
      (200, 'Processed A', 0),
      (300, 'Advanced Commodity', 0),
      (400, 'Basic Industry Facility', 0),
      (401, 'Advanced Industry Facility', 0);
    INSERT INTO planet_schematics VALUES
      (10, 'Make Processed A', 1800),
      (20, 'Make Advanced Commodity', 3600);
    INSERT INTO planet_schematic_pins VALUES
      (10, 400),
      (20, 401);
    INSERT INTO planet_schematic_types VALUES
      (10, 100, 1, 40),
      (10, 101, 1, 40),
      (10, 200, 0, 5),
      (20, 200, 1, 10),
      (20, 300, 0, 3);
  `);
  return database;
}

afterEach(() => {
  database?.close();
  database = null;
});

function colonyEvidence(): PlanetaryColonyEvidence[] {
  return [{
    planetId: 9001,
    planetName: "Test I",
    planetType: "temperate",
    solarSystemId: 300001,
    solarSystemName: "Test System",
    detail: {
      links: [],
      routes: [],
      pins: [
        {
          pin_id: 1,
          type_id: 900,
          latitude: 0,
          longitude: 0,
          extractor_details: {
            cycle_time: 30,
            head_radius: 0.1,
            heads: [],
            product_type_id: 100,
            qty_per_cycle: 100,
          },
        },
        {
          pin_id: 2,
          type_id: 401,
          latitude: 0,
          longitude: 0,
          factory_details: { schematic_id: 20 },
        },
        {
          pin_id: 3,
          type_id: 999,
          latitude: 0,
          longitude: 0,
          contents: [{ type_id: 101, amount: 500 }],
        },
      ],
    },
  }];
}

describe("Planetary Industry production planner", () => {
  it("recursively scales inputs from requested output quantity", () => {
    const plan = buildPlanetaryProductionPlan(testDatabase(), 300, 6);
    expect(plan.root.kind).toBe("production");
    if (plan.root.kind !== "production") return;
    expect(plan.root.cycles).toBe(2);
    expect(plan.root.inputs).toHaveLength(1);
    const intermediate = plan.root.inputs[0];
    expect(intermediate.kind).toBe("production");
    if (intermediate.kind !== "production") return;
    expect(intermediate.requiredQuantity).toBe(20);
    expect(intermediate.cycles).toBe(4);
    expect(intermediate.inputs.map((input) => input.requiredQuantity)).toEqual([160, 160]);
  });

  it("uses ESI-visible colony evidence without claiming future supply", () => {
    const plan = buildPlanetaryProductionPlan(testDatabase(), 300, 3, { colonies: colonyEvidence() });
    expect(plan.root.kind).toBe("production");
    if (plan.root.kind !== "production") return;
    expect(plan.root.evidence.some((entry) => entry.coverage === "factory-configured")).toBe(true);
    const intermediate = plan.root.inputs[0];
    expect(intermediate.kind).toBe("production");
    if (intermediate.kind !== "production") return;
    const rawA = intermediate.inputs.find((input) => input.typeId === 100);
    const rawB = intermediate.inputs.find((input) => input.typeId === 101);
    expect(rawA?.evidence.some((entry) => entry.coverage === "extractor-visible")).toBe(true);
    expect(rawB?.evidence.some((entry) => entry.coverage === "stock-visible")).toBe(true);
    expect(plan.checklist.some((line) => line.includes("verify routing in EVE"))).toBe(true);
  });

  it("preserves missing-source and unavailable-colony state explicitly", () => {
    const colonies = colonyEvidence();
    colonies.push({
      planetId: 9002,
      planetName: "Test II",
      planetType: "barren",
      solarSystemId: 300001,
      solarSystemName: "Test System",
      detail: null,
    });
    const plan = buildPlanetaryProductionPlan(testDatabase(), 100, 50, { colonies });
    expect(plan.root.kind).toBe("leaf");
    if (plan.root.kind !== "leaf") return;
    expect(plan.root.reason).toBe("no-schematic");
    expect(plan.root.evidence.some((entry) => entry.coverage === "extractor-visible")).toBe(true);
    expect(plan.warnings.some((warning) => warning.includes("not produced by a PI schematic"))).toBe(true);
  });

  it("stops at a configured recursion depth instead of expanding forever", () => {
    const plan = buildPlanetaryProductionPlan(testDatabase(), 300, 1, { maxDepth: 1 });
    expect(plan.root.kind).toBe("production");
    if (plan.root.kind !== "production") return;
    expect(plan.root.inputs[0]).toMatchObject({ kind: "leaf", reason: "depth-limit", typeId: 200 });
  });
});
