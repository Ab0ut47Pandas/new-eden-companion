import { describe, expect, it } from "vitest";

import {
  FITTING_METRIC_COVERAGE,
  compareGoldenReference,
  validateGoldenReferenceDefinition,
  type GoldenReferenceCase,
} from "./validation";

const PYFA_DOCUMENTED_REFERENCE: GoldenReferenceCase = {
  id: "pyfa-eos-documented-navy-typhoon",
  title: "Pyfa/Eos documented Navy Typhoon example",
  provenance: {
    authority: "pyfa",
    title: "pyfa-org/eos README documented fit output",
    sourceUrl: "https://github.com/pyfa-org/eos",
    capturedAt: "2026-08-20T00:00:00Z",
    notes: "Harness canary from the upstream documented example. FIT-02 must add current-TQ snapshots captured against the current SDE before its calculator is accepted.",
  },
  metrics: {
    cpuUsedTf: { expected: 823, absoluteTolerance: 0.001 },
    maxVelocityMps: { expected: 1858.3066943807341, relativeTolerance: 1e-9 },
    ehpUniform: { expected: 95189.27348943402, relativeTolerance: 1e-9 },
    totalDps: { expected: 1913.5769753125805, relativeTolerance: 1e-9 },
    totalDpsWithReload: { expected: 1866.5853444855636, relativeTolerance: 1e-9 },
    turretDps: { expected: 637.6960266845035, relativeTolerance: 1e-9 },
    missileDps: { expected: 826.1217743481901, relativeTolerance: 1e-9 },
    droneDps: { expected: 449.7591742798868, relativeTolerance: 1e-9 },
  },
};

describe("FITTING_METRIC_COVERAGE", () => {
  it("uses unique metric keys and covers every FIT-02 stat family", () => {
    const keys = FITTING_METRIC_COVERAGE.map((metric) => metric.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(FITTING_METRIC_COVERAGE.map((metric) => metric.group))).toEqual(new Set([
      "fitting",
      "slots",
      "skills",
      "mobility",
      "tank",
      "capacitor",
      "weapons",
      "drones",
    ]));
  });
});

describe("golden-reference validation", () => {
  it("accepts a documented upstream Pyfa snapshot when every metric matches", () => {
    const actual = Object.fromEntries(
      Object.entries(PYFA_DOCUMENTED_REFERENCE.metrics).map(([key, expectation]) => [key, expectation?.expected]),
    );

    expect(compareGoldenReference(actual, PYFA_DOCUMENTED_REFERENCE)).toEqual({
      passed: true,
      checked: 8,
      failures: [],
    });
  });

  it("reports missing, non-finite, and out-of-tolerance metrics explicitly", () => {
    const result = compareGoldenReference(
      {
        cpuUsedTf: 824,
        maxVelocityMps: Number.NaN,
      },
      PYFA_DOCUMENTED_REFERENCE,
    );

    expect(result.passed).toBe(false);
    expect(result.failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "cpuUsedTf", reason: "outside-tolerance" }),
      expect.objectContaining({ key: "maxVelocityMps", reason: "non-finite" }),
      expect.objectContaining({ key: "ehpUniform", reason: "missing" }),
    ]));
  });

  it("uses the larger of absolute and relative tolerance", () => {
    const reference: GoldenReferenceCase = {
      ...PYFA_DOCUMENTED_REFERENCE,
      id: "tolerance-check",
      metrics: {
        totalDps: { expected: 1000, absoluteTolerance: 1, relativeTolerance: 0.01 },
      },
    };

    expect(compareGoldenReference({ totalDps: 1009.9 }, reference).passed).toBe(true);
    expect(compareGoldenReference({ totalDps: 1010.1 }, reference).passed).toBe(false);
  });

  it("rejects malformed references before comparing calculator output", () => {
    const malformed: GoldenReferenceCase = {
      id: "",
      title: "",
      provenance: {
        authority: "ccp",
        title: "",
        sourceUrl: "http://example.invalid",
        capturedAt: "not-a-date",
      },
      metrics: {},
    };

    expect(validateGoldenReferenceDefinition(malformed)).toEqual(expect.arrayContaining([
      "reference id is required",
      "reference title is required",
      "provenance title is required",
      "provenance sourceUrl must use https",
      "provenance capturedAt must be an ISO-compatible timestamp",
      "at least one metric expectation is required",
    ]));
    expect(() => compareGoldenReference({}, malformed)).toThrow(/Invalid golden reference/);
  });
});
