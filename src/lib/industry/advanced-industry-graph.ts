import type { DatabaseSync } from "node:sqlite";

import {
  type AcquisitionEdge,
  type AcquisitionGraph,
  type AcquisitionNode,
  type AcquisitionOption,
  validateAcquisitionGraph,
} from "../acquisition/graph";
import {
  resolveAcquisitionSources,
  type CuratedAcquisitionSource,
} from "../acquisition/source-boundaries";
import { queryAdvancedIndustryActivitiesForProduct } from "./advanced-industry-query";

export interface AdvancedIndustryGraphOptions {
  curatedSources?: readonly CuratedAcquisitionSource[];
}

type TypeRow = {
  type_id: number;
  name: string | null;
  is_placeholder: number;
};

function targetType(db: DatabaseSync, typeId: number): TypeRow | null {
  return db.prepare(`
    SELECT type_id, name, is_placeholder
    FROM types
    WHERE type_id = ?
  `).get(typeId) as TypeRow | undefined ?? null;
}

function sourceEvidenceLabel(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "Acquisition evidence is present but could not be serialized.";
  }
}

export function buildAdvancedIndustryAcquisitionGraph(
  db: DatabaseSync,
  targetTypeId: number,
  options: AdvancedIndustryGraphOptions = {},
): AcquisitionGraph {
  if (!Number.isSafeInteger(targetTypeId) || targetTypeId <= 0) {
    throw new TypeError("targetTypeId must be a positive integer.");
  }

  const target = targetType(db, targetTypeId);
  const rootNodeId = `item:${targetTypeId}`;
  const nodes = new Map<string, AcquisitionNode>();
  const edges = new Map<string, AcquisitionEdge>();
  const graphOptions: AcquisitionOption[] = [];

  nodes.set(rootNodeId, {
    id: rootNodeId,
    kind: "item",
    typeId: targetTypeId,
    label: target?.name ?? null,
    isPlaceholder: target?.is_placeholder === 1 || target === null,
  });

  const activities = queryAdvancedIndustryActivitiesForProduct(db, targetTypeId);
  for (const activity of activities) {
    const activityId = `activity:${activity.kind}:${activity.source.typeId}:${targetTypeId}`;
    const sourceNodeId = `blueprint:${activity.source.typeId}`;
    nodes.set(sourceNodeId, {
      id: sourceNodeId,
      kind: "blueprint",
      typeId: activity.source.typeId,
      label: activity.source.name,
      isPlaceholder: activity.source.isPlaceholder,
    });
    nodes.set(activityId, activity.kind === "invention"
      ? {
          id: activityId,
          kind: "invention-activity",
          sourceTypeId: activity.source.typeId,
          activity: "invention",
          timeSeconds: activity.timeSeconds,
          label: `Invent ${target?.name ?? targetTypeId}`,
        }
      : {
          id: activityId,
          kind: "reaction-activity",
          formulaTypeId: activity.source.typeId,
          activity: "reaction",
          timeSeconds: activity.timeSeconds,
          label: `React ${target?.name ?? targetTypeId}`,
        });

    const optionEdgeIds: string[] = [];
    const sourceEdgeId = `edge:${activityId}:source:${activity.source.typeId}`;
    edges.set(sourceEdgeId, {
      id: sourceEdgeId,
      kind: "uses-blueprint",
      from: activityId,
      to: sourceNodeId,
    });
    optionEdgeIds.push(sourceEdgeId);

    const matchingProduct = activity.products.find((product) => product.typeId === targetTypeId);
    if (matchingProduct) {
      const productEdgeId = `edge:${activityId}:product:${targetTypeId}`;
      edges.set(productEdgeId, {
        id: productEdgeId,
        kind: "produces-item",
        from: activityId,
        to: rootNodeId,
        quantity: matchingProduct.quantity,
        probability: matchingProduct.probability,
      });
      optionEdgeIds.push(productEdgeId);
    }

    for (const material of activity.materials) {
      const materialNodeId = `material:${material.typeId}`;
      nodes.set(materialNodeId, {
        id: materialNodeId,
        kind: "material",
        typeId: material.typeId,
        label: material.name,
        isPlaceholder: material.isPlaceholder,
      });
      const materialEdgeId = `edge:${activityId}:material:${material.typeId}`;
      edges.set(materialEdgeId, {
        id: materialEdgeId,
        kind: "requires-material",
        from: activityId,
        to: materialNodeId,
        quantity: material.quantity,
      });
      optionEdgeIds.push(materialEdgeId);

      const resolution = resolveAcquisitionSources(db, material.typeId, options.curatedSources ?? []);
      if (resolution.sources.length === 0) {
        const terminalId = `source:unknown:${material.typeId}`;
        nodes.set(terminalId, {
          id: terminalId,
          kind: "source",
          sourceKey: `unknown:${material.typeId}`,
          sourceState: "unknown",
          evidence: null,
          label: resolution.manufacturingBoundary === "ordinary-blueprint-available"
            ? "Ordinary manufacturing path exists; advanced terminal source not expanded here"
            : "Acquisition source not established",
        });
        const terminalEdgeId = `edge:${materialNodeId}:source:unknown`;
        edges.set(terminalEdgeId, {
          id: terminalEdgeId,
          kind: "acquires-from-source",
          from: materialNodeId,
          to: terminalId,
        });
        optionEdgeIds.push(terminalEdgeId);
      } else {
        for (const [index, source] of resolution.sources.entries()) {
          const terminalId = `source:${material.typeId}:${source.sourceKind}:${index}`;
          nodes.set(terminalId, {
            id: terminalId,
            kind: "source",
            sourceKey: `${material.typeId}:${source.sourceKind}:${index}`,
            sourceState: "known",
            evidence: sourceEvidenceLabel(source.evidence),
            label: source.label,
          });
          const terminalEdgeId = `edge:${materialNodeId}:source:${source.sourceKind}:${index}`;
          edges.set(terminalEdgeId, {
            id: terminalEdgeId,
            kind: "acquires-from-source",
            from: materialNodeId,
            to: terminalId,
          });
          optionEdgeIds.push(terminalEdgeId);
        }
      }
    }

    for (const skill of activity.skills) {
      const skillNodeId = `skill:${skill.typeId}`;
      nodes.set(skillNodeId, {
        id: skillNodeId,
        kind: "skill",
        typeId: skill.typeId,
        label: skill.name,
        isPlaceholder: skill.isPlaceholder,
      });
      const skillEdgeId = `edge:${activityId}:skill:${skill.typeId}`;
      edges.set(skillEdgeId, {
        id: skillEdgeId,
        kind: "requires-skill",
        from: activityId,
        to: skillNodeId,
        level: skill.level,
      });
      optionEdgeIds.push(skillEdgeId);
    }

    graphOptions.push({
      id: `option:${activity.kind}:${activity.source.typeId}:${targetTypeId}`,
      targetNodeId: rootNodeId,
      kind: activity.kind,
      edgeIds: optionEdgeIds,
    });
  }

  if (activities.length === 0) {
    const terminalId = `source:unknown-advanced:${targetTypeId}`;
    nodes.set(terminalId, {
      id: terminalId,
      kind: "source",
      sourceKey: `unknown-advanced:${targetTypeId}`,
      sourceState: "unknown",
      evidence: null,
      label: "No invention or reaction path is recorded in the installed SDE",
    });
    const edgeId = `edge:${rootNodeId}:source:unknown-advanced`;
    edges.set(edgeId, {
      id: edgeId,
      kind: "acquires-from-source",
      from: rootNodeId,
      to: terminalId,
    });
    graphOptions.push({
      id: `option:source:unknown-advanced:${targetTypeId}`,
      targetNodeId: rootNodeId,
      kind: "source",
      edgeIds: [edgeId],
    });
  }

  const graph: AcquisitionGraph = {
    rootNodeId,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    options: graphOptions,
  };
  const issues = validateAcquisitionGraph(graph);
  if (issues.length > 0) {
    throw new Error(`Advanced industry graph validation failed: ${issues.map((issue) => issue.message).join("; ")}`);
  }
  return graph;
}
