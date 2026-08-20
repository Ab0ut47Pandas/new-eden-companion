import { describe, expect, it } from "vitest";
import { evaluateFitWeaknesses } from "./weakness";

const provenance = ["validated FIT evidence"] as const;

describe("evaluateFitWeaknesses", () => {
  it("flags a solo weapon plan that extends beyond its own tackle envelope", () => {
    const result = evaluateFitWeaknesses({
      weaponPreferredRangeMeters: 24_000,
      scramRangeMeters: 9_000,
      disruptorRangeMeters: 20_000,
      assumesSoloTackle: true,
      requiresRangeControl: false,
      mobilityPenaltySources: [],
      capacitorStable: true,
      capacitorDependentSystems: [],
      provenance,
    });

    expect(result.findings.map((finding) => finding.code)).toContain("weapon-plan-beyond-own-tackle");
  });

  it("does not call an out-of-tackle weapon range a weakness when the fit explicitly does not assume solo tackle", () => {
    const result = evaluateFitWeaknesses({
      weaponPreferredRangeMeters: 60_000,
      disruptorRangeMeters: 24_000,
      assumesSoloTackle: false,
      requiresRangeControl: false,
      mobilityPenaltySources: [],
      capacitorStable: true,
      capacitorDependentSystems: [],
      provenance,
    });

    expect(result.findings.some((finding) => finding.category === "range-plan" || finding.category === "tackle")).toBe(false);
  });

  it("flags an explicitly cap-dependent plan when deterministic fitting says it is unstable", () => {
    const result = evaluateFitWeaknesses({
      weaponPreferredRangeMeters: 8_000,
      assumesSoloTackle: false,
      requiresRangeControl: false,
      mobilityPenaltySources: [],
      capacitorStable: false,
      capacitorDependentSystems: ["local armor repair", "warp scrambler"],
      provenance,
    });

    const finding = result.findings.find((entry) => entry.code === "unstable-cap-with-cap-dependent-plan");
    expect(finding?.severity).toBe("warning");
    expect(finding?.evidence).toEqual(["Plan depends on: local armor repair", "Plan depends on: warp scrambler"]);
  });

  it("flags dominant expected damage only when it matches the weakest supported resist", () => {
    const result = evaluateFitWeaknesses({
      weaponPreferredRangeMeters: 8_000,
      assumesSoloTackle: false,
      requiresRangeControl: false,
      mobilityPenaltySources: [],
      capacitorStable: true,
      capacitorDependentSystems: [],
      primaryTankLayer: "armor",
      tankResistances: {
        armor: { em: 0.6, thermal: 0.35, kinetic: 0.25, explosive: 0.1 },
      },
      expectedIncomingDamage: { em: 10, thermal: 10, kinetic: 10, explosive: 70 },
      provenance,
    });

    expect(result.findings.map((finding) => finding.code)).toContain("dominant-damage-hits-weakest-resist");
  });

  it("does not invent a resist warning when the expected damage profile is absent", () => {
    const result = evaluateFitWeaknesses({
      weaponPreferredRangeMeters: 8_000,
      assumesSoloTackle: false,
      requiresRangeControl: false,
      mobilityPenaltySources: [],
      capacitorStable: true,
      capacitorDependentSystems: [],
      primaryTankLayer: "armor",
      tankResistances: {
        armor: { em: 0.6, thermal: 0.35, kinetic: 0.25, explosive: 0.1 },
      },
      provenance,
    });

    expect(result.findings.some((finding) => finding.category === "resistance")).toBe(false);
    expect(result.unknowns).toContain("expected incoming damage profile is not established");
  });

  it("flags a mobility conflict only when range-control dependence and resolved penalties are both explicit", () => {
    const result = evaluateFitWeaknesses({
      weaponPreferredRangeMeters: 20_000,
      assumesSoloTackle: false,
      requiresRangeControl: true,
      mobilityPenaltySources: ["resolved fitted effect: -mass/agility plan margin"],
      capacitorStable: true,
      capacitorDependentSystems: [],
      provenance,
    });

    expect(result.findings.map((finding) => finding.code)).toContain("range-control-with-supported-mobility-penalties");
  });

  it("accepts poor application only from separately validated application evidence", () => {
    const result = evaluateFitWeaknesses({
      weaponPreferredRangeMeters: 20_000,
      assumesSoloTackle: false,
      requiresRangeControl: false,
      mobilityPenaltySources: [],
      capacitorStable: true,
      capacitorDependentSystems: [],
      application: {
        status: "poor",
        reason: "Validated target signature/angular inputs exceed this weapon plan's supported application envelope.",
        provenance: ["validated application fixture"],
      },
      provenance,
    });

    expect(result.findings.map((finding) => finding.code)).toContain("supported-poor-application");
  });

  it("preserves missing evidence as unknown instead of fabricating weaknesses", () => {
    const result = evaluateFitWeaknesses({ provenance });

    expect(result.findings).toEqual([]);
    expect(result.unknowns).toEqual([
      "capacitor stability is not established",
      "primary tank layer is not established",
      "range-control dependence is not established",
      "solo tackle responsibility is not established",
      "target-specific damage application is not established",
      "weapon engagement range is not established",
    ]);
  });

  it("requires top-level and application provenance", () => {
    expect(() => evaluateFitWeaknesses({ provenance: [] })).toThrow("Fit weakness evidence requires provenance");
    expect(() => evaluateFitWeaknesses({
      weaponPreferredRangeMeters: 10_000,
      assumesSoloTackle: false,
      requiresRangeControl: false,
      mobilityPenaltySources: [],
      capacitorStable: true,
      capacitorDependentSystems: [],
      application: { status: "poor", provenance: [] },
      provenance,
    })).toThrow("Application evidence requires provenance");
  });
});
