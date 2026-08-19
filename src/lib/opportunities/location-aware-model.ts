import type { RoutePreference } from "@/lib/map/model";

export type NearbyOpportunityKind = "asset" | "service" | "activity";

export interface NearbyRouteEvidence {
  jumps: number;
  minimumSecurity: number | null;
  riskySystems: number | null;
  preference: RoutePreference;
}

export interface NearbyOpportunity {
  id: string;
  kind: NearbyOpportunityKind;
  title: string;
  detail: string;
  destinationSystemId: number;
  destinationSystemName: string;
  locationId?: number;
  itemCount?: number;
  route: NearbyRouteEvidence | null;
  evidence: string[];
  limitations: string[];
}

export interface LocationAwareOpportunityScan {
  current: {
    solarSystemId: number;
    solarSystemName: string;
    securityStatus: number;
    stationId?: number;
    structureId?: number;
  };
  routePreference: RoutePreference;
  assets: NearbyOpportunity[];
  services: NearbyOpportunity[];
  activities: NearbyOpportunity[];
  notes: string[];
}
