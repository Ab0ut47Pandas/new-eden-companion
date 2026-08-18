import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { GoalStore } from "./store-core";

const tempRoots: string[] = [];

function makeStore(): { store: GoalStore; filename: string } {
  const root = mkdtempSync(path.join(tmpdir(), "nec-goals-test-"));
  tempRoots.push(root);
  const filename = path.join(root, "eve-companion.db");
  return { store: new GoalStore(filename), filename };
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("saved goal store", () => {
  it("persists item and activity goals across store reopen", () => {
    const { store, filename } = makeStore();
    const item = store.saveGoal({ characterId: 10, kind: "item", targetKey: "type:587", targetTypeId: 587, title: "Rifter" });
    const activity = store.saveGoal({ characterId: 10, kind: "activity", targetKey: "activity:abyssals", title: "Try Abyssals" });
    expect(store.listGoals(10).map((goal) => goal.title)).toEqual(["Try Abyssals", "Rifter"]);
    store.close();

    const reopened = new GoalStore(filename);
    expect(reopened.getGoalByTarget(10, "item", "type:587")?.id).toBe(item.id);
    expect(reopened.getGoalByTarget(10, "activity", "activity:abyssals")?.id).toBe(activity.id);
    reopened.close();
  });

  it("upserts the same target for the same character without duplicating it", () => {
    const { store } = makeStore();
    const first = store.saveGoal({ characterId: 10, kind: "item", targetKey: "type:587", targetTypeId: 587, title: "Rifter" });
    store.setGoalCompleted(10, first.id, true);
    const second = store.saveGoal({ characterId: 10, kind: "item", targetKey: "type:587", targetTypeId: 587, title: "Rifter hull" });
    const goals = store.listGoals(10);
    expect(goals).toHaveLength(1);
    expect(second.id).toBe(first.id);
    expect(second.status).toBe("active");
    expect(second.title).toBe("Rifter hull");
    store.close();
  });

  it("persists checklist progress", () => {
    const { store } = makeStore();
    const goal = store.saveGoal({ characterId: 10, kind: "activity", targetKey: "activity:missions", title: "Run Level 4 missions" });
    const step = store.addStep(10, goal.id, "Buy mission ammo");
    expect(step?.completed).toBe(false);
    expect(store.setStepCompleted(10, goal.id, step!.id, true)).toBe(true);
    const reloaded = store.listGoals(10)[0];
    expect(reloaded.steps).toHaveLength(1);
    expect(reloaded.steps[0]).toMatchObject({ label: "Buy mission ammo", completed: true });
    store.close();
  });

  it("prevents another character from mutating a goal or checklist", () => {
    const { store } = makeStore();
    const goal = store.saveGoal({ characterId: 10, kind: "item", targetKey: "type:587", targetTypeId: 587, title: "Rifter" });
    const step = store.addStep(10, goal.id, "Get minerals")!;

    expect(store.setGoalCompleted(11, goal.id, true)).toBe(false);
    expect(store.addStep(11, goal.id, "Intruder step")).toBeNull();
    expect(store.setStepCompleted(11, goal.id, step.id, true)).toBe(false);

    const unchanged = store.listGoals(10)[0];
    expect(unchanged.status).toBe("active");
    expect(unchanged.steps).toEqual([expect.objectContaining({ label: "Get minerals", completed: false })]);
    store.close();
  });

  it("allows the same target to be saved independently by different characters", () => {
    const { store } = makeStore();
    store.saveGoal({ characterId: 10, kind: "item", targetKey: "type:587", targetTypeId: 587, title: "Rifter" });
    store.saveGoal({ characterId: 11, kind: "item", targetKey: "type:587", targetTypeId: 587, title: "Rifter" });
    expect(store.listGoals(10)).toHaveLength(1);
    expect(store.listGoals(11)).toHaveLength(1);
    expect(store.listGoals(10)[0].id).not.toBe(store.listGoals(11)[0].id);
    store.close();
  });
});
