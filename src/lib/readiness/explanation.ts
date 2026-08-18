import type {
  ReadinessFinding,
  ReadinessSnapshot,
  TechnicalEligibilityStatus,
} from "./model";

export type ReadinessRecommendationStatus =
  | "ready"
  | "nearly-ready"
  | "not-recommended"
  | "unknown";

export interface ReadinessActionHint {
  findingId: string;
  action: string;
}

export interface ReadinessExplanation {
  status: ReadinessRecommendationStatus;
  headline: string;
  why: string;
  technicalEligibility: TechnicalEligibilityStatus;
  primaryIssue: ReadinessFinding | null;
  nextAction: string | null;
  blockers: readonly ReadinessFinding[];
  warnings: readonly ReadinessFinding[];
  unknowns: readonly ReadinessFinding[];
  satisfied: readonly ReadinessFinding[];
}

function findingPriority(finding: ReadinessFinding): number {
  if (finding.requirement === "hard" && finding.state === "unmet") return 0;
  if (finding.requirement === "hard" && finding.state === "unknown") return 1;
  if (finding.requirement !== "context" && finding.state === "unmet") return 2;
  if (finding.state === "unknown") return 3;
  if (finding.state === "caution") return 4;
  return 99;
}

function actionableFindings(snapshot: ReadinessSnapshot): ReadinessFinding[] {
  return snapshot.findings
    .filter((finding) => findingPriority(finding) < 99)
    .map((finding, index) => ({ finding, index }))
    .sort((left, right) => findingPriority(left.finding) - findingPriority(right.finding) || left.index - right.index)
    .map(({ finding }) => finding);
}

function classify(snapshot: ReadinessSnapshot): ReadinessRecommendationStatus {
  if (snapshot.technicalEligibility.status === "blocked") return "not-recommended";
  if (snapshot.technicalEligibility.status === "unknown" || snapshot.technicalEligibility.status === "not-assessed") return "unknown";

  const relevant = snapshot.findings.filter((finding) => finding.state !== "not-applicable");
  if (relevant.some((finding) => finding.state === "unknown")) return "unknown";
  if (relevant.some((finding) => finding.requirement !== "context" && finding.state === "unmet")) return "nearly-ready";
  if (relevant.some((finding) => finding.state === "caution")) return "nearly-ready";
  return "ready";
}

function defaultAction(finding: ReadinessFinding | null): string | null {
  if (!finding) return null;
  if (finding.state === "unknown") return `Verify: ${finding.summary}`;
  if (finding.state === "unmet") return `Resolve: ${finding.summary}`;
  if (finding.state === "caution") return `Review: ${finding.summary}`;
  return null;
}

function headline(status: ReadinessRecommendationStatus): string {
  if (status === "ready") return "Ready based on the requirements NEC assessed.";
  if (status === "nearly-ready") return "Nearly ready — address the remaining preparation gap first.";
  if (status === "not-recommended") return "Not recommended yet — a hard requirement is blocking this activity.";
  return "Readiness is uncertain because required information is missing or has not been assessed.";
}

function why(status: ReadinessRecommendationStatus, primary: ReadinessFinding | null): string {
  if (primary) {
    if (status === "not-recommended") return `A hard requirement is unmet: ${primary.summary}. ${primary.why}`;
    if (status === "nearly-ready") return `The most important remaining preparation issue is: ${primary.summary}. ${primary.why}`;
    if (status === "unknown") return `NEC cannot establish the answer yet because: ${primary.summary}. ${primary.why}`;
  }
  if (status === "ready") return "Every assessed applicable requirement is met, and the hard technical entry requirements that were evaluated are satisfied.";
  if (status === "unknown") return "NEC has not assessed enough hard entry information to make a confident readiness recommendation.";
  return "The assessed readiness state requires further attention before starting.";
}

export function explainReadiness(
  snapshot: ReadinessSnapshot,
  options: { actionHints?: readonly ReadinessActionHint[] } = {},
): ReadinessExplanation {
  const status = classify(snapshot);
  const actionable = actionableFindings(snapshot);
  const primaryIssue = actionable[0] ?? null;
  const hints = new Map((options.actionHints ?? []).map((hint) => [hint.findingId, hint.action.trim()]));
  const hintedAction = primaryIssue ? hints.get(primaryIssue.id) : undefined;

  const blockers = snapshot.findings.filter((finding) => finding.state === "unmet");
  const warnings = snapshot.findings.filter((finding) => finding.state === "caution");
  const unknowns = snapshot.findings.filter((finding) => finding.state === "unknown");
  const satisfied = snapshot.findings.filter((finding) => finding.state === "met");

  return {
    status,
    headline: headline(status),
    why: why(status, primaryIssue),
    technicalEligibility: snapshot.technicalEligibility.status,
    primaryIssue,
    nextAction: hintedAction || defaultAction(primaryIssue),
    blockers,
    warnings,
    unknowns,
    satisfied,
  };
}
