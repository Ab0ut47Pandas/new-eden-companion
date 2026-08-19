import { describe, expect, it } from "vitest";

import { assessPlanetColony, type PlanetColonyDetail, type PlanetColonySummary } from "./colony-health";

const summary: PlanetColonySummary = {
  last_update: "2026-08-19T12:00:00Z",
  num_pins: 4,
  owner_id: 90000001,
  planet_id: 40000001,
  planet_type: "temperate",
  solar_system_id: 30000142,
  upgrade_level: 3,
};

function detail(): PlanetColonyDetail {
  return {
    links: [{ source_pin_id: 1, destination_pin_id: 2, link_level: 0 }],
    pins: [
      {
        pin_id: 1,
        type_id: 2848,
        latitude: 0,
        longitude: 0,
        expiry_time: "2026-08-19T10:00:00Z",
        extractor_details: {
          cycle_time: 1800,
          head_radius: 0.02,
          heads: [],
          product_type_id: 2268,
          qty_per_cycle: 1000,
        },
      },
      {
        pin_id: 2,
        type_id: 2469,
        latitude: 0,
        longitude: 0,
        factory_details: { schematic_id: 68 },
      },
      {
        pin_id: 3,
        type_id: 2254,
        latitude: 0,
        longitude: 0,
        contents: [{ amount: 1200, type_id: 2268 }],
      },
      {
        pin_id: 4,
        type_id: 2256,
        latitude: 0,
        longitude: 0,
      },
    ],
    routes: [{
      content_type_id: 2268,
      destination_pin_id: 2,
      quantity: 3000,
      route_id: 99,
      source_pin_id: 1,
    }],
  };
}

describe("assessPlanetColony", () => {
  it("flags expired extractors without claiming live state", () => {
    const result = assessPlanetColony(summary, detail(), new Date("2026-08-19T12:00:00Z"));
    expect(result.status).toBe("attention");
    expect(result.attention).toContainEqual(expect.objectContaining({
      category: "extractor",
      severity: "warning",
      title: "Extractor program expired",
    }));
  });

  it("flags factories that have no visible inbound route", () => {
    const colony = detail();
    colony.routes = [];
    const result = assessPlanetColony(summary, colony, new Date("2026-08-19T08:00:00Z"));
    expect(result.attention).toContainEqual(expect.objectContaining({
      category: "factory",
      severity: "warning",
      pinId: 2,
    }));
  });

  it("treats empty factory contents with inbound routes as unknown rather than starved", () => {
    const result = assessPlanetColony(summary, detail(), new Date("2026-08-19T08:00:00Z"));
    expect(result.attention).toContainEqual(expect.objectContaining({
      category: "factory",
      severity: "unknown",
      title: "Factory supply cannot be proven",
    }));
  });

  it("surfaces content pins with no outgoing route as review-only storage attention", () => {
    const result = assessPlanetColony(summary, detail(), new Date("2026-08-19T08:00:00Z"));
    expect(result.attention).toContainEqual(expect.objectContaining({
      category: "storage",
      severity: "info",
      pinId: 3,
    }));
  });

  it("preserves unreadable colony detail as unknown", () => {
    const result = assessPlanetColony(summary, null, new Date("2026-08-19T08:00:00Z"));
    expect(result.status).toBe("unknown");
    expect(result.attention[0]?.title).toBe("Colony detail unavailable");
  });

  it("uses a documented NEC-only threshold for extractor programs expiring within six hours", () => {
    const colony = detail();
    colony.pins[0]!.expiry_time = "2026-08-19T13:00:00Z";
    const result = assessPlanetColony(summary, colony, new Date("2026-08-19T08:00:00Z"));
    expect(result.attention).toContainEqual(expect.objectContaining({
      category: "extractor",
      severity: "warning",
      title: "Extractor expires soon",
    }));
  });
});
