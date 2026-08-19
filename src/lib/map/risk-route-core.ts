export interface RouteGraphSystem {
  id: number;
  name: string;
  securityStatus: number;
}

export interface RouteGraph {
  systems: Map<number, RouteGraphSystem>;
  neighbours: Map<number, number[]>;
}

export interface RouteActivitySnapshot {
  systemId: number;
  shipKills: number;
  podKills: number;
  shipJumps: number;
}

export type RiskRouteMode = "fastest" | "balanced" | "lower-exposure";

export interface RiskRoutePolicy {
  mode: RiskRouteMode;
  avoidSystemIds?: number[];
  maxExtraJumps?: number;
  highSecOnly?: boolean;
}

export interface RiskRouteSystem extends RouteGraphSystem {
  shipKills: number;
  podKills: number;
  shipJumps: number;
  exposureIndex: number;
}

export interface RiskRouteResult {
  mode: RiskRouteMode;
  systems: RiskRouteSystem[];
  jumps: number;
  shortestJumps: number;
  extraJumps: number;
  exposureIndex: number;
  avoidedSystemIds: number[];
  warnings: string[];
  reasons: string[];
}

interface QueueState {
  id: number;
  jumps: number;
  cost: number;
  key: string;
}

function stateKey(id: number, jumps: number): string {
  return `${id}:${jumps}`;
}

function activityMap(activity: RouteActivitySnapshot[]): Map<number, RouteActivitySnapshot> {
  return new Map(activity.map((entry) => [entry.systemId, entry]));
}

export function systemExposureIndex(activity: RouteActivitySnapshot | undefined): number {
  if (!activity) return 0;
  const jumps = Math.max(20, activity.shipJumps);
  const lethal = Math.max(0, activity.shipKills) + Math.max(0, activity.podKills) * 3;
  const trafficAdjusted = (lethal / jumps) * 100;
  return Math.min(25, lethal * 0.35 + trafficAdjusted * 2.5);
}

function securityPenalty(securityStatus: number, mode: RiskRouteMode): number {
  if (mode === "fastest") return 0;
  if (securityStatus >= 0.45) return 0;
  if (securityStatus > 0) return mode === "lower-exposure" ? 35 : 12;
  return mode === "lower-exposure" ? 80 : 30;
}

function edgeCost(system: RouteGraphSystem, activity: RouteActivitySnapshot | undefined, mode: RiskRouteMode): number {
  if (mode === "fastest") return 1;
  const exposure = systemExposureIndex(activity);
  const exposureWeight = mode === "lower-exposure" ? 1.6 : 0.65;
  return 1 + securityPenalty(system.securityStatus, mode) + exposure * exposureWeight;
}

function shortestPath(graph: RouteGraph, originId: number, destinationId: number): number[] | null {
  const queue: Array<{ id: number; path: number[] }> = [{ id: originId, path: [originId] }];
  const seen = new Set<number>([originId]);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current.id === destinationId) return current.path;
    for (const next of graph.neighbours.get(current.id) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push({ id: next, path: [...current.path, next] });
    }
  }
  return null;
}

function popLowest(queue: QueueState[]): QueueState | undefined {
  if (!queue.length) return undefined;
  let best = 0;
  for (let index = 1; index < queue.length; index += 1) {
    if (queue[index].cost < queue[best].cost) best = index;
  }
  const [result] = queue.splice(best, 1);
  return result;
}

export function planRiskAwareRoute(
  graph: RouteGraph,
  originId: number,
  destinationId: number,
  activity: RouteActivitySnapshot[],
  policy: RiskRoutePolicy,
): RiskRouteResult | null {
  if (!graph.systems.has(originId) || !graph.systems.has(destinationId)) return null;
  const baseline = shortestPath(graph, originId, destinationId);
  if (!baseline) return null;
  const shortestJumps = baseline.length - 1;
  const maxExtraJumps = Math.max(0, Math.min(100, Math.trunc(policy.maxExtraJumps ?? 10)));
  const maxJumps = shortestJumps + maxExtraJumps;
  const avoided = new Set(policy.avoidSystemIds ?? []);
  avoided.delete(originId);
  if (avoided.has(destinationId)) return null;
  const byActivity = activityMap(activity);

  if (policy.mode === "fastest" && avoided.size === 0 && !policy.highSecOnly) {
    const systems = baseline.map((id) => {
      const system = graph.systems.get(id)!;
      const snapshot = byActivity.get(id);
      return {
        ...system,
        shipKills: snapshot?.shipKills ?? 0,
        podKills: snapshot?.podKills ?? 0,
        shipJumps: snapshot?.shipJumps ?? 0,
        exposureIndex: systemExposureIndex(snapshot),
      };
    });
    return {
      mode: policy.mode,
      systems,
      jumps: shortestJumps,
      shortestJumps,
      extraJumps: 0,
      exposureIndex: systems.reduce((sum, system) => sum + system.exposureIndex, 0),
      avoidedSystemIds: [],
      warnings: ["Fastest mode minimizes gate count; it does not attempt to reduce current activity exposure."],
      reasons: ["This is the minimum-jump route in the loaded static stargate graph."],
    };
  }

  const originKey = stateKey(originId, 0);
  const queue: QueueState[] = [{ id: originId, jumps: 0, cost: 0, key: originKey }];
  const bestCost = new Map<string, number>([[originKey, 0]]);
  const parent = new Map<string, string | null>([[originKey, null]]);
  let destinationState: QueueState | undefined;

  while (queue.length) {
    const current = popLowest(queue)!;
    if (current.cost !== bestCost.get(current.key)) continue;
    if (current.id === destinationId) {
      destinationState = current;
      break;
    }
    if (current.jumps >= maxJumps) continue;

    for (const nextId of graph.neighbours.get(current.id) ?? []) {
      if (avoided.has(nextId)) continue;
      const nextSystem = graph.systems.get(nextId);
      if (!nextSystem) continue;
      if (policy.highSecOnly && nextId !== destinationId && nextSystem.securityStatus < 0.45) continue;
      const nextJumps = current.jumps + 1;
      if (nextJumps > maxJumps) continue;
      const nextKey = stateKey(nextId, nextJumps);
      const nextCost = current.cost + edgeCost(nextSystem, byActivity.get(nextId), policy.mode);
      if (nextCost >= (bestCost.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;
      bestCost.set(nextKey, nextCost);
      parent.set(nextKey, current.key);
      queue.push({ id: nextId, jumps: nextJumps, cost: nextCost, key: nextKey });
    }
  }

  if (!destinationState) return null;
  const ids: number[] = [];
  let cursor: string | null = destinationState.key;
  while (cursor) {
    const [id] = cursor.split(":");
    ids.push(Number(id));
    cursor = parent.get(cursor) ?? null;
  }
  ids.reverse();

  const systems: RiskRouteSystem[] = ids.map((id) => {
    const system = graph.systems.get(id)!;
    const snapshot = byActivity.get(id);
    return {
      ...system,
      shipKills: snapshot?.shipKills ?? 0,
      podKills: snapshot?.podKills ?? 0,
      shipJumps: snapshot?.shipJumps ?? 0,
      exposureIndex: systemExposureIndex(snapshot),
    };
  });
  const exposureIndex = systems.reduce((sum, system) => sum + system.exposureIndex, 0);
  const baselineExposure = baseline.reduce((sum, id) => sum + systemExposureIndex(byActivity.get(id)), 0);
  const baselineSet = new Set(baseline);
  const routeSet = new Set(ids);
  const bypassed = baseline
    .filter((id) => !routeSet.has(id) && id !== originId && id !== destinationId)
    .map((id) => ({ id, exposure: systemExposureIndex(byActivity.get(id)), name: graph.systems.get(id)?.name ?? `System ${id}` }))
    .sort((a, b) => b.exposure - a.exposure);

  const reasons: string[] = [];
  if (avoided.size) reasons.push(`Excluded ${avoided.size} explicitly avoided system${avoided.size === 1 ? "" : "s"}.`);
  if (policy.highSecOnly) reasons.push("Excluded non-high-sec intermediate systems.");
  if (bypassed[0]?.exposure > 0) reasons.push(`The route bypasses ${bypassed[0].name}, which has elevated current kill/traffic exposure in the supplied snapshot.`);
  if (exposureIndex < baselineExposure) reasons.push(`The selected path has a lower activity-exposure index than the minimum-jump baseline (${exposureIndex.toFixed(1)} vs ${baselineExposure.toFixed(1)}).`);
  if (!reasons.length) reasons.push("No lower-exposure detour within the configured jump budget was established; this is the best path under the selected policy.");

  return {
    mode: policy.mode,
    systems,
    jumps: ids.length - 1,
    shortestJumps,
    extraJumps: Math.max(0, ids.length - baseline.length),
    exposureIndex,
    avoidedSystemIds: [...avoided].filter((id) => baselineSet.has(id) || graph.systems.has(id)),
    warnings: [
      "The activity-exposure index is a route-ranking weight, not a probability of being ganked or a safety guarantee.",
      "CCP system kill and jump totals are cached snapshots. Local, d-scan, gate camps, ship/cargo value, pilot behavior, and delayed/unpublished kills can materially change actual risk.",
    ],
    reasons,
  };
}
