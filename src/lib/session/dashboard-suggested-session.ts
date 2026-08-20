import type { AdviceCard, DashboardData } from "@/lib/dashboard/model";
import type { ReadinessExplanation } from "@/lib/readiness/explanation";
import {
  buildSuggestedSession,
  type SessionLengthClass,
  type SessionRiskPosture,
  type SuggestedSessionCandidate,
  type SuggestedSessionEvidenceKey,
  type SuggestedSessionEvidenceStatus,
  type SuggestedSessionPreferences,
  type SuggestedSessionResult,
} from "./suggested-session";

interface AdviceMetadata {
  activity: string;
  href?: string;
  sessionLength: SessionLengthClass;
  riskPosture: SessionRiskPosture;
  requiredEvidence: readonly SuggestedSessionEvidenceKey[];
}

const DEFAULT_METADATA: AdviceMetadata = {
  activity: "Planning",
  href: "/goals",
  sessionLength: "short",
  riskPosture: "cautious",
  requiredEvidence: ["activity-readiness"],
};

const ADVICE_METADATA: Record<string, AdviceMetadata> = {
  "empty-skill-queue": {
    activity: "Skill training",
    sessionLength: "short",
    riskPosture: "cautious",
    requiredEvidence: ["skills", "training-queue"],
  },
  "short-skill-queue": {
    activity: "Skill training",
    sessionLength: "short",
    riskPosture: "cautious",
    requiredEvidence: ["skills", "training-queue"],
  },
  "security-awareness": {
    activity: "Current-space review",
    sessionLength: "short",
    riskPosture: "balanced",
    requiredEvidence: ["current-ship", "location"],
  },
  liquidity: {
    activity: "Asset cleanup",
    href: "/assets",
    sessionLength: "short",
    riskPosture: "cautious",
    requiredEvidence: ["wallet", "owned-equipment", "market"],
  },
  "asset-concentration": {
    activity: "Hauling",
    href: "/activities/hauling",
    sessionLength: "medium",
    riskPosture: "balanced",
    requiredEvidence: ["owned-equipment", "market", "location"],
  },
  "expiring-orders": {
    activity: "Market review",
    sessionLength: "short",
    riskPosture: "cautious",
    requiredEvidence: ["market"],
  },
  "jobs-finishing": {
    activity: "Industry",
    href: "/activities/industry",
    sessionLength: "medium",
    riskPosture: "cautious",
    requiredEvidence: ["activity-readiness"],
  },
  "steady-state": DEFAULT_METADATA,
};

const EVIDENCE_LABELS: Record<SuggestedSessionEvidenceKey, readonly string[]> = {
  skills: ["skills"],
  "training-queue": ["skill queue"],
  "current-ship": ["ship", "ship type"],
  "current-fit": ["assets"],
  "owned-ships": ["assets"],
  "owned-equipment": ["assets"],
  "cargo-supplies": ["assets"],
  wallet: ["wallet"],
  market: ["market prices", "market orders"],
  location: ["location", "solar system"],
  "nearby-risk": ["solar system"],
  "activity-readiness": [],
};

function readinessForAdvice(card: AdviceCard): ReadinessExplanation {
  return {
    status: "ready",
    headline: "This next action is supported by the dashboard evidence NEC assessed.",
    why: card.evidence,
    technicalEligibility: "not-assessed",
    primaryIssue: null,
    nextAction: card.action,
    blockers: [],
    gaps: [],
    warnings: [],
    unknowns: [],
    satisfied: [],
  };
}

function evidenceCoverage(data: DashboardData): SuggestedSessionEvidenceStatus[] {
  const unavailable = new Set(data.dataQuality.unavailable.map((label) => label.toLowerCase()));
  const provenance = data.mode === "live" ? ["NEC live dashboard from ESI-visible character data"] : ["NEC demo dataset"];

  return (Object.keys(EVIDENCE_LABELS) as SuggestedSessionEvidenceKey[]).map((key) => {
    const labels = EVIDENCE_LABELS[key];
    const blockedBy = labels.find((label) => unavailable.has(label));
    if (!blockedBy) {
      return { key, availability: "available" as const, provenance };
    }
    return {
      key,
      availability: "unavailable" as const,
      detail: `${blockedBy} data is unavailable, so NEC cannot verify this part of the recommendation.`,
      provenance,
      resolveAction: "Refresh the dashboard; if the data remains unavailable, reconnect the character and review EVE SSO permissions.",
    };
  });
}

function candidateForAdvice(card: AdviceCard, data: DashboardData): SuggestedSessionCandidate | null {
  if (card.id === "partial-data") return null;
  const metadata = ADVICE_METADATA[card.id] ?? DEFAULT_METADATA;
  const provenance = data.mode === "live"
    ? ["NEC dashboard advisor", `Dashboard fetched ${data.fetchedAt}`]
    : ["NEC demo dashboard advisor"];

  return {
    id: `dashboard-${card.id}`,
    activity: metadata.activity,
    title: card.title,
    href: metadata.href,
    readiness: readinessForAdvice(card),
    goalRelevance: "none",
    sessionLength: metadata.sessionLength,
    riskPosture: metadata.riskPosture,
    requiredEvidence: metadata.requiredEvidence,
    preparation: [card.summary],
    missingRequirements: [],
    missingItems: [],
    nextAction: card.action,
    evidence: [card.evidence],
    provenance,
  };
}

export function buildDashboardSuggestedSession(
  data: DashboardData,
  preferences: SuggestedSessionPreferences = { sessionLength: "any", risk: "any" },
): SuggestedSessionResult {
  const candidates = data.advice
    .map((card) => candidateForAdvice(card, data))
    .filter((candidate): candidate is SuggestedSessionCandidate => candidate !== null);

  return buildSuggestedSession({
    candidates,
    evidence: evidenceCoverage(data),
    preferences,
  });
}
