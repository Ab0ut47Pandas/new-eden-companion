export type StockpileNeedKind = "goal-material" | "activity-supply" | "fit-supply" | "user-stockpile";
export type StockpileRecommendationStatus = "shortfall" | "stockpile" | "covered" | "unquantified-use" | "unassigned";

export interface StockpileAsset {
  typeId: number;
  name: string;
  ownedQuantity: number;
}

export interface StockpileNeed {
  kind: StockpileNeedKind;
  sourceId: string;
  sourceTitle: string;
  typeId: number;
  typeName: string;
  active: boolean;
  reason: string;
  targetQuantity?: number;
}

export interface StockpileEvidence {
  kind: StockpileNeedKind;
  sourceId: string;
  sourceTitle: string;
  reason: string;
  targetQuantity: number | null;
}

export interface StockpileRecommendation {
  asset: StockpileAsset;
  status: StockpileRecommendationStatus;
  headline: string;
  why: string;
  deliberate: boolean;
  targetQuantity: number | null;
  reservedQuantity: number | null;
  shortfallQuantity: number | null;
  excessToKnownNeedQuantity: number | null;
  evidence: readonly StockpileEvidence[];
}

const KIND_PRIORITY: Readonly<Record<StockpileNeedKind, number>> = {
  "goal-material": 0,
  "activity-supply": 1,
  "fit-supply": 2,
  "user-stockpile": 3,
};

const STATUS_PRIORITY: Readonly<Record<StockpileRecommendationStatus, number>> = {
  shortfall: 0,
  stockpile: 1,
  covered: 2,
  "unquantified-use": 3,
  unassigned: 4,
};

function requireNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must not be empty.`);
  return normalized;
}

function validatePositiveTypeId(typeId: number, label: string): void {
  if (!Number.isSafeInteger(typeId) || typeId <= 0) throw new Error(`${label} must be a positive integer.`);
}

function validateAsset(asset: StockpileAsset): void {
  validatePositiveTypeId(asset.typeId, "Asset type ID");
  requireNonEmpty(asset.name, `Asset ${asset.typeId} name`);
  if (!Number.isSafeInteger(asset.ownedQuantity) || asset.ownedQuantity < 0) {
    throw new Error(`Asset ${asset.typeId} owned quantity must be a non-negative integer.`);
  }
}

function validateNeed(need: StockpileNeed): void {
  validatePositiveTypeId(need.typeId, "Stockpile need type ID");
  requireNonEmpty(need.typeName, `Stockpile need ${need.typeId} type name`);
  requireNonEmpty(need.sourceId, `Stockpile need ${need.typeId} source ID`);
  requireNonEmpty(need.sourceTitle, `Stockpile need ${need.typeId} source title`);
  requireNonEmpty(need.reason, `Stockpile need ${need.typeId} reason`);
  if (need.targetQuantity !== undefined && (!Number.isSafeInteger(need.targetQuantity) || need.targetQuantity <= 0)) {
    throw new Error(`Stockpile need ${need.typeId} target quantity must be a positive integer when supplied.`);
  }
}

function orderEvidence(evidence: readonly StockpileEvidence[]): StockpileEvidence[] {
  return evidence
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) =>
      KIND_PRIORITY[left.entry.kind] - KIND_PRIORITY[right.entry.kind]
      || left.entry.sourceTitle.localeCompare(right.entry.sourceTitle)
      || left.entry.sourceId.localeCompare(right.entry.sourceId)
      || left.index - right.index)
    .map(({ entry }) => entry);
}

export function recommendStockpile(
  asset: StockpileAsset,
  needs: readonly StockpileNeed[],
): StockpileRecommendation {
  validateAsset(asset);
  needs.forEach(validateNeed);

  const relevant = needs.filter((need) => need.active && need.typeId === asset.typeId);
  const evidence = orderEvidence(relevant.map((need) => ({
    kind: need.kind,
    sourceId: need.sourceId,
    sourceTitle: need.sourceTitle,
    reason: need.reason,
    targetQuantity: need.targetQuantity ?? null,
  })));

  if (evidence.length === 0) {
    return {
      asset,
      status: "unassigned",
      headline: "No deliberate stockpile use is established.",
      why: "NEC found no active goal, activity, fitting supply, or explicit user stockpile target for this item. That makes it unassigned inventory, not automatically junk or a sell recommendation.",
      deliberate: false,
      targetQuantity: null,
      reservedQuantity: null,
      shortfallQuantity: null,
      excessToKnownNeedQuantity: null,
      evidence,
    };
  }

  const quantified = evidence.filter((entry) => entry.targetQuantity !== null);
  if (quantified.length === 0) {
    return {
      asset,
      status: "unquantified-use",
      headline: "Useful, but NEC does not know how much to stockpile.",
      why: evidence[0].reason,
      deliberate: true,
      targetQuantity: null,
      reservedQuantity: null,
      shortfallQuantity: null,
      excessToKnownNeedQuantity: null,
      evidence,
    };
  }

  const targetQuantity = quantified.reduce((total, entry) => total + (entry.targetQuantity ?? 0), 0);
  const reservedQuantity = Math.min(asset.ownedQuantity, targetQuantity);
  const shortfallQuantity = Math.max(targetQuantity - asset.ownedQuantity, 0);
  const excessToKnownNeedQuantity = Math.max(asset.ownedQuantity - targetQuantity, 0);

  if (shortfallQuantity > 0) {
    return {
      asset,
      status: "shortfall",
      headline: `Stockpile shortfall: ${shortfallQuantity.toLocaleString()} more needed.`,
      why: evidence[0].reason,
      deliberate: true,
      targetQuantity,
      reservedQuantity,
      shortfallQuantity,
      excessToKnownNeedQuantity,
      evidence,
    };
  }

  if (excessToKnownNeedQuantity > 0) {
    return {
      asset,
      status: "stockpile",
      headline: `${targetQuantity.toLocaleString()} reserved for known uses; ${excessToKnownNeedQuantity.toLocaleString()} is beyond the known target.`,
      why: "The reserved quantity has explicit active-use evidence. Quantity beyond the known target is only excess to these recorded needs; NEC does not automatically classify it as junk or safe to sell.",
      deliberate: true,
      targetQuantity,
      reservedQuantity,
      shortfallQuantity,
      excessToKnownNeedQuantity,
      evidence,
    };
  }

  return {
    asset,
    status: "covered",
    headline: "Known stockpile target is covered.",
    why: evidence[0].reason,
    deliberate: true,
    targetQuantity,
    reservedQuantity,
    shortfallQuantity,
    excessToKnownNeedQuantity,
    evidence,
  };
}

export function recommendStockpiles(
  assets: readonly StockpileAsset[],
  needs: readonly StockpileNeed[],
): StockpileRecommendation[] {
  const seen = new Set<number>();
  const recommendations = assets.map((asset) => {
    if (seen.has(asset.typeId)) throw new Error(`Duplicate stockpile asset type ID: ${asset.typeId}`);
    seen.add(asset.typeId);
    return recommendStockpile(asset, needs);
  });

  return recommendations.sort((left, right) =>
    STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status]
    || left.asset.name.localeCompare(right.asset.name)
    || left.asset.typeId - right.asset.typeId);
}
