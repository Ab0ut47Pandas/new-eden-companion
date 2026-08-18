import { describe, expect, it } from "vitest";

import {
  ABYSSAL_LOOT_FAMILIES,
  TRIGLAVIAN_SURVEY_DATABASE_NPC_BUY_ISK,
  TRIGLAVIAN_SURVEY_DATABASE_TYPE_ID,
  abyssalLootContainersForTier,
  noOrdinaryNpcWreckLootGuidance,
  teachAbyssalLootItem,
} from "./abyssal-loot";

describe("Abyssal loot teaching", () => {
  it("teaches T0 as main-cache only and enables side nodes from T1 upward", () => {
    expect(abyssalLootContainersForTier(0).map((container) => container.id)).toEqual(["bioadaptive-cache"]);
    expect(abyssalLootContainersForTier(1).map((container) => container.id)).toEqual([
      "bioadaptive-cache",
      "extraction-node",
      "extraction-subnode",
    ]);
  });

  it("teaches the main cache as higher priority than optional side loot", () => {
    const containers = abyssalLootContainersForTier(3);
    expect(containers.find((container) => container.id === "bioadaptive-cache")?.role).toBe("main");
    expect(containers.filter((container) => container.role === "optional-side")).toHaveLength(2);
    expect(containers.find((container) => container.id === "extraction-node")?.timerPriority).toMatch(/skip side nodes/i);
  });

  it("documents that combat NPCs are not the ordinary loot/wreck source", () => {
    expect(noOrdinaryNpcWreckLootGuidance()).toMatch(/do not leave ordinary loot\/salvage wrecks or bounties/i);
    expect(noOrdinaryNpcWreckLootGuidance()).toMatch(/Bioadaptive Cache as the main loot source/i);
  });

  it("cash-outs Triglavian Survey Databases through explicit red-loot evidence", () => {
    const taught = teachAbyssalLootItem({
      item: { typeId: TRIGLAVIAN_SURVEY_DATABASE_TYPE_ID, name: "Triglavian Survey Database", quantity: 7 },
      family: "red-loot",
    });

    expect(taught.recommendation.disposition).toBe("sell");
    expect(taught.recommendation.saleEvidence?.estimatedUnitValueIsk).toBe(TRIGLAVIAN_SURVEY_DATABASE_NPC_BUY_ISK);
    expect(taught.guidance).toMatch(/NPC buy orders/i);
  });

  it("lets active-goal evidence outrank red-loot cash-out", () => {
    const taught = teachAbyssalLootItem({
      item: { typeId: TRIGLAVIAN_SURVEY_DATABASE_TYPE_ID, name: "Triglavian Survey Database", quantity: 7 },
      family: "red-loot",
      goalEvidence: [{
        goalId: "goal",
        goalTitle: "Use survey databases",
        relationship: "required-input",
        why: "The active goal explicitly requires these databases.",
        nextAction: "Keep these for the next goal step.",
      }],
    });

    expect(taught.recommendation.disposition).toBe("use-next");
    expect(taught.recommendation.nextAction).toMatch(/keep these/i);
  });

  it("does not auto-sell filaments, mutaplasmids, BPCs, materials, modules, or unknown drops", () => {
    const families = ABYSSAL_LOOT_FAMILIES.filter((family) => family.id !== "red-loot");
    for (const [index, family] of families.entries()) {
      const taught = teachAbyssalLootItem({
        item: { typeId: 60_000 + index, name: `Example ${family.title}`, quantity: 1 },
        family: family.id,
      });
      expect(taught.recommendation.disposition, family.id).toBe("unknown");
      expect(family.automaticSellSafe, family.id).toBe(false);
    }
  });

  it("keeps goal-relevant production loot instead of liquidating it", () => {
    const taught = teachAbyssalLootItem({
      item: { typeId: 17_888, name: "Zero-Point Condensate", quantity: 12 },
      family: "abyssal-material",
      goalEvidence: [{
        goalId: "ship-goal",
        goalTitle: "Build a Triglavian hull",
        relationship: "required-input",
        why: "This material is required by the active manufacturing goal.",
      }],
    });
    expect(taught.recommendation.disposition).toBe("keep");
    expect(taught.guidance).toMatch(/saved manufacturing\/item goals/i);
  });

  it("rejects invalid tiers instead of silently changing container rules", () => {
    expect(() => abyssalLootContainersForTier(-1)).toThrow(/0 through 6/i);
    expect(() => abyssalLootContainersForTier(7)).toThrow(/0 through 6/i);
  });
});
