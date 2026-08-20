import type { MatchupDimension, MatchupDimensionResult, MatchupEdge, TwoFitMatchupResult } from "./matchup";

export type MatchupBriefingTone = "advantage" | "danger" | "contested" | "unknown";

export interface MatchupBriefingCard {
  id: string;
  dimension: MatchupDimension;
  title: string;
  summary: string;
  evidence: string[];
  caveats: string[];
  tone: MatchupBriefingTone;
}

export interface MatchupCondition {
  id: string;
  dimension: MatchupDimension;
  summary: string;
  why: string;
}

export interface MatchupFailureTransition {
  summary: string;
  steps: string[];
  caveat: string;
}

export interface MatchupBriefing {
  headline: string;
  yourAdvantages: MatchupBriefingCard[];
  opponentAdvantages: MatchupBriefingCard[];
  contested: MatchupBriefingCard[];
  goodEngagementConditions: MatchupCondition[];
  badEngagementConditions: MatchupCondition[];
  runIfConditions: MatchupCondition[];
  failureTransition: MatchupFailureTransition;
  unknowns: string[];
  limitations: string[];
  provenance: string[];
}

const DIMENSION_LABELS: Record<MatchupDimension, string> = {
  "engagement-envelope": "Engagement envelope",
  "range-control": "Range control",
  tackle: "Tackle",
  application: "Damage application",
  tank: "Tank",
  capacitor: "Capacitor warfare",
  mobility: "Mobility",
  "damage-types": "Damage types vs resistances",
  escape: "Escape / warp denial",
};

const FAILURE_PRIORITY: readonly MatchupDimension[] = [
  "engagement-envelope",
  "range-control",
  "tackle",
  "application",
  "capacitor",
  "damage-types",
  "tank",
  "mobility",
  "escape",
];

function cardFor(result: MatchupDimensionResult, tone: MatchupBriefingTone): MatchupBriefingCard {
  return {
    id: `${result.dimension}-${tone}`,
    dimension: result.dimension,
    title: DIMENSION_LABELS[result.dimension],
    summary: result.summary,
    evidence: [...result.evidence],
    caveats: [...result.caveats],
    tone,
  };
}

function conditionText(
  result: MatchupDimensionResult,
  side: "you" | "opponent",
  kind: "good" | "bad" | "run",
): MatchupCondition {
  const label = DIMENSION_LABELS[result.dimension];
  const yourSide = side === "you";

  if (kind === "good") {
    switch (result.dimension) {
      case "engagement-envelope":
        return { id: `good-${result.dimension}`, dimension: result.dimension, summary: "Fight where your supported preferred engagement envelope is less constrained by the opponent's established tackle.", why: result.summary };
      case "range-control":
        return { id: `good-${result.dimension}`, dimension: result.dimension, summary: "Keep the fight in the range-control state your supported mobility/tackle evidence favors.", why: result.summary };
      case "tackle":
        return { id: `good-${result.dimension}`, dimension: result.dimension, summary: "Commit when you can establish your supported tackle while preserving the rest of your plan.", why: result.summary };
      case "application":
        return { id: `good-${result.dimension}`, dimension: result.dimension, summary: "Take damage trades while the validated application edge still matches this target interaction.", why: result.summary };
      case "tank":
        return { id: `good-${result.dimension}`, dimension: result.dimension, summary: "Use the supported opponent-specific tank edge as margin, not as permission to ignore range, tackle, or capacitor conditions.", why: result.summary };
      case "capacitor":
        return { id: `good-${result.dimension}`, dimension: result.dimension, summary: "Prefer exchanges where your supported capacitor or neutralizer edge can operate inside the established range conditions.", why: result.summary };
      case "mobility":
        return { id: `good-${result.dimension}`, dimension: result.dimension, summary: "Use the supported mobility edge to choose distance, reset, or leave before other conditions turn against you.", why: result.summary };
      case "damage-types":
        return { id: `good-${result.dimension}`, dimension: result.dimension, summary: "Prefer the supported damage mix while it remains favorable against the opponent's established primary resistance layer.", why: result.summary };
      case "escape":
        return { id: `good-${result.dimension}`, dimension: result.dimension, summary: "Preserve the supported warp-denial/escape relationship; do not assume it remains true after live positioning changes.", why: result.summary };
    }
  }

  if (kind === "bad") {
    switch (result.dimension) {
      case "engagement-envelope":
        return { id: `bad-${result.dimension}`, dimension: result.dimension, summary: "Avoid being forced into the opponent-favored supported engagement envelope.", why: result.summary };
      case "range-control":
        return { id: `bad-${result.dimension}`, dimension: result.dimension, summary: "Avoid a committed fight once the opponent establishes the supported range-control lever their plan wants.", why: result.summary };
      case "tackle":
        return { id: `bad-${result.dimension}`, dimension: result.dimension, summary: "Treat the opponent's supported tackle capability as a commitment threshold rather than discovering it after you need to leave.", why: result.summary };
      case "application":
        return { id: `bad-${result.dimension}`, dimension: result.dimension, summary: "Avoid sustained trades where their validated application is favorable and yours is not.", why: result.summary };
      case "tank":
        return { id: `bad-${result.dimension}`, dimension: result.dimension, summary: "Avoid turning the matchup into a simple attrition race when the supported opponent-specific tank comparison favors them.", why: result.summary };
      case "capacitor":
        return { id: `bad-${result.dimension}`, dimension: result.dimension, summary: "Avoid staying committed while their supported capacitor/neutralizer interaction threatens systems your plan depends on.", why: result.summary };
      case "mobility":
        return { id: `bad-${result.dimension}`, dimension: result.dimension, summary: "Do not rely on raw speed or escape once the opponent's supported mobility edge becomes actual range control.", why: result.summary };
      case "damage-types":
        return { id: `bad-${result.dimension}`, dimension: result.dimension, summary: "Avoid a long damage race when the supported damage-type/resistance interaction favors the opponent and you cannot change that condition.", why: result.summary };
      case "escape":
        return { id: `bad-${result.dimension}`, dimension: result.dimension, summary: "Do not assume warp remains available once the opponent can establish the supported warp-denial condition.", why: result.summary };
    }
  }

  if (kind === "run") {
    switch (result.dimension) {
      case "engagement-envelope":
        return { id: `run-${result.dimension}`, dimension: result.dimension, summary: "Reset or disengage before you are forced into the opponent-favored supported engagement band, if an escape path still exists.", why: result.summary };
      case "range-control":
        return { id: `run-${result.dimension}`, dimension: result.dimension, summary: "Leave before the opponent's supported range-control condition becomes established enough to remove your reset option.", why: result.summary };
      case "tackle":
        return { id: `run-${result.dimension}`, dimension: result.dimension, summary: "If you do not intend to commit, leave before the opponent applies the supported tackle condition that can deny warp under the supplied values.", why: result.summary };
      case "application":
        return { id: `run-${result.dimension}`, dimension: result.dimension, summary: "Reset when your validated application is poor while theirs remains good and you cannot change range or target interaction.", why: result.summary };
      case "tank":
        return { id: `run-${result.dimension}`, dimension: result.dimension, summary: "Disengage rather than accept a straight attrition race when the supported opponent-specific tank edge is the deciding condition you cannot change.", why: result.summary };
      case "capacitor":
        return { id: `run-${result.dimension}`, dimension: result.dimension, summary: "Disengage if possible when their supported capacitor pressure begins removing systems your plan explicitly depends on.", why: result.summary };
      case "mobility":
        return { id: `run-${result.dimension}`, dimension: result.dimension, summary: "Reset early if their supported mobility edge is becoming real range control; maximum velocity alone does not prove you can escape later.", why: result.summary };
      case "damage-types":
        return { id: `run-${result.dimension}`, dimension: result.dimension, summary: "Reset if their supported damage/resistance interaction remains favorable and you cannot change ammunition, range, or tank conditions.", why: result.summary };
      case "escape":
        return { id: `run-${result.dimension}`, dimension: result.dimension, summary: "Treat supported enemy warp denial as an early leave condition: once tackle is successfully applied, NEC does not claim you can still escape.", why: result.summary };
    }
  }

  return {
    id: `${kind}-${result.dimension}-${side}`,
    dimension: result.dimension,
    summary: `${label}: ${yourSide ? "keep" : "avoid"} the supported condition described by the matchup evidence.`,
    why: result.summary,
  };
}

function failureStep(dimension: MatchupDimension): string {
  switch (dimension) {
    case "engagement-envelope": return "You are forced into the opponent-favored supported engagement envelope.";
    case "range-control": return "The opponent establishes the supported range-control lever.";
    case "tackle": return "Their supported tackle narrows or removes your warp-exit option while it is successfully applied.";
    case "application": return "Their validated damage application remains favorable while yours does not.";
    case "capacitor": return "Capacitor pressure threatens systems your stated plan depends on.";
    case "damage-types": return "Their supported damage mix continues to meet your established resistance profile favorably.";
    case "tank": return "The fight becomes an attrition race where their supported opponent-specific tank edge matters.";
    case "mobility": return "Their supported mobility edge prevents an easy reset or range recovery.";
    case "escape": return "The supported warp-denial condition remains established while you try to leave.";
  }
}

function buildFailureTransition(dimensions: readonly MatchupDimensionResult[]): MatchupFailureTransition {
  const opponentEdges = new Map(
    dimensions.filter((entry) => entry.edge === "opponent").map((entry) => [entry.dimension, entry]),
  );
  const steps = FAILURE_PRIORITY.filter((dimension) => opponentEdges.has(dimension)).map(failureStep);

  if (steps.length === 0) {
    return {
      summary: "No opponent-favored failure transition can be established from the supplied matchup evidence.",
      steps: [],
      caveat: "That does not mean the matchup is safe or favored. Unknown dimensions, pilot decisions, heat, live position, implants, boosters, fleet support, and unsupported mechanics can still decide the fight.",
    };
  }

  if (steps.length === 1) {
    return {
      summary: "One opponent-favored failure condition is supported, but the evidence is not sufficient to build a multi-step failure chain.",
      steps,
      caveat: "This is a supported danger condition, not a prediction that it will happen or that it will cause a loss.",
    };
  }

  return {
    summary: "A plausible failure transition can be described from the opponent-favored dimensions below.",
    steps,
    caveat: "The ordering is a teaching sequence based on tactical dependency, not a prediction of live event order, time-to-loss, or probability.",
  };
}

export function buildMatchupBriefing(matchup: TwoFitMatchupResult): MatchupBriefing {
  if (matchup.provenance.length === 0) throw new Error("Matchup briefing requires provenance");

  const yourAdvantages = matchup.dimensions.filter((entry) => entry.edge === "you").map((entry) => cardFor(entry, "advantage"));
  const opponentAdvantages = matchup.dimensions.filter((entry) => entry.edge === "opponent").map((entry) => cardFor(entry, "danger"));
  const contested = matchup.dimensions.filter((entry) => entry.edge === "contested" || entry.edge === "none").map((entry) => cardFor(entry, "contested"));

  const goodEngagementConditions = matchup.dimensions
    .filter((entry) => entry.edge === "you")
    .map((entry) => conditionText(entry, "you", "good"));
  const badEngagementConditions = matchup.dimensions
    .filter((entry) => entry.edge === "opponent")
    .map((entry) => conditionText(entry, "opponent", "bad"));
  const runIfConditions = FAILURE_PRIORITY
    .map((dimension) => matchup.dimensions.find((entry) => entry.dimension === dimension && entry.edge === "opponent"))
    .filter((entry): entry is MatchupDimensionResult => Boolean(entry))
    .slice(0, 4)
    .map((entry) => conditionText(entry, "opponent", "run"));

  return {
    headline: `${matchup.youLabel} vs ${matchup.opponentLabel}: evidence-first matchup briefing`,
    yourAdvantages,
    opponentAdvantages,
    contested,
    goodEngagementConditions,
    badEngagementConditions,
    runIfConditions,
    failureTransition: buildFailureTransition(matchup.dimensions),
    unknowns: [...matchup.unknowns],
    limitations: [...new Set([
      ...matchup.limitations,
      "PVP-02 translates directional matchup evidence into teaching conditions. It does not add the dimensions together into an overall score or winner.",
      "Run-if guidance is an early decision cue, not a guarantee that disengagement remains possible after the stated condition is established.",
      "The failure transition is a plausible teaching sequence from supported opponent-favored dimensions, not a forecast of event order or loss probability.",
    ])],
    provenance: [...matchup.provenance],
  };
}
