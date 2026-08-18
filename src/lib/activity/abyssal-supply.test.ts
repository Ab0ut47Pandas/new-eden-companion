import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildAbyssalFilamentCuratedSources,
  resolveAbyssalConsumableSources,
  resolveAbyssalFilamentSources,
} from "./abyssal-supply";

describe("Abyssal supply sources", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec(`
      CREATE TABLE types (type_id INTEGER PRIMARY KEY);
      CREATE TABLE blueprint_products (product_type_id INTEGER NOT NULL, activity TEXT NOT NULL);
      CREATE TABLE sde_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO sde_meta (key, value) VALUES ('sde_build', 'test-build');
      INSERT INTO types (type_id) VALUES (100), (101), (102), (103), (200), (300);
      INSERT INTO blueprint_products (product_type_id, activity) VALUES (200, 'manufacturing');
    `);
  });

  afterEach(() => db.close());

  it("gives Tranquil filaments explicit exploration, Abyssal, and player-market sources", () => {
    const result = resolveAbyssalFilamentSources(db, { typeId: 100, tier: 0 });
    expect(result.manufacturingBoundary).toBe("no-ordinary-blueprint");
    expect(result.sourceState).toBe("known");
    expect(result.sources.map((source) => source.sourceKind).sort()).toEqual(["exploration", "loot-drop", "market"]);
    expect(result.sources.find((source) => source.sourceKind === "loot-drop")?.label).toMatch(/tier 0 and tier 1/i);
  });

  it("gives Calm filaments Data Site, Abyssal, and market sources", () => {
    const sources = buildAbyssalFilamentCuratedSources(101, 1);
    expect(sources.map((source) => source.label)).toEqual(expect.arrayContaining([
      "Player market",
      "Data Sites across New Eden",
      "Abyssal Deadspace",
    ]));
  });

  it("does not invent an exploration source for higher tiers", () => {
    const result = resolveAbyssalFilamentSources(db, { typeId: 102, tier: 4 });
    expect(result.sources.some((source) => source.sourceKind === "exploration")).toBe(false);
    expect(result.sources.map((source) => source.sourceKind).sort()).toEqual(["loot-drop", "market"]);
  });

  it("keeps Cataclysmic filament drops specifically tied to Tier 5 Abyssal Deadspace", () => {
    const result = resolveAbyssalFilamentSources(db, { typeId: 103, tier: 6 });
    const abyssSource = result.sources.find((source) => source.sourceKind === "loot-drop");
    expect(abyssSource?.label).toBe("Tier 5 Abyssal Deadspace");
  });

  it("routes ordinary consumables through the existing acquisition boundary instead of assuming market purchase", () => {
    const result = resolveAbyssalConsumableSources(db, 200);
    expect(result.manufacturingBoundary).toBe("ordinary-blueprint-available");
    expect(result.sourceState).toBe("unknown");
    expect(result.sources).toEqual([]);
  });

  it("preserves unknown consumable types as unknown", () => {
    const result = resolveAbyssalConsumableSources(db, 999999);
    expect(result.manufacturingBoundary).toBe("unknown-type");
    expect(result.sourceState).toBe("unknown");
    expect(result.sources).toEqual([]);
  });

  it("rejects invalid filament type ids", () => {
    expect(() => buildAbyssalFilamentCuratedSources(0, 1)).toThrow(/positive integer/i);
  });
});
