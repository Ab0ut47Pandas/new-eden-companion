import type {
  ReadinessDimensionKey,
  ReadinessEvidence,
  ReadinessFinding,
  ReadinessFindingState,
  ReadinessRequirementKind,
} from "./model";

export type ActivityRole = "primary" | "side";
export type ActivityRequirementStrength = "hard" | "soft";

interface ActivityRequirementBase {
  id: string;
  strength: ActivityRequirementStrength;
  label: string;
  why: string;
}

export interface ActivitySkillRequirement extends ActivityRequirementBase {
  kind: "skill";
  skillTypeId: number;
  level: number;
}

export interface ActivityShipConstraintRequirement extends ActivityRequirementBase {
  kind: "ship-constraint";
  allowedTypeIds?: readonly number[];
  allowedGroupIds?: readonly number[];
  deniedTypeIds?: readonly number[];
  constraintKey?: string;
}

export interface ActivitySupplyRequirement extends ActivityRequirementBase {
  kind: "supply";
  typeId: number;
  quantity: number;
}

export interface ActivityIskRequirement extends ActivityRequirementBase {
  kind: "isk";
  amountIsk: number;
}

export interface ActivityReplacementRequirement extends ActivityRequirementBase {
  kind: "replacement-capacity";
  policyKey: string;
}

export interface ActivityAccessRequirement extends ActivityRequirementBase {
  kind: "location-access";
  accessKey: string;
}

export interface ActivityMilestoneRequirement extends ActivityRequirementBase {
  kind: "milestone";
  milestoneKey: string;
}

export interface ActivityKnowledgeRequirement extends ActivityRequirementBase {
  kind: "knowledge";
  knowledgeKey: string;
}

export interface ActivityDependencyRequirement extends ActivityRequirementBase {
  kind: "activity";
  activityId: string;
}

export type ActivityRequirement =
  | ActivitySkillRequirement
  | ActivityShipConstraintRequirement
  | ActivitySupplyRequirement
  | ActivityIskRequirement
  | ActivityReplacementRequirement
  | ActivityAccessRequirement
  | ActivityMilestoneRequirement
  | ActivityKnowledgeRequirement
  | ActivityDependencyRequirement;

export interface ActivityDefinition {
  id: string;
  title: string;
  description?: string;
  role: ActivityRole;
  requirements: readonly ActivityRequirement[];
}

export interface ActivityRequirementResult {
  requirementId: string;
  state: ReadinessFindingState;
  summary?: string;
  why?: string;
  evidence?: readonly ReadinessEvidence[];
}

const REQUIREMENT_DIMENSION: Readonly<Record<ActivityRequirement["kind"], ReadinessDimensionKey>> = {
  skill: "skills",
  "ship-constraint": "ship-fit",
  supply: "supplies",
  isk: "isk",
  "replacement-capacity": "replacement-capacity",
  "location-access": "location-access",
  milestone: "experience",
  knowledge: "knowledge-preparation",
  activity: "experience",
};

function nonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must not be empty.`);
  return normalized;
}

function positiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer.`);
}

function nonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative finite number.`);
}

function validateRequirement(requirement: ActivityRequirement): void {
  nonEmpty(requirement.id, "Activity requirement id");
  nonEmpty(requirement.label, `Requirement ${requirement.id} label`);
  nonEmpty(requirement.why, `Requirement ${requirement.id} why`);

  if (requirement.kind === "skill") {
    positiveInteger(requirement.skillTypeId, `Requirement ${requirement.id} skill type id`);
    if (!Number.isInteger(requirement.level) || requirement.level < 0 || requirement.level > 5) {
      throw new Error(`Requirement ${requirement.id} skill level must be an integer from 0 to 5.`);
    }
  } else if (requirement.kind === "ship-constraint") {
    const lists = [requirement.allowedTypeIds, requirement.allowedGroupIds, requirement.deniedTypeIds];
    for (const list of lists) for (const id of list ?? []) positiveInteger(id, `Requirement ${requirement.id} ship constraint id`);
    if (!(requirement.allowedTypeIds?.length || requirement.allowedGroupIds?.length || requirement.deniedTypeIds?.length || requirement.constraintKey?.trim())) {
      throw new Error(`Requirement ${requirement.id} ship constraint must declare at least one deterministic constraint.`);
    }
  } else if (requirement.kind === "supply") {
    positiveInteger(requirement.typeId, `Requirement ${requirement.id} supply type id`);
    positiveInteger(requirement.quantity, `Requirement ${requirement.id} supply quantity`);
  } else if (requirement.kind === "isk") {
    nonNegativeFinite(requirement.amountIsk, `Requirement ${requirement.id} ISK amount`);
  } else if (requirement.kind === "replacement-capacity") {
    nonEmpty(requirement.policyKey, `Requirement ${requirement.id} replacement policy key`);
  } else if (requirement.kind === "location-access") {
    nonEmpty(requirement.accessKey, `Requirement ${requirement.id} access key`);
  } else if (requirement.kind === "milestone") {
    nonEmpty(requirement.milestoneKey, `Requirement ${requirement.id} milestone key`);
  } else if (requirement.kind === "knowledge") {
    nonEmpty(requirement.knowledgeKey, `Requirement ${requirement.id} knowledge key`);
  } else if (requirement.kind === "activity") {
    nonEmpty(requirement.activityId, `Requirement ${requirement.id} activity id`);
  }
}

export function validateActivityDefinitions(activities: readonly ActivityDefinition[]): void {
  const activityIds = new Set<string>();
  for (const activity of activities) {
    nonEmpty(activity.id, "Activity id");
    nonEmpty(activity.title, `Activity ${activity.id} title`);
    if (activityIds.has(activity.id)) throw new Error(`Duplicate activity id: ${activity.id}`);
    activityIds.add(activity.id);

    const requirementIds = new Set<string>();
    for (const requirement of activity.requirements) {
      validateRequirement(requirement);
      if (requirementIds.has(requirement.id)) throw new Error(`Duplicate requirement id ${requirement.id} in activity ${activity.id}`);
      requirementIds.add(requirement.id);
    }
  }

  for (const activity of activities) {
    for (const requirement of activity.requirements) {
      if (requirement.kind === "activity" && !activityIds.has(requirement.activityId)) {
        throw new Error(`Activity ${activity.id} references missing prerequisite activity ${requirement.activityId}`);
      }
    }
  }

  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(activityId: string, path: string[]): void {
    if (visiting.has(activityId)) throw new Error(`Activity prerequisite cycle: ${[...path, activityId].join(" -> ")}`);
    if (visited.has(activityId)) return;
    visiting.add(activityId);
    const activity = byId.get(activityId)!;
    for (const requirement of activity.requirements) {
      if (requirement.kind === "activity") visit(requirement.activityId, [...path, activityId]);
    }
    visiting.delete(activityId);
    visited.add(activityId);
  }

  for (const activity of activities) visit(activity.id, []);
}

export class ActivityPrerequisiteGraph {
  private readonly byId: Map<string, ActivityDefinition>;

  constructor(activities: readonly ActivityDefinition[]) {
    validateActivityDefinitions(activities);
    this.byId = new Map(activities.map((activity) => [activity.id, activity]));
  }

  get(activityId: string): ActivityDefinition | null {
    return this.byId.get(activityId) ?? null;
  }

  list(): ActivityDefinition[] {
    return [...this.byId.values()].sort((left, right) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id));
  }

  prerequisiteActivities(activityId: string): ActivityDefinition[] {
    const root = this.byId.get(activityId);
    if (!root) return [];
    const ordered: ActivityDefinition[] = [];
    const added = new Set<string>();

    const visit = (activity: ActivityDefinition): void => {
      for (const requirement of activity.requirements) {
        if (requirement.kind !== "activity") continue;
        const dependency = this.byId.get(requirement.activityId)!;
        visit(dependency);
        if (!added.has(dependency.id)) {
          ordered.push(dependency);
          added.add(dependency.id);
        }
      }
    };

    visit(root);
    return ordered;
  }

  findingsFor(activityId: string, results: readonly ActivityRequirementResult[]): ReadinessFinding[] {
    const activity = this.byId.get(activityId);
    if (!activity) throw new Error(`Unknown activity: ${activityId}`);
    const resultById = new Map(results.map((result) => [result.requirementId, result]));

    return activity.requirements.map((requirement): ReadinessFinding => {
      const result = resultById.get(requirement.id);
      const requirementKind: ReadinessRequirementKind = requirement.strength;
      return {
        id: `${activity.id}:${requirement.id}`,
        dimension: REQUIREMENT_DIMENSION[requirement.kind],
        requirement: requirementKind,
        state: result?.state ?? "unknown",
        summary: result?.summary?.trim() || requirement.label,
        why: result?.why?.trim() || (result ? requirement.why : `${requirement.why} NEC has not evaluated this requirement yet.`),
        evidence: result?.evidence,
      };
    });
  }
}
