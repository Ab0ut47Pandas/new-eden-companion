import type { PreflightCheck } from "./checker";
import type { PreflightSuitabilityResult, SuitabilityFinding } from "./suitability";

export type FinalPreflightState = "blocked" | "cannot-verify" | "complete";

export interface FinalPreflightSummary {
  state: FinalPreflightState;
  title: string;
  subtitle: string;
  detail: string;
  blockers: Array<PreflightCheck | SuitabilityFinding>;
  improvements: Array<PreflightCheck | SuitabilityFinding>;
  unknowns: Array<PreflightCheck | SuitabilityFinding>;
  pendingManual: PreflightCheck[];
}

export interface FinalPreflightSummaryInput {
  checks: readonly PreflightCheck[];
  confirmedManualIds?: ReadonlySet<string>;
  suitability?: PreflightSuitabilityResult | null;
}

export function summarizePreflight(input: FinalPreflightSummaryInput): FinalPreflightSummary {
  const confirmedManualIds = input.confirmedManualIds ?? new Set<string>();
  const suitability = input.suitability;

  const blockers: Array<PreflightCheck | SuitabilityFinding> = [
    ...input.checks.filter((check) => check.status === "danger"),
    ...(suitability?.blockers ?? []),
  ];
  const improvements: Array<PreflightCheck | SuitabilityFinding> = [
    ...input.checks.filter((check) => check.status === "warning"),
    ...(suitability?.improvements ?? []),
  ];
  const unknowns: Array<PreflightCheck | SuitabilityFinding> = [
    ...input.checks.filter((check) => check.status === "unknown"),
    ...(suitability?.unknowns ?? []),
  ];
  const pendingManual = input.checks.filter(
    (check) => check.status === "manual" && !confirmedManualIds.has(check.id),
  );

  if (blockers.length > 0) {
    return {
      state: "blocked",
      title: "Missing requirements",
      subtitle: `${blockers.length} known blocker${blockers.length === 1 ? "" : "s"}`,
      detail: "Resolve the known blockers before treating this activity setup as complete. Improvements and unknowns remain separate below.",
      blockers,
      improvements,
      unknowns,
      pendingManual,
    };
  }

  if (unknowns.length > 0 || pendingManual.length > 0) {
    return {
      state: "cannot-verify",
      title: "Cannot verify",
      subtitle: "No known blockers in the evidence NEC can verify",
      detail: "Required evidence or in-game confirmation is still missing. NEC will not turn that uncertainty into a readiness claim.",
      blockers,
      improvements,
      unknowns,
      pendingManual,
    };
  }

  return {
    state: "complete",
    title: "Preflight complete",
    subtitle: "No known blockers",
    detail: improvements.length > 0
      ? "No known blockers were found in supported evidence. Review the non-fatal improvements before you go; this is not a safety guarantee."
      : "No known blockers were found in supported evidence. This is not a safety guarantee, and NEC cannot see live threats or piloting state.",
    blockers,
    improvements,
    unknowns,
    pendingManual,
  };
}
