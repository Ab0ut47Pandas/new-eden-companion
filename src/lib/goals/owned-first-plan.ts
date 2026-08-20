export type FocusedGoalKind = "activity" | "ship" | "fitting" | "skill";

export type FocusedRequirementKind =
  | "skill"
  | "hull"
  | "module"
  | "rig"
  | "charge"
  | "drone"
  | "consumable"
  | "material"
  | "blueprint";

export type RequirementCoverageStatus = "covered" | "partial" | "missing" | "unknown";

export interface FocusedGoalTarget {
  kind: FocusedGoalKind;
  key: string;
  title: string;
  typeId?: number | null;
}

export interface FocusedGoalRequirement {
  id: string;
  kind: FocusedRequirementKind;
  title: string;
  reason: string;
  typeId?: number | null;
  quantity?: number | null;
  requiredLevel?: number | null;
}

export interface OwnedQuantityEvidence {
  typeId: number;
  accessibleQuantity: number;
  inaccessibleQuantity?: number;
}

export interface TrainedSkillEvidence {
  typeId: number;
  trainedLevel: number;
}

export interface OwnedFirstPlanInput {
  goal: FocusedGoalTarget;
  requirements: readonly FocusedGoalRequirement[];
  ownedItems: readonly OwnedQuantityEvidence[] | null;
  trainedSkills: readonly TrainedSkillEvidence[] | null;
  ownershipProvenance: readonly string[];
  skillProvenance: readonly string[];
}

export interface FocusedRequirementCoverage {
  requirement: FocusedGoalRequirement;
  status: RequirementCoverageStatus;
  requiredQuantity: number | null;
  accessibleOwnedQuantity: number | null;
  inaccessibleOwnedQuantity: number | null;
  missingQuantity: number | null;
  requiredLevel: number | null;
  trainedLevel: number | null;
  explanation: string;
}

export interface OwnedFirstGoalPlan {
  goal: FocusedGoalTarget;
  covered: readonly FocusedRequirementCoverage[];
  uncovered: readonly FocusedRequirementCoverage[];
  unknown: readonly FocusedRequirementCoverage[];
  all: readonly FocusedRequirementCoverage[];
  provenance: readonly string[];
}

function positiveInteger(value: number | null | undefined): number | null {
  return Number.isSafeInteger(value) && (value ?? 0) > 0 ? value! : null;
}

function normalizeGoal(goal: FocusedGoalTarget): FocusedGoalTarget {
  const key = goal.key.trim();
  const title = goal.title.trim();
  if (!key) throw new Error("Goal key is required.");
  if (!title) throw new Error("Goal title is required.");
  if (goal.typeId != null && positiveInteger(goal.typeId) == null) throw new Error("Goal type ID must be a positive integer when supplied.");
  return { ...goal, key, title };
}

function normalizeRequirement(requirement: FocusedGoalRequirement): FocusedGoalRequirement {
  const id = requirement.id.trim();
  const title = requirement.title.trim();
  const reason = requirement.reason.trim();
  if (!id) throw new Error("Requirement id is required.");
  if (!title) throw new Error(`Requirement ${id} title is required.`);
  if (!reason) throw new Error(`Requirement ${id} parent reason is required.`);
  if (requirement.typeId != null && positiveInteger(requirement.typeId) == null) {
    throw new Error(`Requirement ${id} type ID must be a positive integer when supplied.`);
  }
  if (requirement.quantity != null && positiveInteger(requirement.quantity) == null) {
    throw new Error(`Requirement ${id} quantity must be a positive integer when supplied.`);
  }
  if (requirement.requiredLevel != null && (!Number.isInteger(requirement.requiredLevel) || requirement.requiredLevel < 0 || requirement.requiredLevel > 5)) {
    throw new Error(`Requirement ${id} skill level must be between 0 and 5.`);
  }
  if (requirement.kind === "skill" && positiveInteger(requirement.typeId) == null) {
    throw new Error(`Skill requirement ${id} needs a resolved skill type ID.`);
  }
  return { ...requirement, id, title, reason };
}

function itemCoverage(
  requirement: FocusedGoalRequirement,
  ownedItems: readonly OwnedQuantityEvidence[] | null,
): FocusedRequirementCoverage {
  const requiredQuantity = positiveInteger(requirement.quantity) ?? 1;
  if (positiveInteger(requirement.typeId) == null || ownedItems == null) {
    return {
      requirement,
      status: "unknown",
      requiredQuantity,
      accessibleOwnedQuantity: null,
      inaccessibleOwnedQuantity: null,
      missingQuantity: null,
      requiredLevel: null,
      trainedLevel: null,
      explanation: positiveInteger(requirement.typeId) == null
        ? "NEC does not have a resolved type ID for this requirement, so ownership cannot be established."
        : "Character asset coverage is unavailable, so NEC will not treat this requirement as missing or owned.",
    };
  }

  const evidence = ownedItems.find((entry) => entry.typeId === requirement.typeId);
  const accessible = Math.max(0, Math.trunc(evidence?.accessibleQuantity ?? 0));
  const inaccessible = Math.max(0, Math.trunc(evidence?.inaccessibleQuantity ?? 0));
  const missing = Math.max(0, requiredQuantity - accessible);

  if (missing === 0) {
    return {
      requirement,
      status: "covered",
      requiredQuantity,
      accessibleOwnedQuantity: accessible,
      inaccessibleOwnedQuantity: inaccessible,
      missingQuantity: 0,
      requiredLevel: null,
      trainedLevel: null,
      explanation: `Already covered by ${accessible} accessible owned item${accessible === 1 ? "" : "s"}.`,
    };
  }

  if (accessible > 0 || inaccessible > 0) {
    const inaccessibleNote = inaccessible > 0 ? ` ${inaccessible} more are visible but not established as accessible.` : "";
    return {
      requirement,
      status: "partial",
      requiredQuantity,
      accessibleOwnedQuantity: accessible,
      inaccessibleOwnedQuantity: inaccessible,
      missingQuantity: missing,
      requiredLevel: null,
      trainedLevel: null,
      explanation: `${accessible}/${requiredQuantity} required units are established as accessible; ${missing} remain uncovered.${inaccessibleNote}`,
    };
  }

  return {
    requirement,
    status: "missing",
    requiredQuantity,
    accessibleOwnedQuantity: 0,
    inaccessibleOwnedQuantity: 0,
    missingQuantity: requiredQuantity,
    requiredLevel: null,
    trainedLevel: null,
    explanation: `No accessible owned quantity is established for the ${requiredQuantity} required unit${requiredQuantity === 1 ? "" : "s"}.`,
  };
}

function skillCoverage(
  requirement: FocusedGoalRequirement,
  trainedSkills: readonly TrainedSkillEvidence[] | null,
): FocusedRequirementCoverage {
  const requiredLevel = requirement.requiredLevel ?? 1;
  if (trainedSkills == null) {
    return {
      requirement,
      status: "unknown",
      requiredQuantity: null,
      accessibleOwnedQuantity: null,
      inaccessibleOwnedQuantity: null,
      missingQuantity: null,
      requiredLevel,
      trainedLevel: null,
      explanation: "Character skill coverage is unavailable, so NEC will not assume this skill is trained or missing.",
    };
  }

  const trainedLevel = trainedSkills.find((entry) => entry.typeId === requirement.typeId)?.trainedLevel ?? 0;
  if (trainedLevel >= requiredLevel) {
    return {
      requirement,
      status: "covered",
      requiredQuantity: null,
      accessibleOwnedQuantity: null,
      inaccessibleOwnedQuantity: null,
      missingQuantity: null,
      requiredLevel,
      trainedLevel,
      explanation: `Already trained to level ${trainedLevel}; level ${requiredLevel} is required.`,
    };
  }

  return {
    requirement,
    status: "missing",
    requiredQuantity: null,
    accessibleOwnedQuantity: null,
    inaccessibleOwnedQuantity: null,
    missingQuantity: null,
    requiredLevel,
    trainedLevel,
    explanation: `Trained to level ${trainedLevel}; level ${requiredLevel} is required.`,
  };
}

export function buildOwnedFirstGoalPlan(input: OwnedFirstPlanInput): OwnedFirstGoalPlan {
  const goal = normalizeGoal(input.goal);
  const seen = new Set<string>();
  const requirements = input.requirements.map(normalizeRequirement);
  for (const requirement of requirements) {
    if (seen.has(requirement.id)) throw new Error(`Duplicate requirement id: ${requirement.id}`);
    seen.add(requirement.id);
  }

  const all = requirements.map((requirement) => requirement.kind === "skill"
    ? skillCoverage(requirement, input.trainedSkills)
    : itemCoverage(requirement, input.ownedItems));

  const covered = all.filter((entry) => entry.status === "covered");
  const uncovered = all.filter((entry) => entry.status === "partial" || entry.status === "missing");
  const unknown = all.filter((entry) => entry.status === "unknown");
  const provenance = [...new Set([...input.ownershipProvenance, ...input.skillProvenance].map((value) => value.trim()).filter(Boolean))];

  return { goal, covered, uncovered, unknown, all, provenance };
}
