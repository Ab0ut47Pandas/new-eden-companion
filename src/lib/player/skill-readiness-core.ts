import type { EsiSkills } from "@/lib/esi/types";

export type SkillReadinessStatus = "met" | "below-required" | "not-trained" | "unavailable";

export interface PlayerSkillLevel {
  skillTypeId: number;
  trainedLevel: number;
  activeLevel: number;
}

export interface SkillReadinessIndex {
  visibility: "available" | "unavailable";
  reason?: "esi-unavailable";
  bySkill: Map<number, PlayerSkillLevel>;
}

export interface SkillRequirementReadiness extends PlayerSkillLevel {
  requiredLevel: number;
  missingLevels: number;
  status: SkillReadinessStatus;
}

export function buildSkillReadinessIndex(skills: EsiSkills): SkillReadinessIndex {
  const bySkill = new Map<number, PlayerSkillLevel>();
  for (const skill of skills.skills) {
    bySkill.set(skill.skill_id, {
      skillTypeId: skill.skill_id,
      trainedLevel: Math.max(0, skill.trained_skill_level),
      activeLevel: Math.max(0, skill.active_skill_level),
    });
  }
  return { visibility: "available", bySkill };
}

export function readinessForSkillRequirement(
  index: SkillReadinessIndex,
  skillTypeId: number,
  requiredLevel: number,
): SkillRequirementReadiness {
  if (!Number.isInteger(requiredLevel) || requiredLevel < 0 || requiredLevel > 5) {
    throw new RangeError("requiredLevel must be an integer from 0 through 5.");
  }

  const current = index.bySkill.get(skillTypeId) ?? {
    skillTypeId,
    trainedLevel: 0,
    activeLevel: 0,
  };

  if (index.visibility === "unavailable") {
    return {
      ...current,
      requiredLevel,
      missingLevels: requiredLevel,
      status: "unavailable",
    };
  }

  const missingLevels = Math.max(0, requiredLevel - current.trainedLevel);
  const status: SkillReadinessStatus = current.trainedLevel >= requiredLevel
    ? "met"
    : current.trainedLevel > 0
      ? "below-required"
      : "not-trained";

  return { ...current, requiredLevel, missingLevels, status };
}
