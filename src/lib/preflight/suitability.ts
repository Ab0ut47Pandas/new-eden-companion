import type { DamageType } from "@/lib/fitting/core";

export type SuitabilitySeverity = "blocker" | "improvement" | "unknown";

export interface SuitabilityFinding {
  id: string;
  severity: SuitabilitySeverity;
  title: string;
  detail: string;
  evidence: readonly string[];
  provenance: readonly string[];
}

export interface RequiredFitEvidence {
  id: string;
  label: string;
  required: boolean;
  fitted: boolean | null;
  online: boolean | null;
  provenance: readonly string[];
}

export interface DamageChoiceEvidence {
  expectedDamageTypes: readonly DamageType[] | null;
  selectedDamageTypes: readonly DamageType[] | null;
  expectationReason?: string;
  provenance: readonly string[];
}

export interface OwnedShipCandidateEvidence {
  shipId: string;
  shipName: string;
  accessible: boolean | null;
  suitability: "better" | "not-better" | "unknown";
  reason?: string;
  provenance: readonly string[];
}

export interface PreflightSuitabilityInput {
  fitRequirements?: readonly RequiredFitEvidence[];
  damageChoice?: DamageChoiceEvidence | null;
  ownedShipCandidates?: readonly OwnedShipCandidateEvidence[];
}

export interface PreflightSuitabilityResult {
  blockers: SuitabilityFinding[];
  improvements: SuitabilityFinding[];
  unknowns: SuitabilityFinding[];
  suggestedOwnedShip: OwnedShipCandidateEvidence | null;
}

function requireProvenance(label: string, provenance: readonly string[]): void {
  if (provenance.length === 0) throw new Error(`${label} requires provenance`);
}

function fitFindings(requirements: readonly RequiredFitEvidence[]): SuitabilityFinding[] {
  const findings: SuitabilityFinding[] = [];

  for (const requirement of requirements) {
    requireProvenance(`Fit requirement ${requirement.id}`, requirement.provenance);
    if (!requirement.required) continue;

    if (requirement.fitted === false) {
      findings.push({
        id: `fit-${requirement.id}-missing`,
        severity: "blocker",
        title: `${requirement.label} is required but not fitted`,
        detail: "The supplied activity requirement explicitly marks this fitted capability as required.",
        evidence: [`${requirement.label}: not fitted`],
        provenance: requirement.provenance,
      });
      continue;
    }

    if (requirement.fitted == null) {
      findings.push({
        id: `fit-${requirement.id}-unknown`,
        severity: "unknown",
        title: `Cannot verify ${requirement.label} is fitted`,
        detail: "NEC will not convert missing fit evidence into readiness.",
        evidence: [`${requirement.label}: fitted state unknown`],
        provenance: requirement.provenance,
      });
      continue;
    }

    if (requirement.online === false) {
      findings.push({
        id: `fit-${requirement.id}-offline`,
        severity: "blocker",
        title: `${requirement.label} is required but established offline`,
        detail: "The required capability is fitted, but the supplied evidence explicitly establishes that it is offline.",
        evidence: [`${requirement.label}: fitted, offline`],
        provenance: requirement.provenance,
      });
    } else if (requirement.online == null) {
      findings.push({
        id: `fit-${requirement.id}-online-unknown`,
        severity: "unknown",
        title: `Confirm ${requirement.label} is online in EVE`,
        detail: "Fitted state alone does not establish current online state. Confirm this in the fitting window before relying on it.",
        evidence: [`${requirement.label}: fitted; online state unknown`],
        provenance: requirement.provenance,
      });
    }
  }

  return findings;
}

function damageFindings(choice: DamageChoiceEvidence | null | undefined): SuitabilityFinding[] {
  if (!choice) return [];
  requireProvenance("Damage choice evidence", choice.provenance);

  if (!choice.expectedDamageTypes || !choice.selectedDamageTypes) {
    return [{
      id: "damage-choice-unknown",
      severity: "unknown",
      title: "Cannot verify the damage choice",
      detail: "NEC needs both a sourced activity damage expectation and supported evidence for the selected damage type before judging the choice.",
      evidence: [
        choice.expectedDamageTypes ? `Expected: ${choice.expectedDamageTypes.join(", ")}` : "Expected damage types: unknown",
        choice.selectedDamageTypes ? `Selected: ${choice.selectedDamageTypes.join(", ")}` : "Selected damage types: unknown",
      ],
      provenance: choice.provenance,
    }];
  }

  const overlaps = choice.selectedDamageTypes.some((type) => choice.expectedDamageTypes?.includes(type));
  if (overlaps) return [];

  return [{
    id: "damage-choice-mismatch",
    severity: "improvement",
    title: "The selected damage does not match the established activity expectation",
    detail: choice.expectationReason ?? "A sourced activity expectation favors a different damage type. This is an efficiency warning, not a claim that the activity is impossible.",
    evidence: [
      `Expected: ${choice.expectedDamageTypes.join(", ")}`,
      `Selected: ${choice.selectedDamageTypes.join(", ")}`,
    ],
    provenance: choice.provenance,
  }];
}

function chooseOwnedShip(candidates: readonly OwnedShipCandidateEvidence[]): OwnedShipCandidateEvidence | null {
  for (const candidate of candidates) {
    requireProvenance(`Owned ship candidate ${candidate.shipId}`, candidate.provenance);
  }

  return candidates.find((candidate) => candidate.accessible === true && candidate.suitability === "better") ?? null;
}

export function evaluatePreflightSuitability(input: PreflightSuitabilityInput): PreflightSuitabilityResult {
  const findings = [
    ...fitFindings(input.fitRequirements ?? []),
    ...damageFindings(input.damageChoice),
  ];

  return {
    blockers: findings.filter((finding) => finding.severity === "blocker"),
    improvements: findings.filter((finding) => finding.severity === "improvement"),
    unknowns: findings.filter((finding) => finding.severity === "unknown"),
    suggestedOwnedShip: chooseOwnedShip(input.ownedShipCandidates ?? []),
  };
}
