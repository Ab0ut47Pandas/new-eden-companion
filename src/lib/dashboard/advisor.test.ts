import { describe, expect, it } from "vitest";

import { generateAdvice } from "@/lib/dashboard/advisor";

const base = {
  wallet: 500_000_000,
  assetValue: 1_000_000_000,
  queue: [
    {
      skillId: 1,
      name: "Navigation V",
      targetLevel: 5,
      finishDate: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      active: true,
    },
  ],
  location: "Jita IV - Moon 4",
  systemSecurity: 0.9,
  shipType: "Shuttle",
  online: false,
  orders: [],
  jobs: [],
  locations: [
    { id: 1, name: "Jita", itemCount: 10, estimatedValue: 600_000_000, share: 0.6 },
  ],
  unavailable: [],
};

describe("generateAdvice", () => {
  it("raises an empty skill queue as the first urgent action", () => {
    const advice = generateAdvice({ ...base, queue: [] });
    expect(advice[0]).toMatchObject({ id: "empty-skill-queue", priority: "now" });
  });

  it("warns when an online character is outside high security space", () => {
    const advice = generateAdvice({
      ...base,
      online: true,
      systemSecurity: 0.2,
      location: "A low-sec gate",
      shipType: "Marauder",
    });
    expect(advice.some((item) => item.id === "security-awareness" && item.priority === "now")).toBe(true);
  });

  it("does not invent urgency when the tracked state is healthy", () => {
    const advice = generateAdvice(base);
    expect(advice).toHaveLength(1);
    expect(advice[0].id).toBe("steady-state");
  });

  it("labels materially incomplete data", () => {
    const advice = generateAdvice({ ...base, unavailable: ["assets", "wallet", "skills"] });
    expect(advice.some((item) => item.id === "partial-data")).toBe(true);
  });
});
