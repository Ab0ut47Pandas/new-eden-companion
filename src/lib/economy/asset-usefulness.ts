import type { SavedGoal } from "../goals/store-core";

export type AssetUsefulnessDisposition = "goal-critical" | "keep" | "sell-candidate" | "unknown";
export type AssetUsefulnessRelationship = "goal-target" | "manufacturing-input" | "activity-supply" | "fit-component";

export interface OwnedAssetSummary {
  typeId: number;
  name: string;
  quantity: number;
}

export interface AssetManufacturingDependency {
  goalId: string;
  goalTitle: string;
  goalStatus: "active" | "completed";
  productTypeId: number;
  productName: string;
  materialTypeId: number;
  requiredQuantity: number;
}

export interface AssetActivityUse {
  activityId: string;
  activityTitle: string;
  status: "active" | "inactive";
  typeId: number;
  why: string;
}

export interface AssetFitRecommendationUse {
  fitId: string;
  fitName: string;
  shipName: string;
  typeId: number;
  recommended: boolean;
  role: "hull" | "module" | "charge" | "drone" | "consumable";
}

export interface AssetSaleEvidence {
  why: string;
  estimatedUnitValueIsk?: number;
  asOf?: number;
  source?: string;
}

export interface AssetUsefulnessEvidence {
  relationship: AssetUsefulnessRelationship;
  sourceId: string;
  sourceTitle: string;
  why: string;
  requiredQuantity: number | null;
}

export interface AssetUsefulnessContext {
  asset: OwnedAssetSummary;
  goals?: readonly Pick<SavedGoal, "id" | "title" | "status" | "targetTypeId">[];
  manufacturingDependencies?: readonly AssetManufacturingDependency[];
  activities?: readonly AssetActivityUse[];
  fitRecommendations?: readonly AssetFitRecommendationUse[];
  saleEvidence?: AssetSaleEvidence;
}

export interface AssetUsefulnessClassification {
  asset: OwnedAssetSummary;
  disposition: AssetUsefulnessDisposition;
  headline: string;
  why: string;
  evidence: readonly AssetUsefulnessEvidence[];
  saleEvidence: AssetSaleEvidence | null;
}

const RELATIONSHIP_PRIORITY: Readonly<Record<AssetUsefulnessRelationship, number>> = {
  "goal-target": 0,
  "manufacturing-input": 1,
  "activity-supply": 2,
  "fit-component": 3,
};

const DISPOSITION_PRIORITY: Readonly<Record<AssetUsefulnessDisposition, number>> = {
  "goal-critical": 0,
  keep: 1,
  "sell-candidate": 2,
  unknown: 3,
};

function nonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must not be empty.`);
  return normalized;
}

function validateAsset(asset: OwnedAssetSummary): void {
  if (!Number.isSafeInteger(asset.typeId) || asset.typeId <= 0) throw new Error("Asset type ID must be a positive integer.");
  if (!Number.isSafeInteger(asset.quantity) || asset.quantity <= 0) throw new Error(`Asset ${asset.typeId} quantity must be a positive integer.`);
  nonEmpty(asset.name, `Asset ${asset.typeId} name`);
}

function validateSaleEvidence(asset: OwnedAssetSummary, evidence: AssetSaleEvidence): void {
  nonEmpty(evidence.why, `Asset ${asset.typeId} sale evidence why`);
  if (evidence.source !== undefined) nonEmpty(evidence.source, `Asset ${asset.typeId} sale evidence source`);
  if (evidence.estimatedUnitValueIsk !== undefined && (!Number.isFinite(evidence.estimatedUnitValueIsk) || evidence.estimatedUnitValueIsk < 0)) {
    throw new Error(`Asset ${asset.typeId} estimated unit value must be a non-negative finite number.`);
  }
  if (evidence.asOf !== undefined && (!Number.isSafeInteger(evidence.asOf) || evidence.asOf <= 0)) {
    throw new Error(`Asset ${asset.typeId} sale evidence timestamp must be a positive integer.`);
  }
}

function directGoalEvidence(
  asset: OwnedAssetSummary,
  goals: readonly Pick<SavedGoal, "id" | "title" | "status" | "targetTypeId">[],
): AssetUsefulnessEvidence[] {
  return goals
    .filter((goal) => goal.status === "active" && goal.targetTypeId === asset.typeId)
    .map((goal) => ({
      relationship: "goal-target" as const,
      sourceId: goal.id,
      sourceTitle: goal.title,
      why: `${asset.name} is the direct target of the active goal “${goal.title}”.`,
      requiredQuantity: null,
    }));
}

function manufacturingEvidence(
  asset: OwnedAssetSummary,
  dependencies: readonly AssetManufacturingDependency[],
): AssetUsefulnessEvidence[] {
  return dependencies
    .filter((dependency) => dependency.goalStatus === "active" && dependency.materialTypeId === asset.typeId)
    .map((dependency) => ({
      relationship: "manufacturing-input" as const,
      sourceId: dependency.goalId,
      sourceTitle: dependency.goalTitle,
      why: `${asset.name} is a recorded manufacturing input for ${dependency.productName}, which supports the active goal “${dependency.goalTitle}”.`,
      requiredQuantity: dependency.requiredQuantity,
    }));
}

function activityEvidence(asset: OwnedAssetSummary, activities: readonly AssetActivityUse[]): AssetUsefulnessEvidence[] {
  return activities
    .filter((activity) => activity.status === "active" && activity.typeId === asset.typeId)
    .map((activity) => ({
      relationship: "activity-supply" as const,
      sourceId: activity.activityId,
      sourceTitle: activity.activityTitle,
      why: nonEmpty(activity.why, `Asset ${asset.typeId} activity-use reason`),
      requiredQuantity: null,
    }));
}

function fitEvidence(asset: OwnedAssetSummary, fits: readonly AssetFitRecommendationUse[]): AssetUsefulnessEvidence[] {
  return fits
    .filter((fit) => fit.recommended && fit.typeId === asset.typeId)
    .map((fit) => ({
      relationship: "fit-component" as const,
      sourceId: fit.fitId,
      sourceTitle: `${fit.shipName} — ${fit.fitName}`,
      why: `${asset.name} is a ${fit.role} in the recommended ${fit.shipName} fitting “${fit.fitName}”.`,
      requiredQuantity: null,
    }));
}

function orderedEvidence(evidence: readonly AssetUsefulnessEvidence[]): AssetUsefulnessEvidence[] {
  return evidence
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) =>
      RELATIONSHIP_PRIORITY[left.entry.relationship] - RELATIONSHIP_PRIORITY[right.entry.relationship]
      || left.entry.sourceTitle.localeCompare(right.entry.sourceTitle)
      || left.entry.sourceId.localeCompare(right.entry.sourceId)
      || left.index - right.index)
    .map(({ entry }) => entry);
}

export function classifyAssetUsefulness(context: AssetUsefulnessContext): AssetUsefulnessClassification {
  validateAsset(context.asset);
  if (context.saleEvidence) validateSaleEvidence(context.asset, context.saleEvidence);

  const evidence = orderedEvidence([
    ...directGoalEvidence(context.asset, context.goals ?? []),
    ...manufacturingEvidence(context.asset, context.manufacturingDependencies ?? []),
    ...activityEvidence(context.asset, context.activities ?? []),
    ...fitEvidence(context.asset, context.fitRecommendations ?? []),
  ]);

  const goalEvidence = evidence.find((entry) => entry.relationship === "goal-target" || entry.relationship === "manufacturing-input");
  if (goalEvidence) {
    return {
      asset: context.asset,
      disposition: "goal-critical",
      headline: "Goal-critical: keep this item.",
      why: goalEvidence.why,
      evidence,
      saleEvidence: context.saleEvidence ?? null,
    };
  }

  const practicalUse = evidence[0];
  if (practicalUse) {
    return {
      asset: context.asset,
      disposition: "keep",
      headline: "Useful for an active activity or recommended fit.",
      why: practicalUse.why,
      evidence,
      saleEvidence: context.saleEvidence ?? null,
    };
  }

  if (context.saleEvidence) {
    return {
      asset: context.asset,
      disposition: "sell-candidate",
      headline: "No supported use found; sale evidence exists.",
      why: context.saleEvidence.why,
      evidence,
      saleEvidence: context.saleEvidence,
    };
  }

  return {
    asset: context.asset,
    disposition: "unknown",
    headline: "Usefulness is not established yet.",
    why: "NEC found no active goal, manufacturing dependency, active-activity use, recommended-fit use, or explicit sale evidence for this item. It is not safe to recommend selling it yet.",
    evidence,
    saleEvidence: null,
  };
}

export function classifyOwnedAssets(contexts: readonly AssetUsefulnessContext[]): AssetUsefulnessClassification[] {
  const seenTypeIds = new Set<number>();
  return contexts
    .map((context) => {
      if (seenTypeIds.has(context.asset.typeId)) throw new Error(`Duplicate asset type ID: ${context.asset.typeId}`);
      seenTypeIds.add(context.asset.typeId);
      return classifyAssetUsefulness(context);
    })
    .sort((left, right) =>
      DISPOSITION_PRIORITY[left.disposition] - DISPOSITION_PRIORITY[right.disposition]
      || left.asset.name.localeCompare(right.asset.name)
      || left.asset.typeId - right.asset.typeId);
}
