import { describe, expect, it } from "vitest";

import {
  recommendStockpile,
  recommendStockpiles,
  type StockpileNeed,
} from "./stockpile-recommendations";

const tritanium = { typeId: 34, name: "Tritanium", ownedQuantity: 1_000 };

function need(overrides: Partial<StockpileNeed> = {}): StockpileNeed {
  return {
    kind: "goal-material",
    sourceId: "goal-rifter",
    sourceTitle: "Build a Rifter",
    typeId: 34,
    typeName: "Tritanium",
    active: true,
    reason: "Tritanium is required by the active Rifter manufacturing goal.",
    targetQuantity: 2_500,
    ...overrides,
  };
}

describe("stockpile recommendations", () => {
  it("reports a quantified shortfall for an active goal material", () => {
    const result = recommendStockpile(tritanium, [need()]);

    expect(result.status).toBe("shortfall");
    expect(result.deliberate).toBe(true);
    expect(result.targetQuantity).toBe(2_500);
    expect(result.reservedQuantity).toBe(1_000);
    expect(result.shortfallQuantity).toBe(1_500);
    expect(result.excessToKnownNeedQuantity).toBe(0);
    expect(result.evidence[0]).toMatchObject({ kind: "goal-material", sourceId: "goal-rifter" });
  });

  it("sums multiple quantified active needs for the same item", () => {
    const result = recommendStockpile(
      { ...tritanium, ownedQuantity: 3_000 },
      [
        need({ targetQuantity: 2_000 }),
        need({
          kind: "user-stockpile",
          sourceId: "reserve-minerals",
          sourceTitle: "Mineral reserve",
          reason: "Keep a user-requested mineral reserve.",
          targetQuantity: 1_500,
        }),
      ],
    );

    expect(result.status).toBe("shortfall");
    expect(result.targetQuantity).toBe(3_500);
    expect(result.shortfallQuantity).toBe(500);
  });

  it("separates deliberate reserved quantity from inventory beyond known targets", () => {
    const result = recommendStockpile(
      { ...tritanium, ownedQuantity: 4_000 },
      [need({ targetQuantity: 2_500 })],
    );

    expect(result.status).toBe("stockpile");
    expect(result.reservedQuantity).toBe(2_500);
    expect(result.excessToKnownNeedQuantity).toBe(1_500);
    expect(result.why).toMatch(/does not automatically classify it as junk or safe to sell/i);
  });

  it("reports a covered target without inventing surplus", () => {
    const result = recommendStockpile(
      { ...tritanium, ownedQuantity: 2_500 },
      [need({ targetQuantity: 2_500 })],
    );

    expect(result.status).toBe("covered");
    expect(result.shortfallQuantity).toBe(0);
    expect(result.excessToKnownNeedQuantity).toBe(0);
  });

  it("preserves useful but unquantified activity supplies without guessing a target", () => {
    const result = recommendStockpile(tritanium, [need({
      kind: "activity-supply",
      sourceId: "activity-mining",
      sourceTitle: "Mining session",
      reason: "This item is an explicit supply for the active activity.",
      targetQuantity: undefined,
    })]);

    expect(result.status).toBe("unquantified-use");
    expect(result.deliberate).toBe(true);
    expect(result.targetQuantity).toBeNull();
    expect(result.shortfallQuantity).toBeNull();
  });

  it("treats inventory with no active evidence as unassigned, not junk", () => {
    const result = recommendStockpile(tritanium, [need({ active: false })]);

    expect(result.status).toBe("unassigned");
    expect(result.deliberate).toBe(false);
    expect(result.why).toMatch(/not automatically junk or a sell recommendation/i);
  });

  it("ignores needs for other item types and orders evidence deterministically", () => {
    const result = recommendStockpile(tritanium, [
      need({
        kind: "fit-supply",
        sourceId: "fit-z",
        sourceTitle: "Zulu fit",
        reason: "Fit supply.",
        targetQuantity: undefined,
      }),
      need({
        kind: "activity-supply",
        sourceId: "activity-a",
        sourceTitle: "Alpha activity",
        reason: "Activity supply.",
        targetQuantity: undefined,
      }),
      need({ typeId: 35, typeName: "Pyerite", sourceId: "other", sourceTitle: "Other", reason: "Other item." }),
    ]);

    expect(result.evidence.map((entry) => entry.kind)).toEqual(["activity-supply", "fit-supply"]);
  });

  it("sorts a stockpile list by action priority and rejects duplicate assets", () => {
    const results = recommendStockpiles(
      [
        tritanium,
        { typeId: 35, name: "Pyerite", ownedQuantity: 500 },
        { typeId: 36, name: "Mexallon", ownedQuantity: 500 },
      ],
      [
        need(),
        need({
          typeId: 35,
          typeName: "Pyerite",
          sourceId: "activity-pyerite",
          sourceTitle: "Pyerite activity",
          kind: "activity-supply",
          reason: "Useful activity supply.",
          targetQuantity: undefined,
        }),
      ],
    );

    expect(results.map((entry) => entry.status)).toEqual(["shortfall", "unquantified-use", "unassigned"]);
    expect(() => recommendStockpiles([tritanium, tritanium], [])).toThrow(/Duplicate stockpile asset type ID/);
  });

  it("rejects malformed assets and needs instead of silently producing advice", () => {
    expect(() => recommendStockpile({ typeId: 0, name: "bad", ownedQuantity: 1 }, [])).toThrow(/positive integer/);
    expect(() => recommendStockpile({ ...tritanium, ownedQuantity: -1 }, [])).toThrow(/non-negative/);
    expect(() => recommendStockpile(tritanium, [need({ targetQuantity: 0 })])).toThrow(/positive integer/);
    expect(() => recommendStockpile(tritanium, [need({ reason: " " })])).toThrow(/must not be empty/);
  });
});
