import type { ActivitySignal, IntelLevel, NearbySystemIntel } from "@/lib/intel/model";

export function activityScore(system: Pick<NearbySystemIntel, "distance" | "shipKills" | "podKills" | "npcKills" | "jumps">): number {
  const proximity = 1 / (system.distance + 1);
  return proximity * (system.podKills * 80 + system.shipKills * 30 + Math.min(system.npcKills, 100) * 0.03 + Math.min(system.jumps, 500) * 0.001);
}

export function rankSystems(systems: NearbySystemIntel[]): NearbySystemIntel[] {
  return [...systems].sort((left, right) =>
    activityScore(right) - activityScore(left)
    || left.distance - right.distance
    || left.name.localeCompare(right.name),
  );
}

export function intelLevel(signals: ActivitySignal[], now = Date.now()): IntelLevel {
  const nearbyRecentKill = signals.some((signal) =>
    signal.distance <= 1
    && signal.latestPublishedKill
    && now - new Date(signal.latestPublishedKill).getTime() <= 15 * 60_000,
  );
  if (nearbyRecentKill || signals.some((signal) => signal.distance <= 1 && signal.podKills > 0)) return "hot";
  if (signals.some((signal) => signal.shipKills > 0 || signal.podKills > 0)) return "watch";
  return "quiet";
}

export function intelHeadline(level: IntelLevel, radius: number): string {
  if (level === "hot") return "Recent lethal activity is very close. Treat the next gate as unsafe until you check Local and d-scan.";
  if (level === "watch") return `Player losses were reported within ${radius} jumps. Inspect the hot systems before choosing a route.`;
  return `No player losses are currently reported within ${radius} jumps. That lowers the warning level, but never proves the route is safe.`;
}
