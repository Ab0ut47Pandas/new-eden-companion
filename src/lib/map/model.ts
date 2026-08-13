export type RoutePreference = "shorter" | "safer" | "less-secure";

export interface MapSystem {
  id: number;
  name: string;
  securityStatus: number;
  position: { x: number; y: number; z: number };
}

export interface PlannedRoute {
  preference: RoutePreference;
  origin: MapSystem;
  destination: MapSystem;
  jumps: number;
  systems: MapSystem[];
}

