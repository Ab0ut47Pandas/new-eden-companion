import { describe, expect, it } from "vitest";

import { buildAssetCleanupView, classifyAssetCleanup, type AssetCleanupInput } from "./asset-cleanup";

function base(overrides: Partial<AssetCleanupInput> = {}): AssetCleanupInput {
  return {
    itemId: 1001,
    typeId: 34,
    name: "Tritanium",
    quantity: 1000,
    location: "Jita IV - Moon 4",
    estimatedValueIsk: 5_000,
    ...overrides,
  };
}

describe("asset cleanup", () => {
  it("puts active goal evidence above every other disposition", () => {
    const result = classifyAssetCleanup(base({
      goalCriticalReason: "Required by the active Rifter build goal.",
      sellEvidence: { reason: "Liquid market.", replaceable: true, liquidMarket: true },
    }));
    expect(result.disposition).toBe("goal-critical");
    expect(result.protected).toBe(true);
  });

  it("protects researched BPOs even when no active goal references them", () => {
    const result = classifyAssetCleanup(base({
      name: "Rifter Blueprint",
      intrinsicPreservation: [{ kind: "researched-bpo", reason: "Owned original has ME/TE research recorded by ESI." }],
      sellEvidence: { reason: "There are market buyers.", replaceable: true, liquidMarket: true },
    }));
    expect(result.disposition).toBe("keep");
    expect(result.headline).toBe("Keep — researched blueprint");
  });

  it("protects useful BPCs and hard-to-reacquire items", () => {
    expect(classifyAssetCleanup(base({ intrinsicPreservation: [{ kind: "useful-bpc", reason: "Blueprint copy has remaining runs." }] })).disposition).toBe("keep");
    expect(classifyAssetCleanup(base({ intrinsicPreservation: [{ kind: "hard-to-reacquire", reason: "Evidence-backed source is limited." }] })).headline).toBe("Keep — hard to reacquire");
  });

  it("keeps deliberate stockpile use ahead of use-soon", () => {
    const result = classifyAssetCleanup(base({ stockpileReason: "Needed across known active fit supplies.", useSoonReason: "Staged nearby." }));
    expect(result.disposition).toBe("keep");
    expect(result.headline).toMatch(/^Stockpile/);
  });

  it("marks allocated inventory as protected", () => {
    const result = classifyAssetCleanup(base({ intrinsicPreservation: [{ kind: "allocated", reason: "Already committed to a supported plan." }] }));
    expect(result.disposition).toBe("keep");
    expect(result.protected).toBe(true);
  });

  it("never turns uncertain rarity/source/replaceability into sell", () => {
    const result = classifyAssetCleanup(base({
      intrinsicPreservation: [{ kind: "source-uncertain", reason: "NEC does not have reliable reacquisition evidence." }],
      sellEvidence: { reason: "Some market data exists.", replaceable: true, liquidMarket: true },
    }));
    expect(result.disposition).toBe("unknown");
    expect(result.headline).toBe("Review — source uncertain");
    expect(result.protected).toBe(true);
  });

  it("requires both replaceability and market liquidity before sell", () => {
    expect(classifyAssetCleanup(base({ sellEvidence: { reason: "Replaceable but thin.", replaceable: true, liquidMarket: false } })).disposition).toBe("unknown");
    expect(classifyAssetCleanup(base({ sellEvidence: { reason: "Liquid but reacquisition unknown.", replaceable: false, liquidMarket: true } })).disposition).toBe("unknown");
    expect(classifyAssetCleanup(base({ sellEvidence: { reason: "Current evidence supports easy replacement and a liquid sale path.", replaceable: true, liquidMarket: true } })).disposition).toBe("sell");
  });

  it("only recommends hauling from explicit supported haul evidence", () => {
    expect(classifyAssetCleanup(base({ haulEvidence: { reason: "Hub uplift exceeds configured hauling tolerance.", recommended: true } })).disposition).toBe("haul");
    expect(classifyAssetCleanup(base({ haulEvidence: { reason: "Move not established.", recommended: false } })).disposition).toBe("unknown");
  });

  it("orders groups deterministically and rejects duplicate items", () => {
    const results = buildAssetCleanupView([
      base({ itemId: 5, name: "Unknown", intrinsicPreservation: [{ kind: "rarity-uncertain", reason: "Unknown rarity." }] }),
      base({ itemId: 2, name: "Sell", sellEvidence: { reason: "Liquid and replaceable.", replaceable: true, liquidMarket: true } }),
      base({ itemId: 3, name: "Keep", intrinsicPreservation: [{ kind: "fitted", reason: "Installed on a ship." }] }),
      base({ itemId: 1, name: "Goal", goalCriticalReason: "Active goal target." }),
      base({ itemId: 4, name: "Haul", haulEvidence: { reason: "Supported move.", recommended: true } }),
    ]);
    expect(results.map((item) => item.disposition)).toEqual(["goal-critical", "keep", "haul", "sell", "unknown"]);
    expect(() => buildAssetCleanupView([base(), base()])).toThrow(/Duplicate cleanup asset item ID/);
  });

  it("rejects malformed evidence instead of producing advice", () => {
    expect(() => classifyAssetCleanup(base({ quantity: 0 }))).toThrow(/quantity/);
    expect(() => classifyAssetCleanup(base({ intrinsicPreservation: [{ kind: "limited-source", reason: " " }] }))).toThrow(/preservation reason/);
    expect(() => classifyAssetCleanup(base({ estimatedValueIsk: -1 }))).toThrow(/non-negative/);
  });
});
