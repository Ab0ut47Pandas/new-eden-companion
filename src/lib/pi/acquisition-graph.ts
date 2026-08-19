import type { DatabaseSync } from "node:sqlite";

import {
  type AcquisitionEdge,
  type AcquisitionGraph,
  type AcquisitionNode,
  type AcquisitionOption,
  validateAcquisitionGraph,
} from "../acquisition/graph";
import { queryPlanetarySchematicsForOutput } from "./schematic-query";

export function buildPlanetaryIndustryAcquisitionGraph(
  db: DatabaseSync,
  targetTypeId: number,
): AcquisitionGraph {
  if (!Number.isSafeInteger(targetTypeId) || targetTypeId <= 0) {
    throw new TypeError("targetTypeId must be a positive integer.");
  }

  const rootNodeId = `item:${targetTypeId}`;
  const target = db.prepare("SELECT type_id, name, is_placeholder FROM types WHERE type_id = ?").get(targetTypeId) as
    | { type_id: number; name: string | null; is_placeholder: number }
    | undefined;
  const nodes = new Map<string, AcquisitionNode>();
  const edges = new Map<string, AcquisitionEdge>();
  const options: AcquisitionOption[] = [];

  nodes.set(rootNodeId, {
    id: rootNodeId,
    kind: "item",
    typeId: targetTypeId,
    label: target?.name ?? null,
    isPlaceholder: target?.is_placeholder === 1 || !target,
  });

  const schematics = queryPlanetarySchematicsForOutput(db, targetTypeId);
  for (const schematic of schematics) {
    const activityId = `activity:planetary-industry:${schematic.schematicId}:${targetTypeId}`;
    nodes.set(activityId, {
      id: activityId,
      kind: "planetary-industry-activity",
      schematicId: schematic.schematicId,
      activity: "planetary-industry",
      cycleTimeSeconds: schematic.cycleTimeSeconds,
      label: schematic.name ?? `Planetary schematic ${schematic.schematicId}`,
    });

    const optionEdgeIds: string[] = [];
    const output = schematic.outputs.find((candidate) => candidate.typeId === targetTypeId);
    if (!output) continue;

    const outputEdgeId = `edge:${activityId}:product:${targetTypeId}`;
    edges.set(outputEdgeId, {
      id: outputEdgeId,
      kind: "produces-item",
      from: activityId,
      to: rootNodeId,
      quantity: output.quantity,
    });
    optionEdgeIds.push(outputEdgeId);

    for (const input of schematic.inputs) {
      const materialNodeId = `material:${input.typeId}`;
      nodes.set(materialNodeId, {
        id: materialNodeId,
        kind: "material",
        typeId: input.typeId,
        label: input.name,
        isPlaceholder: input.isPlaceholder,
      });
      const edgeId = `edge:${activityId}:material:${input.typeId}`;
      edges.set(edgeId, {
        id: edgeId,
        kind: "requires-material",
        from: activityId,
        to: materialNodeId,
        quantity: input.quantity,
      });
      optionEdgeIds.push(edgeId);
    }

    options.push({
      id: `option:planetary-industry:${schematic.schematicId}:${targetTypeId}`,
      targetNodeId: rootNodeId,
      kind: "planetary-industry",
      edgeIds: optionEdgeIds,
    });
  }

  if (schematics.length === 0) {
    const sourceNodeId = `source:unknown-pi:${targetTypeId}`;
    const edgeId = `edge:${rootNodeId}:source:unknown-pi`;
    nodes.set(sourceNodeId, {
      id: sourceNodeId,
      kind: "source",
      sourceKey: `unknown-pi:${targetTypeId}`,
      sourceState: "unknown",
      evidence: null,
      label: "No Planetary Industry production relationship is recorded in the installed SDE",
    });
    edges.set(edgeId, {
      id: edgeId,
      kind: "acquires-from-source",
      from: rootNodeId,
      to: sourceNodeId,
    });
    options.push({
      id: `option:source:unknown-pi:${targetTypeId}`,
      targetNodeId: rootNodeId,
      kind: "source",
      edgeIds: [edgeId],
    });
  }

  const graph: AcquisitionGraph = {
    rootNodeId,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    options,
  };
  const issues = validateAcquisitionGraph(graph);
  if (issues.length > 0) {
    throw new Error(`Planetary Industry graph validation failed: ${issues.map((issue) => issue.message).join("; ")}`);
  }
  return graph;
}
