export interface MarketOrderInput {
  isBuyOrder: boolean;
  locationId: number;
  price: number;
  volumeRemain: number;
}

export interface MarketScope {
  label: string;
  regionId: number;
  locationId?: number;
}

export type MarketSideStatus = "available" | "partial-depth" | "unavailable";

export interface MarketSideValuation {
  status: MarketSideStatus;
  bestUnitPrice: number | null;
  filledQuantity: number;
  requestedQuantity: number;
  totalValue: number | null;
  volumeWeightedUnitPrice: number | null;
}

export interface MarketLocationValuation {
  scope: MarketScope;
  orderCount: number;
  sell: MarketSideValuation;
  buy: MarketSideValuation;
  caveats: string[];
}

function validOrder(order: MarketOrderInput): boolean {
  return Number.isFinite(order.price)
    && order.price >= 0
    && Number.isFinite(order.volumeRemain)
    && order.volumeRemain > 0
    && Number.isSafeInteger(order.locationId);
}

function valueSide(
  orders: MarketOrderInput[],
  requestedQuantity: number,
  isBuyOrder: boolean,
): MarketSideValuation {
  const sorted = orders
    .filter((order) => order.isBuyOrder === isBuyOrder && validOrder(order))
    .sort((a, b) => isBuyOrder ? b.price - a.price : a.price - b.price);

  if (sorted.length === 0) {
    return {
      status: "unavailable",
      bestUnitPrice: null,
      filledQuantity: 0,
      requestedQuantity,
      totalValue: null,
      volumeWeightedUnitPrice: null,
    };
  }

  let remaining = requestedQuantity;
  let filledQuantity = 0;
  let totalValue = 0;

  for (const order of sorted) {
    if (remaining <= 0) break;
    const fill = Math.min(remaining, order.volumeRemain);
    filledQuantity += fill;
    totalValue += fill * order.price;
    remaining -= fill;
  }

  return {
    status: remaining > 0 ? "partial-depth" : "available",
    bestUnitPrice: sorted[0]?.price ?? null,
    filledQuantity,
    requestedQuantity,
    totalValue: filledQuantity > 0 ? totalValue : null,
    volumeWeightedUnitPrice: filledQuantity > 0 ? totalValue / filledQuantity : null,
  };
}

export function calculateMarketLocationValuation(
  orders: MarketOrderInput[],
  scope: MarketScope,
  quantity: number,
): MarketLocationValuation {
  if (!Number.isSafeInteger(scope.regionId) || scope.regionId <= 0) {
    throw new Error("Market scope requires a positive integer regionId");
  }
  if (scope.locationId !== undefined && (!Number.isSafeInteger(scope.locationId) || scope.locationId <= 0)) {
    throw new Error("Market scope locationId must be a positive integer when provided");
  }
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new Error("Market valuation quantity must be a positive integer");
  }

  const scopedOrders = scope.locationId === undefined
    ? orders.filter(validOrder)
    : orders.filter((order) => order.locationId === scope.locationId && validOrder(order));

  const sell = valueSide(scopedOrders, quantity, false);
  const buy = valueSide(scopedOrders, quantity, true);
  const caveats = [
    scope.locationId === undefined
      ? "Regional values can come from different stations or structures and are not a guaranteed local execution price."
      : "Exact-location buy value only counts buy orders posted at this location; remote buy orders whose range may reach this location are intentionally excluded.",
  ];

  if (sell.status === "partial-depth") {
    caveats.push(`Visible sell depth only covers ${sell.filledQuantity.toLocaleString()} of ${quantity.toLocaleString()} requested units.`);
  } else if (sell.status === "unavailable") {
    caveats.push("No visible sell orders were returned for this scope, so replacement value is unknown.");
  }

  if (buy.status === "partial-depth") {
    caveats.push(`Visible buy depth only covers ${buy.filledQuantity.toLocaleString()} of ${quantity.toLocaleString()} requested units.`);
  } else if (buy.status === "unavailable") {
    caveats.push("No visible buy orders were returned for this scope, so immediate-sale value is unknown.");
  }

  return {
    scope,
    orderCount: scopedOrders.length,
    sell,
    buy,
    caveats,
  };
}
