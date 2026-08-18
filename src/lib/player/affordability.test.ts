import { describe, expect, it } from "vitest";

import { buildAffordabilityIndex, evaluateAffordability } from "./affordability-core";

describe("affordability overlay", () => {
  it("compares an ESI average-price reference with liquid ISK without inventing a reserve", () => {
    const index = buildAffordabilityIndex(1_000_000_000, [
      { typeId: 34, averagePrice: 5 },
    ]);

    const result = evaluateAffordability(index, 34, 10_000_000);
    expect(result.status).toBe("available");
    expect(result.estimatedCost).toBe(50_000_000);
    expect(result.remainingAfterPurchase).toBe(950_000_000);
    expect(result.reserveIsk).toBeNull();
    expect(result.remainingAfterReserve).toBeNull();
    expect(result.basis).toBe("esi-average");
  });

  it("distinguishes liquid affordability from a configured reserve breach", () => {
    const index = buildAffordabilityIndex(500_000_000, [
      { typeId: 1, averagePrice: 300_000_000 },
    ]);

    const liquidOnly = evaluateAffordability(index, 1, 1);
    expect(liquidOnly.status).toBe("available");

    const withReserve = evaluateAffordability(index, 1, 1, { reserveIsk: 250_000_000 });
    expect(withReserve.status).toBe("reserve-breach");
    expect(withReserve.remainingAfterPurchase).toBe(200_000_000);
    expect(withReserve.remainingAfterReserve).toBe(-50_000_000);
  });

  it("marks a purchase as not affordable when the reference estimate exceeds liquid ISK", () => {
    const index = buildAffordabilityIndex(100_000_000, [
      { typeId: 2, averagePrice: 60_000_000 },
    ]);

    const result = evaluateAffordability(index, 2, 2);
    expect(result.status).toBe("not-affordable");
    expect(result.estimatedCost).toBe(120_000_000);
    expect(result.remainingAfterPurchase).toBe(-20_000_000);
  });

  it("preserves missing wallet and price data as unknown instead of zero", () => {
    const noWallet = buildAffordabilityIndex(null, [{ typeId: 3, averagePrice: 10 }]);
    expect(evaluateAffordability(noWallet, 3, 1).status).toBe("wallet-unavailable");

    const noMarket = buildAffordabilityIndex(100, null);
    expect(evaluateAffordability(noMarket, 3, 1).status).toBe("price-unavailable");

    const missingAverage = buildAffordabilityIndex(100, [{ typeId: 3, averagePrice: null }]);
    expect(evaluateAffordability(missingAverage, 3, 1).status).toBe("price-unavailable");
  });

  it("does not price quantities that are already covered", () => {
    const index = buildAffordabilityIndex(100, [{ typeId: 4, averagePrice: 10 }]);
    const result = evaluateAffordability(index, 4, 0);
    expect(result.status).toBe("no-purchase-needed");
    expect(result.estimatedCost).toBe(0);
    expect(result.remainingAfterPurchase).toBe(100);
  });
});
