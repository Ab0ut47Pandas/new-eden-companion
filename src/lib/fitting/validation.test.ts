import { describe, expect, it } from "vitest";

import {
  FITTING_GOLDEN_REFERENCES,
  FITTING_SCOPE,
  compareGoldenReference,
  validateFittingValidationModel,
} from "./validation";

describe("fitting validation harness", () => {
  it("defines the bounded FIT-02 coverage areas before calculator implementation", () => {
    expect(FITTING_SCOPE.map((area) => area.id)).toEqual([
      "resources",
      "slots",
      "mobility",
      "tank",
      "capacitor",
      "weapons",
    ]);
    expect(FITTING_SCOPE.flatMap((area) => area.metrics)).toContain("missileExplosionRadius");
    expect(FITTING_SCOPE.flatMap((area) => area.metrics)).toContain("droneDps");
  });

  it("pins current primitive Dogma values for T1 and T2 autocannon references", () => {
    expect(FITTING_GOLDEN_REFERENCES).toMatchObject([
      {
        typeId: 486,
        expected: { cpuUsed: 9, powergridUsed: 4, optimalRange: 1000, falloffRange: 5160 },
      },
      {
        typeId: 2889,
        expected: { cpuUsed: 9, powergridUsed: 4, optimalRange: 1200, falloffRange: 5160 },
      },
    ]);
    expect(FITTING_GOLDEN_REFERENCES.every((reference) => reference.sdeBuild === 3424810)).toBe(true);
  });

  it("accepts a calculator snapshot that matches the golden reference", () => {
    const reference = FITTING_GOLDEN_REFERENCES[1];
    expect(compareGoldenReference(reference, reference.expected)).toEqual({ ok: true, mismatches: [], unknown: [] });
  });

  it("reports incorrect values without hiding them behind tolerance", () => {
    const reference = FITTING_GOLDEN_REFERENCES[1];
    const result = compareGoldenReference(reference, { ...reference.expected, optimalRange: 1199 });
    expect(result.ok).toBe(false);
    expect(result.mismatches).toEqual([{ metric: "optimalRange", expected: 1200, actual: 1199 }]);
  });

  it("preserves missing calculator state as unknown rather than passing it", () => {
    const reference = FITTING_GOLDEN_REFERENCES[0];
    const result = compareGoldenReference(reference, {
      cpuUsed: 9,
      powergridUsed: 4,
      optimalRange: 1000,
    });
    expect(result.ok).toBe(false);
    expect(result.unknown).toEqual(["falloffRange"]);
  });

  it("validates source provenance and metric uniqueness", () => {
    expect(() => validateFittingValidationModel()).not.toThrow();
  });
});
