import { describe, expect, it } from "vitest";

import type { EsiOrder } from "@/lib/esi/types";
import { MARKET_HUBS } from "@/lib/map/hubs";
import { estimateTrade } from "@/lib/opportunities/ranking";

function order(overrides: Partial<EsiOrder>): EsiOrder {
  return {
    duration: 90,
    issued: "2026-08-13T00:00:00Z",
    location_id: 1,
    min_volume: 1,
    order_id: 1,
    price: 100,
    range: "station",
    region_id: 1,
    system_id: 1,
    type_id: 34,
    volume_remain: 10_000,
    volume_total: 10_000,
    ...overrides,
  };
}

describe("estimateTrade", () => {
  it("caps a run by cargo, budget, and order depth", () => {
    const opportunity = estimateTrade({
      type: { id: 34, name: "Tritanium", volume: 1 },
      source: MARKET_HUBS[0],
      destination: MARKET_HUBS[1],
      sourceSell: order({ price: 100, volume_remain: 900 }),
      destinationBuy: order({ is_buy_order: true, price: 130, volume_remain: 80 }),
      route: { destinationSystemId: 30000142, destinationName: "Jita", jumps: 10, minimumSecurity: 0.5, riskySystems: 0 },
      cargoM3: 100,
      budget: 20_000,
      feeRate: 0.05,
    });
    expect(opportunity?.units).toBe(80);
    expect(opportunity?.estimatedProfit).toBe(1_880);
    expect(opportunity?.profitPerJump).toBe(188);
  });

  it("rejects spreads consumed by the fee buffer", () => {
    const opportunity = estimateTrade({
      type: { id: 34, name: "Tritanium", volume: 0.01 },
      source: MARKET_HUBS[0],
      destination: MARKET_HUBS[1],
      sourceSell: order({ price: 100 }),
      destinationBuy: order({ is_buy_order: true, price: 103 }),
      route: { destinationSystemId: 30000142, destinationName: "Jita", jumps: 10, minimumSecurity: 0.5, riskySystems: 0 },
      cargoM3: 100,
      budget: 20_000,
      feeRate: 0.04,
    });
    expect(opportunity).toBeNull();
  });
});

