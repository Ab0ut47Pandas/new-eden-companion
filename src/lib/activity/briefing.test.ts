import { describe, expect, it } from "vitest";

import type { ReadinessExplanation } from "../readiness/explanation";
import {
  ACTIVITY_BRIEFING_SECTION_ORDER,
  buildActivityBriefing,
  type ActivityBriefingDefinition,
} from "./briefing";

function definition(overrides: Partial<ActivityBriefingDefinition> = {}): ActivityBriefingDefinition {
  return {
    id: "example-activity",
    title: "Example activity",
    subtitle: "A reusable briefing fixture",
    whatItIs: "A concise explanation of the activity itself.",
    whyCare: "A concise explanation of why this activity matters to the player.",
    whatToBring: [{ id: "ship", label: "Bring the prepared ship", tone: "required" }],
    howToStart: [{ id: "start", label: "Open the activity entry point" }],
    whatToDo: [
      { id: "first", label: "Do the first step" },
      { id: "second", label: "Do the second step" },
    ],
    lootKeepSell: [{ id: "loot", label: "Review the relevant rewards", tone: "info" }],
    failureConditions: [{ id: "failure", label: "Know the explicit failure condition", tone: "warning" }],
    unlocksNext: [{ id: "next", label: "Use the result for the next progression step" }],
    ...overrides,
  };
}

function readiness(overrides: Partial<ReadinessExplanation> = {}): ReadinessExplanation {
  return {
    status: "ready",
    headline: "Ready based on the requirements NEC assessed.",
    why: "Every assessed applicable requirement is met.",
    technicalEligibility: "eligible",
    primaryIssue: null,
    nextAction: null,
    blockers: [],
    gaps: [],
    warnings: [],
    unknowns: [],
    satisfied: [],
    ...overrides,
  };
}

describe("activity briefing", () => {
  it("always produces the standard briefing sections in deterministic order", () => {
    const briefing = buildActivityBriefing(definition(), readiness());
    expect(briefing.sections.map((section) => section.key)).toEqual(ACTIVITY_BRIEFING_SECTION_ORDER);
  });

  it("preserves authored execution order instead of inventing a new sequence", () => {
    const briefing = buildActivityBriefing(definition(), readiness());
    const execution = briefing.sections.find((section) => section.key === "what-to-do");
    expect(execution?.entries.map((entry) => entry.id)).toEqual(["first", "second"]);
  });

  it("keeps readiness explicitly unknown when no assessment was supplied", () => {
    const briefing = buildActivityBriefing(definition());
    const ready = briefing.sections.find((section) => section.key === "am-i-ready");
    expect(briefing.readiness).toBeNull();
    expect(ready?.summary).toMatch(/not been assessed/i);
    expect(ready?.entries[0].tone).toBe("unknown");
  });

  it("surfaces the readiness engine primary issue and corrective action", () => {
    const briefing = buildActivityBriefing(
      definition(),
      readiness({
        status: "not-recommended",
        headline: "Not recommended yet.",
        why: "A hard requirement is unmet: ship restriction.",
        technicalEligibility: "blocked",
        primaryIssue: {
          id: "activity:ship",
          dimension: "ship-fit",
          requirement: "hard",
          state: "unmet",
          summary: "Ship restriction",
          why: "This activity does not accept the selected hull.",
        },
        nextAction: "Switch to an allowed hull.",
      }),
    );

    const ready = briefing.sections.find((section) => section.key === "am-i-ready");
    expect(ready?.entries[0]).toMatchObject({ label: "Ship restriction", tone: "required" });
    expect(ready?.entries[1]).toMatchObject({ label: "Next action", detail: "Switch to an allowed hull.", tone: "required" });
  });

  it("requires every actionable briefing section to say something explicitly", () => {
    expect(() => buildActivityBriefing(definition({ whatToBring: [] }))).toThrow(/what-to-bring.*at least one explicit entry/i);
    expect(() => buildActivityBriefing(definition({ unlocksNext: [] }))).toThrow(/unlocks-next.*at least one explicit entry/i);
  });

  it("rejects duplicate entry ids inside a section", () => {
    expect(() => buildActivityBriefing(definition({
      howToStart: [
        { id: "same", label: "One" },
        { id: "same", label: "Two" },
      ],
    }))).toThrow(/duplicate activity briefing entry id same/i);
  });

  it("rejects blank core explanations rather than presenting empty cards as knowledge", () => {
    expect(() => buildActivityBriefing(definition({ whatItIs: "   " }))).toThrow(/what-it-is summary must not be empty/i);
    expect(() => buildActivityBriefing(definition({ whyCare: "" }))).toThrow(/why-care summary must not be empty/i);
  });
});
