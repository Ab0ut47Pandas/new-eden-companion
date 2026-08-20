import { describe, expect, it } from "vitest";

import type { MatchupDimensionResult, TwoFitMatchupResult } from "./matchup";
import { buildMatchupBriefing } from "./briefing";

function dimension(
  name: MatchupDimensionResult["dimension"],
  edge: MatchupDimensionResult["edge"],
  summary = `${name} ${edge}`,
): MatchupDimensionResult {
  return {
    dimension: name,
    edge,
    summary,
    evidence: [`evidence: ${name}`],
    caveats: [`caveat: ${name}`],
  };
}

function matchup(dimensions: MatchupDimensionResult[]): TwoFitMatchupResult {
  return {
    youLabel: "Your fit",
    opponentLabel: "Opponent fit",
    dimensions,
    unknowns: dimensions.filter((entry) => entry.edge === "unknown").map((entry) => `${entry.dimension}: unknown`),
    limitations: ["PVP-01 never emits a win percentage."],
    provenance: ["validated PVP-01 fixture"],
  };
}

describe("buildMatchupBriefing", () => {
  it("separates your advantages, opponent advantages, and contested dimensions without an overall winner", () => {
    const result = buildMatchupBriefing(matchup([
      dimension("range-control", "you"),
      dimension("tank", "opponent"),
      dimension("tackle", "contested"),
      dimension("mobility", "none"),
      dimension("application", "unknown"),
    ]));

    expect(result.yourAdvantages.map((entry) => entry.dimension)).toEqual(["range-control"]);
    expect(result.opponentAdvantages.map((entry) => entry.dimension)).toEqual(["tank"]);
    expect(result.contested.map((entry) => entry.dimension)).toEqual(["tackle", "mobility"]);
    expect(result.unknowns).toEqual(["application: unknown"]);
    expect(result).not.toHaveProperty("winner");
    expect(result).not.toHaveProperty("score");
    expect(result).not.toHaveProperty("winProbability");
    expect(result.limitations.join(" ")).toMatch(/does not add the dimensions together/i);
  });

  it("turns supported directional edges into good and bad engagement conditions", () => {
    const result = buildMatchupBriefing(matchup([
      dimension("engagement-envelope", "you", "Your preferred range is less constrained."),
      dimension("damage-types", "you", "Your damage mix is favorable."),
      dimension("application", "opponent", "Their application is validated as better."),
    ]));

    expect(result.goodEngagementConditions).toHaveLength(2);
    expect(result.goodEngagementConditions[0].summary).toMatch(/preferred engagement envelope/i);
    expect(result.goodEngagementConditions[1].summary).toMatch(/damage mix/i);
    expect(result.badEngagementConditions).toHaveLength(1);
    expect(result.badEngagementConditions[0].summary).toMatch(/sustained trades/i);
    expect(result.badEngagementConditions[0].why).toBe("Their application is validated as better.");
  });

  it("creates early run-if cues from opponent-favored dimensions in tactical dependency order", () => {
    const result = buildMatchupBriefing(matchup([
      dimension("damage-types", "opponent"),
      dimension("tackle", "opponent"),
      dimension("range-control", "opponent"),
      dimension("capacitor", "opponent"),
      dimension("tank", "opponent"),
    ]));

    expect(result.runIfConditions.map((entry) => entry.dimension)).toEqual([
      "range-control",
      "tackle",
      "capacitor",
      "damage-types",
    ]);
    expect(result.runIfConditions[1].summary).toMatch(/leave before.*tackle|leave before the opponent applies/i);
    expect(result.limitations.join(" ")).toMatch(/not a guarantee that disengagement remains possible/i);
  });

  it("builds a plausible failure transition without pretending to predict live event order", () => {
    const result = buildMatchupBriefing(matchup([
      dimension("range-control", "opponent"),
      dimension("tackle", "opponent"),
      dimension("application", "opponent"),
      dimension("tank", "opponent"),
    ]));

    expect(result.failureTransition.steps).toEqual([
      "The opponent establishes the supported range-control lever.",
      "Their supported tackle narrows or removes your warp-exit option while it is successfully applied.",
      "Their validated damage application remains favorable while yours does not.",
      "The fight becomes an attrition race where their supported opponent-specific tank edge matters.",
    ]);
    expect(result.failureTransition.summary).toMatch(/plausible failure transition/i);
    expect(result.failureTransition.caveat).toMatch(/not a prediction/i);
  });

  it("does not fabricate a failure chain when no opponent-favored dimensions are established", () => {
    const result = buildMatchupBriefing(matchup([
      dimension("range-control", "you"),
      dimension("tackle", "contested"),
      dimension("application", "unknown"),
    ]));

    expect(result.failureTransition.steps).toEqual([]);
    expect(result.failureTransition.summary).toMatch(/no opponent-favored failure transition/i);
    expect(result.runIfConditions).toEqual([]);
  });

  it("requires provenance before emitting player-facing tactical advice", () => {
    const input = matchup([dimension("range-control", "you")]);
    input.provenance = [];
    expect(() => buildMatchupBriefing(input)).toThrow(/requires provenance/i);
  });
});
