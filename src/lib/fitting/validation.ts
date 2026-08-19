export type FittingMetric =
  | "cpuUsed"
  | "powergridUsed"
  | "highSlots"
  | "midSlots"
  | "lowSlots"
  | "rigSlots"
  | "turretHardpoints"
  | "launcherHardpoints"
  | "maxVelocity"
  | "mass"
  | "signatureRadius"
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
  | "ehp"
  | "capacitorCapacity"
  | "capacitorRechargeTime"
  | "capacitorStable"
  | "weaponDps"
  | "droneDps"
  | "volleyDamage"
  | "optimalRange"
  | "falloffRange"
  | "tracking"
  | "missileRange"
  | "missileExplosionRadius"
  | "missileExplosionVelocity"
  | "droneBandwidth"
  | "droneBay";

export type FittingCoverageArea = {
  id: string;
  metrics: readonly FittingMetric[];
  rule: string;
};

export const FITTING_SCOPE: readonly FittingCoverageArea[] = [
  { id: "resources", metrics: ["cpuUsed", "powergridUsed"], rule: "Deterministically derive fitted resource use and compare with ship capacity after supported skill/effect modifiers." },
  { id: "slots", metrics: ["highSlots", "midSlots", "lowSlots", "rigSlots", "turretHardpoints", "launcherHardpoints"], rule: "Validate slot and hardpoint legality from Dogma effects/attributes; never infer slot type from item names." },
  { id: "mobility", metrics: ["maxVelocity", "mass", "signatureRadius"], rule: "Apply only supported Dogma modifiers and stacking rules; unsupported propulsion interactions remain unknown." },
  { id: "tank", metrics: ["shieldHp", "armorHp", "structureHp", "shieldEmResist", "shieldThermalResist", "shieldKineticResist", "shieldExplosiveResist", "armorEmResist", "armorThermalResist", "armorKineticResist", "armorExplosiveResist", "ehp"], rule: "Expose raw layer HP/resists and derived EHP only when the underlying layer/resist state is fully known." },
  { id: "capacitor", metrics: ["capacitorCapacity", "capacitorRechargeTime", "capacitorStable"], rule: "Do not claim stability when activation cycles, charges, scripts, heat, or unsupported effects are unresolved." },
  { id: "weapons", metrics: ["weaponDps", "droneDps", "volleyDamage", "optimalRange", "falloffRange", "tracking", "missileRange", "missileExplosionRadius", "missileExplosionVelocity", "droneBandwidth", "droneBay"], rule: "Keep paper damage/range distinct from application; missing charge/drone/effect data stays unknown." },
] as const;

export type GoldenReference = {
  id: string;
  typeId: number;
  name: string;
  verifiedOn: string;
  sdeBuild: number;
  expected: Partial<Record<FittingMetric, number>>;
  provenance: readonly string[];
};

// These primitive Dogma values are intentionally calculator-independent. FIT-02 must
// reproduce them from the installed SDE before higher-order fit math is trusted.
export const FITTING_GOLDEN_REFERENCES: readonly GoldenReference[] = [
  {
    id: "200mm-autocannon-i-base-dogma",
    typeId: 486,
    name: "200mm AutoCannon I",
    verifiedOn: "2026-08-20",
    sdeBuild: 3424810,
    expected: {
      cpuUsed: 9,
      powergridUsed: 4,
      optimalRange: 1000,
      falloffRange: 5160,
    },
    provenance: [
      "CCP current SDE build 3424810 (types/typeDogma/dogmaAttributes/dogmaEffects)",
      "EVE Ref type 486 cross-check of current SDE-derived Dogma values",
    ],
  },
  {
    id: "200mm-autocannon-ii-base-dogma",
    typeId: 2889,
    name: "200mm AutoCannon II",
    verifiedOn: "2026-08-20",
    sdeBuild: 3424810,
    expected: {
      cpuUsed: 9,
      powergridUsed: 4,
      optimalRange: 1200,
      falloffRange: 5160,
    },
    provenance: [
      "CCP current SDE build 3424810 (types/typeDogma/dogmaAttributes/dogmaEffects)",
      "EVE Ref type 2889 cross-check of current SDE-derived Dogma values",
    ],
  },
] as const;

export type GoldenComparison = {
  ok: boolean;
  mismatches: Array<{ metric: FittingMetric; expected: number; actual: number | null }>;
  unknown: FittingMetric[];
};

export function compareGoldenReference(
  reference: GoldenReference,
  actual: Partial<Record<FittingMetric, number | null | undefined>>,
  tolerance = 1e-9,
): GoldenComparison {
  const mismatches: GoldenComparison["mismatches"] = [];
  const unknown: FittingMetric[] = [];

  for (const [metric, expected] of Object.entries(reference.expected) as Array<[FittingMetric, number]>) {
    const value = actual[metric];
    if (value === null || value === undefined || !Number.isFinite(value)) {
      unknown.push(metric);
      continue;
    }
    if (Math.abs(value - expected) > tolerance) {
      mismatches.push({ metric, expected, actual: value });
    }
  }

  return { ok: mismatches.length === 0 && unknown.length === 0, mismatches, unknown };
}

export function validateFittingValidationModel(): void {
  const metrics = FITTING_SCOPE.flatMap((area) => area.metrics);
  if (new Set(metrics).size !== metrics.length) throw new Error("Fitting metric appears in more than one coverage area");
  if (FITTING_GOLDEN_REFERENCES.length < 2) throw new Error("At least two golden references are required");
  for (const reference of FITTING_GOLDEN_REFERENCES) {
    if (!reference.provenance.some((entry) => entry.startsWith("CCP current SDE"))) {
      throw new Error(`${reference.id} lacks CCP SDE provenance`);
    }
    if (Object.keys(reference.expected).length === 0) throw new Error(`${reference.id} has no expected Dogma metrics`);
  }
}
