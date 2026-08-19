import type { NearbyOpportunity } from "@/lib/opportunities/location-aware-model";

function routeJumps(opportunity: NearbyOpportunity): number {
  return opportunity.route?.jumps ?? Number.POSITIVE_INFINITY;
}

function kindOrder(kind: NearbyOpportunity["kind"]): number {
  return kind === "asset" ? 0 : kind === "service" ? 1 : 2;
}

export function rankNearbyOpportunities(opportunities: NearbyOpportunity[]): NearbyOpportunity[] {
  return [...opportunities].sort((left, right) => {
    const jumpDifference = routeJumps(left) - routeJumps(right);
    if (jumpDifference !== 0) return jumpDifference;
    const kindDifference = kindOrder(left.kind) - kindOrder(right.kind);
    if (kindDifference !== 0) return kindDifference;
    const itemDifference = (right.itemCount ?? 0) - (left.itemCount ?? 0);
    if (itemDifference !== 0) return itemDifference;
    return left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
  });
}
