import { describe, expect, it } from "vitest";

import {
  MISSION_BOUNDARIES,
  MISSION_COMBAT_HABITS,
  MISSION_LEVELS,
  MISSION_SOURCES,
  validateMissionPveGuide,
} from "./mission-pve-guide";

describe("mission PvE progression guide", () => {
  it("uses the current CCP standing gates for agent levels", () => {
    expect(MISSION_LEVELS.map((entry) => [entry.level, entry.minimumStanding])).toEqual([
      [1, -10],
      [2, 1],
      [3, 3],
      [4, 5],
      [5, 7],
    ]);
  });

  it("keeps hull progression contextual instead of equating hull size with readiness", () => {
    expect(MISSION_LEVELS.find((entry) => entry.level === 3)?.shipGuidance).toContain("Cruisers");
    expect(MISSION_LEVELS.find((entry) => entry.level === 3)?.shipGuidance).toContain("battlecruisers");
    expect(MISSION_LEVELS.find((entry) => entry.level === 4)?.shipGuidance).toContain("battleship");
    expect(MISSION_LEVELS.some((entry) => /hull.*not readiness|not readiness.*hull/i.test(entry.readinessNote))).toBe(true);
  });

  it("teaches damage/tank/application/supply/replacement habits", () => {
    const text = MISSION_COMBAT_HABITS.map((habit) => `${habit.label} ${habit.guidance}`).join(" ");
    expect(text).toContain("damage profile");
    expect(text).toContain("resistances");
    expect(text).toContain("application");
    expect(text).toContain("ammunition");
    expect(text).toContain("replacement");
  });

  it("preserves unobservable mission and live-combat state as explicit boundaries", () => {
    const text = MISSION_BOUNDARIES.join(" ");
    expect(text).toContain("active mission");
    expect(text).toContain("trigger");
    expect(text).toContain("hostile composition");
    expect(text).toContain("not proof");
  });

  it("keeps current CCP source provenance and validates the curated model", () => {
    expect(MISSION_SOURCES.length).toBeGreaterThanOrEqual(4);
    expect(MISSION_SOURCES.every((source) => source.verifiedOn === "2026-08-20")).toBe(true);
    expect(() => validateMissionPveGuide()).not.toThrow();
  });
});
