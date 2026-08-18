import type { ReadinessFinding } from "./model";

export interface ReplacementCapacityPolicy {
  reserveIsk: number;
  minimumReplacementCount: number;
}

export interface ReplacementCapacityInput {
  liquidIsk: number | null;
  acquisitionCostIsk: number | null;
  replacementCostIsk: number | null;
  policy?: ReplacementCapacityPolicy | null;
}

export type ReplacementCapacityStatus =
  | "unavailable"
  | "cannot-purchase"
  | "policy-unset"
  | "below-policy"
  | "loss-affordable";

export interface ReplacementCapacityEvaluation {
  status: ReplacementCapacityStatus;
  liquidIsk: number | null;
  acquisitionCostIsk: number | null;
  replacementCostIsk: number | null;
  canPurchase: boolean | null;
  walletAfterPurchase: number | null;
  reserveIsk: number | null;
  riskBudgetAfterPurchase: number | null;
  replacementCountAfterPurchase: number | null;
  fullReplacementsBeforeReserve: number | null;
  minimumReplacementCount: number | null;
  meetsReplacementPolicy: boolean | null;
  replacementHeadroomIsk: number | null;
}

function finiteNonNegative(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function validatePolicy(policy: ReplacementCapacityPolicy): void {
  if (!Number.isFinite(policy.reserveIsk) || policy.reserveIsk < 0) {
    throw new Error("Replacement reserve must be a non-negative finite ISK amount.");
  }
  if (!Number.isFinite(policy.minimumReplacementCount) || policy.minimumReplacementCount < 0) {
    throw new Error("Minimum replacement count must be a non-negative finite number.");
  }
}

export function evaluateReplacementCapacity(input: ReplacementCapacityInput): ReplacementCapacityEvaluation {
  const liquidIsk = finiteNonNegative(input.liquidIsk);
  const acquisitionCostIsk = finiteNonNegative(input.acquisitionCostIsk);
  const replacementCostIsk = finiteNonNegative(input.replacementCostIsk);

  if (liquidIsk === null || acquisitionCostIsk === null || replacementCostIsk === null || replacementCostIsk === 0) {
    return {
      status: "unavailable",
      liquidIsk,
      acquisitionCostIsk,
      replacementCostIsk,
      canPurchase: liquidIsk === null || acquisitionCostIsk === null ? null : liquidIsk >= acquisitionCostIsk,
      walletAfterPurchase: liquidIsk === null || acquisitionCostIsk === null ? null : liquidIsk - acquisitionCostIsk,
      reserveIsk: input.policy?.reserveIsk ?? null,
      riskBudgetAfterPurchase: null,
      replacementCountAfterPurchase: null,
      fullReplacementsBeforeReserve: null,
      minimumReplacementCount: input.policy?.minimumReplacementCount ?? null,
      meetsReplacementPolicy: null,
      replacementHeadroomIsk: null,
    };
  }

  const canPurchase = liquidIsk >= acquisitionCostIsk;
  const walletAfterPurchase = liquidIsk - acquisitionCostIsk;
  if (!canPurchase) {
    return {
      status: "cannot-purchase",
      liquidIsk,
      acquisitionCostIsk,
      replacementCostIsk,
      canPurchase: false,
      walletAfterPurchase,
      reserveIsk: input.policy?.reserveIsk ?? null,
      riskBudgetAfterPurchase: 0,
      replacementCountAfterPurchase: 0,
      fullReplacementsBeforeReserve: 0,
      minimumReplacementCount: input.policy?.minimumReplacementCount ?? null,
      meetsReplacementPolicy: false,
      replacementHeadroomIsk: null,
    };
  }

  if (!input.policy) {
    return {
      status: "policy-unset",
      liquidIsk,
      acquisitionCostIsk,
      replacementCostIsk,
      canPurchase: true,
      walletAfterPurchase,
      reserveIsk: null,
      riskBudgetAfterPurchase: null,
      replacementCountAfterPurchase: null,
      fullReplacementsBeforeReserve: null,
      minimumReplacementCount: null,
      meetsReplacementPolicy: null,
      replacementHeadroomIsk: null,
    };
  }

  validatePolicy(input.policy);
  const riskBudgetAfterPurchase = Math.max(0, walletAfterPurchase - input.policy.reserveIsk);
  const replacementCountAfterPurchase = riskBudgetAfterPurchase / replacementCostIsk;
  const fullReplacementsBeforeReserve = Math.floor(replacementCountAfterPurchase);
  const requiredReplacementIsk = input.policy.minimumReplacementCount * replacementCostIsk;
  const replacementHeadroomIsk = riskBudgetAfterPurchase - requiredReplacementIsk;
  const meetsReplacementPolicy = replacementHeadroomIsk >= 0;

  return {
    status: meetsReplacementPolicy ? "loss-affordable" : "below-policy",
    liquidIsk,
    acquisitionCostIsk,
    replacementCostIsk,
    canPurchase: true,
    walletAfterPurchase,
    reserveIsk: input.policy.reserveIsk,
    riskBudgetAfterPurchase,
    replacementCountAfterPurchase,
    fullReplacementsBeforeReserve,
    minimumReplacementCount: input.policy.minimumReplacementCount,
    meetsReplacementPolicy,
    replacementHeadroomIsk,
  };
}

export function replacementCapacityFindings(
  evaluation: ReplacementCapacityEvaluation,
  labels: { acquisition?: string; exposure?: string } = {},
): ReadinessFinding[] {
  const acquisition = labels.acquisition ?? "the required purchase";
  const exposure = labels.exposure ?? "the ship/fit/supplies at risk";

  const purchaseFinding: ReadinessFinding = {
    id: "financial-can-purchase",
    dimension: "isk",
    requirement: "soft",
    state: evaluation.canPurchase === null ? "unknown" : evaluation.canPurchase ? "met" : "unmet",
    summary: evaluation.canPurchase === false ? `Liquid ISK cannot cover ${acquisition}` : `Liquid ISK coverage for ${acquisition}`,
    why: evaluation.canPurchase === null
      ? "The wallet or acquisition-cost estimate is unavailable, so NEC cannot establish immediate purchase ability."
      : evaluation.canPurchase
        ? "The visible liquid wallet covers the estimated immediate acquisition cost."
        : "The estimated immediate acquisition cost is greater than the visible liquid wallet.",
    evidence: [{ source: "derived", label: "Liquid wallet versus acquisition cost" }],
  };

  let replacementState: ReadinessFinding["state"] = "unknown";
  let replacementSummary = `Replacement capacity for ${exposure}`;
  let replacementWhy = "NEC does not have enough information to evaluate loss affordability.";

  if (evaluation.status === "cannot-purchase") {
    replacementState = "unmet";
    replacementSummary = `No replacement headroom for ${exposure}`;
    replacementWhy = "The immediate purchase is already unaffordable, so the current wallet cannot also satisfy a replacement policy.";
  } else if (evaluation.status === "policy-unset") {
    replacementWhy = "The raw wallet and replacement cost are known, but no reserve/replacement policy was supplied. NEC will not invent one.";
  } else if (evaluation.status === "below-policy") {
    replacementState = "unmet";
    replacementSummary = `Replacement capacity is below the configured policy for ${exposure}`;
    replacementWhy = "After the immediate purchase and configured reserve, the remaining risk budget does not cover the requested number of replacements.";
  } else if (evaluation.status === "loss-affordable") {
    replacementState = "met";
    replacementSummary = `Replacement policy is satisfied for ${exposure}`;
    replacementWhy = "After the immediate purchase and configured reserve, the remaining risk budget covers the requested number of replacements.";
  }

  return [
    purchaseFinding,
    {
      id: "financial-replacement-capacity",
      dimension: "replacement-capacity",
      requirement: "soft",
      state: replacementState,
      summary: replacementSummary,
      why: replacementWhy,
      evidence: [{ source: "derived", label: "Post-purchase wallet, reserve, and replacement exposure" }],
    },
  ];
}
