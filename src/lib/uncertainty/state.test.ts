import { describe, expect, it } from "vitest";

import { companionStateFromReadiness, uncertaintyPresentation } from "./state";

describe("focused beta uncertainty states", () => {
  it("maps readiness explanations onto the standard focused-beta language", () => {
    expect(companionStateFromReadiness("ready")).toBe("ready");
    expect(companionStateFromReadiness("nearly-ready")).toBe("probably-ready");
    expect(companionStateFromReadiness("not-recommended")).toBe("missing-requirements");
    expect(companionStateFromReadiness("unknown")).toBe("cannot-verify");
  });

  it("exposes the exact five user-facing state labels", () => {
    expect([
      uncertaintyPresentation("ready").label,
      uncertaintyPresentation("probably-ready").label,
      uncertaintyPresentation("missing-requirements").label,
      uncertaintyPresentation("cannot-verify").label,
      uncertaintyPresentation("live-information-unavailable").label,
    ]).toEqual([
      "Ready",
      "Probably ready",
      "Missing requirements",
      "Cannot verify",
      "Live information unavailable",
    ]);
  });

  it("never describes unknown or unavailable evidence as ready", () => {
    expect(uncertaintyPresentation("cannot-verify").needsResolution).toBe(true);
    expect(uncertaintyPresentation("cannot-verify").summary).toContain("stays unknown");
    expect(uncertaintyPresentation("live-information-unavailable").needsResolution).toBe(true);
    expect(uncertaintyPresentation("live-information-unavailable").summary).toContain("will not replace");
  });
});
