import { describe, expect, it } from "vitest";

import type { TrainedSkillView } from "@/lib/dashboard/model";
import { assessMiningReadiness, type MiningReadinessInput } from "@/lib/activity/mining-readiness";
import type { ShipCatalogEntry } from "@/lib/ships/model";

function skill(skillId: number, name: string, level: number): TrainedSkillView {
  return { skillId, name, trainedLevel: level, activeLevel: level, skillpoints: 0 };
}

const pioneer: ShipCatalogEntry = {
  typeId: 1,
  name: "Pioneer",
  groupId: 1,
  group: "Mining Destroyer",
  size: "Small",
  activity: "Industry",
  requirements: [{ skillId: 9001, skillName: "Mining Destroyer", level: 1 }],
};

const retriever: ShipCatalogEntry = {
  typeId: 2,
  name: "Retriever",
  groupId: 2,
  group: "Mining Barge",
  size: "Medium",
  activity: "Industry",
  requirements: [{ skillId: 9002, skillName: "Mining Barge", level: 1 }],
};

const pioneerSkills = [
  skill(1, "Mining", 4),
  skill(2, "Astrogeology", 3),
  skill(3, "Mining Upgrades", 4),
  skill(4, "CPU Management", 4),
  skill(5, "Power Grid Management", 3),
  skill(6, "Shield Operation", 3),
  skill(7, "Shield Management", 3),
  skill(8, "Shield Upgrades", 3),
  skill(9, "Navigation", 3),
  skill(9001, "Mining Destroyer", 1),
];

const retrieverSkills = [
  skill(1, "Mining", 5),
  skill(2, "Astrogeology", 4),
  skill(3, "Mining Upgrades", 4),
  skill(4, "CPU Management", 4),
  skill(5, "Power Grid Management", 3),
  skill(6, "Shield Operation", 3),
  skill(7, "Shield Management", 3),
  skill(8, "Shield Upgrades", 3),
  skill(9, "Navigation", 3),
  skill(10, "Tactical Shield Manipulation", 4),
  skill(9002, "Mining Barge", 1),
  skill(11, "Simple Ore Processing", 3),
];

function readyPioneer(overrides: Partial<MiningReadinessInput> = {}): MiningReadinessInput {
  return {
    taskId: "mining-simple",
    catalog: [pioneer],
    trained: pioneerSkills,
    ownedShipNames: new Set(["Pioneer"]),
    supplies: [
      { label: "No crystals required with these scoped T1 mining lasers", state: "available" },
      { label: "Spare light combat drones", state: "available" },
    ],
    location: { state: "reachable", label: "Confirmed asteroid belt" },
    goalReasons: ["Need Tritanium for a saved manufacturing goal"],
    ...overrides,
  };
}

describe("mining readiness integration", () => {
  it("reuses the existing mining fit planner and reaches an actionable ready state", () => {
    const result = assessMiningReadiness(readyPioneer());

    expect(result.task.id).toBe("mining-simple");
    expect(result.recommendedFit?.shipName).toBe("Pioneer");
    expect(result.recommendedFit?.owned).toBe(true);
    expect(result.recommendedFit?.canUseTemplate).toBe(true);
    expect(result.readiness.technicalEligibility.status).toBe("eligible");
    expect(result.nextAction).toContain("Use Pioneer");
  });

  it("turns a required fit skill gap into a hard blocker and next action", () => {
    const trained = pioneerSkills.map((entry) => entry.name === "Mining" ? { ...entry, trainedLevel: 3, activeLevel: 3 } : entry);
    const result = assessMiningReadiness(readyPioneer({ trained }));

    expect(result.readiness.technicalEligibility.status).toBe("blocked");
    expect(result.readiness.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ dimension: "skills", requirement: "hard", state: "unmet", summary: "Mining 4 is required." }),
    ]));
    expect(result.nextAction).toContain("Train Mining 4");
  });

  it("keeps unverified supplies unknown instead of assuming the fit is stocked", () => {
    const result = assessMiningReadiness(readyPioneer({ supplies: undefined }));
    const supply = result.readiness.findings.find((finding) => finding.id === "mining-supply-1");

    expect(supply?.state).toBe("unknown");
    expect(result.nextAction).toContain("Verify");
  });

  it("surfaces resource-processing skill readiness separately", () => {
    const result = assessMiningReadiness({
      taskId: "mining-simple",
      catalog: [retriever],
      trained: retrieverSkills,
      ownedShipNames: new Set(["Retriever"]),
      location: { state: "reachable" },
      goalReasons: ["Need simple ore for a build"],
    });

    expect(result.recommendedFit?.shipName).toBe("Retriever");
    expect(result.processingSkills).toEqual([
      expect.objectContaining({ name: "Simple Ore Processing", current: 3, required: 4, requiredMet: false }),
    ]);
    expect(result.nextAction).toContain("Train Simple Ore Processing 4");
  });

  it("preserves goal relevance and unknown location without inventing either", () => {
    const withGoal = assessMiningReadiness(readyPioneer({ location: undefined }));
    expect(withGoal.goalReasons).toEqual(["Need Tritanium for a saved manufacturing goal"]);
    expect(withGoal.readiness.technicalEligibility.status).toBe("unknown");

    const withoutGoal = assessMiningReadiness(readyPioneer({ goalReasons: [] }));
    expect(withoutGoal.readiness.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "mining-goal", state: "unknown" }),
    ]));
  });

  it("rejects an unknown mining task rather than silently substituting another resource", () => {
    expect(() => assessMiningReadiness(readyPioneer({ taskId: "mining-not-real" }))).toThrow("Unknown mining task");
  });
});
