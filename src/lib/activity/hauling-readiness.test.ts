import { describe, expect, it } from "vitest";
import { assessHaulingReadiness, type HaulingReadinessInput } from "./hauling-readiness";

function baseInput(): HaulingReadinessInput {
  return {
    mode: "own-cargo",
    purpose: { label: "Move minerals to the manufacturing station", detail: "Supports the active manufacturing goal." },
    cargoVolumeM3: 12_000,
    route: { jumps: 6, risk: "low", originLabel: "Origin", destinationLabel: "Destination" },
    tolerance: { maxJumps: 10, maxRisk: "medium" },
    ships: [
      {
        id: "owned-small",
        name: "Owned Small Hauler",
        owned: true,
        canBoard: "yes",
        fitReady: "yes",
        cargoCapacityM3: 5_000,
        profile: "balanced",
        replacementRisk: "affordable",
      },
      {
        id: "unowned-large",
        name: "Unowned Large Hauler",
        owned: false,
        canBoard: "yes",
        fitReady: "yes",
        cargoCapacityM3: 20_000,
        profile: "cargo-efficiency",
        replacementRisk: "affordable",
      },
    ],
  };
}

describe("assessHaulingReadiness", () => {
  it("prefers an already-owned confirmed-usable ship before an unowned larger alternative", () => {
    const result = assessHaulingReadiness(baseInput());

    expect(result.selectedShip?.ship.name).toBe("Owned Small Hauler");
    expect(result.selectedShip?.tripCount).toBe(3);
    expect(result.alternatives[0]?.ship.name).toBe("Unowned Large Hauler");
    expect(result.readiness.technicalEligibility.status).toBe("eligible");
    expect(result.nextAction).toContain("3 trips");
  });

  it("blocks a courier job when the wallet cannot cover known collateral", () => {
    const input = baseInput();
    const result = assessHaulingReadiness({
      ...input,
      mode: "courier",
      courier: { collateralIsk: 100_000_000, walletIsk: 25_000_000, rewardIsk: 5_000_000 },
    });

    const collateral = result.readiness.findings.find((finding) => finding.id === "hauling-collateral");
    expect(collateral?.state).toBe("unmet");
    expect(collateral?.evidence?.[0]?.detail).toContain("Courier-Contracts");
    expect(result.readiness.technicalEligibility.status).toBe("blocked");
    expect(result.nextAction).toContain("collateral");
  });

  it("preserves unknown cargo, route exposure, and courier collateral instead of inventing readiness", () => {
    const input = baseInput();
    const result = assessHaulingReadiness({
      ...input,
      mode: "courier",
      cargoVolumeM3: null,
      route: { jumps: null, risk: "unknown" },
      courier: { collateralIsk: null, walletIsk: null },
      ships: [{
        ...input.ships[0],
        cargoCapacityM3: null,
        replacementRisk: "unknown",
      }],
    });

    expect(result.readiness.technicalEligibility.status).toBe("unknown");
    expect(result.readiness.findings.find((finding) => finding.id === "hauling-cargo")?.state).toBe("unknown");
    expect(result.readiness.findings.find((finding) => finding.id === "hauling-risk-tolerance")?.state).toBe("unknown");
    expect(result.readiness.findings.find((finding) => finding.id === "hauling-collateral")?.state).toBe("unknown");
    expect(result.nextAction).toContain("cargo volume");
  });

  it("treats user route tolerances as cautions rather than a fabricated safety verdict", () => {
    const input = baseInput();
    const result = assessHaulingReadiness({
      ...input,
      route: { jumps: 18, risk: "high" },
      tolerance: { maxJumps: 10, maxRisk: "medium" },
    });

    expect(result.readiness.findings.find((finding) => finding.id === "hauling-jump-tolerance")?.state).toBe("caution");
    expect(result.readiness.findings.find((finding) => finding.id === "hauling-risk-tolerance")?.state).toBe("caution");
    expect(result.readiness.technicalEligibility.status).toBe("eligible");
    expect(result.nextAction).toContain("Shorten the route");
  });

  it("keeps cargo-efficiency and survivability evidence separate", () => {
    const input = baseInput();
    const result = assessHaulingReadiness({
      ...input,
      ships: [{
        ...input.ships[0],
        profile: "cargo-efficiency",
        profileDetail: "Configured to maximize useful cargo capacity; no survivability claim supplied.",
      }],
    });

    const profile = result.readiness.findings.find((finding) => finding.id === "hauling-profile");
    expect(profile?.summary).toContain("cargo efficiency");
    expect(profile?.summary).toContain("not guaranteed survivability");
    expect(profile?.why).toContain("no survivability claim");
  });

  it("rejects courier assessments without courier evidence", () => {
    const input = baseInput();
    expect(() => assessHaulingReadiness({ ...input, mode: "courier" })).toThrow(/courier contract evidence/i);
  });
});
