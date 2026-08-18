import { describe, expect, it } from "vitest";

import type { ReadinessExplanation } from "../readiness/explanation";
import { buildActivityBriefing, type ActivityBriefingDefinition } from "./briefing";
import { ACTIVITY_CHEAT_SHEET_SECTION_ORDER, buildActivityCheatSheet } from "./cheat-sheet";

function definition(): ActivityBriefingDefinition {
  return {
    id: "example",
    title: "Example activity",
    whatItIs: "Example activity overview.",
    whyCare: "Example value.",
    whatToBring: [{ id: "bring", label: "Bring the required ship" }],
    howToStart: [{ id: "start", label: "Activate the entry point" }],
    whatToDo: [
      { id: "step-1", label: "First execution step" },
      { id: "step-2", label: "Second execution step" },
    ],
    lootKeepSell: [{ id: "loot", label: "Take the relevant reward" }],
    failureConditions: [{ id: "fail", label: "Do not cross the failure threshold", tone: "warning" }],
    unlocksNext: [{ id: "next", label: "Advance the progression goal" }],
  };
}

function readiness(): ReadinessExplanation {
  return {
    status: "nearly-ready",
    headline: "Nearly ready — address the remaining preparation gap first.",
    why: "One preparation gap remains.",
    technicalEligibility: "eligible",
    primaryIssue: null,
    nextAction: "Load the missing supply.",
    blockers: [],
    gaps: [],
    warnings: [],
    unknowns: [],
    satisfied: [],
  };
}

describe("activity cheat sheet", () => {
  it("derives only the execution-focused sections in stable order", () => {
    const sheet = buildActivityCheatSheet(buildActivityBriefing(definition(), readiness()));
    expect(sheet.sections.map((section) => section.key)).toEqual(ACTIVITY_CHEAT_SHEET_SECTION_ORDER);
    expect(sheet.sections.map((section) => section.entries[0].id)).toEqual(["bring", "start", "step-1", "loot", "fail"]);
  });

  it("preserves authored execution order", () => {
    const sheet = buildActivityCheatSheet(buildActivityBriefing(definition(), readiness()));
    expect(sheet.sections.find((section) => section.key === "execute")?.entries.map((entry) => entry.id)).toEqual(["step-1", "step-2"]);
  });

  it("carries the readiness headline and next action without recreating readiness logic", () => {
    const sheet = buildActivityCheatSheet(buildActivityBriefing(definition(), readiness()));
    expect(sheet.readinessStatus).toBe("nearly-ready");
    expect(sheet.readinessHeadline).toMatch(/nearly ready/i);
    expect(sheet.nextAction).toBe("Load the missing supply.");
  });

  it("keeps readiness explicitly unassessed when the briefing has no readiness result", () => {
    const sheet = buildActivityCheatSheet(buildActivityBriefing(definition()));
    expect(sheet.readinessStatus).toBe("not-assessed");
    expect(sheet.readinessHeadline).toMatch(/not been assessed/i);
    expect(sheet.nextAction).toBeNull();
  });

  it("does not include explanatory or progression sections in the compact execution view", () => {
    const sheet = buildActivityCheatSheet(buildActivityBriefing(definition(), readiness()));
    const serialized = JSON.stringify(sheet.sections);
    expect(serialized).not.toContain("Example activity overview");
    expect(serialized).not.toContain("Example value");
    expect(serialized).not.toContain("Advance the progression goal");
  });
});
