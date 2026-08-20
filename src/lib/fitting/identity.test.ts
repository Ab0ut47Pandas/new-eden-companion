import { describe, expect, it } from "vitest";
import { classifyFitIdentity } from "./identity";

const provenance = ["validated FIT-02 fixture"] as const;

describe("classifyFitIdentity", () => {
  it("classifies a close scram/web weapon plan as a brawler and tackle", () => {
    const result = classifyFitIdentity({
      weaponPreferredRangeMeters: 7_000,
      webRangeMeters: 10_000,
      scramRangeMeters: 9_000,
      hasWeb: true,
      hasScram: true,
      hasDisruptor: false,
      hasLocalRepair: false,
      hasBufferTank: true,
      hasPassiveRechargeTank: false,
      provenance,
    });

    expect(result.primaryCombatRole).toBe("brawler");
    expect(result.combatRoles.map((entry) => entry.role)).toEqual(["brawler", "tackle"]);
    expect(result.tankRole).toBe("buffer");
    expect(result.combatRoles[0].reasons.map((reason) => reason.code)).toContain("weapon-inside-web");
  });

  it("classifies weapon range outside web but inside scram as scram-kiter", () => {
    const result = classifyFitIdentity({
      weaponPreferredRangeMeters: 8_500,
      webRangeMeters: 7_500,
      scramRangeMeters: 10_000,
      hasWeb: true,
      hasScram: true,
      hasDisruptor: false,
      hasLocalRepair: true,
      hasBufferTank: false,
      hasPassiveRechargeTank: false,
      provenance,
    });

    expect(result.primaryCombatRole).toBe("scram-kiter");
    expect(result.combatRoles.find((entry) => entry.role === "brawler")?.score).toBe(2);
    expect(result.tankRole).toBe("active");
  });

  it("classifies weapon range outside scram but inside disruptor as kiter", () => {
    const result = classifyFitIdentity({
      weaponPreferredRangeMeters: 20_000,
      scramRangeMeters: 10_000,
      disruptorRangeMeters: 24_000,
      hasScram: false,
      hasDisruptor: true,
      hasLocalRepair: false,
      hasBufferTank: false,
      hasPassiveRechargeTank: true,
      provenance,
    });

    expect(result.primaryCombatRole).toBe("kiter");
    expect(result.combatRoles.map((entry) => entry.role)).toEqual(["kiter", "tackle"]);
    expect(result.tankRole).toBe("passive");
  });

  it("uses relative supported envelopes instead of hard-coded module ranges for sniper evidence", () => {
    const result = classifyFitIdentity({
      weaponPreferredRangeMeters: 70_000,
      disruptorRangeMeters: 30_000,
      hasDisruptor: true,
      hasLocalRepair: false,
      hasBufferTank: false,
      hasPassiveRechargeTank: false,
      provenance,
    });

    expect(result.primaryCombatRole).toBeNull();
    expect(result.combatRoles.map((entry) => [entry.role, entry.score])).toEqual([
      ["sniper", 3],
      ["tackle", 3],
    ]);
  });

  it("scores support roles only from explicit supported evidence", () => {
    const result = classifyFitIdentity({
      weaponPreferredRangeMeters: null,
      hasScram: false,
      hasDisruptor: false,
      hasEwar: true,
      hasNeutralizer: true,
      hasRemoteRepair: true,
      hasLocalRepair: true,
      hasBufferTank: true,
      hasPassiveRechargeTank: false,
      provenance,
    });

    expect(result.primaryCombatRole).toBeNull();
    expect(result.combatRoles.map((entry) => entry.role)).toEqual(["ewar", "logi", "neut"]);
    expect(result.tankRole).toBe("hybrid");
    expect(result.unknowns).toContain("weapon engagement range is not established");
  });

  it("returns other/unknown rather than inventing a specific role when evidence is insufficient", () => {
    const result = classifyFitIdentity({ provenance });

    expect(result.primaryCombatRole).toBe("other");
    expect(result.combatRoles).toEqual([
      {
        role: "other",
        score: 1,
        reasons: [
          {
            code: "insufficient-role-evidence",
            summary: "No supported evidence establishes a more specific combat role.",
            weight: 1,
          },
        ],
      },
    ]);
    expect(result.tankRole).toBe("unknown");
    expect(result.unknowns).toEqual([
      "tank style is not established",
      "warp-tackle capability is not established",
      "weapon engagement range is not established",
    ]);
  });

  it("requires provenance instead of accepting unexplained classifier facts", () => {
    expect(() => classifyFitIdentity({ provenance: [] })).toThrow("Fit identity evidence requires provenance");
  });
});
