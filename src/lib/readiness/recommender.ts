import type { ActivityRole } from "./activity-graph";
import type { ReadinessExplanation } from "./explanation";

export type RecommendationBucket =
  | "ready-now"
  | "short-preparation"
  | "longer-goal"
  | "needs-information"
  | "ignore-for-now";

export type GoalRelevance = "direct" | "supporting" | "none";
export type PreparationScope = "none" | "short" | "long" | "unknown";
export type RecommendationDisposition = "consider" | "defer";

export interface RecommendationCandidate {
  id: string;
  title: string;
  role: ActivityRole;
  readiness: ReadinessExplanation;
  goalRelevance: GoalRelevance;
  preparationScope: PreparationScope;
  disposition?: RecommendationDisposition;
  dispositionWhy?: string;
}

export interface RankedRecommendation {
  candidate: RecommendationCandidate;
  bucket: RecommendationBucket;
  whyBucket: string;
  rankReasons: readonly string[];
}

export interface RecommendationBoard {
  ranked: readonly RankedRecommendation[];
  buckets: Readonly<Record<RecommendationBucket, readonly RankedRecommendation[]>>;
}

const BUCKET_ORDER: RecommendationBucket[] = [
  "ready-now",
  "short-preparation",
  "longer-goal",
  "needs-information",
  "ignore-for-now",
];

const GOAL_ORDER: Readonly<Record<GoalRelevance, number>> = {
  direct: 0,
  supporting: 1,
  none: 2,
};

const ROLE_ORDER: Readonly<Record<ActivityRole, number>> = {
  primary: 0,
  side: 1,
};

function nonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must not be empty.`);
  return normalized;
}

function bucketFor(candidate: RecommendationCandidate): { bucket: RecommendationBucket; whyBucket: string } {
  if ((candidate.disposition ?? "consider") === "defer") {
    const reason = candidate.dispositionWhy?.trim();
    if (!reason) throw new Error(`Deferred recommendation ${candidate.id} requires dispositionWhy.`);
    return { bucket: "ignore-for-now", whyBucket: reason };
  }

  if (candidate.readiness.status === "unknown") {
    return {
      bucket: "needs-information",
      whyBucket: "NEC does not know enough to place this activity on a preparation timeline yet.",
    };
  }

  if (candidate.readiness.status === "ready") {
    return {
      bucket: "ready-now",
      whyBucket: "The assessed readiness requirements are satisfied now.",
    };
  }

  if (candidate.preparationScope === "short") {
    return {
      bucket: "short-preparation",
      whyBucket: "The activity is not ready now, but its sourced preparation estimate is short.",
    };
  }

  if (candidate.preparationScope === "long") {
    return {
      bucket: "longer-goal",
      whyBucket: "The activity is not ready now and its sourced preparation estimate is longer-term.",
    };
  }

  return {
    bucket: "needs-information",
    whyBucket: "The readiness issue is known, but NEC does not have a sourced estimate for how much preparation it requires.",
  };
}

function rankReasons(candidate: RecommendationCandidate): string[] {
  const reasons: string[] = [];
  if (candidate.goalRelevance === "direct") reasons.push("Directly matches a saved/selected goal.");
  else if (candidate.goalRelevance === "supporting") reasons.push("Supports a saved/selected goal.");
  else reasons.push("No direct saved-goal match was supplied.");

  reasons.push(candidate.role === "primary" ? "Defined as a primary progression activity." : "Defined as an optional side activity.");
  return reasons;
}

function compare(left: RankedRecommendation, right: RankedRecommendation): number {
  const bucketDifference = BUCKET_ORDER.indexOf(left.bucket) - BUCKET_ORDER.indexOf(right.bucket);
  if (bucketDifference !== 0) return bucketDifference;
  const goalDifference = GOAL_ORDER[left.candidate.goalRelevance] - GOAL_ORDER[right.candidate.goalRelevance];
  if (goalDifference !== 0) return goalDifference;
  const roleDifference = ROLE_ORDER[left.candidate.role] - ROLE_ORDER[right.candidate.role];
  if (roleDifference !== 0) return roleDifference;
  return left.candidate.title.localeCompare(right.candidate.title) || left.candidate.id.localeCompare(right.candidate.id);
}

export function buildRecommendationBoard(candidates: readonly RecommendationCandidate[]): RecommendationBoard {
  const ids = new Set<string>();
  const ranked = candidates.map((candidate): RankedRecommendation => {
    nonEmpty(candidate.id, "Recommendation candidate id");
    nonEmpty(candidate.title, `Recommendation ${candidate.id} title`);
    if (ids.has(candidate.id)) throw new Error(`Duplicate recommendation candidate id: ${candidate.id}`);
    ids.add(candidate.id);
    const classified = bucketFor(candidate);
    return {
      candidate,
      bucket: classified.bucket,
      whyBucket: classified.whyBucket,
      rankReasons: rankReasons(candidate),
    };
  }).sort(compare);

  const buckets = Object.fromEntries(
    BUCKET_ORDER.map((bucket) => [bucket, ranked.filter((entry) => entry.bucket === bucket)]),
  ) as Record<RecommendationBucket, RankedRecommendation[]>;

  return { ranked, buckets };
}
