export type HaulRisk = "low" | "medium" | "high" | "unknown";
export type HaulRecommendation = "sell-here" | "haul" | "consider-haul" | "unknown";

export interface HaulTolerance {
  maxJumps: number;
  maxVolumeM3: number;
  maxRisk: Exclude<HaulRisk, "unknown">;
  minimumExtraIsk: number;
  minimumImprovementPercent: number;
}

export interface HaulDecisionInput {
  localSaleValue: number | null;
  destinationSaleValue: number | null;
  jumps: number | null;
  volumeM3: number | null;
  risk: HaulRisk;
  tolerance: HaulTolerance;
}

export interface HaulDecision {
  recommendation: HaulRecommendation;
  extraIsk: number | null;
  improvementPercent: number | null;
  reasons: string[];
  warnings: string[];
}

const RISK_RANK: Record<Exclude<HaulRisk, "unknown">, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function finiteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function validateTolerance(tolerance: HaulTolerance): void {
  if (!Number.isSafeInteger(tolerance.maxJumps) || tolerance.maxJumps < 0) {
    throw new Error("Hauling tolerance maxJumps must be a non-negative integer");
  }
  if (!finiteNonNegative(tolerance.maxVolumeM3)) {
    throw new Error("Hauling tolerance maxVolumeM3 must be non-negative");
  }
  if (!finiteNonNegative(tolerance.minimumExtraIsk)) {
    throw new Error("Hauling tolerance minimumExtraIsk must be non-negative");
  }
  if (!finiteNonNegative(tolerance.minimumImprovementPercent)) {
    throw new Error("Hauling tolerance minimumImprovementPercent must be non-negative");
  }
}

export function evaluateSellHereVsHaul(input: HaulDecisionInput): HaulDecision {
  validateTolerance(input.tolerance);

  const reasons: string[] = [];
  const warnings: string[] = [];

  if (input.localSaleValue === null || input.destinationSaleValue === null) {
    return {
      recommendation: "unknown",
      extraIsk: null,
      improvementPercent: null,
      reasons: ["A complete local and destination sale valuation is required before comparing the two choices."],
      warnings,
    };
  }
  if (!finiteNonNegative(input.localSaleValue) || !finiteNonNegative(input.destinationSaleValue)) {
    throw new Error("Sale values must be finite and non-negative when provided");
  }

  const extraIsk = input.destinationSaleValue - input.localSaleValue;
  const improvementPercent = input.localSaleValue > 0
    ? (extraIsk / input.localSaleValue) * 100
    : input.destinationSaleValue > 0 ? null : 0;

  if (extraIsk <= 0) {
    reasons.push("The destination does not improve the visible sale value, so hauling adds travel without a price benefit.");
    return { recommendation: "sell-here", extraIsk, improvementPercent, reasons, warnings };
  }

  const policyFailures: string[] = [];
  let policyUnknown = false;

  if (input.jumps === null) {
    policyUnknown = true;
    warnings.push("Route jump count is unknown, so travel tolerance cannot be fully evaluated.");
  } else if (!Number.isSafeInteger(input.jumps) || input.jumps < 0) {
    throw new Error("jumps must be a non-negative integer when provided");
  } else if (input.jumps > input.tolerance.maxJumps) {
    policyFailures.push(`${input.jumps} jumps exceeds your ${input.tolerance.maxJumps}-jump hauling tolerance.`);
  } else {
    reasons.push(`${input.jumps} jumps is within your ${input.tolerance.maxJumps}-jump hauling tolerance.`);
  }

  if (input.volumeM3 === null) {
    policyUnknown = true;
    warnings.push("Cargo volume is unknown, so hauling-size tolerance cannot be fully evaluated.");
  } else if (!finiteNonNegative(input.volumeM3)) {
    throw new Error("volumeM3 must be non-negative when provided");
  } else if (input.volumeM3 > input.tolerance.maxVolumeM3) {
    policyFailures.push(`${input.volumeM3.toLocaleString()} m3 exceeds your ${input.tolerance.maxVolumeM3.toLocaleString()} m3 hauling tolerance.`);
  } else {
    reasons.push(`${input.volumeM3.toLocaleString()} m3 is within your hauling-volume tolerance.`);
  }

  if (input.risk === "unknown") {
    policyUnknown = true;
    warnings.push("Route risk is unknown. NEC will not assume the route is safe.");
  } else if (RISK_RANK[input.risk] > RISK_RANK[input.tolerance.maxRisk]) {
    policyFailures.push(`${input.risk} route risk exceeds your ${input.tolerance.maxRisk} risk tolerance.`);
  } else {
    reasons.push(`${input.risk} route risk is within your configured risk tolerance.`);
  }

  const clearsIskThreshold = extraIsk >= input.tolerance.minimumExtraIsk;
  const clearsPercentThreshold = improvementPercent !== null
    && improvementPercent >= input.tolerance.minimumImprovementPercent;

  if (!clearsIskThreshold) {
    policyFailures.push(`The extra ${extraIsk.toLocaleString()} ISK is below your ${input.tolerance.minimumExtraIsk.toLocaleString()} ISK minimum gain.`);
  }
  if (!clearsPercentThreshold) {
    policyFailures.push(improvementPercent === null
      ? "The percentage improvement cannot be established from a zero local valuation."
      : `The ${improvementPercent.toFixed(1)}% improvement is below your ${input.tolerance.minimumImprovementPercent}% minimum.`);
  }

  reasons.unshift(`The destination's visible sale value is ${extraIsk.toLocaleString()} ISK higher than selling here.`);

  if (policyFailures.length > 0) {
    reasons.push(...policyFailures);
    return { recommendation: "sell-here", extraIsk, improvementPercent, reasons, warnings };
  }

  if (policyUnknown) {
    reasons.push("The price improvement is meaningful, but missing route or cargo evidence prevents a firm hauling recommendation.");
    return { recommendation: "consider-haul", extraIsk, improvementPercent, reasons, warnings };
  }

  reasons.push("The price improvement clears your configured gain, travel, cargo, and risk tolerances.");
  warnings.push("This is decision support, not a safety guarantee; route conditions and market orders can change before arrival.");
  return { recommendation: "haul", extraIsk, improvementPercent, reasons, warnings };
}
