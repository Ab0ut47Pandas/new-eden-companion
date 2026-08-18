import { describe, expect, it } from "vitest";

import {
  buildActivityDebrief,
  directGoalTargetEvidence,
  interpretActivityDebriefItem,
  type ActivityDebriefItemDelta,
} from "./debrief";

const item: ActivityDebriefItemDelta = { typeId: 34, name: "Example Material", quantity: 12 };

describe("post-activity debrief", () => {
  it("matches newly acquired items to direct active item goals", () => {
    const evidence = directGoalTargetEvidence(item, [
      { id: "active", title: "Collect Example Material", status: "active", targetTypeId: 34 },
      { id: "completed", title: "Old Goal", status: "completed", targetTypeId: 34 },
      { id: "other", title: "Other Item", status: "active", targetTypeId: 35 },
    ]);

    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({ goalId: "active", relationship: "goal-target" });
    expect(evidence[0].nextAction).toMatch(/review progress/i);
  });

  it("prefers an evidence-backed immediate use over keep or sell", () => {
    const result = interpretActivityDebriefItem({
      item,
      goalEvidence: [{
        goalId: "goal",
        goalTitle: "Build the next thing",
        relationship: "required-input",
        why: "This material is a required input for the active goal.",
        nextAction: "Open the goal plan and use this material in the next step.",
      }],
      saleEvidence: { why: "A caller supplied market evidence supporting a sale." },
    });

    expect(result.disposition).toBe("use-next");
    expect(result.nextAction).toMatch(/goal plan/i);
  });

  it("keeps goal-relevant items when the next use is not yet established", () => {
    const result = interpretActivityDebriefItem({
      item,
      goalEvidence: [{
        goalId: "goal",
        goalTitle: "Future build",
        relationship: "supported-use",
        why: "The acquisition graph establishes that this item supports the active goal.",
      }],
    });

    expect(result.disposition).toBe("keep");
    expect(result.nextAction).toBeNull();
  });

  it("only recommends selling when explicit sale evidence is supplied", () => {
    const sold = interpretActivityDebriefItem({
      item,
      saleEvidence: {
        why: "The caller established that this item is not goal-relevant and supplied a supported liquidation rule.",
        estimatedUnitValueIsk: 1250,
        asOf: 1_800_000_000_000,
        source: "market adapter",
      },
    });
    expect(sold.disposition).toBe("sell");

    const unknown = interpretActivityDebriefItem({ item });
    expect(unknown.disposition).toBe("unknown");
    expect(unknown.why).toMatch(/no active-goal relationship or explicit sale evidence/i);
  });

  it("orders useful items first while keeping the reason visible", () => {
    const debrief = buildActivityDebrief([
      { item: { typeId: 4, name: "Unknown", quantity: 1 } },
      { item: { typeId: 3, name: "Sell", quantity: 1 }, saleEvidence: { why: "Supported sale evidence." } },
      { item: { typeId: 2, name: "Keep", quantity: 1 }, goalEvidence: [{ goalId: "g2", goalTitle: "Goal", relationship: "supported-use", why: "Supports Goal." }] },
      { item: { typeId: 1, name: "Use", quantity: 1 }, goalEvidence: [{ goalId: "g1", goalTitle: "Goal", relationship: "required-input", why: "Needed now.", nextAction: "Use it now." }] },
    ]);

    expect(debrief.items.map((entry) => entry.disposition)).toEqual(["use-next", "keep", "sell", "unknown"]);
    expect(debrief.counts).toEqual({ "use-next": 1, keep: 1, sell: 1, unknown: 1 });
  });

  it("rejects duplicate item types and invalid quantities instead of double-counting loot", () => {
    expect(() => buildActivityDebrief([
      { item },
      { item: { ...item, quantity: 1 } },
    ])).toThrow(/duplicate debrief item type id/i);

    expect(() => interpretActivityDebriefItem({ item: { ...item, quantity: 0 } })).toThrow(/quantity must be a positive integer/i);
  });
});
