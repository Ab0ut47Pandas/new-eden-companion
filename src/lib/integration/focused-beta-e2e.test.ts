import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { ReadinessExplanation } from "@/lib/readiness/explanation";
import { compileBuilderState, createEmptyBuilderState } from "@/lib/fitting/builder";
import { buildRequirementAcquisitionPlan } from "@/lib/goals/acquisition-choices";
import { buildGoalChecklist } from "@/lib/goals/goal-checklist";
import { buildOwnedFirstGoalPlan } from "@/lib/goals/owned-first-plan";
import { GoalStore } from "@/lib/goals/store-core";
import type { PreflightCheck } from "@/lib/preflight/checker";
import { summarizePreflight } from "@/lib/preflight/summary";
import type { PreflightSuitabilityResult } from "@/lib/preflight/suitability";
import { buildSuggestedSession, type SuggestedSessionCandidate } from "@/lib/session/suggested-session";

const tempRoots: string[] = [];

function readiness(status: ReadinessExplanation["status"]): ReadinessExplanation {
  return {
    status,
    headline: status,
    why: `readiness: ${status}`,
    technicalEligibility: status === "unknown" ? "unknown" : status === "not-recommended" ? "blocked" : "eligible",
    primaryIssue: null,
    nextAction: null,
    blockers: [],
    gaps: [],
    warnings: [],
    unknowns: [],
    satisfied: [],
  };
}

function candidate(overrides: Partial<SuggestedSessionCandidate> = {}): SuggestedSessionCandidate {
  return {
    id: "fit-rifter",
    activity: "fitting",
    title: "Prepare a Rifter fit",
    readiness: readiness("ready"),
    goalRelevance: "direct",
    sessionLength: "short",
    riskPosture: "balanced",
    requiredEvidence: ["activity-readiness"],
    nextAction: "Save the Rifter as your goal.",
    evidence: ["The existing fitting workflow is available for this supported fixture."],
    provenance: ["NEC fitting fixture"],
    ...overrides,
  };
}

function check(id: string, status: PreflightCheck["status"], section: PreflightCheck["section"] = "fit"): PreflightCheck {
  return { id, status, section, title: id, detail: `${id} detail` };
}

const emptySuitability: PreflightSuitabilityResult = {
  blockers: [],
  improvements: [],
  unknowns: [],
  suggestedOwnedShip: null,
};

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("BETA-16 focused beta end-to-end integration", () => {
  it("composes demo session -> persisted goal -> owned reuse -> acquisition -> fit -> preflight", () => {
    const suggested = buildSuggestedSession({
      candidates: [candidate()],
      evidence: [{ key: "activity-readiness", availability: "available", provenance: ["NEC readiness engine"] }],
      preferences: { sessionLength: "short", risk: "balanced" },
    });
    expect(suggested.primary).toMatchObject({
      candidateId: "fit-rifter",
      state: "ready",
      nextAction: "Save the Rifter as your goal.",
    });

    const root = mkdtempSync(path.join(tmpdir(), "nec-beta16-e2e-"));
    tempRoots.push(root);
    const filename = path.join(root, "eve-companion.db");
    const store = new GoalStore(filename);
    const saved = store.saveGoal({
      characterId: 9001,
      kind: "item",
      targetKey: "type:587",
      targetTypeId: 587,
      title: "Rifter fitting goal",
    });
    const persistedStep = store.addStep(9001, saved.id, "Resolve the uncovered fit requirements");
    expect(persistedStep?.completed).toBe(false);
    store.close();

    const reopened = new GoalStore(filename);
    expect(reopened.getGoalByTarget(9001, "item", "type:587")?.steps).toEqual([
      expect.objectContaining({ label: "Resolve the uncovered fit requirements", completed: false }),
    ]);
    reopened.close();

    const ownedFirst = buildOwnedFirstGoalPlan({
      goal: { kind: "fitting", key: "fit:rifter-beta16", title: "Rifter beta fit" },
      requirements: [
        { id: "hull", kind: "hull", title: "Rifter", reason: "The selected fitting uses this hull.", typeId: 587, quantity: 1 },
        { id: "guns", kind: "module", title: "200mm AutoCannon I", reason: "The selected fitting uses three validated turrets.", typeId: 478, quantity: 3 },
        { id: "ammo", kind: "charge", title: "EMP S", reason: "The selected fitting needs compatible ammunition.", typeId: 185, quantity: 1000 },
        { id: "special-source", kind: "consumable", title: "Source-boundary fixture", reason: "The integration path must preserve a supported non-market source boundary.", typeId: 999, quantity: 1 },
      ],
      trainedSkills: [],
      ownedItems: [
        { typeId: 587, accessibleQuantity: 1 },
        { typeId: 478, accessibleQuantity: 2 },
        { typeId: 185, accessibleQuantity: 1000 },
      ],
      ownershipProvenance: ["ESI-visible accessible assets fixture"],
      skillProvenance: ["ESI skills fixture"],
    });

    expect(ownedFirst.covered.map((entry) => entry.requirement.id)).toEqual(["hull", "ammo"]);
    expect(ownedFirst.uncovered.find((entry) => entry.requirement.id === "guns")?.missingQuantity).toBe(1);

    const acquisitionPlans = ownedFirst.uncovered.map((coverage) => {
      if (coverage.requirement.id === "special-source") {
        return buildRequirementAcquisitionPlan(coverage, {
          sourceResolution: {
            typeId: 999,
            manufacturingBoundary: "no-ordinary-blueprint",
            sourceState: "known",
            sources: [{
              sourceKind: "loyalty-points",
              label: "Supported non-market source fixture",
              evidence: { kind: "curated", authority: "BETA-16 fixture", title: "Integration source boundary", url: "https://developers.eveonline.com/" },
            }],
          },
        });
      }
      return buildRequirementAcquisitionPlan(coverage, {
        market: { state: "available", summary: "Verified exact-type market fixture is available.", provenance: ["BETA-16 verified-market fixture"] },
      });
    });

    const nonMarket = acquisitionPlans.find((plan) => plan.requirement.id === "special-source");
    expect(nonMarket?.choices).toEqual([
      expect.objectContaining({ kind: "source", label: "Supported non-market source fixture" }),
    ]);
    expect(nonMarket?.choices.some((choice) => choice.kind === "buy")).toBe(false);

    const checklist = buildGoalChecklist(ownedFirst, acquisitionPlans);
    expect(checklist.nextAction).toBeTruthy();
    expect(checklist.milestones.every((milestone) => milestone.reason.length > 0)).toBe(true);

    const fitState = createEmptyBuilderState();
    fitState.name = "BETA-16 Rifter";
    fitState.modules = Array.from({ length: 3 }, (_, index) => ({
      instanceId: `gun-${index}`,
      definitionId: "200mm-autocannon-i",
      chargeId: "emp-s",
    }));
    const compiled = compileBuilderState(fitState);
    expect(compiled.errors).toEqual([]);
    expect(compiled.result?.fitValid).toBe(true);

    const preflight = summarizePreflight({
      checks: [
        check("validated-fit", compiled.result?.fitValid === true ? "pass" : "danger"),
        check("required-ammunition", "pass", "supplies"),
      ],
      suitability: emptySuitability,
    });
    expect(preflight).toMatchObject({ state: "complete", title: "Preflight complete", subtitle: "No known blockers" });
    expect(preflight.detail.toLowerCase()).toContain("not a safety guarantee");
  });

  it("keeps missing required evidence honest and actionable across the composed path", () => {
    const suggested = buildSuggestedSession({
      candidates: [candidate({ requiredEvidence: ["activity-readiness", "current-ship", "cargo-supplies"] })],
      evidence: [{ key: "activity-readiness", availability: "available", provenance: ["NEC readiness engine"] }],
      preferences: { sessionLength: "short", risk: "balanced" },
    });
    expect(suggested.primary?.state).toBe("cannot-verify");
    expect(suggested.primary?.resolveUnknowns).toContain("Refresh or reconnect to resolve current-ship evidence.");

    const unknownPlan = buildOwnedFirstGoalPlan({
      goal: { kind: "fitting", key: "fit:unknown", title: "Unverified fitting goal" },
      requirements: [{ id: "hull", kind: "hull", title: "Rifter", reason: "The selected fitting needs its hull.", typeId: 587, quantity: 1 }],
      ownedItems: null,
      trainedSkills: null,
      ownershipProvenance: ["ESI assets unavailable"],
      skillProvenance: ["ESI skills unavailable"],
    });
    const unknownAcquisition = unknownPlan.unknown.map((coverage) => buildRequirementAcquisitionPlan(coverage));
    expect(unknownAcquisition[0].choices[0]).toMatchObject({ kind: "unknown", label: "Acquisition cannot be planned yet" });

    const preflight = summarizePreflight({
      checks: [check("active-ship-inventory", "unknown")],
      suitability: emptySuitability,
    });
    expect(preflight).toMatchObject({ state: "cannot-verify", title: "Cannot verify" });
  });
});
