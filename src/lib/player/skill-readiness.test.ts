import { describe, expect, it } from "vitest";

import { buildSkillReadinessIndex, readinessForSkillRequirement } from "./skill-readiness-core";

describe("player skill readiness", () => {
  const index = buildSkillReadinessIndex({
    total_sp: 12345,
    skills: [
      { skill_id: 100, trained_skill_level: 4, active_skill_level: 4, skillpoints_in_skill: 1000 },
      { skill_id: 101, trained_skill_level: 2, active_skill_level: 2, skillpoints_in_skill: 500 },
    ],
  });

  it("marks a trained requirement as met", () => {
    expect(readinessForSkillRequirement(index, 100, 3)).toMatchObject({
      status: "met",
      trainedLevel: 4,
      requiredLevel: 3,
      missingLevels: 0,
    });
  });

  it("distinguishes below-required from untrained", () => {
    expect(readinessForSkillRequirement(index, 101, 4)).toMatchObject({
      status: "below-required",
      trainedLevel: 2,
      missingLevels: 2,
    });
    expect(readinessForSkillRequirement(index, 102, 1)).toMatchObject({
      status: "not-trained",
      trainedLevel: 0,
      missingLevels: 1,
    });
  });

  it("keeps unavailable skill visibility distinct from an untrained skill", () => {
    expect(readinessForSkillRequirement(
      { visibility: "unavailable", reason: "esi-unavailable", bySkill: new Map() },
      100,
      3,
    )).toMatchObject({ status: "unavailable", requiredLevel: 3 });
  });

  it("rejects impossible required levels", () => {
    expect(() => readinessForSkillRequirement(index, 100, 6)).toThrow("requiredLevel");
  });
});
