import type { AdventureIntent } from "@/lib/onboarding/intents";
import type { GoalRelevance } from "@/lib/readiness/recommender";
import type { ReadinessExplanation } from "@/lib/readiness/explanation";

export type SessionLengthPreference = "short" | "medium" | "long" | "any";
export type SessionRiskPreference = "cautious" | "balanced" | "adventurous" | "any";
export type SessionLengthClass = Exclude<SessionLengthPreference, "any">;
export type SessionRiskPosture = Exclude<SessionRiskPreference, "any">;

export type SuggestedSessionEvidenceKey =
  | "skills"
  | "training-queue"
  | "current-ship"
  | "current-fit"
  | "owned-ships"
  | "owned-equipment"
  | "cargo-supplies"
  | "wallet"
  | "market"
  | "location"
  | "nearby-risk"
  | "activity-readiness";

export type EvidenceAvailability = "available" | "unavailable" | "not-requested";

export interface SuggestedSessionEvidenceStatus {
  key: SuggestedSessionEvidenceKey;
  availability: EvidenceAvailability;
  detail?: string;
  provenance?: readonly string[];
  resolveAction?: string;
}

export interface SupportedShipChoice {
  typeId?: number;
  name: string;
  owned: boolean | "unknown";
  accessible: boolean | "unknown";
  suitability: "supported" | "unknown";
  why?: string;
  provenance: readonly string[];
}

export interface SuggestedSessionCandidate {
  id: string;
  activity: string;
  title: string;
  href?: string;
  readiness: ReadinessExplanation;
  goalRelevance: GoalRelevance;
  sessionLength: SessionLengthClass;
  riskPosture: SessionRiskPosture;
  adventureIntents?: readonly AdventureIntent[];
  requiredEvidence: readonly SuggestedSessionEvidenceKey[];
  shipChoices?: readonly SupportedShipChoice[];
  preparation?: readonly string[];
  missingRequirements?: readonly string[];
  missingItems?: readonly string[];
  nextAction: string;
  evidence: readonly string[];
  provenance: readonly string[];
}

export interface SuggestedSessionPreferences {
  sessionLength: SessionLengthPreference;
  risk: SessionRiskPreference;
  intent?: AdventureIntent | null;
}

export interface SuggestedSessionInput {
  candidates: readonly SuggestedSessionCandidate[];
  evidence: readonly SuggestedSessionEvidenceStatus[];
  preferences: SuggestedSessionPreferences;
}

export type SuggestedSessionState =
  | "ready"
  | "probably-ready"
  | "missing-requirements"
  | "cannot-verify"
  | "live-information-unavailable";

export interface SuggestedSessionRecommendation {
  candidateId: string;
  activity: string;
  title: string;
  href?: string;
  state: SuggestedSessionState;
  ship: SupportedShipChoice | null;
  preparation: readonly string[];
  sessionLength: SessionLengthClass;
  riskPosture: SessionRiskPosture;
  missingRequirements: readonly string[];
  missingItems: readonly string[];
  nextAction: string;
  why: readonly string[];
  evidence: readonly string[];
  provenance: readonly string[];
  unknowns: readonly string[];
  resolveUnknowns: readonly string[];
}

export interface SuggestedSessionResult {
  primary: SuggestedSessionRecommendation | null;
  alternatives: readonly SuggestedSessionRecommendation[];
  ranked: readonly SuggestedSessionRecommendation[];
  evidenceCoverage: readonly SuggestedSessionEvidenceStatus[];
}

const STATE_ORDER: Record<SuggestedSessionState, number> = {
  ready: 0,
  "probably-ready": 1,
  "missing-requirements": 2,
  "cannot-verify": 3,
  "live-information-unavailable": 4,
};

const GOAL_ORDER: Record<GoalRelevance, number> = {
  direct: 0,
  supporting: 1,
  none: 2,
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function evidenceMap(evidence: readonly SuggestedSessionEvidenceStatus[]): Map<SuggestedSessionEvidenceKey, SuggestedSessionEvidenceStatus> {
  const map = new Map<SuggestedSessionEvidenceKey, SuggestedSessionEvidenceStatus>();
  for (const entry of evidence) {
    if (map.has(entry.key)) throw new Error(`Duplicate Suggested Session evidence key: ${entry.key}`);
    map.set(entry.key, entry);
  }
  return map;
}

function missingRequiredEvidence(
  candidate: SuggestedSessionCandidate,
  coverage: Map<SuggestedSessionEvidenceKey, SuggestedSessionEvidenceStatus>,
): SuggestedSessionEvidenceStatus[] {
  return candidate.requiredEvidence
    .map((key) => coverage.get(key) ?? { key, availability: "not-requested" as const })
    .filter((entry) => entry.availability !== "available");
}

function chooseSupportedShip(choices: readonly SupportedShipChoice[] | undefined): SupportedShipChoice | null {
  if (!choices?.length) return null;
  return [...choices].sort((left, right) => {
    const leftRank = Number(left.suitability !== "supported") * 4 + Number(left.owned !== true) * 2 + Number(left.accessible !== true);
    const rightRank = Number(right.suitability !== "supported") * 4 + Number(right.owned !== true) * 2 + Number(right.accessible !== true);
    return leftRank - rightRank || left.name.localeCompare(right.name);
  })[0] ?? null;
}

function stateFor(candidate: SuggestedSessionCandidate, missingEvidence: readonly SuggestedSessionEvidenceStatus[]): SuggestedSessionState {
  if (missingEvidence.length) {
    const liveUnavailable = missingEvidence.some((entry) => entry.availability === "unavailable");
    return liveUnavailable ? "live-information-unavailable" : "cannot-verify";
  }
  if (candidate.readiness.status === "unknown") return "cannot-verify";
  if (candidate.readiness.status === "not-recommended") return "missing-requirements";
  if (candidate.readiness.status === "nearly-ready") return "probably-ready";
  return "ready";
}

function lengthMismatch(candidate: SuggestedSessionCandidate, preference: SessionLengthPreference): number {
  if (preference === "any" || candidate.sessionLength === preference) return 0;
  const order: SessionLengthClass[] = ["short", "medium", "long"];
  return Math.abs(order.indexOf(candidate.sessionLength) - order.indexOf(preference));
}

function riskMismatch(candidate: SuggestedSessionCandidate, preference: SessionRiskPreference): number {
  if (preference === "any" || candidate.riskPosture === preference) return 0;
  const order: SessionRiskPosture[] = ["cautious", "balanced", "adventurous"];
  return Math.abs(order.indexOf(candidate.riskPosture) - order.indexOf(preference));
}

function intentMismatch(candidate: SuggestedSessionCandidate, intent: AdventureIntent | null | undefined): number {
  if (!intent || intent === "show-me-something" || intent === "adventure") return 0;
  return candidate.adventureIntents?.includes(intent) ? 0 : 1;
}

function preferenceReasons(candidate: SuggestedSessionCandidate, preferences: SuggestedSessionPreferences): string[] {
  const reasons: string[] = [];
  if (preferences.intent) {
    if (preferences.intent === "show-me-something" || preferences.intent === "adventure") {
      reasons.push("You asked NEC to choose an experience, so intent does not narrow the supported candidate set.");
    } else if (candidate.adventureIntents?.includes(preferences.intent)) {
      reasons.push("Matches the kind of experience you said sounds fun.");
    } else {
      reasons.push("This supported option does not directly match your selected adventure intent; a matching option ranks ahead only when readiness and saved-goal relevance are otherwise equal.");
    }
  }
  if (preferences.sessionLength !== "any") {
    reasons.push(candidate.sessionLength === preferences.sessionLength
      ? `Matches your ${preferences.sessionLength} session-length preference.`
      : `This is a ${candidate.sessionLength} session; you asked for ${preferences.sessionLength}, so closer verified options rank ahead when available.`);
  }
  if (preferences.risk !== "any") {
    reasons.push(candidate.riskPosture === preferences.risk
      ? `Matches your ${preferences.risk} risk preference.`
      : `This uses a ${candidate.riskPosture} risk posture; you asked for ${preferences.risk}, so closer verified options rank ahead when available.`);
  }
  return reasons;
}

function toRecommendation(
  candidate: SuggestedSessionCandidate,
  coverage: Map<SuggestedSessionEvidenceKey, SuggestedSessionEvidenceStatus>,
  preferences: SuggestedSessionPreferences,
): SuggestedSessionRecommendation {
  if (!candidate.id.trim()) throw new Error("Suggested Session candidate id must not be empty.");
  if (!candidate.activity.trim()) throw new Error(`Suggested Session candidate ${candidate.id} activity must not be empty.`);
  if (!candidate.title.trim()) throw new Error(`Suggested Session candidate ${candidate.id} title must not be empty.`);
  if (!candidate.nextAction.trim()) throw new Error(`Suggested Session candidate ${candidate.id} nextAction must not be empty.`);
  if (!candidate.evidence.some((entry) => entry.trim())) throw new Error(`Suggested Session candidate ${candidate.id} requires evidence.`);
  if (!candidate.provenance.length) throw new Error(`Suggested Session candidate ${candidate.id} requires provenance.`);

  const missingEvidence = missingRequiredEvidence(candidate, coverage);
  const readinessUnknowns = candidate.readiness.unknowns.map((finding) => finding.summary);
  const unknowns = unique([
    ...missingEvidence.map((entry) => entry.detail || `${entry.key} evidence is ${entry.availability}`),
    ...readinessUnknowns,
  ]);
  const resolveUnknowns = unique([
    ...missingEvidence.map((entry) => entry.resolveAction || `Refresh or reconnect to resolve ${entry.key} evidence.`),
    ...candidate.readiness.unknowns.map((finding) => candidate.readiness.nextAction || `Verify: ${finding.summary}`),
  ]);
  const ship = chooseSupportedShip(candidate.shipChoices);
  const why = unique([
    candidate.goalRelevance === "direct"
      ? "Directly supports a selected or saved goal."
      : candidate.goalRelevance === "supporting"
        ? "Supports a selected or saved goal."
        : "No direct saved-goal match was supplied.",
    candidate.readiness.why,
    ship?.why ?? "",
    ...preferenceReasons(candidate, preferences),
  ]);

  return {
    candidateId: candidate.id,
    activity: candidate.activity,
    title: candidate.title,
    href: candidate.href,
    state: stateFor(candidate, missingEvidence),
    ship,
    preparation: unique(candidate.preparation ?? []),
    sessionLength: candidate.sessionLength,
    riskPosture: candidate.riskPosture,
    missingRequirements: unique([
      ...(candidate.missingRequirements ?? []),
      ...candidate.readiness.blockers.map((finding) => finding.summary),
      ...candidate.readiness.gaps.map((finding) => finding.summary),
    ]),
    missingItems: unique(candidate.missingItems ?? []),
    nextAction: candidate.readiness.nextAction || candidate.nextAction,
    why,
    evidence: unique(candidate.evidence),
    provenance: unique([
      ...candidate.provenance,
      ...candidate.requiredEvidence.flatMap((key) => coverage.get(key)?.provenance ?? []),
      ...(ship?.provenance ?? []),
    ]),
    unknowns,
    resolveUnknowns,
  };
}

export function buildSuggestedSession(input: SuggestedSessionInput): SuggestedSessionResult {
  const coverage = evidenceMap(input.evidence);
  const ids = new Set<string>();

  const ranked = input.candidates.map((candidate) => {
    if (ids.has(candidate.id)) throw new Error(`Duplicate Suggested Session candidate id: ${candidate.id}`);
    ids.add(candidate.id);
    return { candidate, recommendation: toRecommendation(candidate, coverage, input.preferences) };
  }).sort((left, right) => {
    const state = STATE_ORDER[left.recommendation.state] - STATE_ORDER[right.recommendation.state];
    if (state !== 0) return state;
    const goal = GOAL_ORDER[left.candidate.goalRelevance] - GOAL_ORDER[right.candidate.goalRelevance];
    if (goal !== 0) return goal;
    const intent = intentMismatch(left.candidate, input.preferences.intent) - intentMismatch(right.candidate, input.preferences.intent);
    if (intent !== 0) return intent;
    const length = lengthMismatch(left.candidate, input.preferences.sessionLength) - lengthMismatch(right.candidate, input.preferences.sessionLength);
    if (length !== 0) return length;
    const risk = riskMismatch(left.candidate, input.preferences.risk) - riskMismatch(right.candidate, input.preferences.risk);
    if (risk !== 0) return risk;
    return left.candidate.title.localeCompare(right.candidate.title) || left.candidate.id.localeCompare(right.candidate.id);
  }).map((entry) => entry.recommendation);

  return {
    primary: ranked[0] ?? null,
    alternatives: ranked.slice(1, 3),
    ranked,
    evidenceCoverage: input.evidence,
  };
}
