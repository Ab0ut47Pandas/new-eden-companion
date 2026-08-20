export type AdventureIntent =
  | "combat"
  | "exploration"
  | "mining"
  | "hauling-trade"
  | "industry-building"
  | "dangerous-exploration"
  | "friend"
  | "show-me-something"
  | "adventure"
  | "make-isk";

export interface AdventureIntentOption {
  value: AdventureIntent;
  label: string;
  detail: string;
}

export const ADVENTURE_INTENT_OPTIONS: readonly AdventureIntentOption[] = [
  { value: "combat", label: "Fight someone", detail: "Look for an achievable combat direction without making you pick a fleet role first." },
  { value: "exploration", label: "Explore", detail: "Favor supported scanning and exploration directions when NEC can verify them." },
  { value: "mining", label: "Mine or gather resources", detail: "Favor supported resource-gathering directions when NEC has the evidence." },
  { value: "hauling-trade", label: "Haul or trade", detail: "Favor existing hauling, market, or movement work when readiness is otherwise comparable." },
  { value: "industry-building", label: "Build something", detail: "Favor existing industry work when NEC can support the recommendation." },
  { value: "dangerous-exploration", label: "Explore somewhere dangerous", detail: "Prefer higher-exposure exploration only after readiness; NEC never treats the route or destination as safe." },
  { value: "friend", label: "Play with a friend", detail: "Favor shared objectives without assuming either inexperienced player is the leader or a fleet specialist." },
  { value: "show-me-something", label: "Show me something", detail: "Let NEC pick from its supported options instead of requiring a career choice." },
  { value: "adventure", label: "Give me an adventure", detail: "Favor a supported change of pace without inventing readiness or live opportunities." },
  { value: "make-isk", label: "Make ISK", detail: "Favor supported economic directions without inventing profitability." },
] as const;

const ADVENTURE_INTENTS = new Set<AdventureIntent>(ADVENTURE_INTENT_OPTIONS.map((option) => option.value));

export function normalizeAdventureIntent(value: string | undefined): AdventureIntent | null {
  return value && ADVENTURE_INTENTS.has(value as AdventureIntent) ? value as AdventureIntent : null;
}

export function adventureIntentLabel(intent: AdventureIntent): string {
  return ADVENTURE_INTENT_OPTIONS.find((option) => option.value === intent)?.label ?? intent;
}
