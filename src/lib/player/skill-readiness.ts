import { esi } from "@/lib/esi/client";
import type { EsiSkills } from "@/lib/esi/types";
import { buildSkillReadinessIndex, type SkillReadinessIndex } from "./skill-readiness-core";

export {
  buildSkillReadinessIndex,
  readinessForSkillRequirement,
  type PlayerSkillLevel,
  type SkillReadinessIndex,
  type SkillReadinessStatus,
  type SkillRequirementReadiness,
} from "./skill-readiness-core";

export async function loadCharacterSkillReadiness(characterId: number, token: string): Promise<SkillReadinessIndex> {
  try {
    const skills = await esi<EsiSkills>(`/characters/${characterId}/skills`, { token });
    return buildSkillReadinessIndex(skills);
  } catch (error) {
    console.warn("Unable to load character skills for Item Explorer readiness", error);
    return { visibility: "unavailable", reason: "esi-unavailable", bySkill: new Map() };
  }
}
