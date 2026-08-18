import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { ActivityPrerequisiteGraph, type ActivityDefinition } from "./activity-graph";
import { buildReadinessSnapshot } from "./model";
import { ExperienceMilestoneStore, milestoneRequirementResult } from "./milestones-store-core";

const tempRoots: string[] = [];

function makeStore(): { store: ExperienceMilestoneStore; filename: string } {
  const root = mkdtempSync(path.join(tmpdir(), "nec-milestones-test-"));
  tempRoots.push(root);
  const filename = path.join(root, "eve-companion.db");
  return { store: new ExperienceMilestoneStore(filename), filename };
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const activity: ActivityDefinition = {
  id: "example-activity",
  title: "Example activity",
  role: "primary",
  requirements: [
    {
      id: "practice-first",
      kind: "milestone",
      strength: "soft",
      label: "Practice the lower tier",
      why: "Prior practice reduces the learning jump.",
      milestoneKey: "example:lower-tier-practiced",
    },
  ],
};

describe("experience milestone store", () => {
  it("persists explicit confirmed milestones across reopen", () => {
    const { store, filename } = makeStore();
    const saved = store.setState({
      characterId: 10,
      milestoneKey: "abyss:t0-success",
      label: "Completed a T0 Abyssal run",
      state: "confirmed",
      now: 1234,
    });
    expect(saved).toMatchObject({ state: "confirmed", confirmedAt: 1234, updatedAt: 1234 });
    store.close();

    const reopened = new ExperienceMilestoneStore(filename);
    expect(reopened.get(10, "abyss:t0-success")).toEqual(saved);
    reopened.close();
  });

  it("keeps milestones separate between characters", () => {
    const { store } = makeStore();
    store.setState({ characterId: 10, milestoneKey: "missions:first-l4", label: "Completed first L4", state: "confirmed", now: 1 });
    store.setState({ characterId: 11, milestoneKey: "missions:first-l4", label: "Completed first L4", state: "not-yet", now: 2 });

    expect(store.get(10, "missions:first-l4")?.state).toBe("confirmed");
    expect(store.get(11, "missions:first-l4")?.state).toBe("not-yet");
    store.close();
  });

  it("allows an explicit not-yet record and later confirmation", () => {
    const { store } = makeStore();
    const first = store.setState({ characterId: 10, milestoneKey: "industry:first-build", label: "Manufactured an item", state: "not-yet", now: 10 });
    expect(first.confirmedAt).toBeNull();

    const confirmed = store.setState({ characterId: 10, milestoneKey: "industry:first-build", label: "Manufactured an item", state: "confirmed", now: 20 });
    expect(confirmed.state).toBe("confirmed");
    expect(confirmed.confirmedAt).toBe(20);
    expect(store.list(10)).toHaveLength(1);
    store.close();
  });

  it("clears a record back to unknown rather than manufacturing a negative state", () => {
    const { store } = makeStore();
    store.setState({ characterId: 10, milestoneKey: "exploration:first-site", label: "Completed an exploration site", state: "confirmed", now: 10 });
    expect(store.clear(10, "exploration:first-site")).toBe(true);
    expect(store.get(10, "exploration:first-site")).toBeNull();
    expect(store.clear(10, "exploration:first-site")).toBe(false);
    store.close();
  });

  it("treats absence as unknown, confirmation as met, and explicit not-yet as unmet", () => {
    const graph = new ActivityPrerequisiteGraph([activity]);
    const { store } = makeStore();

    const unknown = graph.findingsFor("example-activity", [milestoneRequirementResult("practice-first", null)]);
    expect(unknown[0].state).toBe("unknown");
    expect(buildReadinessSnapshot(unknown).dimensions.find((entry) => entry.dimension === "experience")?.status).toBe("unknown");

    const confirmedRecord = store.setState({ characterId: 10, milestoneKey: "example:lower-tier-practiced", label: "Practice the lower tier", state: "confirmed", now: 10 });
    const met = graph.findingsFor("example-activity", [milestoneRequirementResult("practice-first", confirmedRecord)]);
    expect(met[0].state).toBe("met");
    expect(met[0].evidence).toEqual([{ source: "user", label: "Player-confirmed local milestone" }]);

    const notYetRecord = store.setState({ characterId: 10, milestoneKey: "example:lower-tier-practiced", label: "Practice the lower tier", state: "not-yet", now: 20 });
    const unmet = graph.findingsFor("example-activity", [milestoneRequirementResult("practice-first", notYetRecord)]);
    expect(unmet[0].state).toBe("unmet");
    expect(buildReadinessSnapshot(unmet).dimensions.find((entry) => entry.dimension === "experience")?.status).toBe("needs-work");
    store.close();
  });

  it("uses only user-local evidence for milestone evaluation", () => {
    const record = {
      characterId: 10,
      milestoneKey: "example:test",
      label: "Example milestone",
      state: "confirmed" as const,
      updatedAt: 10,
      confirmedAt: 10,
    };
    const result = milestoneRequirementResult("milestone", record);
    expect(result.evidence).toEqual([{ source: "user", label: "Player-confirmed local milestone" }]);
  });
});
