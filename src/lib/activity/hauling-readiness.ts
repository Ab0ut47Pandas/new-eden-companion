import { buildReadinessSnapshot, type ReadinessFinding, type ReadinessSnapshot } from "@/lib/readiness/model";
import type { HaulRisk } from "@/lib/economy/haul-decision";

export type HaulingMode = "own-cargo" | "courier";
export type HaulingEvidenceState = "yes" | "no" | "unknown";
export type HaulingShipProfile = "cargo-efficiency" | "balanced" | "survivability" | "unknown";
export type ReplacementRiskState = "affordable" | "not-affordable" | "unknown";

export interface HaulingPurpose {
  label: string;
  detail?: string;
}

export interface HaulingRouteEvidence {
  jumps: number | null;
  risk: HaulRisk;
  originLabel?: string;
  destinationLabel?: string;
  detail?: string;
}

export interface HaulingTolerance {
  maxJumps: number;
  maxRisk: Exclude<HaulRisk, "unknown">;
}

export interface HaulingShipCandidate {
  id: string;
  name: string;
  owned: boolean | null;
  canBoard: HaulingEvidenceState;
  fitReady: HaulingEvidenceState;
  cargoCapacityM3: number | null;
  profile: HaulingShipProfile;
  profileDetail?: string;
  replacementRisk: ReplacementRiskState;
  replacementDetail?: string;
}

export interface CourierContractEvidence {
  collateralIsk: number | null;
  rewardIsk?: number | null;
  walletIsk: number | null;
  detail?: string;
}

export interface HaulingReadinessInput {
  mode: HaulingMode;
  purpose: HaulingPurpose;
  cargoVolumeM3: number | null;
  route: HaulingRouteEvidence;
  tolerance: HaulingTolerance;
  ships: readonly HaulingShipCandidate[];
  courier?: CourierContractEvidence;
}

export interface HaulingShipAssessment {
  ship: HaulingShipCandidate;
  tripCount: number | null;
  confirmedUsable: boolean;
  unknownUsability: boolean;
}

export interface HaulingReadinessAssessment {
  mode: HaulingMode;
  purpose: HaulingPurpose;
  selectedShip: HaulingShipAssessment | null;
  alternatives: readonly HaulingShipAssessment[];
  readiness: ReadinessSnapshot;
  nextAction: string;
  notes: readonly string[];
}

const CCP_COURIER_SOURCE = "https://support.eveonline.com/hc/en-us/articles/203218982-Courier-Contracts";

const RISK_RANK: Record<Exclude<HaulRisk, "unknown">, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function nonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must not be empty.`);
  return normalized;
}

function finiteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be finite and non-negative.`);
}

function validateInput(input: HaulingReadinessInput): void {
  nonEmpty(input.purpose.label, "Hauling purpose");
  if (input.cargoVolumeM3 !== null) finiteNonNegative(input.cargoVolumeM3, "Cargo volume");
  if (!Number.isSafeInteger(input.tolerance.maxJumps) || input.tolerance.maxJumps < 0) {
    throw new Error("Hauling tolerance maxJumps must be a non-negative integer.");
  }
  if (input.route.jumps !== null && (!Number.isSafeInteger(input.route.jumps) || input.route.jumps < 0)) {
    throw new Error("Route jumps must be a non-negative integer when provided.");
  }
  const ids = new Set<string>();
  for (const ship of input.ships) {
    nonEmpty(ship.id, "Hauling ship id");
    nonEmpty(ship.name, "Hauling ship name");
    if (ids.has(ship.id)) throw new Error(`Duplicate hauling ship id: ${ship.id}`);
    ids.add(ship.id);
    if (ship.cargoCapacityM3 !== null) finiteNonNegative(ship.cargoCapacityM3, `${ship.name} cargo capacity`);
  }
  if (input.mode === "courier" && !input.courier) throw new Error("Courier hauling requires courier contract evidence.");
  if (input.courier) {
    if (input.courier.collateralIsk !== null) finiteNonNegative(input.courier.collateralIsk, "Courier collateral");
    if (input.courier.rewardIsk !== undefined && input.courier.rewardIsk !== null) finiteNonNegative(input.courier.rewardIsk, "Courier reward");
    if (input.courier.walletIsk !== null) finiteNonNegative(input.courier.walletIsk, "Courier wallet balance");
  }
}

function assessShip(ship: HaulingShipCandidate, cargoVolumeM3: number | null): HaulingShipAssessment {
  const confirmedUsable = ship.canBoard === "yes" && ship.fitReady === "yes" && ship.cargoCapacityM3 !== null && ship.cargoCapacityM3 > 0;
  const unknownUsability = ship.canBoard === "unknown" || ship.fitReady === "unknown" || ship.cargoCapacityM3 === null;
  const tripCount = cargoVolumeM3 !== null && ship.cargoCapacityM3 !== null && ship.cargoCapacityM3 > 0
    ? Math.ceil(cargoVolumeM3 / ship.cargoCapacityM3)
    : null;
  return { ship, tripCount, confirmedUsable, unknownUsability };
}

function shipRank(assessment: HaulingShipAssessment): readonly number[] {
  const ownedRank = assessment.ship.owned === true ? 0 : assessment.ship.owned === null ? 1 : 2;
  const usabilityRank = assessment.confirmedUsable ? 0 : assessment.unknownUsability ? 1 : 2;
  const tripRank = assessment.tripCount ?? Number.MAX_SAFE_INTEGER;
  return [usabilityRank, ownedRank, tripRank];
}

function compareShips(left: HaulingShipAssessment, right: HaulingShipAssessment): number {
  const a = shipRank(left);
  const b = shipRank(right);
  for (let index = 0; index < a.length; index += 1) {
    const difference = a[index] - b[index];
    if (difference !== 0) return difference;
  }
  return left.ship.name.localeCompare(right.ship.name);
}

function shipFindings(selected: HaulingShipAssessment | null): ReadinessFinding[] {
  if (!selected) return [{
    id: "hauling-ship", dimension: "ship-fit", requirement: "hard", state: "unmet",
    summary: "No hauling ship candidate is available.",
    why: "NEC needs at least one evidence-backed ship candidate before it can evaluate hauling readiness.",
  }];

  const ship = selected.ship;
  const findings: ReadinessFinding[] = [];
  const state = selected.confirmedUsable ? "met" : selected.unknownUsability ? "unknown" : "unmet";
  findings.push({
    id: "hauling-ship", dimension: "ship-fit", requirement: "hard", state,
    summary: state === "met"
      ? `${ship.name} is a confirmed usable hauling candidate.`
      : state === "unmet" ? `${ship.name} is not currently a confirmed usable hauling ship.` : `${ship.name} hauling usability is not fully established.`,
    why: [
      `Boarding: ${ship.canBoard}.`,
      `Fit readiness: ${ship.fitReady}.`,
      `Cargo capacity: ${ship.cargoCapacityM3 === null ? "unknown" : `${ship.cargoCapacityM3.toLocaleString()} m3`}.`,
    ].join(" "),
    evidence: [{ source: "derived", label: ship.owned === true ? "Owned ship preferred" : ship.owned === false ? "Ship not owned" : "Ownership unknown" }],
  });

  findings.push({
    id: "hauling-profile", dimension: "knowledge-preparation", requirement: "context",
    state: ship.profile === "unknown" ? "unknown" : "met",
    summary: ship.profile === "cargo-efficiency"
      ? `${ship.name} is characterized for cargo efficiency, not guaranteed survivability.`
      : ship.profile === "survivability" ? `${ship.name} is characterized for survivability over maximum cargo efficiency.`
        : ship.profile === "balanced" ? `${ship.name} is characterized as a balance of capacity and survivability.`
          : `${ship.name} has no established cargo-versus-survivability profile.`,
    why: ship.profileDetail ?? "The ship profile is caller-supplied evidence; NEC does not infer a safety guarantee from hull choice.",
  });

  findings.push({
    id: "hauling-replacement", dimension: "replacement-capacity", requirement: "soft",
    state: ship.replacementRisk === "affordable" ? "met" : ship.replacementRisk === "not-affordable" ? "caution" : "unknown",
    summary: ship.replacementRisk === "affordable"
      ? `Replacement exposure for ${ship.name} is within the supplied policy.`
      : ship.replacementRisk === "not-affordable" ? `Losing ${ship.name} would exceed the supplied replacement policy.` : `Replacement exposure for ${ship.name} is unknown.`,
    why: ship.replacementDetail ?? "Replacement risk stays unknown unless a caller supplies a replacement-capacity assessment.",
  });
  return findings;
}

function cargoFinding(selected: HaulingShipAssessment | null, cargoVolumeM3: number | null): ReadinessFinding {
  if (cargoVolumeM3 === null) return {
    id: "hauling-cargo", dimension: "supplies", requirement: "hard", state: "unknown",
    summary: "Cargo volume has not been established.",
    why: "Trip count and cargo fit cannot be calculated without a supported cargo-volume value.",
  };
  if (!selected || selected.ship.cargoCapacityM3 === null || selected.ship.cargoCapacityM3 <= 0) return {
    id: "hauling-cargo", dimension: "supplies", requirement: "hard", state: "unknown",
    summary: `${cargoVolumeM3.toLocaleString()} m3 needs moving, but usable cargo capacity is unknown.`,
    why: "NEC will not guess a ship cargo capacity.",
  };
  return {
    id: "hauling-cargo", dimension: "supplies", requirement: "hard", state: "met",
    summary: selected.tripCount === 1
      ? `${selected.ship.name} can move the supplied ${cargoVolumeM3.toLocaleString()} m3 in one trip.`
      : `${selected.ship.name} can move the supplied ${cargoVolumeM3.toLocaleString()} m3 in ${selected.tripCount} trips.`,
    why: `Supplied cargo capacity is ${selected.ship.cargoCapacityM3.toLocaleString()} m3.`,
    evidence: [{ source: "derived", label: `${selected.tripCount} trip${selected.tripCount === 1 ? "" : "s"}` }],
  };
}

function routeFindings(route: HaulingRouteEvidence, tolerance: HaulingTolerance): ReadinessFinding[] {
  const access: ReadinessFinding = {
    id: "hauling-route", dimension: "location-access", requirement: "hard",
    state: route.jumps === null ? "unknown" : "met",
    summary: route.jumps === null ? "Route distance is unknown." : `The supplied route is ${route.jumps} jump${route.jumps === 1 ? "" : "s"}.`,
    why: route.detail ?? "A route is evidence of connectivity, not proof that travel is safe.",
    evidence: route.originLabel || route.destinationLabel
      ? [{ source: "derived", label: `${route.originLabel ?? "Origin"} -> ${route.destinationLabel ?? "Destination"}` }]
      : undefined,
  };
  const jumpTolerance: ReadinessFinding = {
    id: "hauling-jump-tolerance", dimension: "knowledge-preparation", requirement: "soft",
    state: route.jumps === null ? "unknown" : route.jumps <= tolerance.maxJumps ? "met" : "caution",
    summary: route.jumps === null
      ? "Jump-count tolerance cannot be evaluated." : route.jumps <= tolerance.maxJumps
        ? `${route.jumps} jumps is within the configured ${tolerance.maxJumps}-jump tolerance.`
        : `${route.jumps} jumps exceeds the configured ${tolerance.maxJumps}-jump tolerance.`,
    why: "This is a user policy, not a claim about route safety.",
  };
  const riskTolerance: ReadinessFinding = {
    id: "hauling-risk-tolerance", dimension: "knowledge-preparation", requirement: "soft",
    state: route.risk === "unknown" ? "unknown" : RISK_RANK[route.risk] <= RISK_RANK[tolerance.maxRisk] ? "met" : "caution",
    summary: route.risk === "unknown"
      ? "Route exposure is unknown; NEC will not assume the route is safe." : RISK_RANK[route.risk] <= RISK_RANK[tolerance.maxRisk]
        ? `Supplied ${route.risk} route exposure is within the configured ${tolerance.maxRisk} tolerance.`
        : `Supplied ${route.risk} route exposure exceeds the configured ${tolerance.maxRisk} tolerance.`,
    why: "Risk labels are caller-supplied evidence. They are not a gank probability or safety guarantee.",
  };
  return [access, jumpTolerance, riskTolerance];
}

function courierFindings(mode: HaulingMode, courier?: CourierContractEvidence): ReadinessFinding[] {
  if (mode !== "courier") return [{
    id: "hauling-collateral", dimension: "isk", requirement: "context", state: "not-applicable",
    summary: "Courier collateral does not apply to this own-cargo move.",
    why: "No courier contract is being accepted.",
  }];
  if (!courier) return [];
  const { collateralIsk, walletIsk } = courier;
  const state = collateralIsk === null || walletIsk === null ? "unknown" : walletIsk >= collateralIsk ? "met" : "unmet";
  return [{
    id: "hauling-collateral", dimension: "isk", requirement: "hard", state,
    summary: collateralIsk === null
      ? "Courier collateral is unknown." : walletIsk === null ? `Courier collateral is ${collateralIsk.toLocaleString()} ISK, but wallet coverage is unknown.`
        : state === "met" ? `Wallet covers the ${collateralIsk.toLocaleString()} ISK courier collateral.`
          : `Wallet does not cover the ${collateralIsk.toLocaleString()} ISK courier collateral.`,
    why: courier.detail ?? "CCP documents that courier collateral is paid on acceptance, returned after successful delivery, and goes to the issuer if the contract fails.",
    evidence: [{ source: "curated", label: "CCP Courier Contracts", detail: CCP_COURIER_SOURCE }],
  }];
}

function purposeFinding(input: HaulingReadinessInput): ReadinessFinding {
  return {
    id: "hauling-purpose", dimension: "knowledge-preparation", requirement: "context", state: "met",
    summary: `Move purpose: ${input.purpose.label}`,
    why: input.purpose.detail ?? (input.mode === "courier"
      ? "This move is being evaluated as a player courier/freelance hauling job."
      : "This move is being evaluated as movement of the character's own cargo."),
    evidence: [{ source: "user", label: input.purpose.label }],
  };
}

function nextAction(input: HaulingReadinessInput, selected: HaulingShipAssessment | null): string {
  if (!selected) return "Identify at least one evidence-backed hauling ship candidate.";
  if (selected.ship.canBoard === "no") return `Use another owned ship or meet the boarding requirements for ${selected.ship.name}.`;
  if (selected.ship.canBoard === "unknown") return `Verify that the character can board ${selected.ship.name}.`;
  if (selected.ship.fitReady === "no") return `Make ${selected.ship.name}'s hauling fit ready before moving the cargo.`;
  if (selected.ship.fitReady === "unknown") return `Verify ${selected.ship.name}'s hauling fit readiness.`;
  if (input.cargoVolumeM3 === null) return "Establish the cargo volume so NEC can calculate trip count.";
  if (selected.ship.cargoCapacityM3 === null || selected.ship.cargoCapacityM3 <= 0) return `Verify ${selected.ship.name}'s usable cargo capacity.`;
  if (input.mode === "courier" && input.courier) {
    if (input.courier.collateralIsk === null) return "Verify the courier contract collateral before accepting it.";
    if (input.courier.walletIsk === null) return "Verify wallet coverage for the courier collateral.";
    if (input.courier.walletIsk < input.courier.collateralIsk) return "Choose a courier contract whose collateral the wallet can cover.";
  }
  if (input.route.jumps === null) return "Resolve the route distance before committing to the move.";
  if (input.route.risk === "unknown") return "Review the route exposure manually before undocking; NEC cannot establish that the route is safe.";
  if (input.route.jumps > input.tolerance.maxJumps) return "Shorten the route or explicitly revise the hauling jump tolerance.";
  if (RISK_RANK[input.route.risk] > RISK_RANK[input.tolerance.maxRisk]) return "Choose a route within the configured exposure tolerance or explicitly revise that tolerance.";
  if (selected.ship.replacementRisk === "not-affordable") return `Use a less exposed/replacement-costly option before risking ${selected.ship.name}.`;
  if (selected.ship.replacementRisk === "unknown") return `Check replacement exposure for ${selected.ship.name} before undocking.`;
  return `Move ${input.purpose.label} with ${selected.ship.name} in ${selected.tripCount ?? "the required"} trip${selected.tripCount === 1 ? "" : "s"}.`;
}

export function assessHaulingReadiness(input: HaulingReadinessInput): HaulingReadinessAssessment {
  validateInput(input);
  const assessedShips = input.ships.map((ship) => assessShip(ship, input.cargoVolumeM3)).sort(compareShips);
  const selectedShip = assessedShips[0] ?? null;
  const findings = [
    ...shipFindings(selectedShip),
    cargoFinding(selectedShip, input.cargoVolumeM3),
    ...routeFindings(input.route, input.tolerance),
    ...courierFindings(input.mode, input.courier),
    purposeFinding(input),
  ];
  return {
    mode: input.mode,
    purpose: { label: input.purpose.label.trim(), detail: input.purpose.detail?.trim() },
    selectedShip,
    alternatives: assessedShips.slice(1),
    readiness: buildReadinessSnapshot(findings),
    nextAction: nextAction(input, selectedShip),
    notes: [
      "Owned confirmed-usable ships are preferred before unowned alternatives; trip count is derived only from supplied cargo volume and usable cargo capacity.",
      "Cargo efficiency and survivability are separate concepts. A larger hold is not treated as evidence that a ship or route is safer.",
      input.mode === "courier"
        ? "Courier collateral is exposure as well as an acceptance requirement; contract success, delivery access, and route safety are never assumed."
        : "Own-cargo hauling has no courier collateral, but ship/cargo replacement exposure and route risk still matter.",
    ],
  };
}
