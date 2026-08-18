import { describe, expect, it } from "vitest";

import { type AcquisitionGraph, validateAcquisitionGraph } from "./graph";

function validAlternativeGraph(): AcquisitionGraph {
  return {
    rootNodeId: "item:100",
    nodes: [
      { id: "item:100", kind: "item", typeId: 100, label: "Target item", isPlaceholder: false },
      { id: "blueprint:200", kind: "blueprint", typeId: 200, label: "Target Blueprint", isPlaceholder: false },
      {
        id: "activity:200:manufacturing",
        kind: "manufacturing-activity",
        blueprintTypeId: 200,
        activity: "manufacturing",
        timeSeconds: 60,
        label: "Manufacture Target item",
      },
      { id: "material:300", kind: "material", typeId: 300, label: "Material", isPlaceholder: false },
      { id: "skill:400", kind: "skill", typeId: 400, label: "Industry", isPlaceholder: false },
      {
        id: "source:unknown:100",
        kind: "source",
        sourceKey: "unknown:100",
        sourceState: "unknown",
        evidence: null,
        label: "Acquisition source not yet established",
      },
    ],
    edges: [
      { id: "edge:activity-blueprint", kind: "uses-blueprint", from: "activity:200:manufacturing", to: "blueprint:200" },
      { id: "edge:activity-product", kind: "produces-item", from: "activity:200:manufacturing", to: "item:100", quantity: 1 },
      { id: "edge:activity-material", kind: "requires-material", from: "activity:200:manufacturing", to: "material:300", quantity: 5 },
      { id: "edge:activity-skill", kind: "requires-skill", from: "activity:200:manufacturing", to: "skill:400", level: 3 },
      { id: "edge:item-source", kind: "acquires-from-source", from: "item:100", to: "source:unknown:100" },
    ],
    options: [
      {
        id: "option:manufacturing:200",
        targetNodeId: "item:100",
        kind: "manufacturing",
        edgeIds: ["edge:activity-blueprint", "edge:activity-product", "edge:activity-material", "edge:activity-skill"],
      },
      {
        id: "option:source:unknown:100",
        targetNodeId: "item:100",
        kind: "source",
        edgeIds: ["edge:item-source"],
      },
    ],
  };
}

describe("acquisition graph domain model", () => {
  it("supports multiple acquisition options for the same target", () => {
    const graph = validAlternativeGraph();

    expect(graph.options.map((option) => option.kind)).toEqual(["manufacturing", "source"]);
    expect(graph.options.every((option) => option.targetNodeId === graph.rootNodeId)).toBe(true);
    expect(validateAcquisitionGraph(graph)).toEqual([]);
  });

  it("preserves an unknown terminal source without inventing its acquisition mechanism", () => {
    const graph = validAlternativeGraph();
    const source = graph.nodes.find((node) => node.kind === "source");

    expect(source).toMatchObject({ sourceState: "unknown", evidence: null });
  });

  it("reports broken references and invalid requirement values", () => {
    const graph = validAlternativeGraph();
    graph.rootNodeId = "item:missing";
    graph.edges.push({
      id: "edge:bad-material",
      kind: "requires-material",
      from: "activity:missing",
      to: "material:300",
      quantity: 0,
    });
    graph.edges.push({
      id: "edge:bad-skill",
      kind: "requires-skill",
      from: "activity:200:manufacturing",
      to: "skill:400",
      level: 6,
    });
    graph.options[0].edgeIds.push("edge:missing");

    expect(validateAcquisitionGraph(graph).map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["missing-root-node", "missing-edge-node", "invalid-quantity", "invalid-skill-level", "missing-option-edge"]),
    );
  });
});
