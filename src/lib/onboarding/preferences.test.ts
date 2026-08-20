import { describe, expect, it } from "vitest";

import {
  normalizeSessionLength,
  normalizeSessionRisk,
  onboardingComplete,
  onboardingPreferences,
} from "./preferences";

describe("onboarding preferences", () => {
  it("preserves supported session length and risk choices", () => {
    expect(onboardingPreferences({ sessionLength: "medium", risk: "adventurous" })).toEqual({
      sessionLength: "medium",
      risk: "adventurous",
    });
  });

  it("fails unknown cookie values back to neutral preferences", () => {
    expect(normalizeSessionLength("forever")).toBe("any");
    expect(normalizeSessionRisk("reckless")).toBe("any");
    expect(onboardingPreferences({})).toEqual({ sessionLength: "any", risk: "any" });
  });

  it("only treats the explicit completion marker as complete", () => {
    expect(onboardingComplete("1")).toBe(true);
    expect(onboardingComplete("true")).toBe(false);
    expect(onboardingComplete(undefined)).toBe(false);
  });
});
