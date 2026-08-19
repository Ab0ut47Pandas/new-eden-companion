import { describe, expect, it } from "vitest";

import { planRiskAwareRoute, type RouteGraph } from "./risk-route-core";

function graph(): RouteGraph {
  const systems = new Map([
    [1, { id: 1, name: "Origin", securityStatus: 0.9 }],
    [2, { id: 2, name: "Hot Pipe", securityStatus: 0.5 }],
    [3, { id: 3, name: "Destination", securityStatus: 0.9 }],
    [4, { id: 4, name: "Quiet A", securityStatus: 0.8 }],
    [5, { id: 5, name: "Quiet B", securityStatus: 0.8 }],
    [6, { id: 6, name: "Lowsec Shortcut", securityStatus: 0.2 }],
  ]);
  const neighbours = new Map<number, number[]>([
    [1, [2, 4, 6]],
    [2, [1, 3]],
    [3, [2, 5, 6]],
    [4, [1, 5]],
    [5, [4, 3]],
    [6, [1, 3]],
  ]);
  return { systems, neighbours };
}

const activity = [
  { systemId: 2, shipKills: 20, podKills: 5, shipJumps: 100 },
  { systemId: 4, shipKills: 0, podKills: 0, shipJumps: 80 },
  { systemId: 5, shipKills: 0, podKills: 0, shipJumps: 80 },
];

describe("risk-aware route pathfinder", () => {
  it("keeps the minimum-jump route in fastest mode", () => {
    const result = planRiskAwareRoute(graph(), 1, 3, activity, { mode: "fastest" });
    expect(result?.systems.map((system) => system.id)).toEqual([1, 2, 3]);
    expect(result?.extraJumps).toBe(0);
  });

  it("can spend bounded extra jumps to bypass a hot system", () => {
    const result = planRiskAwareRoute(graph(), 1, 3, activity, {
      mode: "lower-exposure",
      maxExtraJumps: 2,
      highSecOnly: true,
    });
    expect(result?.systems.map((system) => system.id)).toEqual([1, 4, 5, 3]);
    expect(result?.extraJumps).toBe(1);
    expect(result?.reasons.join(" ")).toMatch(/bypass/i);
  });

  it("honors explicit avoid systems", () => {
    const result = planRiskAwareRoute(graph(), 1, 3, [], {
      mode: "balanced",
      avoidSystemIds: [2, 6],
      maxExtraJumps: 2,
    });
    expect(result?.systems.map((system) => system.id)).toEqual([1, 4, 5, 3]);
    expect(result?.systems.some((system) => system.id === 2)).toBe(false);
  });

  it("does not violate a zero-detour budget", () => {
    const result = planRiskAwareRoute(graph(), 1, 3, activity, {
      mode: "lower-exposure",
      maxExtraJumps: 0,
      highSecOnly: true,
    });
    expect(result?.jumps).toBe(2);
  });

  it("returns null if the destination itself is explicitly avoided", () => {
    expect(planRiskAwareRoute(graph(), 1, 3, [], {
      mode: "balanced",
      avoidSystemIds: [3],
    })).toBeNull();
  });
});
