import { describe, expect, it } from "vitest";

import { buildReadinessSnapshot } from "./model";
import { evaluateReplacementCapacity, replacementCapacityFindings } from "./replacement-capacity";

describe("replacement capacity", () => {
  it("distinguishes being able to buy from being below a replacement policy", () => {
    const evaluation = evaluateReplacementCapacity({
      liquidIsk: 1_000_000_000,
      acquisitionCostIsk: 300_000_000,
      replacementCostIsk: 300_000_000,
      policy: { reserveIsk: 250_000_000, minimumReplacementCount: 2 },
    });

    expect(evaluation.canPurchase).toBe(true);
    expect(evaluation.walletAfterPurchase).toBe(700_000_000);
    expect(evaluation.riskBudgetAfterPurchase).toBe(450_000_000);
    expect(evaluation.replacementCountAfterPurchase).toBe(1.5);
    expect(evaluation.fullReplacementsBeforeReserve).toBe(1);
    expect(evaluation.meetsReplacementPolicy).toBe(false);
    expect(evaluation.status).toBe("below-policy");
  });

  it("marks a loss exposure affordable when reserve and replacement target both survive", () => {
    const evaluation = evaluateReplacementCapacity({
      liquidIsk: 2_000_000_000,
      acquisitionCostIsk: 400_000_000,
      replacementCostIsk: 400_000_000,
      policy: { reserveIsk: 400_000_000, minimumReplacementCount: 2 },
    });

    expect(evaluation.status).toBe("loss-affordable");
    expect(evaluation.riskBudgetAfterPurchase).toBe(1_200_000_000);
    expect(evaluation.replacementCountAfterPurchase).toBe(3);
    expect(evaluation.replacementHeadroomIsk).toBe(400_000_000);
  });

  it("accounts for an already-owned exposure by allowing zero immediate acquisition cost", () => {
    const evaluation = evaluateReplacementCapacity({
      liquidIsk: 900_000_000,
      acquisitionCostIsk: 0,
      replacementCostIsk: 300_000_000,
      policy: { reserveIsk: 300_000_000, minimumReplacementCount: 2 },
    });

    expect(evaluation.canPurchase).toBe(true);
    expect(evaluation.walletAfterPurchase).toBe(900_000_000);
    expect(evaluation.replacementCountAfterPurchase).toBe(2);
    expect(evaluation.status).toBe("loss-affordable");
  });

  it("does not invent a loss-affordability verdict when no policy is supplied", () => {
    const evaluation = evaluateReplacementCapacity({
      liquidIsk: 1_000_000_000,
      acquisitionCostIsk: 200_000_000,
      replacementCostIsk: 200_000_000,
    });

    expect(evaluation.status).toBe("policy-unset");
    expect(evaluation.canPurchase).toBe(true);
    expect(evaluation.meetsReplacementPolicy).toBeNull();
    expect(evaluation.replacementCountAfterPurchase).toBeNull();
  });

  it("reports immediate purchase failure independently", () => {
    const evaluation = evaluateReplacementCapacity({
      liquidIsk: 100_000_000,
      acquisitionCostIsk: 250_000_000,
      replacementCostIsk: 250_000_000,
      policy: { reserveIsk: 0, minimumReplacementCount: 1 },
    });

    expect(evaluation.status).toBe("cannot-purchase");
    expect(evaluation.canPurchase).toBe(false);
    expect(evaluation.meetsReplacementPolicy).toBe(false);
  });

  it("preserves missing price/wallet inputs as unavailable instead of zero", () => {
    const missingWallet = evaluateReplacementCapacity({
      liquidIsk: null,
      acquisitionCostIsk: 100,
      replacementCostIsk: 100,
      policy: { reserveIsk: 0, minimumReplacementCount: 1 },
    });
    expect(missingWallet.status).toBe("unavailable");
    expect(missingWallet.canPurchase).toBeNull();

    const missingExposure = evaluateReplacementCapacity({
      liquidIsk: 1_000,
      acquisitionCostIsk: 100,
      replacementCostIsk: null,
      policy: { reserveIsk: 0, minimumReplacementCount: 1 },
    });
    expect(missingExposure.status).toBe("unavailable");
    expect(missingExposure.meetsReplacementPolicy).toBeNull();
  });

  it("turns the financial evaluation into separate ISK and replacement-capacity readiness findings", () => {
    const evaluation = evaluateReplacementCapacity({
      liquidIsk: 1_000_000_000,
      acquisitionCostIsk: 300_000_000,
      replacementCostIsk: 300_000_000,
      policy: { reserveIsk: 250_000_000, minimumReplacementCount: 2 },
    });
    const snapshot = buildReadinessSnapshot(replacementCapacityFindings(evaluation));

    expect(snapshot.dimensions.find((entry) => entry.dimension === "isk")?.status).toBe("ready");
    expect(snapshot.dimensions.find((entry) => entry.dimension === "replacement-capacity")?.status).toBe("needs-work");
  });

  it("rejects invalid hidden policy values instead of normalizing them silently", () => {
    expect(() => evaluateReplacementCapacity({
      liquidIsk: 1_000,
      acquisitionCostIsk: 100,
      replacementCostIsk: 100,
      policy: { reserveIsk: -1, minimumReplacementCount: 1 },
    })).toThrow(/reserve/);

    expect(() => evaluateReplacementCapacity({
      liquidIsk: 1_000,
      acquisitionCostIsk: 100,
      replacementCostIsk: 100,
      policy: { reserveIsk: 0, minimumReplacementCount: -1 },
    })).toThrow(/replacement count/);
  });
});
