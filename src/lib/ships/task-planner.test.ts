import { describe, expect, it } from "vitest";

import type { TrainedSkillView } from "@/lib/dashboard/model";
import type { ShipCatalogEntry } from "@/lib/ships/model";
import { recommendFits, SHIP_TASKS } from "@/lib/ships/task-planner";

function skill(skillId: number, name: string, level: number): TrainedSkillView {
  return { skillId, name, trainedLevel: level, activeLevel: level, skillpoints: 1 };
}

describe("task-specific ship recommendations", () => {
  const catalog: ShipCatalogEntry[] = [
    { typeId: 47466, name: "Praxis", groupId: 27, group: "Battleship", size: "Large", activity: "Combat", requirements: [{ skillId: 3327, skillName: "Spaceship Command", level: 1 }] },
    { typeId: 638, name: "Raven", groupId: 27, group: "Battleship", size: "Large", activity: "Combat", requirements: [{ skillId: 3338, skillName: "Caldari Battleship", level: 1 }] },
    { typeId: 642, name: "Apocalypse", groupId: 27, group: "Battleship", size: "Large", activity: "Combat", requirements: [{ skillId: 3339, skillName: "Amarr Battleship", level: 1 }] },
  ];

  const trained = [
    skill(3327, "Spaceship Command", 5),
    skill(3338, "Caldari Battleship", 0),
    skill(3339, "Amarr Battleship", 2),
    skill(3319, "Missile Launcher Operation", 5),
    skill(3324, "Heavy Missiles", 5),
    skill(3300, "Gunnery", 5),
    skill(3309, "Large Energy Turret", 4),
    skill(3436, "Drones", 5),
    skill(3442, "Drone Interfacing", 3),
    skill(3441, "Heavy Drone Operation", 3),
    skill(3413, "Power Grid Management", 5),
    skill(3426, "CPU Management", 5),
    skill(3418, "Capacitor Management", 5),
    skill(3449, "Navigation", 5),
    skill(3428, "Long Range Targeting", 5),
    skill(3431, "Signature Analysis", 5),
    skill(3424, "Shield Operation", 5),
    skill(3416, "Shield Management", 5),
    skill(3425, "Shield Upgrades", 5),
    skill(3427, "Tactical Shield Manipulation", 4),
    skill(3392, "Mechanics", 5),
    skill(3394, "Hull Upgrades", 5),
    skill(3393, "Repair Systems", 3),
  ];

  it("keeps boarding, template, and target readiness as separate claims", () => {
    const task = SHIP_TASKS.find((item) => item.id === "security-l4")!;
    const recommendations = recommendFits(task, catalog, trained, new Set(["Praxis"]));
    const raven = recommendations.find((item) => item.shipName === "Raven")!;
    expect(raven.canBoard).toBe(false);
    expect(raven.boardingGaps[0].skillName).toBe("Caldari Battleship");
    expect(raven.targetsMet).toBeLessThan(raven.targetTotal);
    expect(recommendations[0].shipName).toBe("Praxis");
  });

  it("includes the beginner mission ladder and all three T0 entry formats", () => {
    expect(SHIP_TASKS.some((task) => task.id === "security-l1")).toBe(true);
    expect(SHIP_TASKS.some((task) => task.id === "security-l2")).toBe(true);
    for (const id of ["abyssal-t0-cruiser", "abyssal-t0-destroyer", "abyssal-t0-frigate"]) {
      expect(SHIP_TASKS.find((task) => task.id === id)?.fits).toHaveLength(3);
    }
  });
});
