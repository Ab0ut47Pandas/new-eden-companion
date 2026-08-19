import { describe, expect, it } from "vitest";

import { calculateMarketLocationValuation, type MarketOrderInput } from "./market-valuation-core";

const ORDERS: MarketOrderInput[] = [
  { isBuyOrder: false, locationId: 60000001, price: 10, volumeRemain: 4 },
  { isBuyOrder: false, locationId: 60000001, price: 12, volumeRemain: 10 },
  { isBuyOrder: true, locationId: 60000001, price: 8, volumeRemain: 3 },
  { isBuyOrder: true, locationId: 60000001, price: 7, volumeRemain: 10 },
  { isBuyOrder: false, locationId: 60000002, price: 9, volumeRemain: 20 },
  { isBuyOrder: true, locationId: 60000002, price: 8.5, volumeRemain: 20 },
];

describe("market valuation core", () => {
  it("calculates volume-weighted replacement and immediate-sale values at an exact location", () => {
    const result = calculateMarketLocationValuation(
      ORDERS,
      { label: "Local station", regionId: 10000001, locationId: 60000001 },
      5,
    );

    expect(result.orderCount).toBe(4);
    expect(result.sell.status).toBe("available");
    expect(result.sell.bestUnitPrice).toBe(10);
    expect(result.sell.totalValue).toBe(52);
    expect(result.sell.volumeWeightedUnitPrice).toBe(10.4);
    expect(result.buy.status).toBe("available");
    expect(result.buy.bestUnitPrice).toBe(8);
    expect(result.buy.totalValue).toBe(38);
    expect(result.buy.volumeWeightedUnitPrice).toBe(7.6);
  });

  it("uses the entire region only when no exact location is supplied", () => {
    const result = calculateMarketLocationValuation(
      ORDERS,
      { label: "Local region", regionId: 10000001 },
      5,
    );

    expect(result.orderCount).toBe(6);
    expect(result.sell.bestUnitPrice).toBe(9);
    expect(result.sell.totalValue).toBe(45);
    expect(result.buy.bestUnitPrice).toBe(8.5);
    expect(result.buy.totalValue).toBe(42.5);
    expect(result.caveats[0]).toContain("not a guaranteed local execution price");
  });

  it("reports partial visible depth instead of extrapolating a fake full-order value", () => {
    const result = calculateMarketLocationValuation(
      [{ isBuyOrder: false, locationId: 60000001, price: 10, volumeRemain: 2 }],
      { label: "Thin market", regionId: 10000001, locationId: 60000001 },
      5,
    );

    expect(result.sell.status).toBe("partial-depth");
    expect(result.sell.filledQuantity).toBe(2);
    expect(result.sell.totalValue).toBe(20);
    expect(result.buy.status).toBe("unavailable");
    expect(result.caveats.join(" ")).toContain("Visible sell depth only covers 2 of 5 requested units");
  });

  it("keeps missing order data unknown rather than treating it as zero", () => {
    const result = calculateMarketLocationValuation(
      [],
      { label: "Empty market", regionId: 10000001, locationId: 60000001 },
      1,
    );

    expect(result.sell.status).toBe("unavailable");
    expect(result.sell.totalValue).toBeNull();
    expect(result.buy.status).toBe("unavailable");
    expect(result.buy.totalValue).toBeNull();
  });

  it("rejects nonsensical quantity and scope inputs", () => {
    expect(() => calculateMarketLocationValuation(ORDERS, { label: "Bad", regionId: 0 }, 1)).toThrow();
    expect(() => calculateMarketLocationValuation(ORDERS, { label: "Bad", regionId: 1, locationId: -1 }, 1)).toThrow();
    expect(() => calculateMarketLocationValuation(ORDERS, { label: "Bad", regionId: 1 }, 0)).toThrow();
  });
});
