import "server-only";

import { esi } from "@/lib/esi/client";
import {
  planRiskAwareRoute,
  type RiskRoutePolicy,
  type RiskRouteResult,
  type RouteActivitySnapshot,
} from "@/lib/map/risk-route-core";
import { loadStaticRouteTopology } from "@/lib/sde/route-topology";

interface SystemKills {
  system_id: number;
  npc_kills: number;
  pod_kills: number;
  ship_kills: number;
}

interface SystemJumps {
  system_id: number;
  ship_jumps: number;
}

export interface LiveRiskRouteResult {
  route: RiskRouteResult | null;
  topologyAvailable: boolean;
  topologyReason: string | null;
  generatedAt: string;
  source: {
    topology: "CCP SDE mapSolarSystems + mapStargates";
    activity: "CCP ESI system_kills + system_jumps";
    cacheSeconds: 300;
  };
}

async function activitySnapshot(): Promise<RouteActivitySnapshot[]> {
  const [kills, jumps] = await Promise.all([
    esi<SystemKills[]>("/universe/system_kills", { revalidate: 300 }),
    esi<SystemJumps[]>("/universe/system_jumps", { revalidate: 300 }),
  ]);
  const jumpMap = new Map(jumps.map((entry) => [entry.system_id, entry.ship_jumps]));
  return kills.map((entry) => ({
    systemId: entry.system_id,
    shipKills: entry.ship_kills,
    podKills: entry.pod_kills,
    shipJumps: jumpMap.get(entry.system_id) ?? 0,
  }));
}

export async function planLiveRiskAwareRoute(
  originId: number,
  destinationId: number,
  policy: RiskRoutePolicy,
): Promise<LiveRiskRouteResult> {
  const topology = loadStaticRouteTopology();
  if (!topology.available || !topology.graph) {
    return {
      route: null,
      topologyAvailable: false,
      topologyReason: topology.reason,
      generatedAt: new Date().toISOString(),
      source: {
        topology: "CCP SDE mapSolarSystems + mapStargates",
        activity: "CCP ESI system_kills + system_jumps",
        cacheSeconds: 300,
      },
    };
  }

  const activity = await activitySnapshot();
  return {
    route: planRiskAwareRoute(topology.graph, originId, destinationId, activity, policy),
    topologyAvailable: true,
    topologyReason: null,
    generatedAt: new Date().toISOString(),
    source: {
      topology: "CCP SDE mapSolarSystems + mapStargates",
      activity: "CCP ESI system_kills + system_jumps",
      cacheSeconds: 300,
    },
  };
}
