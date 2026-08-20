import type { AdviceCard, DashboardData } from "./model";

export interface ProgressionHomeModel {
  primary: AdviceCard | null;
  supporting: AdviceCard[];
  connected: boolean;
  dataGapCount: number;
}

const PRIORITY_ORDER: Record<AdviceCard["priority"], number> = {
  now: 0,
  next: 1,
  watch: 2,
};

export function buildProgressionHomeModel(data: DashboardData): ProgressionHomeModel {
  const ranked = data.advice
    .map((card, index) => ({ card, index }))
    .sort((a, b) => PRIORITY_ORDER[a.card.priority] - PRIORITY_ORDER[b.card.priority] || a.index - b.index)
    .map(({ card }) => card);

  return {
    primary: ranked[0] ?? null,
    supporting: ranked.slice(1, 3),
    connected: data.mode === "live",
    dataGapCount: data.dataQuality.unavailable.length,
  };
}
