export type TradeRunDegradedState = "Cannot verify" | "Live information unavailable";

export interface TradeRunDegradedResult {
  state: TradeRunDegradedState;
  message: string;
}

export function classifyTradeRunFailure(error: unknown): TradeRunDegradedResult {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("Static EVE data is unavailable")) {
    return {
      state: "Cannot verify",
      message: "Static EVE data is unavailable. Restore or update NEC's local static data before evaluating trade candidates.",
    };
  }

  if (
    message.includes("Fuzzwork")
    || message.includes("ESI")
    || message.includes("market")
    || message.includes("fetch")
    || message.includes("HTTP")
  ) {
    return {
      state: "Live information unavailable",
      message: "Live market information is unavailable right now. NEC will not substitute stale, guessed, or demo prices for a live trade-run recommendation.",
    };
  }

  return {
    state: "Cannot verify",
    message: "NEC could not verify this trade run. No profitability recommendation is available until the failed evidence can be refreshed.",
  };
}
