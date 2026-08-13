import type { TrainedSkillView } from "@/lib/dashboard/model";
import type { RankedShip, ShipActivity, ShipCatalogEntry } from "@/lib/ships/model";

const FOUNDATION_SKILLS = [
  "CPU Management",
  "Power Grid Management",
  "Capacitor Management",
  "Capacitor Systems Operation",
  "Mechanics",
  "Hull Upgrades",
  "Navigation",
  "Evasive Maneuvering",
  "Warp Drive Operation",
  "Weapon Upgrades",
  "Advanced Weapon Upgrades",
  "Long Range Targeting",
  "Signature Analysis",
  "Target Management",
];

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function levelByName(skills: TrainedSkillView[]): Map<string, number> {
  return new Map(skills.map((skill) => [skill.name, skill.activeLevel]));
}

function normalized(levels: Map<string, number>, names: string[], target = 4): number {
  return average(names.map((name) => Math.min(1, (levels.get(name) ?? 0) / target)));
}

function activitySupport(activity: ShipActivity, levels: Map<string, number>): number {
  const weapon = Math.max(
    normalized(levels, ["Gunnery"], 5),
    normalized(levels, ["Missile Launcher Operation"], 5),
    normalized(levels, ["Drones"], 5),
  );
  const tank = Math.max(
    normalized(levels, ["Mechanics", "Hull Upgrades", "Repair Systems"]),
    normalized(levels, ["Shield Operation", "Shield Management", "Tactical Shield Manipulation"]),
  );

  switch (activity) {
    case "Combat":
      return weapon * 0.55 + tank * 0.3 + normalized(levels, ["Target Management", "Signature Analysis"]) * 0.15;
    case "Exploration":
      return normalized(levels, ["Astrometrics", "Hacking", "Archaeology", "Cloaking", "Navigation"]);
    case "Hauling":
      return normalized(levels, ["Evasive Maneuvering", "Warp Drive Operation", "Navigation", "Hull Upgrades", "Shield Management"]);
    case "Industry":
      return normalized(levels, ["Mining", "Astrogeology", "Mining Upgrades", "Drones", "Shield Management"]);
    case "Logistics":
      return normalized(levels, ["Remote Armor Repair Systems", "Shield Emission Systems", "Capacitor Emission Systems", "Drones", "Repair Systems"]);
    case "Travel":
      return normalized(levels, ["Navigation", "Evasive Maneuvering", "Warp Drive Operation"]);
  }
}

function utilityPenalty(group: string): number {
  if (group === "Capsule") return 35;
  if (group === "Shuttle") return 25;
  if (group === "Corvette") return 20;
  if (group === "Special Edition Yachts") return 8;
  return 0;
}

export function rankShips(catalog: ShipCatalogEntry[], trained: TrainedSkillView[]): RankedShip[] {
  const byId = new Map(trained.map((skill) => [skill.skillId, skill.activeLevel]));
  const byName = levelByName(trained);
  const foundationScore = normalized(byName, FOUNDATION_SKILLS, 5);

  const ranked = catalog.map((ship) => {
    const requirements = ship.requirements.length ? ship.requirements : [{ skillId: 0, skillName: "Unverified requirement", level: 1 }];
    const requirementProgress = average(requirements.map((requirement) =>
      Math.min(1, (byId.get(requirement.skillId) ?? 0) / Math.max(1, requirement.level)),
    ));
    const gaps = requirements
      .map((requirement) => ({ ...requirement, currentLevel: byId.get(requirement.skillId) ?? 0 }))
      .filter((requirement) => requirement.currentLevel < requirement.level);
    const canFly = gaps.length === 0 && ship.requirements.length > 0;
    const masteryRequirements = requirements.filter((requirement) => requirement.skillName !== "Spaceship Command");
    const masteryBase = masteryRequirements.length ? masteryRequirements : requirements;
    const hullMastery = average(masteryBase.map((requirement) => Math.min(1, (byId.get(requirement.skillId) ?? 0) / 5)));
    const supportScore = activitySupport(ship.activity, byName);
    const rawScore = canFly
      ? 50 + hullMastery * 25 + foundationScore * 10 + supportScore * 15
      : requirementProgress * 48 + foundationScore * 4 + supportScore * 3;
    const score = Math.max(0, Math.round(rawScore - utilityPenalty(ship.group)));
    const tier: RankedShip["tier"] = !canFly
      ? "Training required"
      : score >= 85
        ? "Mastered"
        : score >= 74
          ? "Strong match"
          : score >= 62
            ? "Usable now"
            : "Barely trained";
    const relevant = masteryBase
      .map((requirement) => ({ name: requirement.skillName, level: byId.get(requirement.skillId) ?? 0 }))
      .sort((left, right) => right.level - left.level || left.name.localeCompare(right.name));

    return {
      ...ship,
      rank: 0,
      score,
      canFly,
      tier,
      requirementProgress,
      hullMastery,
      supportScore,
      foundationScore,
      gaps,
      strongestSkill: relevant[0],
      weakestSkill: relevant.at(-1),
    };
  });

  return ranked
    .sort((left, right) => Number(right.canFly) - Number(left.canFly) || right.score - left.score || left.name.localeCompare(right.name))
    .map((ship, index) => ({ ...ship, rank: index + 1 }));
}
