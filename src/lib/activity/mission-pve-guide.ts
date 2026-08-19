export type MissionLevel = 1 | 2 | 3 | 4 | 5;

export interface MissionSource {
  title: string;
  url: string;
  verifiedOn: string;
  supports: string[];
}

export interface MissionLevelGuide {
  level: MissionLevel;
  minimumStanding: number;
  shipGuidance: string;
  readinessNote: string;
}

export interface MissionCombatHabit {
  label: string;
  guidance: string;
}

export const MISSION_SOURCES: MissionSource[] = [
  {
    title: "EVE Online Help Center - Standings",
    url: "https://support.eveonline.com/hc/en-us/articles/203217152-Standings",
    verifiedOn: "2026-08-20",
    supports: [
      "level 1 agent availability",
      "minimum standings for level 2 through level 5 agents",
      "mission completion and decline/failure standing effects",
    ],
  },
  {
    title: "EVE Academy - Mission Runner",
    url: "https://www.eveonline.com/eve-academy/careers/enforcer/mission-runner",
    verifiedOn: "2026-08-20",
    supports: ["Security missions are combat missions", "mission-runner progression context"],
  },
  {
    title: "EVE Academy - Fitting your ship",
    url: "https://www.eveonline.com/news/view/r08ulp",
    verifiedOn: "2026-08-20",
    supports: [
      "typical hull progression from frigate/destroyer through cruiser/battlecruiser/battleship",
      "resistance choices should respond to the hostile NPC damage profile",
      "mission PvE commonly favors sustained tank rather than short burst survival",
    ],
  },
  {
    title: "EVE Academy - Combat Mechanics",
    url: "https://www.eveonline.com/eve-academy/ships/combat-mechanics",
    verifiedOn: "2026-08-20",
    supports: [
      "turret optimal/falloff and tracking limitations",
      "missile range and application limitations",
      "application and damage-support module roles",
    ],
  },
];

export const MISSION_LEVELS: MissionLevelGuide[] = [
  {
    level: 1,
    minimumStanding: -10,
    shipGuidance: "Start with a properly fitted combat frigate; a destroyer can also be comfortable once you can fit and replace it.",
    readinessNote: "Level 1 agents are broadly available. Use this tier to learn range control, target priority, capacitor/tank management, and when to leave.",
  },
  {
    level: 2,
    minimumStanding: 1,
    shipGuidance: "A well-fit destroyer is the normal progression target; do not upgrade only because a larger hull is affordable once.",
    readinessNote: "Check that your weapon application still works against smaller NPCs and that the replacement cost is acceptable before moving up.",
  },
  {
    level: 3,
    minimumStanding: 3,
    shipGuidance: "Cruisers can complete some level 3 work, while battlecruisers provide a more forgiving progression path when skills, fit, and finances support them.",
    readinessNote: "The hull class alone is not readiness. Tank profile, sustained damage, application, capacitor stability or management, supplies, and replacement capacity all matter.",
  },
  {
    level: 4,
    minimumStanding: 5,
    shipGuidance: "A well-prepared battleship is the typical progression target for regular level 4 Security missions.",
    readinessNote: "Do not jump into a battleship because the wallet can buy the hull. Budget the complete fit, ammunition/drones, and a replacement policy first.",
  },
  {
    level: 5,
    minimumStanding: 7,
    shipGuidance: "Treat level 5 missions as advanced content that needs mission-specific preparation rather than a simple next-hull step.",
    readinessNote: "NEC does not assume solo viability, safe location, or a universal fit for level 5 missions. Verify the actual mission and operating environment before committing assets.",
  },
];

export const MISSION_COMBAT_HABITS: MissionCombatHabit[] = [
  {
    label: "Read the actual hostile damage profile",
    guidance: "Use the in-game NPC information and mission-specific evidence when available. Do not hard-code a faction damage guess when the actual enemies are not established.",
  },
  {
    label: "Match your tank to the incoming damage",
    guidance: "Improve the relevant shield or armor resistances and bring enough sustained repair for the mission. A giant paper-EHP number is not the same thing as the right tank profile.",
  },
  {
    label: "Check application, not only paper DPS",
    guidance: "Large turrets can struggle with tracking and missiles can lose damage to signature/speed mismatch. If small NPCs take forever to die, more headline DPS may not solve the problem.",
  },
  {
    label: "Carry the boring supplies",
    guidance: "Bring the ammunition, charges, drones, cap charges or repair consumables your fit actually uses, plus enough cargo room for mission items when the objective requires them.",
  },
  {
    label: "Have an exit condition",
    guidance: "Decide what tank/capacitor state makes you align out or warp. NEC cannot see live aggro, triggers, scrams, capacitor, or incoming DPS, so the player must monitor those manually.",
  },
  {
    label: "Protect the replacement budget",
    guidance: "A more expensive hull is not progress if losing it wipes out the wallet. Upgrade value must be judged against the complete fitted cost and realistic replacement capacity.",
  },
];

export const MISSION_BOUNDARIES = [
  "NEC does not receive your active mission, room, trigger, hostile composition, or completion state from ESI.",
  "NEC must not claim a mission-specific damage type, tank profile, reward, objective, or standings consequence unless it has sourced evidence for that exact case.",
  "An offered Anomic/Burner mission is not equivalent to a regular level 4 mission; CCP describes them as optional, restricted-hull encounters built around stronger NPCs and fitting/piloting knowledge.",
  "Agent access is a standing gate, not proof that the character is ready to run the mission safely or economically.",
];

export function validateMissionPveGuide(): void {
  if (MISSION_LEVELS.length !== 5) throw new Error("Mission guide must cover levels 1 through 5");
  const expected = [-10, 1, 3, 5, 7];
  MISSION_LEVELS.forEach((entry, index) => {
    if (entry.level !== index + 1) throw new Error("Mission levels must be ordered");
    if (entry.minimumStanding !== expected[index]) throw new Error(`Unexpected standing gate for level ${entry.level}`);
  });
  if (MISSION_SOURCES.some((source) => source.verifiedOn !== "2026-08-20")) {
    throw new Error("Mission source verification date drifted");
  }
  if (!MISSION_BOUNDARIES.some((boundary) => boundary.includes("does not receive your active mission"))) {
    throw new Error("Mission-state visibility boundary is required");
  }
}
