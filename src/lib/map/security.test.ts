import { describe, expect, it } from "vitest";

import { displayedSecurity, securityBand } from "@/lib/map/security";

describe("security display", () => {
  it("uses the same one-decimal band shown to the player", () => {
    expect(displayedSecurity(0.492)).toBe(0.5);
    expect(securityBand(0.492)).toBe("high");
    expect(securityBand(0.449)).toBe("low");
    expect(securityBand(-0.01)).toBe("null");
  });
});

