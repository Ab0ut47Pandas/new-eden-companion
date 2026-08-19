import { describe, expect, it } from "vitest";

import { evaluateSellHereVsHaul, type HaulTolerance } from "./haul-decision";

const TOLERANCE: HaulTolerance = {
  maxJumps: 8,
  maxVolumeM3: 10_000,
  maxRisk: "medium",
  minimumExtraIsk: 1_000_000,
  minimumImprovementPercent: 10,
};

describe("sell-here vs haul decision", () => {
  it("recommends hauling only when the gain and all configured tolerances pass", () => {
    const result = evaluateSellHereVsHaul({
      localSaleValue: 10_000_000,
      destinationSaleValue: 12_000_000,
      jumps: 5,
      volumeM3: 4_000,
      risk: "medium",
      tolerance: TOLERANCE,
    });

    expect(result.recommendation).toBe("haul");
    expect(result.extraIsk).toBe(2_000_000);
    expect(result.improvementPercent).toBe(20);
    expect(result.reasons.join(" ")).toContain("clears your configured gain");
    expect(result.warnings.join(" ")).toContain("not a safety guarantee");
  });

  it("prefers selling here when the destination is not worth more", () => {
    const result = evaluateSellHereVsHaul({
      localSaleValue: 10_000_000,
      destinationSaleValue: 9_000_000,
      jumps: 1,
      volumeM3: 1,
      risk: "low",
      tolerance: TOLERANCE,
    });

    expect(result.recommendation).toBe("sell-here");
    expect(result.extraIsk).toBe(-1_000_000);
  });

  it("respects jump, volume, risk, and minimum-gain tolerances", () => {
    const result = evaluateSellHereVsHaul({
      localSaleValue: 10_000_000,
      destinationSaleValue: 10_500_000,
      jumps: 12,
      volumeM3: 20_000,
      risk: "high",
      tolerance: TOLERANCE,
    });

    expect(result.recommendation).toBe("sell-here");
    expect(result.reasons.join(" ")).toContain("exceeds your 8-jump hauling tolerance");
    expect(result.reasons.join(" ")).toContain("exceeds your 10,000 m3 hauling tolerance");
    expect(result.reasons.join(" ")).toContain("high route risk exceeds your medium risk tolerance");
    expect(result.reasons.join(" ")).toContain("below your 1,000,000 ISK minimum gain");
    expect(result.reasons.join(" ")).toContain("below your 10% minimum");
  });

  it("keeps the decision conditional when route evidence is incomplete", () => {
    const result = evaluateSellHereVsHaul({
      localSaleValue: 10_000_000,
      destinationSaleValue: 12_000_000,
      jumps: null,
      volumeM3: null,
      risk: "unknown",
      tolerance: TOLERANCE,
    });

    expect(result.recommendation).toBe("consider-haul");
    expect(result.warnings.join(" ")).toContain("Route jump count is unknown");
    expect(result.warnings.join(" ")).toContain("Cargo volume is unknown");
    expect(result.warnings.join(" ")).toContain("will not assume the route is safe");
  });

  it("keeps missing market valuations unknown", () => {
    const result = evaluateSellHereVsHaul({
      localSaleValue: null,
      destinationSaleValue: 12_000_000,
      jumps: 2,
      volumeM3: 100,
      risk: "low",
      tolerance: TOLERANCE,
    });

    expect(result.recommendation).toBe("unknown");
    expect(result.extraIsk).toBeNull();
  });

  it("rejects invalid policy and route inputs", () => {
    expect(() => evaluateSellHereVsHaul({
      localSaleValue: 1,
      destinationSaleValue: 2,
      jumps: -1,
      volumeM3: 1,
      risk: "low",
      tolerance: TOLERANCE,
    })).toThrow();

    expect(() => evaluateSellHereVsHaul({
      localSaleValue: 1,
      destinationSaleValue: 2,
      jumps: 1,
      volumeM3: 1,
      risk: "low",
      tolerance: { ...TOLERANCE, maxJumps: -1 },
    })).toThrow();
  });
});
