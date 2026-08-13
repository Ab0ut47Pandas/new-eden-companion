import { describe, expect, it } from "vitest";

import { demoDashboard } from "@/lib/dashboard/demo";
import { buildCombatTrainingPlan, stageClipboardText } from "@/lib/training/combat-plan";

const MAGIC_14 = [
  "CPU Management", "Power Grid Management", "Capacitor Management", "Capacitor Systems Operation",
  "Mechanics", "Hull Upgrades", "Shield Management", "Shield Operation", "Long Range Targeting",
  "Signature Analysis", "Navigation", "Evasive Maneuvering", "Warp Drive Operation", "Spaceship Command",
];

describe("combat training plan", () => {
  it("recognizes an already-complete Magic 14 foundation", () => {
    const data = demoDashboard();
    data.skills.trained = [
      ...MAGIC_14.map((name, index) => ({ skillId: 10_000 + index, name, trainedLevel: 5, activeLevel: 5, skillpoints: 256_000 })),
      { skillId: 11207, name: "Advanced Weapon Upgrades", trainedLevel: 5, activeLevel: 5, skillpoints: 1_536_000 },
    ];
    const plan = buildCombatTrainingPlan(data);
    expect(plan.foundation.magic14AtFive).toBe(14);
    expect(plan.foundation.advancedWeaponUpgrades).toBe(5);
    expect(plan.foundation.message).toContain("specialization");
  });

  it("marks trained and buried queue levels separately", () => {
    const data = demoDashboard();
    data.skills.trained = [
      { skillId: 1, name: "Heavy Missiles", trainedLevel: 5, activeLevel: 5, skillpoints: 768_000 },
      { skillId: 2, name: "Rapid Launch", trainedLevel: 3, activeLevel: 3, skillpoints: 16_000 },
    ];
    data.skills.queue = [{ skillId: 2, name: "Rapid Launch", targetLevel: 4, active: false }];
    const main = buildCombatTrainingPlan(data).stages[0];
    expect(main.steps.find((step) => step.skill === "Rapid Launch")?.status).toBe("queued");
    expect(main.steps.find((step) => step.skill === "Warhead Upgrades")?.status).toBe("needed");
  });

  it("copies only unfinished levels", () => {
    const data = demoDashboard();
    data.skills.trained = [{ skillId: 1, name: "Caldari Battlecruiser", trainedLevel: 3, activeLevel: 3, skillpoints: 48_000 }];
    const main = buildCombatTrainingPlan(data).stages[0];
    const text = stageClipboardText(main);
    expect(text).not.toContain("Caldari Battlecruiser III");
    expect(text).toContain("Caldari Battlecruiser IV");
    expect(text).toContain("Rapid Launch IV");
  });
});
