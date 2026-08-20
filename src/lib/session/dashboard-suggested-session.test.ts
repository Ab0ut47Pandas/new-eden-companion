import { describe, expect, it } from "vitest";
import { demoDashboard } from "@/lib/dashboard/demo";
import { buildDashboardSuggestedSession } from "./dashboard-suggested-session";

describe("buildDashboardSuggestedSession", () => {
  it("routes dashboard advice through the unified Suggested Session service", () => {
    const data = demoDashboard();
    const result = buildDashboardSuggestedSession(data);

    expect(result.primary).not.toBeNull();
    expect(result.alternatives.length).toBeLessThanOrEqual(2);
    expect(result.ranked.length).toBeGreaterThan(0);
    expect(result.primary?.nextAction).toBeTruthy();
    expect(result.primary?.activity).toBeTruthy();
    expect(result.primary?.provenance.length).toBeGreaterThan(0);
  });

  it("keeps Why this explanation facts and provenance on every meaningful dashboard recommendation", () => {
    const data = demoDashboard();
    const result = buildDashboardSuggestedSession(data, { sessionLength: "short", risk: "cautious" });

    expect(result.ranked.length).toBeGreaterThan(0);
    for (const recommendation of result.ranked) {
      expect(recommendation.why.length).toBeGreaterThan(0);
      expect(recommendation.evidence.length).toBeGreaterThan(0);
      expect(recommendation.provenance.length).toBeGreaterThan(0);
    }
  });

  it("maps adventure intent only onto existing supported activity advice", () => {
    const data = demoDashboard();
    data.advice = [
      {
        id: "jobs-finishing",
        priority: "now",
        title: "Industry jobs are finishing",
        summary: "Existing industry work needs attention.",
        evidence: "The dashboard has supported job-state evidence.",
        action: "Review the industry jobs.",
      },
      {
        id: "asset-concentration",
        priority: "watch",
        title: "Assets are concentrated",
        summary: "Existing assets may need movement planning.",
        evidence: "The dashboard has supported asset/location evidence.",
        action: "Review the hauling plan.",
      },
    ];

    const industry = buildDashboardSuggestedSession(data, { sessionLength: "any", risk: "any", intent: "industry-building" });
    const hauling = buildDashboardSuggestedSession(data, { sessionLength: "any", risk: "any", intent: "hauling-trade" });

    expect(industry.primary?.candidateId).toBe("dashboard-jobs-finishing");
    expect(hauling.primary?.candidateId).toBe("dashboard-asset-concentration");
  });

  it("fails closed when evidence required by a recommendation is unavailable", () => {
    const data = demoDashboard();
    data.mode = "live";
    data.advice = [{
      id: "empty-skill-queue",
      priority: "now",
      title: "Your skill queue is empty",
      summary: "Training is idle.",
      evidence: "ESI returned no queued skills.",
      action: "Add a skill to the queue.",
    }];
    data.dataQuality.unavailable = ["skill queue"];

    const result = buildDashboardSuggestedSession(data);

    expect(result.primary?.state).toBe("live-information-unavailable");
    expect(result.primary?.unknowns.join(" ")).toContain("skill queue data is unavailable");
    expect(result.primary?.resolveUnknowns.length).toBeGreaterThan(0);
  });

  it("does not turn the partial-data warning itself into a session activity", () => {
    const data = demoDashboard();
    data.advice = [{
      id: "partial-data",
      priority: "watch",
      title: "Recommendations are using partial data",
      summary: "Some categories are unavailable.",
      evidence: "assets unavailable.",
      action: "Refresh once.",
    }];

    const result = buildDashboardSuggestedSession(data);
    expect(result.primary).toBeNull();
    expect(result.ranked).toEqual([]);
  });
});
