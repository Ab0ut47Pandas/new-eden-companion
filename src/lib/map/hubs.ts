import type { MapSystem } from "@/lib/map/model";

export interface MarketHub extends MapSystem {
  regionId: number;
  regionName: string;
  stationId: number;
  stationName: string;
}

export const MARKET_HUBS: MarketHub[] = [
  {
    id: 30002187,
    name: "Amarr",
    securityStatus: 0.949,
    position: { x: -204748707250000000, y: 40238379936600000, z: -57621278902400000 },
    regionId: 10000043,
    regionName: "Domain",
    stationId: 60008494,
    stationName: "Amarr VIII (Oris) - Emperor Family Academy",
  },
  {
    id: 30000142,
    name: "Jita",
    securityStatus: 0.9459,
    position: { x: -129064861735000000, y: 60755306910000000, z: 117469227060000000 },
    regionId: 10000002,
    regionName: "The Forge",
    stationId: 60003760,
    stationName: "Jita IV - Moon 4 - Caldari Navy Assembly Plant",
  },
  {
    id: 30002659,
    name: "Dodixie",
    securityStatus: 0.8684,
    position: { x: -187616963382000000, y: 53241293004300000, z: 27692548633900000 },
    regionId: 10000032,
    regionName: "Sinq Laison",
    stationId: 60011866,
    stationName: "Dodixie IX - Moon 20 - Federation Navy Assembly Plant",
  },
  {
    id: 30002510,
    name: "Rens",
    securityStatus: 0.8946,
    position: { x: -99122341091000000, y: 40335100631500000, z: -2867728819580000 },
    regionId: 10000030,
    regionName: "Heimatar",
    stationId: 60004588,
    stationName: "Rens VI - Moon 8 - Brutor Tribe Treasury",
  },
  {
    id: 30002053,
    name: "Hek",
    securityStatus: 0.8,
    position: { x: -129897345751000000, y: 43294669860600000, z: 55969571554600000 },
    regionId: 10000042,
    regionName: "Metropolis",
    stationId: 60005686,
    stationName: "Hek VIII - Moon 12 - Boundless Creation Factory",
  },
];

export function marketHub(systemId: number): MarketHub | undefined {
  return MARKET_HUBS.find((hub) => hub.id === systemId);
}

