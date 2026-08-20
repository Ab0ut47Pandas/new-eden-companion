import type { ReadinessRecommendationStatus } from "@/lib/readiness/explanation";

export type CompanionUncertaintyState =
  | "ready"
  | "probably-ready"
  | "missing-requirements"
  | "cannot-verify"
  | "live-information-unavailable";

export interface CompanionUncertaintyPresentation {
  label: "Ready" | "Probably ready" | "Missing requirements" | "Cannot verify" | "Live information unavailable";
  summary: string;
  needsResolution: boolean;
}

const PRESENTATION: Readonly<Record<CompanionUncertaintyState, CompanionUncertaintyPresentation>> = {
  ready: {
    label: "Ready",
    summary: "NEC has enough supported evidence for the assessed requirements and found no known blocker in that evidence.",
    needsResolution: false,
  },
  "probably-ready": {
    label: "Probably ready",
    summary: "No hard blocker is established, but an assessed preparation gap or caution still deserves attention.",
    needsResolution: false,
  },
  "missing-requirements": {
    label: "Missing requirements",
    summary: "At least one supported requirement is currently unmet. Resolve the stated blocker before treating this as ready.",
    needsResolution: true,
  },
  "cannot-verify": {
    label: "Cannot verify",
    summary: "NEC does not currently have enough supported evidence to establish readiness. Missing information stays unknown rather than being treated as ready.",
    needsResolution: true,
  },
  "live-information-unavailable": {
    label: "Live information unavailable",
    summary: "Required live data was requested but is currently unavailable. NEC will not replace that missing live state with an assumption.",
    needsResolution: true,
  },
};

export function uncertaintyPresentation(state: CompanionUncertaintyState): CompanionUncertaintyPresentation {
  return PRESENTATION[state];
}

export function companionStateFromReadiness(status: ReadinessRecommendationStatus): CompanionUncertaintyState {
  if (status === "ready") return "ready";
  if (status === "nearly-ready") return "probably-ready";
  if (status === "not-recommended") return "missing-requirements";
  return "cannot-verify";
}
