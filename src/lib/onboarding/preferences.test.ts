import { describe, expect, it } from "vitest";

import { normalizeAdventureIntent } from "./intents";
import {
  normalizeSessionLength,
  normalizeSessionRisk,
  onboardingComplete,
  onboardingPreferences,
} from "./preferences";

describe("onboarding preferences", () => {
  it("preserves supported session length, risk, and plain-language intent choices", () => {
    expect(onboardingPreferences({ sessionLength: "medium", risk: "adventurous", intent: "exploration" })).toEqual({
      sessionLength: "medium",
      risk: "adventurous",
      intent: "exploration",
    });
  });

  it("fails unknown cookie values back to neutral preferences", () => {
    expect(normalizeSessionLength("forever")).toBe("any");
    expect(normalizeSessionRisk("reckless")).toBe("any");
    expect(normalizeAdventureIntent("fleet-command")).toBeNull();
    expect(onboardingPreferences({})).toEqual({ sessionLength: "any", risk: "any", intent: null });
  });

  it("supports every focused-beta adventure-first intent without fleet-role jargon", () => {
    const supported = [
      "combat",
      "exploration",
      "mining",
      "hauling-trade",
      "industry-building",
      "dangerous-exploration",
      "friend",
      "show-me-something",
      "adventure",
      "make-isk",
    ];
    for (const intent of supported) expect(normalizeAdventureIntent(intent)).toBe(intent);
  });

  it("only treats the explicit completion marker as complete", () => {
    expect(onboardingComplete("1")).toBe(true);
    expect(onboardingComplete("true")).toBe(false);
    expect(onboardingComplete(undefined)).toBe(false);
  });
});
