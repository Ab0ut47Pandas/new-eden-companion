import { describe, expect, it } from "vitest";
import type { ReadinessExplanation } from "@/lib/readiness/explanation";
import { buildSuggestedSession, type SuggestedSessionCandidate } from "./suggested-session";

function readiness(status: ReadinessExplanation["status"], overrides: Partial<ReadinessExplanation> = {}): ReadinessExplanation {
  return {
    status,
    headline: status,
    why: `readiness: ${status}`,
    technicalEligibility: status === "not-recommended" ? "blocked" : status === "unknown" ? "unknown" : "eligible",
    primaryIssue: null,
    nextAction: null,
    blockers: [],
    gaps: [],
    warnings: [],
    unknowns: [],
    satisfied: [],
    ...overrides,
  };
}

function candidate(overrides: Partial<SuggestedSessionCandidate> & Pick<SuggestedSessionCandidate, "id" | "activity" | "title">): SuggestedSessionCandidate {
  return {
    readiness: readiness("ready"),
    goalRelevance: "none",
    sessionLength: "medium",
    riskPosture: "balanced",
    requiredEvidence: ["activity-readiness"],
    nextAction: "Open the activity briefing.",
    evidence: ["Existing activity readiness evaluator."],
    provenance: ["NEC readiness engine"],
    ...overrides,
  };
}

const readinessCoverage = [{
  key: "activity-readiness" as const,
  availability: "available" as const,
  provenance: ["activity readiness engine"],
}];

describe("buildSuggestedSession", () => {
  it("returns one primary recommendation and up to two alternatives", () => {
    const result = buildSuggestedSession({
      candidates: [
        candidate({ id: "mining", activity: "mining", title: "Mine useful ore", sessionLength: "short" }),
        candidate({ id: "exploration", activity: "exploration", title: "Run a scanning loop", sessionLength: "medium" }),
        candidate({ id: "missions", activity: "missions", title: "Run a security mission", sessionLength: "long" }),
        candidate({ id: "industry", activity: "industry", title: "Build an item", sessionLength: "long" }),
      ],
      evidence: readinessCoverage,
      preferences: { sessionLength: "short", risk: "any" },
    });

    expect(result.primary?.candidateId).toBe("mining");
    expect(result.alternatives).toHaveLength(2);
    expect(result.ranked).toHaveLength(4);
  });

  it("never treats missing required evidence as ready", () => {
    const result = buildSuggestedSession({
      candidates: [candidate({
        id: "exploration",
        activity: "exploration",
        title: "Explore nearby space",
        requiredEvidence: ["activity-readiness", "current-ship", "cargo-supplies"],
      })],
      evidence: readinessCoverage,
      preferences: { sessionLength: "any", risk: "any" },
    });

    expect(result.primary?.state).toBe("cannot-verify");
    expect(result.primary?.unknowns).toEqual([
      "current-ship evidence is not-requested",
      "cargo-supplies evidence is not-requested",
    ]);
    expect(result.primary?.resolveUnknowns).toContain("Refresh or reconnect to resolve current-ship evidence.");
  });

  it("distinguishes unavailable live evidence from merely unrequested evidence", () => {
    const result = buildSuggestedSession({
      candidates: [candidate({
        id: "trade",
        activity: "hauling/trade",
        title: "Review a trade run",
        requiredEvidence: ["activity-readiness", "market"],
      })],
      evidence: [
        ...readinessCoverage,
        { key: "market", availability: "unavailable", detail: "Live market orders could not be fetched.", resolveAction: "Refresh market data later." },
      ],
      preferences: { sessionLength: "any", risk: "any" },
    });

    expect(result.primary?.state).toBe("live-information-unavailable");
    expect(result.primary?.unknowns).toContain("Live market orders could not be fetched.");
    expect(result.primary?.resolveUnknowns).toContain("Refresh market data later.");
  });

  it("prefers a supported owned accessible ship without inventing suitability", () => {
    const result = buildSuggestedSession({
      candidates: [candidate({
        id: "mining",
        activity: "mining",
        title: "Mine useful ore",
        shipChoices: [
          { name: "Venture", owned: true, accessible: true, suitability: "supported", why: "Existing mining readiness supports this hull.", provenance: ["mining readiness"] },
          { name: "Retriever", owned: true, accessible: "unknown", suitability: "supported", provenance: ["asset list"] },
          { name: "Prospect", owned: false, accessible: false, suitability: "supported", provenance: ["fit catalog"] },
        ],
      })],
      evidence: readinessCoverage,
      preferences: { sessionLength: "any", risk: "any" },
    });

    expect(result.primary?.ship?.name).toBe("Venture");
    expect(result.primary?.why).toContain("Existing mining readiness supports this hull.");
  });

  it("ranks readiness ahead of preference matching so a preferred risky activity is not promoted over a verified ready option", () => {
    const result = buildSuggestedSession({
      candidates: [
        candidate({ id: "ready", activity: "mining", title: "Ready mining", riskPosture: "cautious", sessionLength: "short" }),
        candidate({
          id: "unknown",
          activity: "exploration",
          title: "Unverified dangerous exploration",
          riskPosture: "adventurous",
          sessionLength: "long",
          readiness: readiness("unknown"),
        }),
      ],
      evidence: readinessCoverage,
      preferences: { sessionLength: "long", risk: "adventurous" },
    });

    expect(result.primary?.candidateId).toBe("ready");
    expect(result.ranked[1].state).toBe("cannot-verify");
  });

  it("keeps direct-goal relevance above preference matching within the same verified state", () => {
    const result = buildSuggestedSession({
      candidates: [
        candidate({ id: "goal", activity: "industry", title: "Build goal item", goalRelevance: "direct", sessionLength: "long", riskPosture: "balanced" }),
        candidate({ id: "pref", activity: "mining", title: "Short cautious mining", goalRelevance: "none", sessionLength: "short", riskPosture: "cautious" }),
      ],
      evidence: readinessCoverage,
      preferences: { sessionLength: "short", risk: "cautious" },
    });

    expect(result.primary?.candidateId).toBe("goal");
  });

  it("surfaces readiness blockers, missing items, and one concrete next action", () => {
    const blocker = {
      id: "skill",
      dimension: "skills" as const,
      requirement: "hard" as const,
      state: "unmet" as const,
      summary: "Required skill is not trained",
      why: "The activity requires the skill.",
      evidence: [{ source: "derived" as const, label: "Skill level below requirement" }],
    };
    const result = buildSuggestedSession({
      candidates: [candidate({
        id: "missions",
        activity: "missions",
        title: "Run a mission",
        readiness: readiness("not-recommended", { blockers: [blocker], nextAction: "Train the required skill." }),
        missingItems: ["appropriate ammunition"],
      })],
      evidence: readinessCoverage,
      preferences: { sessionLength: "any", risk: "any" },
    });

    expect(result.primary?.state).toBe("missing-requirements");
    expect(result.primary?.missingRequirements).toContain("Required skill is not trained");
    expect(result.primary?.missingItems).toEqual(["appropriate ammunition"]);
    expect(result.primary?.nextAction).toBe("Train the required skill.");
  });

  it("requires candidate provenance and rejects duplicate evidence/candidate ids", () => {
    expect(() => buildSuggestedSession({
      candidates: [candidate({ id: "x", activity: "mining", title: "Mine", provenance: [] })],
      evidence: readinessCoverage,
      preferences: { sessionLength: "any", risk: "any" },
    })).toThrow("requires provenance");

    expect(() => buildSuggestedSession({
      candidates: [candidate({ id: "x", activity: "mining", title: "Mine" })],
      evidence: [...readinessCoverage, ...readinessCoverage],
      preferences: { sessionLength: "any", risk: "any" },
    })).toThrow("Duplicate Suggested Session evidence key");

    expect(() => buildSuggestedSession({
      candidates: [candidate({ id: "x", activity: "mining", title: "Mine" }), candidate({ id: "x", activity: "exploration", title: "Explore" })],
      evidence: readinessCoverage,
      preferences: { sessionLength: "any", risk: "any" },
    })).toThrow("Duplicate Suggested Session candidate id");
  });
});
