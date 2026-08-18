export type ProgressionGoalKind = "activity" | "item";
export type ProgressionNodeKind =
  | "activity"
  | "item"
  | "skill"
  | "supply"
  | "milestone"
  | "knowledge"
  | "financial"
  | "access"
  | "action";

export type ProgressionNodeState = "complete" | "incomplete" | "unknown";
export type ProgressionStepStatus = "done" | "next" | "later" | "unknown";
export type ProgressionPlanStatus = "complete" | "in-progress" | "unknown";

export interface ProgressionPlanNode {
  id: string;
  kind: ProgressionNodeKind;
  title: string;
  why: string;
  state: ProgressionNodeState;
  dependsOn: readonly string[];
  action?: string | null;
  target?: {
    activityId?: string;
    typeId?: number;
  };
}

export interface ProgressionGoal {
  id: string;
  kind: ProgressionGoalKind;
  title: string;
  targetNodeId: string;
}

export interface ProgressionPlanStep {
  node: ProgressionPlanNode;
  status: ProgressionStepStatus;
  unmetDependencies: readonly string[];
  unknownDependencies: readonly string[];
}

export interface ProgressionPlan {
  goal: ProgressionGoal;
  status: ProgressionPlanStatus;
  steps: readonly ProgressionPlanStep[];
  nextSteps: readonly ProgressionPlanStep[];
  unknownSteps: readonly ProgressionPlanStep[];
  completedSteps: readonly ProgressionPlanStep[];
}

function nonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must not be empty.`);
  return normalized;
}

function validateTarget(node: ProgressionPlanNode): void {
  const activityId = node.target?.activityId;
  const typeId = node.target?.typeId;
  if (activityId !== undefined) nonEmpty(activityId, `Progression node ${node.id} activity target`);
  if (typeId !== undefined && (!Number.isSafeInteger(typeId) || typeId <= 0)) {
    throw new Error(`Progression node ${node.id} item target type ID must be a positive integer.`);
  }
}

export function validateProgressionPlanGraph(goal: ProgressionGoal, nodes: readonly ProgressionPlanNode[]): void {
  nonEmpty(goal.id, "Progression goal id");
  nonEmpty(goal.title, `Progression goal ${goal.id} title`);
  nonEmpty(goal.targetNodeId, `Progression goal ${goal.id} target node id`);

  const byId = new Map<string, ProgressionPlanNode>();
  for (const node of nodes) {
    nonEmpty(node.id, "Progression node id");
    nonEmpty(node.title, `Progression node ${node.id} title`);
    nonEmpty(node.why, `Progression node ${node.id} why`);
    if (byId.has(node.id)) throw new Error(`Duplicate progression node id: ${node.id}`);
    byId.set(node.id, node);
    validateTarget(node);

    const dependencies = new Set<string>();
    for (const dependencyId of node.dependsOn) {
      nonEmpty(dependencyId, `Progression node ${node.id} dependency id`);
      if (dependencies.has(dependencyId)) throw new Error(`Duplicate dependency ${dependencyId} on progression node ${node.id}`);
      dependencies.add(dependencyId);
    }
  }

  if (!byId.has(goal.targetNodeId)) throw new Error(`Progression goal ${goal.id} references missing target node ${goal.targetNodeId}`);

  for (const node of nodes) {
    for (const dependencyId of node.dependsOn) {
      if (!byId.has(dependencyId)) throw new Error(`Progression node ${node.id} references missing dependency ${dependencyId}`);
      if (dependencyId === node.id) throw new Error(`Progression node ${node.id} cannot depend on itself.`);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(nodeId: string, path: string[]): void {
    if (visiting.has(nodeId)) throw new Error(`Progression plan cycle: ${[...path, nodeId].join(" -> ")}`);
    if (visited.has(nodeId)) return;
    visiting.add(nodeId);
    const node = byId.get(nodeId)!;
    for (const dependencyId of node.dependsOn) visit(dependencyId, [...path, nodeId]);
    visiting.delete(nodeId);
    visited.add(nodeId);
  }
  for (const node of nodes) visit(node.id, []);
}

function reachableFromTarget(targetNodeId: string, byId: ReadonlyMap<string, ProgressionPlanNode>): Set<string> {
  const reachable = new Set<string>();
  function visit(nodeId: string): void {
    if (reachable.has(nodeId)) return;
    reachable.add(nodeId);
    const node = byId.get(nodeId)!;
    for (const dependencyId of node.dependsOn) visit(dependencyId);
  }
  visit(targetNodeId);
  return reachable;
}

function topologicalOrder(targetNodeId: string, byId: ReadonlyMap<string, ProgressionPlanNode>): ProgressionPlanNode[] {
  const reachable = reachableFromTarget(targetNodeId, byId);
  const ordered: ProgressionPlanNode[] = [];
  const visited = new Set<string>();

  function visit(nodeId: string): void {
    if (visited.has(nodeId)) return;
    const node = byId.get(nodeId)!;
    for (const dependencyId of [...node.dependsOn].sort()) {
      if (reachable.has(dependencyId)) visit(dependencyId);
    }
    visited.add(nodeId);
    ordered.push(node);
  }

  visit(targetNodeId);
  return ordered;
}

function classifyStep(node: ProgressionPlanNode, byId: ReadonlyMap<string, ProgressionPlanNode>): ProgressionPlanStep {
  const dependencies = node.dependsOn.map((id) => byId.get(id)!);
  const unmetDependencies = dependencies.filter((dependency) => dependency.state === "incomplete").map((dependency) => dependency.id);
  const unknownDependencies = dependencies.filter((dependency) => dependency.state === "unknown").map((dependency) => dependency.id);

  let status: ProgressionStepStatus;
  if (node.state === "complete") status = "done";
  else if (node.state === "unknown") status = "unknown";
  else if (unknownDependencies.length > 0) status = "unknown";
  else if (unmetDependencies.length > 0) status = "later";
  else status = "next";

  return { node, status, unmetDependencies, unknownDependencies };
}

export function buildProgressionPlan(goal: ProgressionGoal, nodes: readonly ProgressionPlanNode[]): ProgressionPlan {
  validateProgressionPlanGraph(goal, nodes);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const ordered = topologicalOrder(goal.targetNodeId, byId);
  const steps = ordered.map((node) => classifyStep(node, byId));
  const target = byId.get(goal.targetNodeId)!;
  const nextSteps = steps.filter((step) => step.status === "next");
  const unknownSteps = steps.filter((step) => step.status === "unknown");
  const completedSteps = steps.filter((step) => step.status === "done");

  let status: ProgressionPlanStatus;
  if (target.state === "complete") status = "complete";
  else if (nextSteps.length > 0) status = "in-progress";
  else status = "unknown";

  return { goal, status, steps, nextSteps, unknownSteps, completedSteps };
}

export interface ActivityGoalPlanInput {
  goalId: string;
  goalTitle: string;
  targetActivityId: string;
  prerequisiteActivityIds: readonly string[];
  activityStates: Readonly<Record<string, ProgressionNodeState>>;
  activityTitles?: Readonly<Record<string, string>>;
  activityWhy?: Readonly<Record<string, string>>;
}

export function buildActivityGoalPlan(input: ActivityGoalPlanInput): ProgressionPlan {
  const chain = [...new Set([...input.prerequisiteActivityIds, input.targetActivityId])];
  const nodes: ProgressionPlanNode[] = chain.map((activityId, index) => ({
    id: `activity:${activityId}`,
    kind: "activity",
    title: input.activityTitles?.[activityId] ?? activityId,
    why: input.activityWhy?.[activityId] ?? (activityId === input.targetActivityId ? "This is the selected activity goal." : "This activity is an explicit prerequisite of the selected goal."),
    state: input.activityStates[activityId] ?? "unknown",
    dependsOn: index === 0 ? [] : [`activity:${chain[index - 1]}`],
    target: { activityId },
  }));

  return buildProgressionPlan(
    { id: input.goalId, kind: "activity", title: input.goalTitle, targetNodeId: `activity:${input.targetActivityId}` },
    nodes,
  );
}
