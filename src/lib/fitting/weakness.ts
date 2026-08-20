import type { DamageType, ResistanceVector, TankLayer } from "./core";

export type FitWeaknessCategory =
  | "range-plan"
  | "mobility"
  | "capacitor"
  | "resistance"
  | "tackle"
  | "application";

export type FitWeaknessSeverity = "caution" | "warning";

export interface FitWeaknessFinding {
  code: string;
  category: FitWeaknessCategory;
  severity: FitWeaknessSeverity;
  summary: string;
  why: string;
  evidence: string[];
}

export interface FitApplicationEvidence {
  status: "good" | "poor" | "unknown";
  reason?: string;
  provenance: readonly string[];
}

export interface FitWeaknessEvidence {
  weaponPreferredRangeMeters?: number | null;
  webRangeMeters?: number | null;
  scramRangeMeters?: number | null;
  disruptorRangeMeters?: number | null;
  assumesSoloTackle?: boolean | null;
  requiresRangeControl?: boolean | null;
  mobilityPenaltySources?: readonly string[] | null;
  capacitorStable?: boolean | null;
  capacitorDependentSystems?: readonly string[] | null;
  primaryTankLayer?: TankLayer | null;
  tankResistances?: Partial<Record<TankLayer, Partial<ResistanceVector>>> | null;
  expectedIncomingDamage?: Partial<Record<DamageType, number | null>> | null;
  application?: FitApplicationEvidence | null;
  provenance: readonly string[];
}

export interface FitWeaknessResult {
  primary: FitWeaknessFinding | null;
  findings: FitWeaknessFinding[];
  unknowns: string[];
  provenance: readonly string[];
}

const DAMAGE_TYPES: readonly DamageType[] = ["em", "thermal", "kinetic", "explosive"];
const CATEGORY_PRIORITY: Record<FitWeaknessCategory, number> = {
  "range-plan": 0,
  tackle: 1,
  capacitor: 2,
  resistance: 3,
  application: 4,
  mobility: 5,
};

function finitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function longestTackleRange(evidence: FitWeaknessEvidence): number | null {
  const candidates = [evidence.scramRangeMeters, evidence.disruptorRangeMeters].filter(finitePositive);
  return candidates.length ? Math.max(...candidates) : null;
}

function evaluateRangeAndTackle(
  evidence: FitWeaknessEvidence,
  findings: FitWeaknessFinding[],
  unknowns: string[],
): void {
  const preferred = evidence.weaponPreferredRangeMeters;
  if (!finitePositive(preferred)) {
    unknowns.push("weapon engagement range is not established");
    return;
  }

  if (evidence.assumesSoloTackle == null) {
    unknowns.push("solo tackle responsibility is not established");
    return;
  }
  if (!evidence.assumesSoloTackle) return;

  const tackleRange = longestTackleRange(evidence);
  if (!tackleRange) {
    findings.push({
      code: "solo-plan-without-established-tackle",
      category: "tackle",
      severity: "warning",
      summary: "The fit assumes it must hold its own target, but no supported warp-tackle envelope is established.",
      why: "A solo engagement plan that depends on preventing escape needs supported tackle evidence. NEC will not infer tackle from a module name or role label.",
      evidence: [`Preferred weapon range: ${Math.round(preferred)} m`],
    });
    return;
  }

  if (preferred > tackleRange) {
    findings.push({
      code: "weapon-plan-beyond-own-tackle",
      category: "range-plan",
      severity: "caution",
      summary: "The preferred weapon range extends beyond the fit's established self-tackle envelope.",
      why: "At the preferred damage range, the fit cannot establish from its own validated tackle data that it can also prevent the target from warping. That can be intentional, but the plan needs an explicit disengage or support assumption.",
      evidence: [
        `Preferred weapon range: ${Math.round(preferred)} m`,
        `Longest established tackle range: ${Math.round(tackleRange)} m`,
      ],
    });
  }
}

function evaluateMobility(
  evidence: FitWeaknessEvidence,
  findings: FitWeaknessFinding[],
  unknowns: string[],
): void {
  if (evidence.requiresRangeControl == null) {
    unknowns.push("range-control dependence is not established");
    return;
  }
  if (!evidence.requiresRangeControl) return;
  if (evidence.mobilityPenaltySources == null) {
    unknowns.push("mobility penalty evidence is not established");
    return;
  }
  if (evidence.mobilityPenaltySources.length === 0) return;

  findings.push({
    code: "range-control-with-supported-mobility-penalties",
    category: "mobility",
    severity: "caution",
    summary: "The fit's plan depends on range control while supported fitted effects reduce mobility.",
    why: "This is a plan conflict, not a claim that the fit is unusable. The caller supplied both the range-control requirement and resolved mobility penalties; NEC does not infer either from item names.",
    evidence: [...evidence.mobilityPenaltySources],
  });
}

function evaluateCapacitor(
  evidence: FitWeaknessEvidence,
  findings: FitWeaknessFinding[],
  unknowns: string[],
): void {
  if (evidence.capacitorStable == null) {
    unknowns.push("capacitor stability is not established");
    return;
  }
  const systems = evidence.capacitorDependentSystems;
  if (systems == null) {
    unknowns.push("capacitor-dependent plan systems are not established");
    return;
  }
  if (evidence.capacitorStable || systems.length === 0) return;

  findings.push({
    code: "unstable-cap-with-cap-dependent-plan",
    category: "capacitor",
    severity: "warning",
    summary: "The fit is not capacitor-stable while its stated plan depends on capacitor-using systems.",
    why: "Running out of capacitor can remove one or more systems the plan explicitly depends on. NEC does not predict time-to-cap-out or enemy neutralizer pressure unless those inputs are separately established.",
    evidence: systems.map((system) => `Plan depends on: ${system}`),
  });
}

function normalizedDamageProfile(
  profile: Partial<Record<DamageType, number | null>>,
): Record<DamageType, number> | null {
  const values = DAMAGE_TYPES.map((type) => profile[type]);
  if (values.some((value) => value == null || typeof value !== "number" || !Number.isFinite(value) || value < 0)) {
    return null;
  }
  const numericValues = values as number[];
  const total = numericValues.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return null;
  return Object.fromEntries(
    DAMAGE_TYPES.map((type, index) => [type, numericValues[index] / total]),
  ) as Record<DamageType, number>;
}

function evaluateResistance(
  evidence: FitWeaknessEvidence,
  findings: FitWeaknessFinding[],
  unknowns: string[],
): void {
  const tankLayer = evidence.primaryTankLayer;
  if (!tankLayer) {
    unknowns.push("primary tank layer is not established");
    return;
  }
  const layer = evidence.tankResistances?.[tankLayer];
  if (!layer) {
    unknowns.push("primary tank resistances are not established");
    return;
  }
  const resistances = DAMAGE_TYPES.map((type) => layer[type]);
  if (resistances.some((value) => value == null || typeof value !== "number" || !Number.isFinite(value))) {
    unknowns.push("primary tank resistances are incomplete");
    return;
  }
  if (!evidence.expectedIncomingDamage) {
    unknowns.push("expected incoming damage profile is not established");
    return;
  }
  const normalized = normalizedDamageProfile(evidence.expectedIncomingDamage);
  if (!normalized) {
    unknowns.push("expected incoming damage profile is incomplete");
    return;
  }

  const numericResists = resistances as number[];
  const numeric = Object.fromEntries(
    DAMAGE_TYPES.map((type, index) => [type, numericResists[index]]),
  ) as Record<DamageType, number>;
  const weakestValue = Math.min(...DAMAGE_TYPES.map((type) => numeric[type]));
  const weakestTypes = DAMAGE_TYPES.filter((type) => numeric[type] === weakestValue);
  const dominantShare = Math.max(...DAMAGE_TYPES.map((type) => normalized[type]));
  const dominantTypes = DAMAGE_TYPES.filter((type) => normalized[type] === dominantShare);
  const exposed = dominantTypes.filter((type) => weakestTypes.includes(type));
  if (exposed.length === 0) return;

  findings.push({
    code: "dominant-damage-hits-weakest-resist",
    category: "resistance",
    severity: "warning",
    summary: `The expected dominant damage type (${exposed.join("/")}) matches the weakest resistance on the primary tank layer.`,
    why: "CCP applies each damage type against its corresponding resistance. This finding is emitted only because both the tank layer/resist profile and expected incoming damage composition were supplied as supported evidence.",
    evidence: exposed.map(
      (type) => `${type}: ${(numeric[type] * 100).toFixed(1)}% resist, ${(normalized[type] * 100).toFixed(1)}% of expected incoming damage`,
    ),
  });
}

function evaluateApplication(
  evidence: FitWeaknessEvidence,
  findings: FitWeaknessFinding[],
  unknowns: string[],
): void {
  const application = evidence.application;
  if (!application || application.status === "unknown") {
    unknowns.push("target-specific damage application is not established");
    return;
  }
  if (application.provenance.length === 0) throw new Error("Application evidence requires provenance");
  if (application.status !== "poor") return;

  findings.push({
    code: "supported-poor-application",
    category: "application",
    severity: "warning",
    summary: "Supported target-specific evidence indicates poor damage application.",
    why: application.reason ?? "A validated application evaluator marked this target interaction as poor.",
    evidence: [...application.provenance],
  });
}

export function evaluateFitWeaknesses(evidence: FitWeaknessEvidence): FitWeaknessResult {
  if (evidence.provenance.length === 0) throw new Error("Fit weakness evidence requires provenance");

  const findings: FitWeaknessFinding[] = [];
  const unknowns: string[] = [];
  evaluateRangeAndTackle(evidence, findings, unknowns);
  evaluateMobility(evidence, findings, unknowns);
  evaluateCapacitor(evidence, findings, unknowns);
  evaluateResistance(evidence, findings, unknowns);
  evaluateApplication(evidence, findings, unknowns);

  findings.sort((a, b) => {
    const severity = Number(b.severity === "warning") - Number(a.severity === "warning");
    if (severity !== 0) return severity;
    return CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category] || a.code.localeCompare(b.code);
  });

  return {
    primary: findings[0] ?? null,
    findings,
    unknowns: [...new Set(unknowns)].sort(),
    provenance: evidence.provenance,
  };
}
