import { describe, expect, it } from "vitest";

import { demoDashboard } from "./demo";
import { buildProgressionHomeModel } from "./progression-home";

describe("buildProgressionHomeModel", () => {
  it("promotes the most urgent recommendation without discarding supporting choices", () => {
    const data = demoDashboard();
    data.advice = [
      { id: "watch", priority: "watch", title: "Watch", summary: "Watch", evidence: "e", action: "a" },
      { id: "next", priority: "next", title: "Next", summary: "Next", evidence: "e", action: "a" },
      { id: "now", priority: "now", title: "Now", summary: "Now", evidence: "e", action: "a" },
      { id: "next-2", priority: "next", title: "Next 2", summary: "Next 2", evidence: "e", action: "a" },
    ];

    const result = buildProgressionHomeModel(data);

    expect(result.primary?.id).toBe("now");
    expect(result.supporting.map((item) => item.id)).toEqual(["next", "next-2"]);
  });

  it("preserves an honest empty state when there is no supported recommendation", () => {
    const data = demoDashboard();
    data.advice = [];
    data.dataQuality.unavailable = ["assets", "skills"];

    const result = buildProgressionHomeModel(data);

    expect(result.primary).toBeNull();
    expect(result.supporting).toEqual([]);
    expect(result.dataGapCount).toBe(2);
  });
});
