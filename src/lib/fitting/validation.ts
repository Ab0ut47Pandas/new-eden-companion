export type FittingStatGroup =
  | "fitting"
  | "slots"
  | "skills"
  | "mobility"
  | "tank"
  | "capacitor"
  | "weapons"
  | "drones";

export type FittingMetricKey =
  | "cpuOutputTf"
  | "cpuUsedTf"
  | "powergridOutputMw"
  | "powergridUsedMw"
  | "highSlots"
  | "midSlots"
  | "lowSlots"
  | "rigSlots"
  | "turretHardpoints"
  | "launcherHardpoints"
  | "calibrationOutput"
  | "calibrationUsed"
  | "missingRequiredSkillCount"
  | "maxVelocityMps"
  | "massKg"
  | "inertiaModifier"
  | "alignTimeSeconds"
  | "signatureRadiusM"
  | "shieldHp"
  | "armorHp"
  | "structureHp"
  | "shieldEmResist"
  | "shieldThermalResist"
  | "shieldKineticResist"
  | "shieldExplosiveResist"
  | "armorEmResist"
  | "armorThermalResist"
  | "armorKineticResist"
  | "armorExplosiveResist"
  | "structureEmResist"
  | "structureThermalResist"
  | "structureKineticResist"
  | "structureExplosiveResist"
  | "ehpUniform"
  | "capacitorCapacityGj"
  | "capacitorRechargeSeconds"
  | "capacitorPeakRechargeGjPerSecond"
  | "capacitorStablePercent"
  | "capacitorLastsSeconds"
  | "turretDps"
  | "missileDps"
  | "droneDps"
  | "totalDps"
  | "totalDpsWithReload"
  | "turretOptimalM"
  | "turretFalloffM"
  | "turretTracking"
  | "missileMaxRangeM"
  | "missileExplosionRadiusM"
  | "missileExplosionVelocityMps"
  | "droneBandwidthMbit"
  | "droneBandwidthUsedMbit"
  | "droneBayM3"
  | "droneControlRangeM";

export interface FittingMetricDefinition {
  key: FittingMetricKey;
  group: FittingStatGroup;
  unit: string;
  description: string;
}

export const FITTING_METRIC_COVERAGE: readonly FittingMetricDefinition[] = [
  { key: "cpuOutputTf", group: "fitting", unit: "tf", description: "Available CPU after supported modifiers." },
  { key: "cpuUsedTf", group: "fitting", unit: "tf", description: "CPU consumed by fitted online modules." },
  { key: "powergridOutputMw", group: "fitting", unit: "MW", description: "Available powergrid after supported modifiers." },
  { key: "powergridUsedMw", group: "fitting", unit: "MW", description: "Powergrid consumed by fitted online modules." },
  { key: "highSlots", group: "slots", unit: "count", description: "Hull high-slot capacity." },
  { key: "midSlots", group: "slots", unit: "count", description: "Hull mid-slot capacity." },
  { key: "lowSlots", group: "slots", unit: "count", description: "Hull low-slot capacity." },
  { key: "rigSlots", group: "slots", unit: "count", description: "Hull rig-slot capacity." },
  { key: "turretHardpoints", group: "slots", unit: "count", description: "Hull turret hardpoint capacity." },
  { key: "launcherHardpoints", group: "slots", unit: "count", description: "Hull launcher hardpoint capacity." },
  { key: "calibrationOutput", group: "slots", unit: "points", description: "Rig calibration available." },
  { key: "calibrationUsed", group: "slots", unit: "points", description: "Rig calibration consumed." },
  { key: "missingRequiredSkillCount", group: "skills", unit: "count", description: "Explicit required skill requirements not met by the selected character profile." },
  { key: "maxVelocityMps", group: "mobility", unit: "m/s", description: "Maximum velocity after supported modifiers." },
  { key: "massKg", group: "mobility", unit: "kg", description: "Effective ship mass." },
  { key: "inertiaModifier", group: "mobility", unit: "multiplier", description: "Effective inertia modifier." },
  { key: "alignTimeSeconds", group: "mobility", unit: "s", description: "Derived align time for the selected state." },
  { key: "signatureRadiusM", group: "mobility", unit: "m", description: "Effective signature radius." },
  { key: "shieldHp", group: "tank", unit: "HP", description: "Effective shield hit points before resist profile." },
  { key: "armorHp", group: "tank", unit: "HP", description: "Effective armor hit points before resist profile." },
  { key: "structureHp", group: "tank", unit: "HP", description: "Effective structure hit points before resist profile." },
  { key: "shieldEmResist", group: "tank", unit: "fraction", description: "Shield EM resistance, 0 through 1." },
  { key: "shieldThermalResist", group: "tank", unit: "fraction", description: "Shield thermal resistance, 0 through 1." },
  { key: "shieldKineticResist", group: "tank", unit: "fraction", description: "Shield kinetic resistance, 0 through 1." },
  { key: "shieldExplosiveResist", group: "tank", unit: "fraction", description: "Shield explosive resistance, 0 through 1." },
  { key: "armorEmResist", group: "tank", unit: "fraction", description: "Armor EM resistance, 0 through 1." },
  { key: "armorThermalResist", group: "tank", unit: "fraction", description: "Armor thermal resistance, 0 through 1." },
  { key: "armorKineticResist", group: "tank", unit: "fraction", description: "Armor kinetic resistance, 0 through 1." },
  { key: "armorExplosiveResist", group: "tank", unit: "fraction", description: "Armor explosive resistance, 0 through 1." },
  { key: "structureEmResist", group: "tank", unit: "fraction", description: "Structure EM resistance, 0 through 1." },
  { key: "structureThermalResist", group: "tank", unit: "fraction", description: "Structure thermal resistance, 0 through 1." },
  { key: "structureKineticResist", group: "tank", unit: "fraction", description: "Structure kinetic resistance, 0 through 1." },
  { key: "structureExplosiveResist", group: "tank", unit: "fraction", description: "Structure explosive resistance, 0 through 1." },
  { key: "ehpUniform", group: "tank", unit: "EHP", description: "Total effective hit points against a 25/25/25/25 damage profile." },
  { key: "capacitorCapacityGj", group: "capacitor", unit: "GJ", description: "Effective capacitor capacity." },
  { key: "capacitorRechargeSeconds", group: "capacitor", unit: "s", description: "Effective capacitor recharge time." },
  { key: "capacitorPeakRechargeGjPerSecond", group: "capacitor", unit: "GJ/s", description: "Derived peak passive capacitor recharge." },
  { key: "capacitorStablePercent", group: "capacitor", unit: "fraction", description: "Stable capacitor fraction when a supported activation model reaches equilibrium." },
  { key: "capacitorLastsSeconds", group: "capacitor", unit: "s", description: "Time to depletion when the supported activation model is not stable." },
  { key: "turretDps", group: "weapons", unit: "HP/s", description: "Paper turret DPS for the selected charge/state." },
  { key: "missileDps", group: "weapons", unit: "HP/s", description: "Paper missile DPS for the selected charge/state." },
  { key: "droneDps", group: "drones", unit: "HP/s", description: "Paper DPS of active drones within supported bandwidth/count limits." },
  { key: "totalDps", group: "weapons", unit: "HP/s", description: "Paper weapon plus drone DPS without reload downtime." },
  { key: "totalDpsWithReload", group: "weapons", unit: "HP/s", description: "Paper DPS including supported reload downtime." },
  { key: "turretOptimalM", group: "weapons", unit: "m", description: "Effective turret optimal range." },
  { key: "turretFalloffM", group: "weapons", unit: "m", description: "Effective turret falloff range." },
  { key: "turretTracking", group: "weapons", unit: "rad/s", description: "Effective turret tracking attribute." },
  { key: "missileMaxRangeM", group: "weapons", unit: "m", description: "Deterministic nominal missile range from supported velocity and flight-time data; not a hit guarantee." },
  { key: "missileExplosionRadiusM", group: "weapons", unit: "m", description: "Effective missile explosion radius for application analysis." },
  { key: "missileExplosionVelocityMps", group: "weapons", unit: "m/s", description: "Effective missile explosion velocity for application analysis." },
  { key: "droneBandwidthMbit", group: "drones", unit: "Mbit/s", description: "Hull drone bandwidth capacity." },
  { key: "droneBandwidthUsedMbit", group: "drones", unit: "Mbit/s", description: "Bandwidth consumed by active drones." },
  { key: "droneBayM3", group: "drones", unit: "m3", description: "Hull drone bay capacity." },
  { key: "droneControlRangeM", group: "drones", unit: "m", description: "Supported drone control range." },
] as const;

export type FittingMetricSnapshot = Partial<Record<FittingMetricKey, number>>;

export interface GoldenReferenceProvenance {
  authority: "ccp" | "pyfa";
  title: string;
  sourceUrl: string;
  capturedAt: string;
  sdeBuild?: number;
  pyfaVersion?: string;
  notes?: string;
}

export interface GoldenMetricExpectation {
  expected: number;
  absoluteTolerance?: number;
  relativeTolerance?: number;
}

export interface GoldenReferenceCase {
  id: string;
  title: string;
  provenance: GoldenReferenceProvenance;
  metrics: Partial<Record<FittingMetricKey, GoldenMetricExpectation>>;
}

export interface GoldenReferenceFailure {
  key: FittingMetricKey;
  reason: "missing" | "non-finite" | "outside-tolerance";
  expected: number;
  actual: number | null;
  tolerance: number;
}

export interface GoldenReferenceResult {
  passed: boolean;
  checked: number;
  failures: GoldenReferenceFailure[];
}

function expectationTolerance(expectation: GoldenMetricExpectation): number {
  const absolute = expectation.absoluteTolerance ?? 0;
  const relative = expectation.relativeTolerance ?? 0;
  return Math.max(absolute, Math.abs(expectation.expected) * relative);
}

export function validateGoldenReferenceDefinition(reference: GoldenReferenceCase): string[] {
  const errors: string[] = [];
  if (!reference.id.trim()) errors.push("reference id is required");
  if (!reference.title.trim()) errors.push("reference title is required");
  if (!reference.provenance.title.trim()) errors.push("provenance title is required");
  if (!/^https:\/\//.test(reference.provenance.sourceUrl)) errors.push("provenance sourceUrl must use https");
  if (!Number.isFinite(Date.parse(reference.provenance.capturedAt))) errors.push("provenance capturedAt must be an ISO-compatible timestamp");

  const entries = Object.entries(reference.metrics) as [FittingMetricKey, GoldenMetricExpectation][];
  if (entries.length === 0) errors.push("at least one metric expectation is required");

  for (const [key, expectation] of entries) {
    if (!Number.isFinite(expectation.expected)) errors.push(`${key} expected value must be finite`);
    if ((expectation.absoluteTolerance ?? 0) < 0) errors.push(`${key} absolute tolerance cannot be negative`);
    if ((expectation.relativeTolerance ?? 0) < 0) errors.push(`${key} relative tolerance cannot be negative`);
  }

  return errors;
}

export function compareGoldenReference(
  actual: FittingMetricSnapshot,
  reference: GoldenReferenceCase,
): GoldenReferenceResult {
  const definitionErrors = validateGoldenReferenceDefinition(reference);
  if (definitionErrors.length > 0) {
    throw new Error(`Invalid golden reference ${reference.id || "<unnamed>"}: ${definitionErrors.join("; ")}`);
  }

  const failures: GoldenReferenceFailure[] = [];
  const entries = Object.entries(reference.metrics) as [FittingMetricKey, GoldenMetricExpectation][];

  for (const [key, expectation] of entries) {
    const value = actual[key];
    const tolerance = expectationTolerance(expectation);
    if (value === undefined) {
      failures.push({ key, reason: "missing", expected: expectation.expected, actual: null, tolerance });
      continue;
    }
    if (!Number.isFinite(value)) {
      failures.push({ key, reason: "non-finite", expected: expectation.expected, actual: value, tolerance });
      continue;
    }
    if (Math.abs(value - expectation.expected) > tolerance) {
      failures.push({ key, reason: "outside-tolerance", expected: expectation.expected, actual: value, tolerance });
    }
  }

  return {
    passed: failures.length === 0,
    checked: entries.length,
    failures,
  };
}
