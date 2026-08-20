import { describe, expect, it } from "vitest";
import type { FittingCoreResult } from "../fitting/core";
import { compareTwoFits, type MatchupFitEvidence } from "./matchup";

function fitting(metrics: FittingCoreResult["metrics"]): FittingCoreResult {
  return {
    metrics,
    unknownMetrics: {},
    resources: {
      cpuCapacity: null,
      cpuUsed: null,
      cpuValid: null,
      powergridCapacity: null,
      powergridUsed: null,
      powergridValid: null,
    },
    legality: {
      slotsValid: null,
      hardpointsValid: null,
      droneBandwidthValid: null,
      droneBayValid: null,
      activeDroneCountValid: null,
      issues: [],
    },
    skills: { known: false, valid: null, gaps: [] },
    capacitor: { averageDrainPerSecond: null, peakRechargePerSecond: null, stableFraction: null },
    fitValid: null,
  };
}

function baseFit(label: string, overrides: Partial<MatchupFitEvidence> = {}): MatchupFitEvidence {
  return {
    label,
    provenance: [`validated fixture: ${label}`],
    ...overrides,
  };
}

function dimension(result: ReturnType<typeof compareTwoFits>, name: string) {
  const found = result.dimensions.find((entry) => entry.dimension === name);
  if (!found) throw new Error(`Missing dimension ${name}`);
  return found;
}

describe("compareTwoFits", () => {
  it("requires provenance for both fit inputs", () => {
    expect(() => compareTwoFits(
      { label: "You", provenance: [] },
      baseFit("Opponent"),
    )).toThrow(/requires provenance/);
  });

  it("compares preferred engagement envelopes without claiming range control", () => {
    const result = compareTwoFits(
      baseFit("Kiter", {
        preferredRangeMeters: 20_000,
        fitting: fitting({ maxVelocity: 3_200 }),
        propulsion: "mwd",
        tackle: { disruptorRangeMeters: 24_000, warpDisruptionStrength: 1 },
        warpCoreStrength: 0,
      }),
      baseFit("Brawler", {
        preferredRangeMeters: 7_000,
        fitting: fitting({ maxVelocity: 1_900 }),
        propulsion: "afterburner",
        tackle: { webRangeMeters: 10_000, scramRangeMeters: 9_000, warpDisruptionStrength: 2 },
        warpCoreStrength: 0,
      }),
    );

    expect(dimension(result, "engagement-envelope").edge).toBe("you");
    expect(dimension(result, "range-control").edge).toBe("you");
    expect(dimension(result, "range-control").caveats.join(" ")).toMatch(/not a prediction/i);
  });

  it("uses CCP disruption-strength versus warp-core-strength rule for tackle and escape", () => {
    const result = compareTwoFits(
      baseFit("You", {
        tackle: { warpDisruptionStrength: 1 },
        warpCoreStrength: 0,
      }),
      baseFit("Opponent", {
        tackle: { warpDisruptionStrength: 1 },
        warpCoreStrength: 1,
      }),
    );

    expect(dimension(result, "tackle").edge).toBe("opponent");
    expect(dimension(result, "escape").edge).toBe("opponent");
    expect(dimension(result, "tackle").summary).toMatch(/overcome/i);
  });

  it("treats target-specific application as validated evidence instead of deriving it from paper DPS", () => {
    const result = compareTwoFits(
      baseFit("You", {
        applicationAgainstOpponent: {
          status: "good",
          reason: "Validated missile application case",
          provenance: ["application fixture A"],
        },
      }),
      baseFit("Opponent", {
        applicationAgainstOpponent: {
          status: "poor",
          reason: "Validated turret application case",
          provenance: ["application fixture B"],
        },
      }),
    );

    const application = dimension(result, "application");
    expect(application.edge).toBe("you");
    expect(application.evidence).toContain("application fixture A");
    expect(application.evidence).toContain("application fixture B");
  });

  it("compares supplied damage composition against the opponent primary-layer resistances", () => {
    const result = compareTwoFits(
      baseFit("EM ship", {
        damageProfile: { em: 100, thermal: 0, kinetic: 0, explosive: 0 },
        primaryTankLayer: "shield",
        tankResistances: {
          shield: { em: 0.8, thermal: 0.2, kinetic: 0.2, explosive: 0 },
        },
      }),
      baseFit("Explosive ship", {
        damageProfile: { em: 0, thermal: 0, kinetic: 0, explosive: 100 },
        primaryTankLayer: "armor",
        tankResistances: {
          armor: { em: 0.5, thermal: 0.2, kinetic: 0.2, explosive: 0.1 },
        },
      }),
    );

    const damageTypes = dimension(result, "damage-types");
    expect(damageTypes.edge).toBe("opponent");
    expect(damageTypes.evidence.join(" ")).toContain("1.000x");
    expect(damageTypes.evidence.join(" ")).toContain("0.500x");
  });

  it("surfaces a neutralizer threat only when range and capacitor-dependent systems are supplied", () => {
    const result = compareTwoFits(
      baseFit("Neut ship", {
        preferredRangeMeters: 8_000,
        capWarfare: { hasNeutralizer: true, rangeMeters: 12_000, pressureGjPerSecond: 20 },
        capacitorDependentSystems: [],
      }),
      baseFit("Active ship", {
        preferredRangeMeters: 10_000,
        capWarfare: { hasNeutralizer: false },
        capacitorDependentSystems: ["local armor repairer", "propulsion"],
      }),
    );

    const capacitor = dimension(result, "capacitor");
    expect(capacitor.edge).toBe("you");
    expect(capacitor.summary).toMatch(/neutralizer threat/i);
    expect(capacitor.caveats.join(" ")).toMatch(/does not calculate time-to-cap-out/i);
  });

  it("keeps unsupported dimensions unknown and never produces a winner or win percentage", () => {
    const result = compareTwoFits(baseFit("You"), baseFit("Opponent"));

    expect(result.unknowns.length).toBeGreaterThan(0);
    expect(result.limitations.join(" ")).toMatch(/never emits a win percentage/i);
    expect(JSON.stringify(result)).not.toMatch(/winProbability|winner|chanceToWin/i);
  });

  it("uses only opponent-specific EHP for the tank dimension", () => {
    const genericOnly = compareTwoFits(
      baseFit("You", { fitting: fitting({ ehp: 100_000 }) }),
      baseFit("Opponent", { fitting: fitting({ ehp: 10_000 }) }),
    );
    expect(dimension(genericOnly, "tank").edge).toBe("unknown");

    const opponentSpecific = compareTwoFits(
      baseFit("You", { ehpAgainstOpponent: 30_000 }),
      baseFit("Opponent", { ehpAgainstOpponent: 20_000 }),
    );
    expect(dimension(opponentSpecific, "tank").edge).toBe("you");
  });
});
