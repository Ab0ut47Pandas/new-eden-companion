import { describe, expect, it } from "vitest";

import { buildReadinessSnapshot } from "./model";
import { ActivityPrerequisiteGraph, validateActivityDefinitions, type ActivityDefinition } from "./activity-graph";

const activities: ActivityDefinition[] = [
  {
    id: "basic-missions",
    title: "Basic missions",
    role: "primary",
    requirements: [
      { id: "frigate-skill", kind: "skill", strength: "hard", label: "Frigate skill", why: "The example hull requires this skill.", skillTypeId: 3327, level: 1 },
    ],
  },
  {
    id: "advanced-site",
    title: "Advanced site",
    role: "side",
    requirements: [
      { id: "prior-practice", kind: "activity", strength: "soft", label: "Practice basic missions first", why: "Prior practice reduces the learning jump.", activityId: "basic-missions" },
      { id: "site-hull", kind: "ship-constraint", strength: "hard", label: "Use an allowed hull", why: "The site has a hard ship-access rule.", allowedGroupIds: [25, 26] },
      { id: "ammo", kind: "supply", strength: "hard", label: "Bring ammunition", why: "The activity requires ammunition to apply damage.", typeId: 178, quantity: 1000 },
      { id: "practice", kind: "milestone", strength: "soft", label: "Practice the lower tier", why: "The higher tier assumes prior practice.", milestoneKey: "advanced-site:lower-tier-practiced" },
      { id: "briefing", kind: "knowledge", strength: "soft", label: "Read the site briefing", why: "Knowing the failure conditions is part of preparation.", knowledgeKey: "advanced-site:briefing" },
      { id: "access", kind: "location-access", strength: "hard", label: "Reach the site", why: "The character must be able to access the site location.", accessKey: "advanced-site:access" },
      { id: "wallet", kind: "isk", strength: "soft", label: "Cover the entry cost", why: "The activity has an estimated immediate cost.", amountIsk: 1_000_000 },
      { id: "replacement", kind: "replacement-capacity", strength: "soft", label: "Meet the loss policy", why: "The selected risk policy should survive a loss.", policyKey: "advanced-site:replacement" },
    ],
  },
];

describe("activity prerequisite graph", () => {
  it("preserves primary versus optional side-activity status", () => {
    const graph = new ActivityPrerequisiteGraph(activities);
    expect(graph.get("basic-missions")?.role).toBe("primary");
    expect(graph.get("advanced-site")?.role).toBe("side");
  });

  it("orders transitive prerequisite activities before their dependent activity", () => {
    const graph = new ActivityPrerequisiteGraph([
      ...activities,
      {
        id: "expert-site",
        title: "Expert site",
        role: "side",
        requirements: [
          { id: "advanced-first", kind: "activity", strength: "soft", label: "Practice advanced site", why: "This tier builds on the prior tier.", activityId: "advanced-site" },
        ],
      },
    ]);
    expect(graph.prerequisiteActivities("expert-site").map((activity) => activity.id)).toEqual(["basic-missions", "advanced-site"]);
  });

  it("maps evaluated activity requirements into the standard readiness dimensions", () => {
    const graph = new ActivityPrerequisiteGraph(activities);
    const findings = graph.findingsFor("advanced-site", [
      { requirementId: "site-hull", state: "unmet", summary: "Selected hull is rejected" },
      { requirementId: "ammo", state: "met" },
      { requirementId: "practice", state: "unmet" },
      { requirementId: "briefing", state: "caution" },
      { requirementId: "access", state: "met" },
      { requirementId: "wallet", state: "met" },
      { requirementId: "replacement", state: "unknown" },
      { requirementId: "prior-practice", state: "met" },
    ]);
    const snapshot = buildReadinessSnapshot(findings);

    expect(snapshot.technicalEligibility.status).toBe("blocked");
    expect(snapshot.dimensions.find((entry) => entry.dimension === "ship-fit")?.status).toBe("blocked");
    expect(snapshot.dimensions.find((entry) => entry.dimension === "supplies")?.status).toBe("ready");
    expect(snapshot.dimensions.find((entry) => entry.dimension === "experience")?.status).toBe("needs-work");
    expect(snapshot.dimensions.find((entry) => entry.dimension === "knowledge-preparation")?.status).toBe("caution");
    expect(snapshot.dimensions.find((entry) => entry.dimension === "replacement-capacity")?.status).toBe("unknown");
  });

  it("turns missing evaluator results into unknown findings instead of implicit pass/fail", () => {
    const graph = new ActivityPrerequisiteGraph(activities);
    const findings = graph.findingsFor("advanced-site", []);
    expect(findings).toHaveLength(8);
    expect(findings.every((finding) => finding.state === "unknown")).toBe(true);
    expect(buildReadinessSnapshot(findings).technicalEligibility.status).toBe("unknown");
  });

  it("rejects missing prerequisite activity references", () => {
    expect(() => validateActivityDefinitions([
      {
        id: "bad",
        title: "Bad",
        role: "primary",
        requirements: [{ id: "missing", kind: "activity", strength: "hard", label: "Missing", why: "Missing.", activityId: "not-there" }],
      },
    ])).toThrow(/missing prerequisite activity/);
  });

  it("rejects activity dependency cycles", () => {
    expect(() => validateActivityDefinitions([
      { id: "a", title: "A", role: "primary", requirements: [{ id: "b-first", kind: "activity", strength: "soft", label: "B", why: "B first.", activityId: "b" }] },
      { id: "b", title: "B", role: "primary", requirements: [{ id: "a-first", kind: "activity", strength: "soft", label: "A", why: "A first.", activityId: "a" }] },
    ])).toThrow(/cycle/);
  });

  it("validates structured skill, supply, and ship constraints", () => {
    expect(() => validateActivityDefinitions([
      { id: "bad-skill", title: "Bad skill", role: "primary", requirements: [{ id: "skill", kind: "skill", strength: "hard", label: "Skill", why: "Skill.", skillTypeId: 1, level: 6 }] },
    ])).toThrow(/skill level/);

    expect(() => validateActivityDefinitions([
      { id: "bad-supply", title: "Bad supply", role: "primary", requirements: [{ id: "supply", kind: "supply", strength: "hard", label: "Supply", why: "Supply.", typeId: 1, quantity: 0 }] },
    ])).toThrow(/supply quantity/);

    expect(() => validateActivityDefinitions([
      { id: "bad-ship", title: "Bad ship", role: "primary", requirements: [{ id: "ship", kind: "ship-constraint", strength: "hard", label: "Ship", why: "Ship." }] },
    ])).toThrow(/deterministic constraint/);
  });
});
