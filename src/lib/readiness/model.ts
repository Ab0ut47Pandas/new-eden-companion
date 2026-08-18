export const READINESS_DIMENSIONS = [
  "skills",
  "ship-fit",
  "supplies",
  "isk",
  "replacement-capacity",
  "location-access",
  "experience",
  "knowledge-preparation",
] as const;

export type ReadinessDimensionKey = (typeof READINESS_DIMENSIONS)[number];

export interface ReadinessDimensionDefinition {
  key: ReadinessDimensionKey;
  label: string;
  question: string;
}

export const READINESS_DIMENSION_DEFINITIONS: Readonly<Record<ReadinessDimensionKey, ReadinessDimensionDefinition>> = {
  skills: {
    key: "skills",
    label: "Skills",
    question: "Do the trained skills meet the hard requirements and the meaningful performance recommendations?",
  },
  "ship-fit": {
    key: "ship-fit",
    label: "Ship & fit",
    question: "Can the selected hull/fit enter the activity, and is it suitable for the intended job?",
  },
  supplies: {
    key: "supplies",
    label: "Supplies",
    question: "Are the required charges, drones, consumables, cargo, tools, and other run supplies available?",
  },
  isk: {
    key: "isk",
    label: "ISK",
    question: "Can the character pay the immediate acquisition or entry cost?",
  },
  "replacement-capacity": {
    key: "replacement-capacity",
    label: "Replacement capacity",
    question: "Can the character absorb a plausible loss while preserving the configured financial reserve?",
  },
  "location-access": {
    key: "location-access",
    label: "Location & access",
    question: "Can the character actually reach and access the activity, site, facility, gate, or required location?",
  },
  experience: {
    key: "experience",
    label: "Experience",
    question: "Has the player explicitly established the practice or prior milestones that matter for this activity?",
  },
  "knowledge-preparation": {
    key: "knowledge-preparation",
    label: "Knowledge & preparation",
    question: "Does the player have the important briefing, mechanics, failure conditions, and preparation checklist?",
  },
};

export type ReadinessRequirementKind = "hard" | "soft" | "context";
export type ReadinessFindingState = "met" | "caution" | "unmet" | "unknown" | "not-applicable";
export type ReadinessEvidenceSource = "esi" | "sde" | "curated" | "user" | "derived";

export interface ReadinessEvidence {
  source: ReadinessEvidenceSource;
  label: string;
  detail?: string;
}

export interface ReadinessFinding {
  id: string;
  dimension: ReadinessDimensionKey;
  requirement: ReadinessRequirementKind;
  state: ReadinessFindingState;
  summary: string;
  why: string;
  evidence?: readonly ReadinessEvidence[];
}

export type ReadinessDimensionStatus =
  | "not-assessed"
  | "ready"
  | "caution"
  | "needs-work"
  | "blocked"
  | "unknown"
  | "not-applicable";

export interface ReadinessDimensionAssessment {
  dimension: ReadinessDimensionKey;
  definition: ReadinessDimensionDefinition;
  status: ReadinessDimensionStatus;
  findings: readonly ReadinessFinding[];
}

export type TechnicalEligibilityStatus = "not-assessed" | "eligible" | "blocked" | "unknown";

export interface TechnicalEligibilityAssessment {
  status: TechnicalEligibilityStatus;
  hardRequirements: readonly ReadinessFinding[];
  blockers: readonly ReadinessFinding[];
  unknowns: readonly ReadinessFinding[];
}

export interface ReadinessSnapshot {
  technicalEligibility: TechnicalEligibilityAssessment;
  dimensions: readonly ReadinessDimensionAssessment[];
  findings: readonly ReadinessFinding[];
}

const DIMENSION_INDEX = new Map<ReadinessDimensionKey, number>(
  READINESS_DIMENSIONS.map((dimension, index) => [dimension, index]),
);

function nonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`Readiness finding ${field} must not be empty.`);
  return normalized;
}

export function validateReadinessFindings(findings: readonly ReadinessFinding[]): void {
  const ids = new Set<string>();
  for (const finding of findings) {
    nonEmpty(finding.id, "id");
    nonEmpty(finding.summary, "summary");
    nonEmpty(finding.why, "why");
    if (ids.has(finding.id)) throw new Error(`Duplicate readiness finding id: ${finding.id}`);
    ids.add(finding.id);
    for (const evidence of finding.evidence ?? []) nonEmpty(evidence.label, "evidence label");
  }
}

function dimensionStatus(findings: readonly ReadinessFinding[]): ReadinessDimensionStatus {
  if (findings.length === 0) return "not-assessed";
  const relevant = findings.filter((finding) => finding.state !== "not-applicable");
  if (relevant.length === 0) return "not-applicable";
  if (relevant.some((finding) => finding.requirement === "hard" && finding.state === "unmet")) return "blocked";
  if (relevant.some((finding) => finding.requirement !== "context" && finding.state === "unmet")) return "needs-work";
  if (relevant.some((finding) => finding.state === "unknown")) return "unknown";
  if (relevant.some((finding) => finding.state === "caution")) return "caution";
  if (relevant.every((finding) => finding.state === "met" || finding.requirement === "context")) return "ready";
  return "caution";
}

function technicalEligibility(findings: readonly ReadinessFinding[]): TechnicalEligibilityAssessment {
  const hardRequirements = findings.filter(
    (finding) => finding.requirement === "hard" && finding.state !== "not-applicable",
  );
  const blockers = hardRequirements.filter((finding) => finding.state === "unmet");
  const unknowns = hardRequirements.filter((finding) => finding.state === "unknown");

  let status: TechnicalEligibilityStatus;
  if (hardRequirements.length === 0) status = "not-assessed";
  else if (blockers.length > 0) status = "blocked";
  else if (unknowns.length > 0) status = "unknown";
  else status = "eligible";

  return { status, hardRequirements, blockers, unknowns };
}

export function buildReadinessSnapshot(input: readonly ReadinessFinding[]): ReadinessSnapshot {
  validateReadinessFindings(input);
  const findings = [...input].sort((left, right) => {
    const dimensionDifference = (DIMENSION_INDEX.get(left.dimension) ?? 999) - (DIMENSION_INDEX.get(right.dimension) ?? 999);
    if (dimensionDifference !== 0) return dimensionDifference;
    return left.id.localeCompare(right.id);
  });

  const dimensions = READINESS_DIMENSIONS.map((dimension): ReadinessDimensionAssessment => {
    const matching = findings.filter((finding) => finding.dimension === dimension);
    return {
      dimension,
      definition: READINESS_DIMENSION_DEFINITIONS[dimension],
      status: dimensionStatus(matching),
      findings: matching,
    };
  });

  return {
    technicalEligibility: technicalEligibility(findings),
    dimensions,
    findings,
  };
}
