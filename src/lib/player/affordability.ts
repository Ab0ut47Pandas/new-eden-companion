import { esi } from "@/lib/esi/client";
import type { EsiMarketPrice } from "@/lib/esi/types";
import {
  buildAffordabilityIndex,
  type AffordabilityIndex,
} from "./affordability-core";

export {
  buildAffordabilityIndex,
  evaluateAffordability,
  type AffordabilityEvaluation,
  type AffordabilityIndex,
  type AffordabilityStatus,
  type MarketReferenceInput,
  type MarketReferencePrice,
} from "./affordability-core";

export async function loadCharacterAffordability(characterId: number, token: string): Promise<AffordabilityIndex> {
  const [walletResult, marketResult] = await Promise.allSettled([
    esi<number>(`/characters/${characterId}/wallet`, { token }),
    esi<EsiMarketPrice[]>("/markets/prices", { revalidate: 3_600 }),
  ]);

  if (walletResult.status === "rejected") {
    console.warn("Unable to load character wallet for affordability overlay", walletResult.reason);
  }
  if (marketResult.status === "rejected") {
    console.warn("Unable to load ESI market references for affordability overlay", marketResult.reason);
  }

  return buildAffordabilityIndex(
    walletResult.status === "fulfilled" ? walletResult.value : null,
    marketResult.status === "fulfilled"
      ? marketResult.value.map((price) => ({ typeId: price.type_id, averagePrice: price.average_price }))
      : null,
  );
}
