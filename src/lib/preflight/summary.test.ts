import { describe, expect, it } from "vitest";
import { summarizePreflight } from "./summary";
import type { PreflightCheck } from "./checker";
import type { PreflightSuitabilityResult } from "./suitability";

function check(id: string, status: PreflightCheck["status"]): PreflightCheck {
  return { id, status, section: "fit", title: id, detail: `${id} detail` };
}

const emptySuitability: PreflightSuitabilityResult = {
  blockers: [],
  improvements: [],
  unknowns: [],
  suggestedOwnedShip: null,
};

describe("summarizePreflight", () => {
  it("reports Preflight complete / No known blockers when supported checks are resolved", () => {
    const result = summarizePreflight({
      checks: [check("weapon", "pass"), check("optional", "info")],
      suitability: emptySuitability,
    });

    expect(result.state).toBe("complete");
    expect(result.title).toBe("Preflight complete");
    expect(result.subtitle).toBe("No known blockers");
    expect(result.detail.toLowerCase()).toContain("not a safety guarantee");
  });

  it("keeps non-fatal improvements separate without blocking completion", () => {
    const result = summarizePreflight({
      checks: [check("tank-improvement", "warning")],
      suitability: emptySuitability,
    });

    expect(result.state).toBe("complete");
    expect(result.improvements).toHaveLength(1);
    expect(result.blockers).toHaveLength(0);
  });

  it("returns Missing requirements for checker or suitability blockers", () => {
    const suitability: PreflightSuitabilityResult = {
      ...emptySuitability,
      blockers: [{
        id: "fit-probe-missing",
        severity: "blocker",
        title: "Probe launcher required",
        detail: "Required fit evidence says it is missing.",
        evidence: ["not fitted"],
        provenance: ["validated requirement"],
      }],
    };
    const result = summarizePreflight({
      checks: [check("filament", "danger")],
      suitability,
    });

    expect(result.state).toBe("blocked");
    expect(result.title).toBe("Missing requirements");
    expect(result.blockers).toHaveLength(2);
  });

  it("fails closed when unknown or manual evidence remains", () => {
    const result = summarizePreflight({
      checks: [check("inventory", "unknown"), check("capacitor", "manual")],
      suitability: emptySuitability,
    });

    expect(result.state).toBe("cannot-verify");
    expect(result.title).toBe("Cannot verify");
    expect(result.unknowns).toHaveLength(1);
    expect(result.pendingManual).toHaveLength(1);
  });

  it("allows an explicitly confirmed manual check to stop blocking verification", () => {
    const result = summarizePreflight({
      checks: [check("capacitor", "manual")],
      confirmedManualIds: new Set(["capacitor"]),
      suitability: emptySuitability,
    });

    expect(result.state).toBe("complete");
    expect(result.pendingManual).toHaveLength(0);
  });
});
