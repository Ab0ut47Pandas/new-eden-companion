export interface MarketReferenceInput {
  typeId: number;
  averagePrice?: number | null;
}

export interface MarketReferencePrice {
  typeId: number;
  unitPrice: number;
  basis: "esi-average";
}

export interface AffordabilityIndex {
  wallet: {
    visibility: "available" | "unavailable";
    liquidIsk: number | null;
  };
  market: {
    visibility: "available" | "unavailable";
    prices: Map<number, MarketReferencePrice>;
  };
}

export type AffordabilityStatus =
  | "available"
  | "not-affordable"
  | "reserve-breach"
  | "no-purchase-needed"
  | "wallet-unavailable"
  | "price-unavailable";

export interface AffordabilityEvaluation {
  status: AffordabilityStatus;
  typeId: number;
  quantity: number;
  unitPrice: number | null;
  estimatedCost: number | null;
  liquidIsk: number | null;
  remainingAfterPurchase: number | null;
  reserveIsk: number | null;
  remainingAfterReserve: number | null;
  basis: MarketReferencePrice["basis"] | null;
}

export function buildAffordabilityIndex(
  liquidIsk: number | null,
  references: MarketReferenceInput[] | null,
): AffordabilityIndex {
  const prices = new Map<number, MarketReferencePrice>();
  if (references) {
    for (const reference of references) {
      if (!Number.isInteger(reference.typeId) || reference.typeId <= 0) continue;
      const averagePrice = reference.averagePrice;
      if (typeof averagePrice !== "number" || !Number.isFinite(averagePrice) || averagePrice <= 0) continue;
      prices.set(reference.typeId, {
        typeId: reference.typeId,
        unitPrice: averagePrice,
        basis: "esi-average",
      });
    }
  }

  const walletAvailable = typeof liquidIsk === "number" && Number.isFinite(liquidIsk) && liquidIsk >= 0;
  return {
    wallet: {
      visibility: walletAvailable ? "available" : "unavailable",
      liquidIsk: walletAvailable ? liquidIsk : null,
    },
    market: {
      visibility: references ? "available" : "unavailable",
      prices,
    },
  };
}

export function evaluateAffordability(
  index: AffordabilityIndex,
  typeId: number,
  quantity: number,
  options: { reserveIsk?: number | null } = {},
): AffordabilityEvaluation {
  const normalizedQuantity = Math.max(0, Number.isFinite(quantity) ? quantity : 0);
  const reserveIsk = typeof options.reserveIsk === "number" && Number.isFinite(options.reserveIsk) && options.reserveIsk >= 0
    ? options.reserveIsk
    : null;

  if (normalizedQuantity === 0) {
    return {
      status: "no-purchase-needed",
      typeId,
      quantity: 0,
      unitPrice: index.market.prices.get(typeId)?.unitPrice ?? null,
      estimatedCost: 0,
      liquidIsk: index.wallet.liquidIsk,
      remainingAfterPurchase: index.wallet.liquidIsk,
      reserveIsk,
      remainingAfterReserve: index.wallet.liquidIsk === null || reserveIsk === null ? null : index.wallet.liquidIsk - reserveIsk,
      basis: index.market.prices.get(typeId)?.basis ?? null,
    };
  }

  if (index.wallet.visibility !== "available" || index.wallet.liquidIsk === null) {
    return {
      status: "wallet-unavailable",
      typeId,
      quantity: normalizedQuantity,
      unitPrice: index.market.prices.get(typeId)?.unitPrice ?? null,
      estimatedCost: null,
      liquidIsk: null,
      remainingAfterPurchase: null,
      reserveIsk,
      remainingAfterReserve: null,
      basis: index.market.prices.get(typeId)?.basis ?? null,
    };
  }

  const price = index.market.prices.get(typeId);
  if (index.market.visibility !== "available" || !price) {
    return {
      status: "price-unavailable",
      typeId,
      quantity: normalizedQuantity,
      unitPrice: null,
      estimatedCost: null,
      liquidIsk: index.wallet.liquidIsk,
      remainingAfterPurchase: null,
      reserveIsk,
      remainingAfterReserve: null,
      basis: null,
    };
  }

  const estimatedCost = price.unitPrice * normalizedQuantity;
  const remainingAfterPurchase = index.wallet.liquidIsk - estimatedCost;
  const remainingAfterReserve = reserveIsk === null ? null : remainingAfterPurchase - reserveIsk;
  let status: AffordabilityStatus = remainingAfterPurchase >= 0 ? "available" : "not-affordable";
  if (status === "available" && reserveIsk !== null && remainingAfterPurchase < reserveIsk) status = "reserve-breach";

  return {
    status,
    typeId,
    quantity: normalizedQuantity,
    unitPrice: price.unitPrice,
    estimatedCost,
    liquidIsk: index.wallet.liquidIsk,
    remainingAfterPurchase,
    reserveIsk,
    remainingAfterReserve,
    basis: price.basis,
  };
}
