import { describe, expect, it } from "vitest";

import { classifyTradeRunFailure } from "./trade-run-degraded";

describe("classifyTradeRunFailure", () => {
  it("keeps missing static data distinct from live market failure", () => {
    expect(classifyTradeRunFailure(new Error("Static EVE data is unavailable."))).toEqual({
      state: "Cannot verify",
      message: "Static EVE data is unavailable. Restore or update NEC's local static data before evaluating trade candidates.",
    });
  });

  it("does not invent prices when an external market source fails", () => {
    expect(classifyTradeRunFailure(new Error("Fuzzwork aggregate snapshot failed (503)."))).toEqual({
      state: "Live information unavailable",
      message: "Live market information is unavailable right now. NEC will not substitute stale, guessed, or demo prices for a live trade-run recommendation.",
    });
    expect(classifyTradeRunFailure(new Error("ESI request failed (502)."))).toEqual({
      state: "Live information unavailable",
      message: "Live market information is unavailable right now. NEC will not substitute stale, guessed, or demo prices for a live trade-run recommendation.",
    });
  });

  it("fails closed for unclassified discovery failures", () => {
    expect(classifyTradeRunFailure(new Error("unexpected parser failure"))).toEqual({
      state: "Cannot verify",
      message: "NEC could not verify this trade run. No profitability recommendation is available until the failed evidence can be refreshed.",
    });
  });
});
