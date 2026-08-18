import { describe, expect, it } from "vitest";

import type { ReadinessExplanation, ReadinessRecommendationStatus } from "./explanation";
import { buildRecommendationBoard, type RecommendationCandidate } from "./recommender";

function readiness(status: ReadinessRecommendationStatus): ReadinessExplanation {
  return {
    status,
    headline: status,
    why: `Why ${status}`,
    technicalEligibility: status === "not-recommended" ? "blocked" : status === "unknown" ? "unknown" : "eligible",
    primaryIssue: null,
    nextAction: null,
    blockers: [],
    gaps: [],
    warnings: [],
    unknowns: [],
    satisfied: [],
  };
}

function candidate(overrides: Partial<RecommendationCandidate> & Pick<RecommendationCandidate, "id" | "title">): RecommendationCandidate {
  return {
    role: "primary",
    readiness: readiness("ready"),
    goalRelevance: "none",
    preparationScope: "none",
    ...overrides,
  };
}

describe("recommendation board", () => {
  it("places ready activities in ready-now", () => {
    const board = buildRecommendationBoard([candidate({ id: "ready", title: "Ready activity" })]);
    expect(board.buckets["ready-now"]).toHaveLength(1);
    expect(board.ranked[0].whyBucket).toMatch(/satisfied now/i);
  });

  it("uses explicit preparation scope instead of counting readiness gaps", () => {
    const board = buildRecommendationBoard([
      candidate({ id: "short", title: "Short prep", readiness: readiness("nearly-ready"), preparationScope: "short" }),
      candidate({ id: "long", title: "Long prep", readiness: readiness("not-recommended"), preparationScope: "long" }),
    ]);
    expect(board.buckets["short-preparation"].map((entry) => entry.candidate.id)).toEqual(["short"]);
    expect(board.buckets["longer-goal"].map((entry) => entry.candidate.id)).toEqual(["long"]);
  });

  it("keeps unknown readiness and unknown preparation out of false timeline buckets", () => {
    const board = buildRecommendationBoard([
      candidate({ id: "unknown-readiness", title: "Unknown readiness", readiness: readiness("unknown"), preparationScope: "short" }),
      candidate({ id: "unknown-scope", title: "Unknown scope", readiness: readiness("nearly-ready"), preparationScope: "unknown" }),
    ]);
    expect(board.buckets["needs-information"].map((entry) => entry.candidate.id)).toEqual(["unknown-readiness", "unknown-scope"]);
  });

  it("does not automatically demote optional side activities", () => {
    const board = buildRecommendationBoard([
      candidate({ id: "side", title: "Optional side activity", role: "side", readiness: readiness("ready") }),
    ]);
    expect(board.buckets["ready-now"].map((entry) => entry.candidate.id)).toEqual(["side"]);
    expect(board.buckets["ignore-for-now"]).toHaveLength(0);
  });

  it("requires an explicit defer reason before placing something in ignore-for-now", () => {
    expect(() => buildRecommendationBoard([
      candidate({ id: "bad-defer", title: "Bad defer", disposition: "defer" }),
    ])).toThrow(/requires dispositionWhy/);

    const board = buildRecommendationBoard([
      candidate({ id: "defer", title: "Deferred activity", disposition: "defer", dispositionWhy: "A sourced progression rule says this should wait until the current goal is complete." }),
    ]);
    expect(board.buckets["ignore-for-now"][0].whyBucket).toMatch(/current goal/i);
  });

  it("ranks direct goal matches ahead of supporting and unrelated candidates inside a bucket", () => {
    const board = buildRecommendationBoard([
      candidate({ id: "none", title: "A unrelated", goalRelevance: "none" }),
      candidate({ id: "support", title: "Z supporting", goalRelevance: "supporting" }),
      candidate({ id: "direct", title: "M direct", goalRelevance: "direct" }),
    ]);
    expect(board.buckets["ready-now"].map((entry) => entry.candidate.id)).toEqual(["direct", "support", "none"]);
  });

  it("uses primary versus side only as a transparent tie-breaker", () => {
    const board = buildRecommendationBoard([
      candidate({ id: "side", title: "A side", role: "side", goalRelevance: "none" }),
      candidate({ id: "primary", title: "Z primary", role: "primary", goalRelevance: "none" }),
    ]);
    expect(board.buckets["ready-now"].map((entry) => entry.candidate.id)).toEqual(["primary", "side"]);
  });

  it("orders buckets predictably without exposing a fake numeric score", () => {
    const board = buildRecommendationBoard([
      candidate({ id: "ignore", title: "Ignore", disposition: "defer", dispositionWhy: "Explicitly deferred." }),
      candidate({ id: "long", title: "Long", readiness: readiness("not-recommended"), preparationScope: "long" }),
      candidate({ id: "info", title: "Info", readiness: readiness("unknown"), preparationScope: "unknown" }),
      candidate({ id: "short", title: "Short", readiness: readiness("nearly-ready"), preparationScope: "short" }),
      candidate({ id: "ready", title: "Ready" }),
    ]);
    expect(board.ranked.map((entry) => entry.bucket)).toEqual([
      "ready-now",
      "short-preparation",
      "longer-goal",
      "needs-information",
      "ignore-for-now",
    ]);
    expect(board.ranked.every((entry) => !("score" in entry))).toBe(true);
  });

  it("rejects duplicate candidate IDs so ranking explanations stay addressable", () => {
    expect(() => buildRecommendationBoard([
      candidate({ id: "same", title: "One" }),
      candidate({ id: "same", title: "Two" }),
    ])).toThrow(/Duplicate recommendation candidate id/);
  });
});
