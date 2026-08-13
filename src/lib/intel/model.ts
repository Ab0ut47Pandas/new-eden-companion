export type IntelLevel = "quiet" | "watch" | "hot";

export interface NearbySystemIntel {
  id: number;
  name: string;
  securityStatus: number;
  distance: number;
  shipKills: number;
  podKills: number;
  npcKills: number;
  jumps: number;
  latestPublishedKill?: string;
}

export interface NearbyKill {
  killmailId: number;
  time: string;
  systemId: number;
  systemName: string;
  securityStatus: number;
  distance: number;
  victimName: string;
  victimShip: string;
  attackerName: string;
  attackerCount: number;
  totalValue: number;
  solo: boolean;
  npc: boolean;
  url: string;
}

export interface NearbyIntelResponse {
  origin: {
    id: number;
    name: string;
    securityStatus: number;
  };
  radius: number;
  generatedAt: string;
  level: IntelLevel;
  headline: string;
  summary: {
    systems: number;
    shipKills: number;
    podKills: number;
    npcKills: number;
    jumps: number;
    publishedKills: number;
  };
  systems: NearbySystemIntel[];
  kills: NearbyKill[];
  sources: {
    officialSnapshot: string;
    publicFeed: string;
  };
}

export interface ActivitySignal {
  distance: number;
  shipKills: number;
  podKills: number;
  latestPublishedKill?: string;
}
