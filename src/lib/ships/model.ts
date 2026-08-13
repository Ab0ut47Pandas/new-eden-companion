export type ShipActivity = "Combat" | "Exploration" | "Hauling" | "Industry" | "Logistics" | "Travel";
export type ShipSize = "Small" | "Medium" | "Large" | "Capital";

export interface ShipSkillRequirement {
  skillId: number;
  skillName: string;
  level: number;
}

export interface ShipCatalogEntry {
  typeId: number;
  name: string;
  groupId: number;
  group: string;
  size: ShipSize;
  activity: ShipActivity;
  requirements: ShipSkillRequirement[];
}

export interface RankedShip extends ShipCatalogEntry {
  rank: number;
  score: number;
  canFly: boolean;
  tier: "Mastered" | "Strong match" | "Usable now" | "Barely trained" | "Training required";
  requirementProgress: number;
  hullMastery: number;
  supportScore: number;
  foundationScore: number;
  gaps: Array<ShipSkillRequirement & { currentLevel: number }>;
  strongestSkill?: { name: string; level: number };
  weakestSkill?: { name: string; level: number };
}

export interface ShipCatalogResponse {
  fetchedAt: string;
  source: "ESI";
  ships: ShipCatalogEntry[];
}
