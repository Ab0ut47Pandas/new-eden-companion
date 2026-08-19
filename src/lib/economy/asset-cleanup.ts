export type AssetCleanupDisposition = "goal-critical" | "keep" | "use-soon" | "sell" | "haul" | "unknown";

export type IntrinsicPreservationKind =
  | "researched-bpo"
  | "useful-bpc"
  | "hard-to-reacquire"
  | "limited-source"
  | "allocated"
  | "fitted"
  | "user-protected"
  | "rarity-uncertain"
  | "source-uncertain"
  | "replaceability-uncertain";

export interface IntrinsicPreservationEvidence {
  kind: IntrinsicPreservationKind;
  reason: string;
}

export interface AssetCleanupInput {
  itemId: number;
  typeId: number;
  name: string;
  quantity: number;
  location: string;
  estimatedValueIsk?: number;
  goalCriticalReason?: string;
  useSoonReason?: string;
  stockpileReason?: string;
  intrinsicPreservation?: readonly IntrinsicPreservationEvidence[];
  sellEvidence?: {
    reason: string;
    replaceable: boolean;
    liquidMarket: boolean;
  };
  haulEvidence?: {
    reason: string;
    recommended: boolean;
  };
}

export interface AssetCleanupDecision {
  itemId: number;
  typeId: number;
  name: string;
  quantity: number;
  location: string;
  estimatedValueIsk: number | null;
  disposition: AssetCleanupDisposition;
  headline: string;
  reason: string;
  protected: boolean;
  preservationEvidence: readonly IntrinsicPreservationEvidence[];
}

const DISPOSITION_PRIORITY: Readonly<Record<AssetCleanupDisposition, number>> = {
  "goal-critical": 0,
  keep: 1,
  "use-soon": 2,
  haul: 3,
  sell: 4,
  unknown: 5,
};

const PRESERVATION_PRIORITY: Readonly<Record<IntrinsicPreservationKind, number>> = {
  "researched-bpo": 0,
  "useful-bpc": 1,
  "hard-to-reacquire": 2,
  "limited-source": 3,
  allocated: 4,
  fitted: 5,
  "user-protected": 6,
  "rarity-uncertain": 7,
  "source-uncertain": 8,
  "replaceability-uncertain": 9,
};

function nonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must not be empty.`);
  return normalized;
}

function validate(input: AssetCleanupInput): void {
  if (!Number.isSafeInteger(input.itemId) || input.itemId <= 0) throw new Error("Asset cleanup item ID must be a positive integer.");
  if (!Number.isSafeInteger(input.typeId) || input.typeId <= 0) throw new Error("Asset cleanup type ID must be a positive integer.");
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) throw new Error(`Asset ${input.itemId} quantity must be a positive integer.`);
  nonEmpty(input.name, `Asset ${input.itemId} name`);
  nonEmpty(input.location, `Asset ${input.itemId} location`);
  if (input.estimatedValueIsk !== undefined && (!Number.isFinite(input.estimatedValueIsk) || input.estimatedValueIsk < 0)) {
    throw new Error(`Asset ${input.itemId} estimated value must be non-negative when supplied.`);
  }
  for (const evidence of input.intrinsicPreservation ?? []) nonEmpty(evidence.reason, `Asset ${input.itemId} preservation reason`);
  if (input.goalCriticalReason !== undefined) nonEmpty(input.goalCriticalReason, `Asset ${input.itemId} goal-critical reason`);
  if (input.useSoonReason !== undefined) nonEmpty(input.useSoonReason, `Asset ${input.itemId} use-soon reason`);
  if (input.stockpileReason !== undefined) nonEmpty(input.stockpileReason, `Asset ${input.itemId} stockpile reason`);
  if (input.sellEvidence) nonEmpty(input.sellEvidence.reason, `Asset ${input.itemId} sell evidence reason`);
  if (input.haulEvidence) nonEmpty(input.haulEvidence.reason, `Asset ${input.itemId} haul evidence reason`);
}

function orderPreservation(evidence: readonly IntrinsicPreservationEvidence[]): IntrinsicPreservationEvidence[] {
  return [...evidence].sort((left, right) =>
    PRESERVATION_PRIORITY[left.kind] - PRESERVATION_PRIORITY[right.kind]
    || left.reason.localeCompare(right.reason));
}

function preservationHeadline(kind: IntrinsicPreservationKind): string {
  switch (kind) {
    case "researched-bpo": return "Keep — researched blueprint";
    case "useful-bpc": return "Keep — useful blueprint copy";
    case "hard-to-reacquire": return "Keep — hard to reacquire";
    case "limited-source": return "Keep — limited source";
    case "allocated": return "Keep — already allocated";
    case "fitted": return "Keep — fitted or installed";
    case "user-protected": return "Keep — protected by you";
    case "rarity-uncertain": return "Review — rarity uncertain";
    case "source-uncertain": return "Review — source uncertain";
    case "replaceability-uncertain": return "Review — replaceability uncertain";
  }
}

function preservationIsUnknown(kind: IntrinsicPreservationKind): boolean {
  return kind === "rarity-uncertain" || kind === "source-uncertain" || kind === "replaceability-uncertain";
}

export function classifyAssetCleanup(input: AssetCleanupInput): AssetCleanupDecision {
  validate(input);
  const preservation = orderPreservation(input.intrinsicPreservation ?? []);
  const base = {
    itemId: input.itemId,
    typeId: input.typeId,
    name: input.name.trim(),
    quantity: input.quantity,
    location: input.location.trim(),
    estimatedValueIsk: input.estimatedValueIsk ?? null,
    preservationEvidence: preservation,
  };

  if (input.goalCriticalReason) {
    return { ...base, disposition: "goal-critical", headline: "Goal-critical", reason: input.goalCriticalReason.trim(), protected: true };
  }

  const protective = preservation.find((entry) => !preservationIsUnknown(entry.kind));
  if (protective) {
    return { ...base, disposition: "keep", headline: preservationHeadline(protective.kind), reason: protective.reason.trim(), protected: true };
  }

  if (input.stockpileReason) {
    return { ...base, disposition: "keep", headline: "Stockpile — known use", reason: input.stockpileReason.trim(), protected: true };
  }

  if (input.useSoonReason) {
    return { ...base, disposition: "use-soon", headline: "Use soon", reason: input.useSoonReason.trim(), protected: true };
  }

  const uncertainty = preservation[0];
  if (uncertainty) {
    return { ...base, disposition: "unknown", headline: preservationHeadline(uncertainty.kind), reason: uncertainty.reason.trim(), protected: true };
  }

  if (input.haulEvidence?.recommended) {
    return { ...base, disposition: "haul", headline: "Haul — supported move", reason: input.haulEvidence.reason.trim(), protected: false };
  }

  if (input.sellEvidence?.replaceable && input.sellEvidence.liquidMarket) {
    return { ...base, disposition: "sell", headline: "Sell — replaceable", reason: input.sellEvidence.reason.trim(), protected: false };
  }

  return {
    ...base,
    disposition: "unknown",
    headline: "Review — not enough evidence",
    reason: "NEC cannot establish that this item is disposable, replaceable, or safe to sell. Unknown rarity, source, or replaceability stays review-only.",
    protected: true,
  };
}

export function buildAssetCleanupView(inputs: readonly AssetCleanupInput[]): AssetCleanupDecision[] {
  const seen = new Set<number>();
  const decisions = inputs.map((input) => {
    if (seen.has(input.itemId)) throw new Error(`Duplicate cleanup asset item ID ${input.itemId}.`);
    seen.add(input.itemId);
    return classifyAssetCleanup(input);
  });
  return decisions.sort((left, right) =>
    DISPOSITION_PRIORITY[left.disposition] - DISPOSITION_PRIORITY[right.disposition]
    || (right.estimatedValueIsk ?? -1) - (left.estimatedValueIsk ?? -1)
    || left.name.localeCompare(right.name)
    || left.itemId - right.itemId);
}
