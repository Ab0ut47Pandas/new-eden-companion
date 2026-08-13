import type { RoutePreference } from "@/lib/map/model";

export interface OpportunityRoute {
  destinationSystemId: number;
  destinationName: string;
  jumps: number;
  minimumSecurity: number;
  riskySystems: number;
}

export interface TradeOpportunity {
  typeId: number;
  name: string;
  unitVolume: number;
  sourceName: string;
  destinationName: string;
  destinationSystemId: number;
  buyPrice: number;
  sellPrice: number;
  units: number;
  cargoUsed: number;
  investment: number;
  grossRevenue: number;
  estimatedProfit: number;
  returnPercent: number;
  profitPerM3: number;
  profitPerJump: number;
  route: OpportunityRoute;
}

export interface OreOpportunity {
  typeId: number;
  name: string;
  unitVolume: number;
  immediateBuyPrice: number;
  lowestSellPrice?: number;
  iskPerM3: number;
  demandUnits: number;
  holdUnits: number;
  estimatedHoldValue: number;
}

export interface OpportunityScan {
  mode: "trade" | "mining";
  source: { systemId: number; name: string; stationId: number; stationName: string };
  fetchedAt: string;
  marketCacheSeconds: number;
  assumptions: {
    cargoM3: number;
    budget: number;
    feeRate: number;
    routePreference: RoutePreference;
  };
  trade: TradeOpportunity[];
  ores: OreOpportunity[];
  notes: string[];
}

