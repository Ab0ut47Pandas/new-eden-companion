import type { SavedGoal } from "../goals/store-core";

export type ActivityDebriefDisposition = "use-next" | "keep" | "sell" | "unknown";
export type ActivityDebriefGoalRelationship = "goal-target" | "required-input" | "activity-supply" | "supported-use";

export interface ActivityDebriefItemDelta {
  typeId: number;
  name: string;
  quantity: number;
}

export interface ActivityDebriefGoalEvidence {
  goalId: string;
  goalTitle: string;
  relationship: ActivityDebriefGoalRelationship;
  why: string;
  nextAction?: string;
}

export interface ActivityDebriefSaleEvidence {
  why: string;
  estimatedUnitValueIsk?: number;
  asOf?: number;
  source?: string;
}

export interface ActivityDebriefItemContext {
  item: ActivityDebriefItemDelta;
  goalEvidence?: readonly ActivityDebriefGoalEvidence[];
  saleEvidence?: ActivityDebriefSaleEvidence;
}

export interface ActivityDebriefItem {
  item: ActivityDebriefItemDelta;
  disposition: ActivityDebriefDisposition;
  headline: string;
  why: string;
  nextAction: string | null;
  goalEvidence: readonly ActivityDebriefGoalEvidence[];
  saleEvidence: ActivityDebriefSaleEvidence | null;
}

export interface ActivityDebriefView {
  items: readonly ActivityDebriefItem[];
  counts: Readonly<Record<ActivityDebriefDisposition, number>>;
}

const RELATIONSHIP_PRIORITY: Readonly<Record<ActivityDebriefGoalRelationship, number>> = {
  "goal-target": 0,
  "required-input": 1,
  "activity-supply": 2,
  "supported-use": 3,
};

const DISPOSITION_PRIORITY: Readonly<Record<ActivityDebriefDisposition, number>> = {
  "use-next": 0,
  keep: 1,
  sell: 2,
  unknown: 3,
};

function nonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must not be empty.`);
  return normalized;
}

function validateItem(item: ActivityDebriefItemDelta): void {
  if (!Number.isSafeInteger(item.typeId) || item.typeId <= 0) throw new Error("Debrief item type ID must be a positive integer.");
  if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new Error(`Debrief item ${item.typeId} quantity must be a positive integer.`);
  nonEmpty(item.name, `Debrief item ${item.typeId} name`);
}

function validateGoalEvidence(item: ActivityDebriefItemDelta, evidence: ActivityDebriefGoalEvidence): void {
  nonEmpty(evidence.goalId, `Debrief item ${item.typeId} goal evidence goal ID`);
  nonEmpty(evidence.goalTitle, `Debrief item ${item.typeId} goal evidence title`);
  nonEmpty(evidence.why, `Debrief item ${item.typeId} goal evidence why`);
  if (evidence.nextAction !== undefined) nonEmpty(evidence.nextAction, `Debrief item ${item.typeId} goal evidence next action`);
}

function validateSaleEvidence(item: ActivityDebriefItemDelta, evidence: ActivityDebriefSaleEvidence): void {
  nonEmpty(evidence.why, `Debrief item ${item.typeId} sale evidence why`);
  if (evidence.source !== undefined) nonEmpty(evidence.source, `Debrief item ${item.typeId} sale evidence source`);
  if (evidence.estimatedUnitValueIsk !== undefined && (!Number.isFinite(evidence.estimatedUnitValueIsk) || evidence.estimatedUnitValueIsk < 0)) {
    throw new Error(`Debrief item ${item.typeId} estimated unit value must be a non-negative finite number.`);
  }
  if (evidence.asOf !== undefined && (!Number.isSafeInteger(evidence.asOf) || evidence.asOf <= 0)) {
    throw new Error(`Debrief item ${item.typeId} sale evidence timestamp must be a positive integer.`);
  }
}

function orderedGoalEvidence(evidence: readonly ActivityDebriefGoalEvidence[]): ActivityDebriefGoalEvidence[] {
  return evidence
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) =>
      RELATIONSHIP_PRIORITY[left.entry.relationship] - RELATIONSHIP_PRIORITY[right.entry.relationship]
      || left.entry.goalTitle.localeCompare(right.entry.goalTitle)
      || left.entry.goalId.localeCompare(right.entry.goalId)
      || left.index - right.index)
    .map(({ entry }) => entry);
}

export function directGoalTargetEvidence(
  item: ActivityDebriefItemDelta,
  goals: readonly Pick<SavedGoal, "id" | "title" | "status" | "targetTypeId">[],
): ActivityDebriefGoalEvidence[] {
  validateItem(item);
  return goals
    .filter((goal) => goal.status === "active" && goal.targetTypeId === item.typeId)
    .map((goal) => ({
      goalId: goal.id,
      goalTitle: goal.title,
      relationship: "goal-target" as const,
      why: `${item.name} is the direct target of the active goal “${goal.title}”.`,
      nextAction: `Review progress for “${goal.title}”.`,
    }))
    .sort((left, right) => left.goalTitle.localeCompare(right.goalTitle) || left.goalId.localeCompare(right.goalId));
}

export function interpretActivityDebriefItem(context: ActivityDebriefItemContext): ActivityDebriefItem {
  validateItem(context.item);
  for (const evidence of context.goalEvidence ?? []) validateGoalEvidence(context.item, evidence);
  if (context.saleEvidence) validateSaleEvidence(context.item, context.saleEvidence);

  const goalEvidence = orderedGoalEvidence(context.goalEvidence ?? []);
  const actionableGoal = goalEvidence.find((evidence) => evidence.nextAction?.trim());

  if (actionableGoal) {
    return {
      item: context.item,
      disposition: "use-next",
      headline: "Useful for an active goal now.",
      why: actionableGoal.why,
      nextAction: actionableGoal.nextAction!.trim(),
      goalEvidence,
      saleEvidence: context.saleEvidence ?? null,
    };
  }

  if (goalEvidence.length > 0) {
    return {
      item: context.item,
      disposition: "keep",
      headline: "Keep for an active goal.",
      why: goalEvidence[0].why,
      nextAction: null,
      goalEvidence,
      saleEvidence: context.saleEvidence ?? null,
    };
  }

  if (context.saleEvidence) {
    return {
      item: context.item,
      disposition: "sell",
      headline: "Sell based on the supplied sale evidence.",
      why: context.saleEvidence.why,
      nextAction: null,
      goalEvidence,
      saleEvidence: context.saleEvidence,
    };
  }

  return {
    item: context.item,
    disposition: "unknown",
    headline: "No supported keep, sell, or immediate-use recommendation yet.",
    why: "NEC has no active-goal relationship or explicit sale evidence for this newly acquired item.",
    nextAction: null,
    goalEvidence,
    saleEvidence: null,
  };
}

export function buildActivityDebrief(contexts: readonly ActivityDebriefItemContext[]): ActivityDebriefView {
  const seenTypeIds = new Set<number>();
  const items = contexts.map((context) => {
    if (seenTypeIds.has(context.item.typeId)) throw new Error(`Duplicate debrief item type ID: ${context.item.typeId}`);
    seenTypeIds.add(context.item.typeId);
    return interpretActivityDebriefItem(context);
  }).sort((left, right) =>
    DISPOSITION_PRIORITY[left.disposition] - DISPOSITION_PRIORITY[right.disposition]
    || left.item.name.localeCompare(right.item.name)
    || left.item.typeId - right.item.typeId);

  const counts: Record<ActivityDebriefDisposition, number> = {
    "use-next": 0,
    keep: 0,
    sell: 0,
    unknown: 0,
  };
  for (const item of items) counts[item.disposition] += 1;

  return { items, counts };
}
