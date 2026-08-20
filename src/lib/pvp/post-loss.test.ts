import { describe, expect, it } from "vitest";
import type { FitWeaknessResult } from "../fitting/weakness";
import type { MatchupBriefing } from "./briefing";
import { buildPostLossDebrief } from "./post-loss";

const lossProvenance = ["authenticated CCP killmail 9001"] as const;

const fitWeaknesses: FitWeaknessResult = {
  primary: {
    code: "weapon-plan-beyond-own-tackle",
    category: "range-plan",
    severity: "caution",
    summary: "Preferred weapon range extends beyond established self-tackle.",
    why: "The stated plan cannot establish both preferred damage range and self-tackle from the supplied fit evidence.",
    evidence: ["Preferred weapon range: 24,000 m", "Longest established tackle range: 20,000 m"],
  },
  findings: [
    {
      code: "weapon-plan-beyond-own-tackle",
      category: "range-plan",
      severity: "caution",
      summary: "Preferred weapon range extends beyond established self-tackle.",
      why: "The stated plan cannot establish both preferred damage range and self-tackle from the supplied fit evidence.",
      evidence: ["Preferred weapon range: 24,000 m", "Longest established tackle range: 20,000 m"],
    },
  ],
  unknowns: ["target-specific damage application is not established"],
  provenance: ["validated destroyed-fit analysis"],
};

const matchupBriefing: MatchupBriefing = {
  headline: "Rifter vs Condor: evidence-first matchup briefing",
  yourAdvantages: [],
  opponentAdvantages: [
    {
      id: "range-control-danger",
      dimension: "range-control",
      title: "Range control",
      summary: "Condor has the supported range-control edge in this supplied matchup.",
      evidence: ["Condor modeled max velocity exceeds Rifter modeled max velocity"],
      caveats: ["Maximum velocity alone does not prove live range control."],
      tone: "danger",
    },
  ],
  contested: [],
  goodEngagementConditions: [],
  badEngagementConditions: [],
  runIfConditions: [
    {
      id: "run-range-control",
      dimension: "range-control",
      summary: "Reset before the opponent establishes the supported range-control condition.",
      why: "Condor has the supported range-control edge in this supplied matchup.",
    },
  ],
  failureTransition: {
    summary: "One supported danger condition is available.",
    steps: ["The opponent establishes the supported range-control lever."],
    caveat: "This is not a prediction.",
  },
  unknowns: [],
  limitations: ["No overall winner or probability."],
  provenance: ["validated PVP-02 matchup briefing"],
};

describe("buildPostLossDebrief", () => {
  it("requires CCP-backed or otherwise explicit loss provenance", () => {
    expect(() => buildPostLossDebrief({ loss: { provenance: [] } })).toThrow(
      "Post-loss debrief requires killmail/loss provenance",
    );
  });

  it("preserves missing fit, attacker, and matchup context instead of fabricating a cause", () => {
    const result = buildPostLossDebrief({ loss: { killmailId: 9001, provenance: lossProvenance } });

    expect(result.primaryFactors).toEqual([]);
    expect(result.secondaryFactors).toEqual([]);
    expect(result.unknowns).toContain("recorded attacker context is not available");
    expect(result.unknowns).toContain("the destroyed ship fitting snapshot is not available");
    expect(result.unknowns).toContain("validated destroyed-fit weakness analysis is not available");
    expect(result.unknowns).toContain("validated two-fit matchup context is not available for a recorded attacker");
    expect(result.unknowns).toContain("no evidence-backed primary or secondary failure factor can be established from the supplied context");
  });

  it("treats multiple recorded damaging player attackers as context without claiming they were simultaneous or decisive", () => {
    const result = buildPostLossDebrief({
      loss: {
        killmailId: 9001,
        attackers: [
          { characterId: 1, recordedDamage: 1_200, finalBlow: false, isNpc: false },
          { characterId: 2, recordedDamage: 900, finalBlow: true, isNpc: false },
          { characterId: null, recordedDamage: 300, isNpc: true },
        ],
        destroyedFitTypeIds: [587, 2048],
        provenance: lossProvenance,
      },
    });

    expect(result.primaryFactors[0]).toMatchObject({
      id: "multiple-recorded-player-attackers",
      category: "numbers",
      support: "recorded-context",
    });
    expect(result.primaryFactors[0].caveats.join(" ")).toContain("does not prove every attacker was applying damage simultaneously");
  });

  it("uses a supported destroyed-fit weakness only as a plausible contributor", () => {
    const result = buildPostLossDebrief({
      loss: {
        attackers: [{ characterId: 1, recordedDamage: 1_000, finalBlow: true, isNpc: false }],
        destroyedFitTypeIds: [587, 2048],
        provenance: lossProvenance,
      },
      fitWeaknesses,
    });

    const factor = [...result.primaryFactors, ...result.secondaryFactors].find((entry) => entry.id === "fit-weapon-plan-beyond-own-tackle");
    expect(factor?.support).toBe("plausible");
    expect(factor?.why).toContain("does not prove that it caused the destruction");
    expect(result.unknowns).toContain("fit analysis: target-specific damage application is not established");
  });

  it("refuses to use a matchup briefing when its opponent is not confirmed as a recorded attacker", () => {
    const result = buildPostLossDebrief({
      loss: {
        attackers: [{ characterId: 1, recordedDamage: 1_000, isNpc: false }],
        destroyedFitTypeIds: [587],
        provenance: lossProvenance,
      },
      matchupBriefing,
      matchedOpponent: { status: "unknown", provenance: [] },
    });

    expect([...result.primaryFactors, ...result.secondaryFactors].some((entry) => entry.id === "matchup-range-control")).toBe(false);
    expect(result.unknowns).toContain("the supplied matchup is not confirmed to correspond to a recorded attacker on this loss");
  });

  it("uses confirmed opponent matchup evidence as a plausible review factor and carries early reset teaching forward", () => {
    const result = buildPostLossDebrief({
      loss: {
        attackers: [{ characterId: 55, recordedDamage: 2_000, finalBlow: true, isNpc: false }],
        destroyedFitTypeIds: [587, 2048],
        provenance: lossProvenance,
      },
      matchupBriefing,
      matchedOpponent: {
        status: "confirmed",
        reason: "The validated opponent fit belongs to recorded attacker 55.",
        provenance: ["attacker 55 linkage evidence"],
      },
    });

    expect(result.primaryFactors[0]).toMatchObject({
      id: "matchup-range-control",
      category: "range-control",
      support: "plausible",
    });
    expect(result.learningPoints.map((entry) => entry.id)).toContain("learn-run-run-range-control");
    expect(result.provenance).toContain("attacker 55 linkage evidence");
  });

  it("requires provenance before accepting a confirmed attacker-to-matchup link", () => {
    expect(() => buildPostLossDebrief({
      loss: { attackers: [], destroyedFitTypeIds: [], provenance: lossProvenance },
      matchupBriefing,
      matchedOpponent: { status: "confirmed", provenance: [] },
    })).toThrow("Confirmed opponent linkage requires provenance");
  });

  it("never interprets final blow by itself as the primary causal factor", () => {
    const result = buildPostLossDebrief({
      loss: {
        attackers: [
          { characterId: 1, recordedDamage: 9_000, finalBlow: false, isNpc: false },
          { characterId: 2, recordedDamage: 1, finalBlow: true, isNpc: false },
        ],
        destroyedFitTypeIds: [587],
        provenance: lossProvenance,
      },
    });

    expect([...result.primaryFactors, ...result.secondaryFactors].some((entry) => entry.id.includes("final"))).toBe(false);
    expect(result.limitations.join(" ")).toContain("not a combat replay");
  });
});
