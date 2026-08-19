import { describe, expect, it } from "vitest";

import { rankNearbyOpportunities } from "@/lib/opportunities/location-aware-core";
import type { NearbyOpportunity } from "@/lib/opportunities/location-aware-model";

function candidate(overrides: Partial<NearbyOpportunity> & Pick<NearbyOpportunity, "id" | "kind" | "title">): NearbyOpportunity {
  return {
    detail: "test",
    destinationSystemId: 30_000_142,
    destinationSystemName: "Jita",
    route: { jumps: 3, minimumSecurity: 0.5, riskySystems: 0, preference: "safer" },
    evidence: [],
    limitations: [],
    ...overrides,
  };
}

describe("rankNearbyOpportunities", () => {
  it("prefers fewer known jumps and leaves unknown routes last", () => {
    const ranked = rankNearbyOpportunities([
      candidate({ id: "unknown", kind: "service", title: "Unknown", route: null }),
      candidate({ id: "far", kind: "service", title: "Far", route: { jumps: 8, minimumSecurity: 0.5, riskySystems: 0, preference: "safer" } }),
      candidate({ id: "near", kind: "service", title: "Near", route: { jumps: 1, minimumSecurity: 0.5, riskySystems: 0, preference: "safer" } }),
    ]);

    expect(ranked.map((entry) => entry.id)).toEqual(["near", "far", "unknown"]);
  });

  it("uses evidence-backed kind and asset-count tie breakers deterministically", () => {
    const ranked = rankNearbyOpportunities([
      candidate({ id: "activity", kind: "activity", title: "Activity" }),
      candidate({ id: "small-assets", kind: "asset", title: "Small assets", itemCount: 2 }),
      candidate({ id: "service", kind: "service", title: "Service" }),
      candidate({ id: "large-assets", kind: "asset", title: "Large assets", itemCount: 8 }),
    ]);

    expect(ranked.map((entry) => entry.id)).toEqual(["large-assets", "small-assets", "service", "activity"]);
  });
});
