import { describe, expect, it } from "vitest";

import { EVE_SCOPES, RECOMMENDED_EVE_SCOPES } from "@/lib/auth/scopes";

describe("EVE access profiles", () => {
  it("keeps every recommended scope inside the full catalog", () => {
    const full = new Set<string>(EVE_SCOPES);
    expect(RECOMMENDED_EVE_SCOPES.every((scope) => full.has(scope))).toBe(true);
  });

  it("does not quietly include mail, corporation, fleet, or general write access", () => {
    expect(RECOMMENDED_EVE_SCOPES.some((scope) => /^(esi-mail|esi-corporation|esi-fleet)/.test(scope))).toBe(false);
    expect(RECOMMENDED_EVE_SCOPES.filter((scope) => scope.includes("write"))).toEqual(["esi-ui.write_waypoint.v1"]);
  });
});
