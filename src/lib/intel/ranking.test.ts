import { describe, expect, it } from "vitest";

import { activityScore, intelLevel, rankSystems } from "@/lib/intel/ranking";
import type { NearbySystemIntel } from "@/lib/intel/model";

function system(overrides: Partial<NearbySystemIntel>): NearbySystemIntel {
  return {
    id: 1,
    name: "Amarr",
    securityStatus: 1,
    distance: 0,
    shipKills: 0,
    podKills: 0,
    npcKills: 0,
    jumps: 0,
    ...overrides,
  };
}

describe("nearby activity ranking", () => {
  it("weights player and pod kills above ordinary traffic", () => {
    expect(activityScore(system({ distance: 1, podKills: 1 }))).toBeGreaterThan(
      activityScore(system({ distance: 1, jumps: 500 })),
    );
  });

  it("ranks closer lethal activity first", () => {
    const ranked = rankSystems([
      system({ id: 2, name: "Far", distance: 3, shipKills: 1 }),
      system({ id: 3, name: "Near", distance: 1, shipKills: 1 }),
    ]);
    expect(ranked[0].name).toBe("Near");
  });

  it("marks a published kill within one jump and fifteen minutes as hot", () => {
    const now = Date.parse("2026-08-13T14:30:00Z");
    expect(intelLevel([{ distance: 1, shipKills: 1, podKills: 0, latestPublishedKill: "2026-08-13T14:20:00Z" }], now)).toBe("hot");
  });

  it("keeps distant hourly losses at watch", () => {
    expect(intelLevel([{ distance: 3, shipKills: 2, podKills: 0 }])).toBe("watch");
  });
});
