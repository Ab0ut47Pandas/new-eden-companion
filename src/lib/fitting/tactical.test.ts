import { describe, expect, it } from "vitest";

import { buildFitTacticalBriefing } from "./tactical";
import type { FitIdentityResult } from "./identity";
import type { FitWeaknessResult } from "./weakness";

const provenance = ["validated fitting evidence"] as const;

function identity(overrides: Partial<FitIdentityResult> = {}): FitIdentityResult {
  return {
    primaryCombatRole: "scram-kiter",
    combatRoles: [
      {
        role: "scram-kiter",
        score: 4,
        reasons: [
          {
            code: "weapon-outside-web-inside-scram",
            summary: "Preferred weapon range is outside the fit's established web envelope but inside its scram envelope.",
            weight: 4,
          },
        ],
      },
    ],
    tankRole: "active",
    tankReasons: ["local repair/boost evidence is present"],
    unknowns: [],
    provenance,
    ...overrides,
  };
}

function weaknesses(overrides: Partial<FitWeaknessResult> = {}): FitWeaknessResult {
  return {
    primary: null,
    findings: [],
    unknowns: [],
    provenance,
    ...overrides,
  };
}

describe("buildFitTacticalBriefing", () => {
  it("translates supported identity evidence into what-the-fit-wants and how-to-fly guidance", () => {
    const result = buildFitTacticalBriefing({
      identity: identity(),
      weaknesses: weaknesses(),
      provenance,
    });

    expect(result.headline).toBe("Scram-kiter - active tank");
    expect(result.whatThisFitWants.map((card) => card.id)).toEqual(["role-scram-kiter", "tank-active"]);
    expect(result.howToFlyIt[0].title).toContain("scram-kiter");
    expect(result.howToFlyIt[0].why[0]).toContain("outside the fit's established web envelope");
  });

  it("translates FIT-05 weaknesses without turning severity into a matchup probability", () => {
    const finding = {
      code: "weapon-plan-beyond-own-tackle",
      category: "range-plan" as const,
      severity: "caution" as const,
      summary: "The preferred weapon range extends beyond the fit's established self-tackle envelope.",
      why: "The damage plan and self-tackle envelope do not overlap at the preferred range.",
      evidence: ["Preferred weapon range: 24000 m", "Longest established tackle range: 20000 m"],
    };
    const result = buildFitTacticalBriefing({
      identity: identity(),
      weaknesses: weaknesses({ primary: finding, findings: [finding] }),
      provenance,
    });

    expect(result.whatRuinsItsPlan[0]).toMatchObject({
      id: "weakness-weapon-plan-beyond-own-tackle",
      tone: "caution",
    });
    expect(result.whatRuinsItsPlan[0].summary).not.toMatch(/%|chance|win|lose/i);
  });

  it("shows deterministic weapon range primitives as evidence without calling them a guaranteed tactical range", () => {
    const result = buildFitTacticalBriefing({
      identity: identity({ primaryCombatRole: "other", combatRoles: [{ role: "other", score: 1, reasons: [] }] }),
      weaknesses: weaknesses(),
      fitting: {
        metrics: { optimalRange: 500, falloffRange: 5160, missileRange: 18750 },
        unknownMetrics: {},
        resources: { cpuCapacity: 130, cpuUsed: 27, cpuValid: true, powergridCapacity: 41, powergridUsed: 12, powergridValid: true },
        legality: { slotsValid: true, hardpointsValid: true, droneBandwidthValid: true, droneBayValid: true, activeDroneCountValid: true, issues: [] },
        skills: { known: false, valid: null, gaps: [] },
        capacitor: { averageDrainPerSecond: null, peakRechargePerSecond: null, stableFraction: null },
        fitValid: null,
      },
      provenance,
    });

    const range = result.howToFlyIt.find((card) => card.id === "modeled-weapon-envelope");
    expect(range?.evidence).toEqual([
      "Modeled turret optimal: 500 m",
      "Modeled turret falloff: 5,160 m",
      "Modeled missile range primitive: 18,750 m",
    ]);
    expect(range?.summary).toContain("do not by themselves establish the correct tactical range");
    expect(result.unknowns).toContain("overall fitting validity is not fully established");
  });

  it("preserves unknowns and explicitly refuses to treat no detected contradiction as safety", () => {
    const result = buildFitTacticalBriefing({
      identity: identity({ primaryCombatRole: "other", combatRoles: [{ role: "other", score: 1, reasons: [] }], tankRole: "unknown", tankReasons: [], unknowns: ["tank style is not established"] }),
      weaknesses: weaknesses({ unknowns: ["target-specific damage application is not established"] }),
      provenance,
    });

    expect(result.whatRuinsItsPlan[0].id).toBe("no-supported-contradiction");
    expect(result.whatRuinsItsPlan[0].summary).toContain("not a claim that the fit is safe");
    expect(result.unknowns).toEqual([
      "tank style is not established",
      "target-specific damage application is not established",
    ]);
  });

  it("surfaces modeled fit invalidity ahead of tactical weakness cards", () => {
    const result = buildFitTacticalBriefing({
      identity: identity(),
      weaknesses: weaknesses(),
      fitting: {
        metrics: {},
        unknownMetrics: {},
        resources: { cpuCapacity: 130, cpuUsed: 150, cpuValid: false, powergridCapacity: 41, powergridUsed: 20, powergridValid: true },
        legality: { slotsValid: true, hardpointsValid: true, droneBandwidthValid: true, droneBayValid: true, activeDroneCountValid: true, issues: [{ code: "cpu-over", summary: "CPU use exceeds modeled capacity." }] },
        skills: { known: false, valid: null, gaps: [] },
        capacitor: { averageDrainPerSecond: null, peakRechargePerSecond: null, stableFraction: null },
        fitValid: false,
      },
      provenance,
    });

    expect(result.whatRuinsItsPlan[0].id).toBe("invalid-modeled-fit");
    expect(result.whatRuinsItsPlan[0].tone).toBe("warning");
  });

  it("requires provenance rather than emitting unexplained tactical advice", () => {
    expect(() => buildFitTacticalBriefing({
      identity: identity(),
      weaknesses: weaknesses(),
      provenance: [],
    })).toThrow("Tactical briefing requires provenance");
  });
});
