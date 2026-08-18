import { describe, expect, it } from "vitest";

import { buildProgressionPlan, validateProgressionPlanGraph, type ProgressionPlanNode } from "./goal-plan";

function node(overrides: Partial<ProgressionPlanNode> & Pick<ProgressionPlanNode, "id" | "title">): ProgressionPlanNode {
  return {
    kind: "action",
    why: `Why ${overrides.id}`,
    state: "incomplete",
    dependsOn: [],
    ...overrides,
  };
}

describe("goal progression plan", () => {
  it("orders dependencies before an item/ship goal", () => {
    const plan = buildProgressionPlan(
      { id: "goal-ship", kind: "item", title: "Build example ship", targetNodeId: "ship" },
      [
        node({ id: "ship", title: "Build example ship", kind: "item", dependsOn: ["component"], target: { typeId: 100 } }),
        node({ id: "ore", title: "Obtain example material", kind: "supply", state: "complete", target: { typeId: 101 } }),
        node({ id: "component", title: "Build example component", kind: "item", dependsOn: ["ore"], target: { typeId: 102 } }),
      ],
    );

    expect(plan.steps.map((step) => step.node.id)).toEqual(["ore", "component", "ship"]);
    expect(plan.steps.map((step) => step.status)).toEqual(["done", "next", "later"]);
    expect(plan.nextSteps.map((step) => step.node.id)).toEqual(["component"]);
    expect(plan.status).toBe("in-progress");
  });

  it("allows multiple independent prerequisites to be actionable at the same time", () => {
    const plan = buildProgressionPlan(
      { id: "goal-activity", kind: "activity", title: "Try example activity", targetNodeId: "activity" },
      [
        node({ id: "skill", title: "Train required skill", kind: "skill" }),
        node({ id: "supplies", title: "Get required supplies", kind: "supply" }),
        node({ id: "activity", title: "Try example activity", kind: "activity", dependsOn: ["skill", "supplies"] }),
      ],
    );

    expect(plan.nextSteps.map((step) => step.node.id)).toEqual(["skill", "supplies"]);
    expect(plan.steps.find((step) => step.node.id === "activity")?.status).toBe("later");
  });

  it("preserves unknown prerequisite state and does not unlock downstream work falsely", () => {
    const plan = buildProgressionPlan(
      { id: "goal", kind: "activity", title: "Example", targetNodeId: "activity" },
      [
        node({ id: "access", title: "Verify site access", kind: "access", state: "unknown" }),
        node({ id: "activity", title: "Run site", kind: "activity", dependsOn: ["access"] }),
      ],
    );

    expect(plan.steps.find((step) => step.node.id === "access")?.status).toBe("unknown");
    expect(plan.steps.find((step) => step.node.id === "activity")?.status).toBe("unknown");
    expect(plan.nextSteps).toHaveLength(0);
    expect(plan.status).toBe("unknown");
  });

  it("does not infer completion from readiness or an action label", () => {
    const plan = buildProgressionPlan(
      { id: "goal", kind: "activity", title: "Example", targetNodeId: "activity" },
      [
        node({ id: "activity", title: "Run activity", kind: "activity", state: "incomplete", action: "You are ready; start the activity." }),
      ],
    );

    expect(plan.status).toBe("in-progress");
    expect(plan.nextSteps[0].node.id).toBe("activity");
    expect(plan.nextSteps[0].status).toBe("next");
  });

  it("marks a goal complete only from explicit target completion", () => {
    const plan = buildProgressionPlan(
      { id: "goal", kind: "item", title: "Obtain item", targetNodeId: "item" },
      [node({ id: "item", title: "Obtain item", kind: "item", state: "complete", target: { typeId: 200 } })],
    );
    expect(plan.status).toBe("complete");
    expect(plan.completedSteps.map((step) => step.node.id)).toEqual(["item"]);
    expect(plan.nextSteps).toHaveLength(0);
  });

  it("excludes unrelated graph nodes from the selected goal plan", () => {
    const plan = buildProgressionPlan(
      { id: "goal", kind: "item", title: "Target", targetNodeId: "target" },
      [
        node({ id: "needed", title: "Needed" }),
        node({ id: "target", title: "Target", kind: "item", dependsOn: ["needed"], target: { typeId: 300 } }),
        node({ id: "unrelated", title: "Unrelated" }),
      ],
    );
    expect(plan.steps.map((step) => step.node.id)).toEqual(["needed", "target"]);
  });

  it("rejects missing dependencies, missing targets, duplicate dependencies, and cycles", () => {
    expect(() => validateProgressionPlanGraph(
      { id: "goal", kind: "item", title: "Goal", targetNodeId: "missing-target" },
      [],
    )).toThrow(/missing target node/);

    expect(() => validateProgressionPlanGraph(
      { id: "goal", kind: "item", title: "Goal", targetNodeId: "target" },
      [node({ id: "target", title: "Target", dependsOn: ["missing"] })],
    )).toThrow(/missing dependency/);

    expect(() => validateProgressionPlanGraph(
      { id: "goal", kind: "item", title: "Goal", targetNodeId: "target" },
      [node({ id: "target", title: "Target", dependsOn: ["a", "a"] }), node({ id: "a", title: "A" })],
    )).toThrow(/Duplicate dependency/);

    expect(() => validateProgressionPlanGraph(
      { id: "goal", kind: "activity", title: "Goal", targetNodeId: "a" },
      [node({ id: "a", title: "A", dependsOn: ["b"] }), node({ id: "b", title: "B", dependsOn: ["a"] })],
    )).toThrow(/cycle/);
  });

  it("keeps topological output deterministic when dependency arrays arrive in different orders", () => {
    const goal = { id: "goal", kind: "item" as const, title: "Goal", targetNodeId: "target" };
    const first = buildProgressionPlan(goal, [
      node({ id: "target", title: "Target", dependsOn: ["b", "a"] }),
      node({ id: "a", title: "A" }),
      node({ id: "b", title: "B" }),
    ]);
    const second = buildProgressionPlan(goal, [
      node({ id: "target", title: "Target", dependsOn: ["a", "b"] }),
      node({ id: "b", title: "B" }),
      node({ id: "a", title: "A" }),
    ]);
    expect(first.steps.map((step) => step.node.id)).toEqual(["a", "b", "target"]);
    expect(second.steps.map((step) => step.node.id)).toEqual(["a", "b", "target"]);
  });
});
