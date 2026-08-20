import { describe, expect, it } from "vitest";

import { evaluatePreflightSuitability } from "@/lib/preflight/suitability";

const provenance = ["validated activity requirement"] as const;

describe("evaluatePreflightSuitability", () => {
  it("separates required fit blockers from useful improvements", () => {
    const result = evaluatePreflightSuitability({
      fitRequirements: [
        { id: "probe-launcher", label: "Core Probe Launcher", required: true, fitted: false, online: null, provenance },
      ],
      damageChoice: {
        expectedDamageTypes: ["em"],
        selectedDamageTypes: ["kinetic"],
        expectationReason: "The caller supplied a sourced EM expectation for this activity.",
        provenance: ["sourced activity damage expectation", "validated loaded charge evidence"],
      },
    });

    expect(result.blockers.map((finding) => finding.id)).toEqual(["fit-probe-launcher-missing"]);
    expect(result.improvements.map((finding) => finding.id)).toEqual(["damage-choice-mismatch"]);
  });

  it("preserves online state as unknown when only fitted state is established", () => {
    const result = evaluatePreflightSuitability({
      fitRequirements: [
        { id: "analyzer", label: "Relic Analyzer", required: true, fitted: true, online: null, provenance },
      ],
    });

    expect(result.blockers).toEqual([]);
    expect(result.unknowns[0]?.id).toBe("fit-analyzer-online-unknown");
    expect(result.unknowns[0]?.title).toContain("Confirm Relic Analyzer is online");
  });

  it("treats an explicitly offline required module as a blocker", () => {
    const result = evaluatePreflightSuitability({
      fitRequirements: [
        { id: "analyzer", label: "Relic Analyzer", required: true, fitted: true, online: false, provenance },
      ],
    });

    expect(result.blockers[0]?.id).toBe("fit-analyzer-offline");
  });

  it("does not flag damage when the sourced expectation overlaps the selected damage", () => {
    const result = evaluatePreflightSuitability({
      damageChoice: {
        expectedDamageTypes: ["em", "thermal"],
        selectedDamageTypes: ["thermal"],
        provenance: ["sourced activity expectation", "validated loaded charge evidence"],
      },
    });

    expect(result.improvements).toEqual([]);
    expect(result.unknowns).toEqual([]);
  });

  it("does not invent a damage mismatch when either side is unknown", () => {
    const result = evaluatePreflightSuitability({
      damageChoice: {
        expectedDamageTypes: null,
        selectedDamageTypes: ["thermal"],
        provenance: ["activity expectation unavailable", "validated loaded charge evidence"],
      },
    });

    expect(result.improvements).toEqual([]);
    expect(result.unknowns.map((finding) => finding.id)).toEqual(["damage-choice-unknown"]);
  });

  it("suggests a better owned ship only when better suitability and accessibility are both positive evidence", () => {
    const result = evaluatePreflightSuitability({
      ownedShipCandidates: [
        { shipId: "1", shipName: "Inaccessible Better Ship", accessible: false, suitability: "better", reason: "Validated activity evaluator prefers this hull.", provenance },
        { shipId: "2", shipName: "Unknown Ship", accessible: true, suitability: "unknown", provenance },
        { shipId: "3", shipName: "Accessible Better Ship", accessible: true, suitability: "better", reason: "Validated activity evaluator prefers this hull and ESI-visible ownership places it in an accessible location.", provenance },
      ],
    });

    expect(result.suggestedOwnedShip?.shipId).toBe("3");
    expect(result.suggestedOwnedShip?.shipName).toBe("Accessible Better Ship");
  });

  it("returns no ship suggestion when positive accessibility or superiority evidence is missing", () => {
    const result = evaluatePreflightSuitability({
      ownedShipCandidates: [
        { shipId: "1", shipName: "Maybe Better", accessible: null, suitability: "better", provenance },
        { shipId: "2", shipName: "Accessible Unknown", accessible: true, suitability: "unknown", provenance },
      ],
    });

    expect(result.suggestedOwnedShip).toBeNull();
  });

  it("requires provenance for claims instead of accepting unexplained suitability facts", () => {
    expect(() => evaluatePreflightSuitability({
      fitRequirements: [{ id: "x", label: "Required module", required: true, fitted: true, online: true, provenance: [] }],
    })).toThrow("Fit requirement x requires provenance");

    expect(() => evaluatePreflightSuitability({
      ownedShipCandidates: [{ shipId: "x", shipName: "Ship", accessible: true, suitability: "better", provenance: [] }],
    })).toThrow("Owned ship candidate x requires provenance");
  });
});
