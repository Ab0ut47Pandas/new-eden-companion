import { describe, expect, it } from "vitest";

import type { TrainedSkillView } from "@/lib/dashboard/model";
import type { ShipCatalogEntry } from "@/lib/ships/model";
import { rankShips } from "@/lib/ships/ranking";

function trained(skillId: number, name: string, level: number): TrainedSkillView {
  return { skillId, name, activeLevel: level, trainedLevel: level, skillpoints: 1 };
}

describe("rankShips", () => {
  const catalog: ShipCatalogEntry[] = [
    {
      typeId: 670,
      name: "Capsule",
      groupId: 29,
      group: "Capsule",
      size: "Small",
      activity: "Travel",
      requirements: [{ skillId: 3327, skillName: "Spaceship Command", level: 1 }],
    },
    {
      typeId: 47466,
      name: "Praxis",
      groupId: 27,
      group: "Battleship",
      size: "Large",
      activity: "Combat",
      requirements: [{ skillId: 3327, skillName: "Spaceship Command", level: 1 }],
    },
    {
      typeId: 642,
      name: "Apocalypse",
      groupId: 27,
      group: "Battleship",
      size: "Large",
      activity: "Combat",
      requirements: [{ skillId: 3339, skillName: "Amarr Battleship", level: 1 }],
    },
    {
      typeId: 638,
      name: "Raven",
      groupId: 27,
      group: "Battleship",
      size: "Large",
      activity: "Combat",
      requirements: [{ skillId: 3338, skillName: "Caldari Battleship", level: 1 }],
    },
  ];

  const skills = [
    trained(3327, "Spaceship Command", 5),
    trained(3339, "Amarr Battleship", 2),
    trained(3319, "Missile Launcher Operation", 5),
    trained(3413, "Power Grid Management", 5),
    trained(3426, "CPU Management", 5),
    trained(3418, "Capacitor Management", 5),
    trained(3417, "Capacitor Systems Operation", 5),
    trained(3392, "Mechanics", 5),
    trained(3394, "Hull Upgrades", 5),
    trained(3449, "Navigation", 5),
  ];

  it("always ranks ships the character can board above locked hulls", () => {
    const ranked = rankShips(catalog, skills);
    expect(ranked.at(-1)?.name).toBe("Raven");
    expect(ranked.at(-1)?.canFly).toBe(false);
    expect(ranked.slice(0, 2).every((ship) => ship.canFly)).toBe(true);
  });

  it("reports the exact missing requirement", () => {
    const raven = rankShips(catalog, skills).find((ship) => ship.name === "Raven");
    expect(raven?.gaps).toEqual([{ skillId: 3338, skillName: "Caldari Battleship", level: 1, currentLevel: 0 }]);
  });

  it("does not let a capsule outrank practical hulls just because Spaceship Command is high", () => {
    const ranked = rankShips(catalog, skills);
    expect(ranked.findIndex((ship) => ship.name === "Capsule")).toBeGreaterThan(ranked.findIndex((ship) => ship.name === "Praxis"));
  });
});
