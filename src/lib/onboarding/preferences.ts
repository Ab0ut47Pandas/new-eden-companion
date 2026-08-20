import type {
  SessionLengthPreference,
  SessionRiskPreference,
  SuggestedSessionPreferences,
} from "@/lib/session/suggested-session";
import { normalizeAdventureIntent } from "./intents";

export const ONBOARDING_COMPLETE_COOKIE = "nec_onboarding_complete";
export const SESSION_LENGTH_COOKIE = "nec_session_length";
export const SESSION_RISK_COOKIE = "nec_session_risk";
export const ADVENTURE_INTENT_COOKIE = "nec_adventure_intent";

const SESSION_LENGTHS = new Set<SessionLengthPreference>(["short", "medium", "long", "any"]);
const SESSION_RISKS = new Set<SessionRiskPreference>(["cautious", "balanced", "adventurous", "any"]);

export function normalizeSessionLength(value: string | undefined): SessionLengthPreference {
  return value && SESSION_LENGTHS.has(value as SessionLengthPreference)
    ? value as SessionLengthPreference
    : "any";
}

export function normalizeSessionRisk(value: string | undefined): SessionRiskPreference {
  return value && SESSION_RISKS.has(value as SessionRiskPreference)
    ? value as SessionRiskPreference
    : "any";
}

export function onboardingPreferences(input: {
  sessionLength?: string;
  risk?: string;
  intent?: string;
}): SuggestedSessionPreferences {
  return {
    sessionLength: normalizeSessionLength(input.sessionLength),
    risk: normalizeSessionRisk(input.risk),
    intent: normalizeAdventureIntent(input.intent),
  };
}

export function onboardingComplete(value: string | undefined): boolean {
  return value === "1";
}
