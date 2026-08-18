export type AcquisitionNodeId = string;
export type AcquisitionEdgeId = string;
export type AcquisitionOptionId = string;

interface AcquisitionNodeBase {
  id: AcquisitionNodeId;
  label: string | null;
}

export interface ItemNode extends AcquisitionNodeBase {
  kind: "item";
  typeId: number;
  isPlaceholder: boolean;
}

export interface BlueprintNode extends AcquisitionNodeBase {
  kind: "blueprint";
  typeId: number;
  isPlaceholder: boolean;
}

export interface ManufacturingActivityNode extends AcquisitionNodeBase {
  kind: "manufacturing-activity";
  blueprintTypeId: number;
  activity: "manufacturing";
  timeSeconds: number | null;
}

export interface MaterialNode extends AcquisitionNodeBase {
  kind: "material";
  typeId: number;
  isPlaceholder: boolean;
}

export interface SkillNode extends AcquisitionNodeBase {
  kind: "skill";
  typeId: number;
  isPlaceholder: boolean;
}

export type AcquisitionSourceState = "known" | "unknown";

export interface AcquisitionSourceNode extends AcquisitionNodeBase {
  kind: "source";
  sourceKey: string;
  sourceState: AcquisitionSourceState;
  evidence: string | null;
}

export type AcquisitionNode =
  | ItemNode
  | BlueprintNode
  | ManufacturingActivityNode
  | MaterialNode
  | SkillNode
  | AcquisitionSourceNode;

interface AcquisitionEdgeBase {
  id: AcquisitionEdgeId;
  from: AcquisitionNodeId;
  to: AcquisitionNodeId;
}

export interface UsesBlueprintEdge extends AcquisitionEdgeBase {
  kind: "uses-blueprint";
}

export interface ProducesItemEdge extends AcquisitionEdgeBase {
  kind: "produces-item";
  quantity: number;
}

export interface RequiresMaterialEdge extends AcquisitionEdgeBase {
  kind: "requires-material";
  quantity: number;
}

export interface RequiresSkillEdge extends AcquisitionEdgeBase {
  kind: "requires-skill";
  level: number;
}

export interface AcquiresFromSourceEdge extends AcquisitionEdgeBase {
  kind: "acquires-from-source";
}

export type AcquisitionEdge =
  | UsesBlueprintEdge
  | ProducesItemEdge
  | RequiresMaterialEdge
  | RequiresSkillEdge
  | AcquiresFromSourceEdge;

export type AcquisitionOptionKind = "manufacturing" | "source";

export interface AcquisitionOption {
  id: AcquisitionOptionId;
  targetNodeId: AcquisitionNodeId;
  kind: AcquisitionOptionKind;
  edgeIds: AcquisitionEdgeId[];
}

export interface AcquisitionGraph {
  rootNodeId: AcquisitionNodeId;
  nodes: AcquisitionNode[];
  edges: AcquisitionEdge[];
  options: AcquisitionOption[];
}

export interface AcquisitionGraphValidationIssue {
  code:
    | "duplicate-node-id"
    | "duplicate-edge-id"
    | "duplicate-option-id"
    | "missing-root-node"
    | "missing-edge-node"
    | "missing-option-target"
    | "missing-option-edge"
    | "invalid-quantity"
    | "invalid-skill-level";
  id: string;
  message: string;
}

export function validateAcquisitionGraph(graph: AcquisitionGraph): AcquisitionGraphValidationIssue[] {
  const issues: AcquisitionGraphValidationIssue[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const optionIds = new Set<string>();

  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      issues.push({ code: "duplicate-node-id", id: node.id, message: `Duplicate acquisition node id: ${node.id}` });
    }
    nodeIds.add(node.id);
  }

  if (!nodeIds.has(graph.rootNodeId)) {
    issues.push({ code: "missing-root-node", id: graph.rootNodeId, message: `Root node does not exist: ${graph.rootNodeId}` });
  }

  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) {
      issues.push({ code: "duplicate-edge-id", id: edge.id, message: `Duplicate acquisition edge id: ${edge.id}` });
    }
    edgeIds.add(edge.id);

    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      issues.push({
        code: "missing-edge-node",
        id: edge.id,
        message: `Edge ${edge.id} references a missing node (${edge.from} -> ${edge.to}).`,
      });
    }

    if ((edge.kind === "produces-item" || edge.kind === "requires-material") && (!Number.isFinite(edge.quantity) || edge.quantity <= 0)) {
      issues.push({ code: "invalid-quantity", id: edge.id, message: `Edge ${edge.id} must use a positive finite quantity.` });
    }

    if (edge.kind === "requires-skill" && (!Number.isInteger(edge.level) || edge.level < 0 || edge.level > 5)) {
      issues.push({ code: "invalid-skill-level", id: edge.id, message: `Edge ${edge.id} has invalid required skill level ${edge.level}.` });
    }
  }

  for (const option of graph.options) {
    if (optionIds.has(option.id)) {
      issues.push({ code: "duplicate-option-id", id: option.id, message: `Duplicate acquisition option id: ${option.id}` });
    }
    optionIds.add(option.id);

    if (!nodeIds.has(option.targetNodeId)) {
      issues.push({
        code: "missing-option-target",
        id: option.id,
        message: `Acquisition option ${option.id} targets missing node ${option.targetNodeId}.`,
      });
    }

    for (const edgeId of option.edgeIds) {
      if (!edgeIds.has(edgeId)) {
        issues.push({
          code: "missing-option-edge",
          id: option.id,
          message: `Acquisition option ${option.id} references missing edge ${edgeId}.`,
        });
      }
    }
  }

  return issues;
}
