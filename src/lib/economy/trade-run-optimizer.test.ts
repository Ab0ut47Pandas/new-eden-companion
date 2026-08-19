import { describe, expect, it } from "vitest";

import { optimizeTradeRun, type TradeCandidate } from "./trade-run-optimizer";

const candidates: TradeCandidate[] = [
  {
    typeId: 34,
    name: "Tritanium",
    unitVolumeM3: 0.01,
    originSell: [{ price: 4, quantity: 10_000 }],
    destinationBuy: [{ price: 5.5, quantity: 10_000 }],
  },
  {
    typeId: 35,
    name: "Pyerite",
    unitVolumeM3: 0.01,
    originSell: [{ price: 8, quantity: 10_000 }],
    destinationBuy: [{ price: 12, quantity: 10_000 }],
  },
];

describe("trade-run optimizer", () => {
  it("respects cargo, capital, visible depth, and sales tax", () => {
    const plan = optimizeTradeRun(candidates, {
      cargoCapacityM3: 50,
      capitalIsk: 30_000,
      salesTaxRate: 0.05,
      goal: "profit",
    });

    expect(plan.lines.length).toBeGreaterThan(0);
    expect(plan.cargoUsedM3).toBeLessThanOrEqual(50.000001);
    expect(plan.capitalUsedIsk).toBeLessThanOrEqual(30_000.000001);
    expect(plan.profitIsk).toBeGreaterThan(0);
    expect(plan.salesTaxIsk).toBeGreaterThan(0);
    expect(plan.lines.every((line) => line.quantity <= 10_000)).toBe(true);
  });

  it("walks marginal depth instead of multiplying the best price forever", () => {
    const plan = optimizeTradeRun([{
      typeId: 100,
      name: "Depth Test",
      unitVolumeM3: 1,
      originSell: [
        { price: 100, quantity: 2 },
        { price: 150, quantity: 10 },
      ],
      destinationBuy: [
        { price: 220, quantity: 1 },
        { price: 170, quantity: 10 },
      ],
    }], {
      cargoCapacityM3: 3,
      capitalIsk: 10_000,
      salesTaxRate: 0,
    });

    expect(plan.lines).toHaveLength(1);
    expect(plan.lines[0].quantity).toBe(3);
    expect(plan.lines[0].acquisitionCostIsk).toBe(350);
    expect(plan.lines[0].grossRevenueIsk).toBe(560);
    expect(plan.lines[0].profitIsk).toBe(210);
  });

  it("drops after-tax negative spreads", () => {
    const plan = optimizeTradeRun([{
      typeId: 200,
      name: "Tax Trap",
      unitVolumeM3: 1,
      originSell: [{ price: 100, quantity: 10 }],
      destinationBuy: [{ price: 105, quantity: 10 }],
    }], {
      cargoCapacityM3: 10,
      capitalIsk: 10_000,
      salesTaxRate: 0.075,
    });

    expect(plan.lines).toHaveLength(0);
    expect(plan.profitIsk).toBe(0);
    expect(plan.warnings[0]).toMatch(/No candidate lot/);
  });

  it("can optimize for profit density instead of raw profit", () => {
    const plan = optimizeTradeRun([
      {
        typeId: 1,
        name: "Bulky",
        unitVolumeM3: 10,
        originSell: [{ price: 100, quantity: 10 }],
        destinationBuy: [{ price: 300, quantity: 10 }],
      },
      {
        typeId: 2,
        name: "Dense",
        unitVolumeM3: 1,
        originSell: [{ price: 100, quantity: 10 }],
        destinationBuy: [{ price: 160, quantity: 10 }],
      },
    ], {
      cargoCapacityM3: 10,
      capitalIsk: 10_000,
      salesTaxRate: 0,
      goal: "profit-per-m3",
    });

    expect(plan.lines[0].name).toBe("Dense");
    expect(plan.lines[0].quantity).toBe(10);
  });
});
