import { FITTING_SCOPE, type FittingMetric } from "./validation";

export type DamageType = "em" | "thermal" | "kinetic" | "explosive";
export type TankLayer = "shield" | "armor" | "structure";
export type FittingSlot = "high" | "mid" | "low" | "rig";
export type HardpointKind = "turret" | "launcher";

export type DamageVector = Record<DamageType, number>;
export type ResistanceVector = Record<DamageType, number>;

export type ShipScalarMetric =
  | "cpuCapacity"
  | "powergridCapacity"
  | "maxVelocity"
  | "mass"
  | "signatureRadius"
  | "shieldHp"
  | "armorHp"
  | "structureHp"
  | "capacitorCapacity"
  | "capacitorRechargeTime"
  | "droneBandwidth"
  | "droneBay";

export interface FittingModifier {
  /** Multiplicative factor after Dogma resolution. 1.10 means +10%, 0.85 means -15%. */
  factor: number;
  /** Only modifiers explicitly known to share a stacking group should share this key. */
  stackingGroup?: string | null;
  /** Dogma decides whether an effect is stacking penalized; callers must not infer this from the item name. */
  stackingPenalized?: boolean;
  source: string;
}

export interface ResistanceBonus {
  /** Fractional resistance bonus after Dogma resolution. 0.30 means a 30% reduction of remaining damage. */
  bonus: number;
  stackingGroup?: string | null;
  stackingPenalized?: boolean;
  source: string;
}

export interface SkillRequirement {
  typeId: number;
  level: number;
  source: string;
}

export interface CharacterSkillState {
  levels: Readonly<Record<number, number>>;
}

export interface FittingShipInput {
  typeId?: number;
  name?: string;
  cpuCapacity?: number | null;
  powergridCapacity?: number | null;
  slots?: Partial<Record<FittingSlot, number | null>>;
  hardpoints?: Partial<Record<HardpointKind, number | null>>;
  maxVelocity?: number | null;
  mass?: number | null;
  signatureRadius?: number | null;
  shieldHp?: number | null;
  armorHp?: number | null;
  structureHp?: number | null;
  resistances?: Partial<Record<TankLayer, Partial<Record<DamageType, number | null>>>>;
  capacitorCapacity?: number | null;
  capacitorRechargeTime?: number | null;
  droneBandwidth?: number | null;
  droneBay?: number | null;
  maxActiveDrones?: number | null;
  modifiers?: Partial<Record<ShipScalarMetric, readonly FittingModifier[]>>;
  resistanceBonuses?: Partial<
    Record<TankLayer, Partial<Record<DamageType, readonly ResistanceBonus[]>>>
  >;
  requiredSkills?: readonly SkillRequirement[];
}

export interface CapActivationInput {
  state: "active" | "inactive";
  costGJ?: number | null;
  cycleSeconds?: number | null;
}

export interface TurretProfileInput {
  damage?: Partial<Record<DamageType, number | null>>;
  damageMultiplier?: number | null;
  cycleSeconds?: number | null;
  optimalRange?: number | null;
  falloffRange?: number | null;
  tracking?: number | null;
}

export interface MissileProfileInput {
  damage?: Partial<Record<DamageType, number | null>>;
  damageMultiplier?: number | null;
  cycleSeconds?: number | null;
  maxVelocity?: number | null;
  flightTimeSeconds?: number | null;
  explosionRadius?: number | null;
  explosionVelocity?: number | null;
}

export interface FittingModuleInput {
  id: string;
  name?: string;
  quantity?: number;
  slot?: FittingSlot | null;
  hardpoint?: HardpointKind | null;
  cpu?: number | null;
  powergrid?: number | null;
  capActivation?: CapActivationInput | null;
  turret?: TurretProfileInput | null;
  missile?: MissileProfileInput | null;
  requiredSkills?: readonly SkillRequirement[];
}

export interface DroneGroupInput {
  id: string;
  name?: string;
  quantityInBay: number;
  quantityActive: number;
  volumePerDrone?: number | null;
  bandwidthPerDrone?: number | null;
  damage?: Partial<Record<DamageType, number | null>>;
  damageMultiplier?: number | null;
  cycleSeconds?: number | null;
  requiredSkills?: readonly SkillRequirement[];
}

export interface FittingCoreInput {
  ship: FittingShipInput;
  modules?: readonly FittingModuleInput[];
  drones?: readonly DroneGroupInput[];
  skills?: CharacterSkillState | null;
  incomingDamage?: Partial<Record<DamageType, number | null>> | null;
}

export interface FittingIssue {
  code: string;
  summary: string;
  sourceId?: string;
}

export interface FittingSkillGap {
  typeId: number;
  requiredLevel: number;
  trainedLevel: number | null;
  sources: string[];
}

export interface FittingCoreResult {
  metrics: Partial<Record<FittingMetric, number>>;
  unknownMetrics: Partial<Record<FittingMetric, string>>;
  resources: {
    cpuCapacity: number | null;
    cpuUsed: number | null;
    cpuValid: boolean | null;
    powergridCapacity: number | null;
    powergridUsed: number | null;
    powergridValid: boolean | null;
  };
  legality: {
    slotsValid: boolean | null;
    hardpointsValid: boolean | null;
    droneBandwidthValid: boolean | null;
    droneBayValid: boolean | null;
    activeDroneCountValid: boolean | null;
    issues: FittingIssue[];
  };
  skills: {
    known: boolean;
    valid: boolean | null;
    gaps: FittingSkillGap[];
  };
  capacitor: {
    averageDrainPerSecond: number | null;
    peakRechargePerSecond: number | null;
    stableFraction: number | null;
  };
  fitValid: boolean | null;
}

const DAMAGE_TYPES: readonly DamageType[] = ["em", "thermal", "kinetic", "explosive"];
const SLOT_TYPES: readonly FittingSlot[] = ["high", "mid", "low", "rig"];
const HARDPOINT_TYPES: readonly HardpointKind[] = ["turret", "launcher"];
const UNIFORM_DAMAGE: DamageVector = { em: 0.25, thermal: 0.25, kinetic: 0.25, explosive: 0.25 };

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function finiteNonNegative(value: unknown): value is number {
  return finite(value) && value >= 0;
}

function positive(value: unknown): value is number {
  return finite(value) && value > 0;
}

/**
 * EVE stacking-penalty coefficient. CCP's current support article documents the
 * same descending effectiveness sequence (100%, 86.9%, 57.1%, 28.3%, 10.6%).
 * The continuous expression reproduces the established coefficients without
 * hard-coding an arbitrary maximum module count.
 */
export function stackingPenaltyCoefficient(zeroBasedIndex: number): number {
  if (!Number.isInteger(zeroBasedIndex) || zeroBasedIndex < 0) {
    throw new Error("Stacking-penalty index must be a non-negative integer");
  }
  return Math.exp(-Math.pow(zeroBasedIndex / 2.67, 2));
}

export function applyMultiplicativeModifiers(
  base: number,
  modifiers: readonly FittingModifier[] = [],
): number | null {
  if (!finite(base)) return null;
  let result = base;
  const penalized = new Map<string, FittingModifier[]>();

  for (const modifier of modifiers) {
    if (!positive(modifier.factor)) return null;
    if (modifier.stackingPenalized) {
      if (!modifier.stackingGroup) return null;
      const group = penalized.get(modifier.stackingGroup) ?? [];
      group.push(modifier);
      penalized.set(modifier.stackingGroup, group);
    } else {
      result *= modifier.factor;
    }
  }

  for (const group of penalized.values()) {
    const ordered = [...group].sort((left, right) =>
      Math.abs(right.factor - 1) - Math.abs(left.factor - 1));
    for (let index = 0; index < ordered.length; index += 1) {
      const modifier = ordered[index];
      const effectiveFactor = 1 + (modifier.factor - 1) * stackingPenaltyCoefficient(index);
      result *= effectiveFactor;
    }
  }

  return Number.isFinite(result) ? result : null;
}

export function applyResistanceBonuses(
  baseResistance: number,
  bonuses: readonly ResistanceBonus[] = [],
): number | null {
  if (!finite(baseResistance) || baseResistance >= 1) return null;
  let remainingDamage = 1 - baseResistance;
  if (!(remainingDamage > 0)) return null;
  const penalized = new Map<string, ResistanceBonus[]>();

  for (const modifier of bonuses) {
    if (!finite(modifier.bonus) || modifier.bonus >= 1) return null;
    if (modifier.stackingPenalized) {
      if (!modifier.stackingGroup) return null;
      const group = penalized.get(modifier.stackingGroup) ?? [];
      group.push(modifier);
      penalized.set(modifier.stackingGroup, group);
    } else {
      remainingDamage *= 1 - modifier.bonus;
    }
  }

  for (const group of penalized.values()) {
    const ordered = [...group].sort((left, right) => Math.abs(right.bonus) - Math.abs(left.bonus));
    for (let index = 0; index < ordered.length; index += 1) {
      remainingDamage *= 1 - ordered[index].bonus * stackingPenaltyCoefficient(index);
    }
  }

  const resistance = 1 - remainingDamage;
  return finite(resistance) && resistance < 1 ? resistance : null;
}

function normalizeDamageProfile(
  profile: Partial<Record<DamageType, number | null>> | null | undefined,
): DamageVector | null {
  if (!profile) return { ...UNIFORM_DAMAGE };
  const values = DAMAGE_TYPES.map((type) => profile[type]);
  if (!values.every(finiteNonNegative)) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) return null;
  return {
    em: values[0] / total,
    thermal: values[1] / total,
    kinetic: values[2] / total,
    explosive: values[3] / total,
  };
}

function completeDamageVector(
  input: Partial<Record<DamageType, number | null>> | null | undefined,
): DamageVector | null {
  if (!input) return null;
  const values = DAMAGE_TYPES.map((type) => input[type]);
  if (!values.every(finiteNonNegative)) return null;
  return { em: values[0], thermal: values[1], kinetic: values[2], explosive: values[3] };
}

function damageTotal(input: Partial<Record<DamageType, number | null>> | null | undefined): number | null {
  const damage = completeDamageVector(input);
  if (!damage) return null;
  return DAMAGE_TYPES.reduce((sum, type) => sum + damage[type], 0);
}

function consensus(values: readonly (number | null)[]): number | null {
  const known = values.filter(finite);
  if (known.length !== values.length || known.length === 0) return null;
  const first = known[0];
  return known.every((value) => Math.abs(value - first) <= 1e-9) ? first : null;
}

function quantity(value: number | undefined): number | null {
  const resolved = value ?? 1;
  return Number.isInteger(resolved) && resolved > 0 ? resolved : null;
}

function sumModuleResource(
  modules: readonly FittingModuleInput[],
  key: "cpu" | "powergrid",
): number | null {
  let total = 0;
  for (const module of modules) {
    const count = quantity(module.quantity);
    const use = module[key];
    if (count === null || !finiteNonNegative(use)) return null;
    total += use * count;
  }
  return total;
}

function scalarShipMetric(
  ship: FittingShipInput,
  metric: ShipScalarMetric,
  base: number | null | undefined,
): number | null {
  if (!finiteNonNegative(base)) return null;
  return applyMultiplicativeModifiers(base, ship.modifiers?.[metric] ?? []);
}

function resistanceFor(
  ship: FittingShipInput,
  layer: TankLayer,
  type: DamageType,
): number | null {
  const base = ship.resistances?.[layer]?.[type];
  if (!finite(base)) return null;
  return applyResistanceBonuses(base, ship.resistanceBonuses?.[layer]?.[type] ?? []);
}

function effectiveLayerHp(hp: number, resist: ResistanceVector, profile: DamageVector): number | null {
  const damageMultiplier = DAMAGE_TYPES.reduce(
    (sum, type) => sum + profile[type] * (1 - resist[type]),
    0,
  );
  if (!(damageMultiplier > 0) || !Number.isFinite(damageMultiplier)) return null;
  return hp / damageMultiplier;
}

function resolveSkillGaps(
  ship: FittingShipInput,
  modules: readonly FittingModuleInput[],
  drones: readonly DroneGroupInput[],
  skills: CharacterSkillState | null | undefined,
): FittingCoreResult["skills"] {
  const requirements = [
    ...(ship.requiredSkills ?? []),
    ...modules.flatMap((module) => module.requiredSkills ?? []),
    ...drones.flatMap((drone) => drone.requiredSkills ?? []),
  ];
  const bySkill = new Map<number, { requiredLevel: number; sources: Set<string> }>();
  for (const requirement of requirements) {
    if (!Number.isInteger(requirement.typeId) || requirement.typeId <= 0) continue;
    if (!Number.isInteger(requirement.level) || requirement.level < 0 || requirement.level > 5) continue;
    const existing = bySkill.get(requirement.typeId) ?? { requiredLevel: 0, sources: new Set<string>() };
    existing.requiredLevel = Math.max(existing.requiredLevel, requirement.level);
    existing.sources.add(requirement.source);
    bySkill.set(requirement.typeId, existing);
  }

  if (requirements.length > 0 && !skills) {
    return {
      known: false,
      valid: null,
      gaps: [...bySkill.entries()].map(([typeId, requirement]) => ({
        typeId,
        requiredLevel: requirement.requiredLevel,
        trainedLevel: null,
        sources: [...requirement.sources].sort(),
      })),
    };
  }

  const gaps: FittingSkillGap[] = [];
  for (const [typeId, requirement] of bySkill) {
    const trained = skills?.levels[typeId];
    if (!Number.isInteger(trained) || trained < requirement.requiredLevel) {
      gaps.push({
        typeId,
        requiredLevel: requirement.requiredLevel,
        trainedLevel: Number.isInteger(trained) ? trained : null,
        sources: [...requirement.sources].sort(),
      });
    }
  }
  gaps.sort((left, right) => left.typeId - right.typeId);
  return { known: true, valid: gaps.length === 0, gaps };
}

function capacitorStableFraction(capacity: number, rechargeSeconds: number, drainPerSecond: number): number | null {
  if (!positive(capacity) || !positive(rechargeSeconds) || !finiteNonNegative(drainPerSecond)) return null;
  if (drainPerSecond === 0) return 1;
  const peakRecharge = (2.5 * capacity) / rechargeSeconds;
  if (drainPerSecond > peakRecharge) return 0;
  const tau = rechargeSeconds / 5;
  const radicand = 1 - (2 * drainPerSecond * tau) / capacity;
  if (radicand < 0) return 0;
  const fraction = 0.25 * Math.pow(1 + Math.sqrt(radicand), 2);
  return finite(fraction) ? Math.min(1, Math.max(0, fraction)) : null;
}

function slotAndHardpointLegality(
  ship: FittingShipInput,
  modules: readonly FittingModuleInput[],
): Pick<FittingCoreResult["legality"], "slotsValid" | "hardpointsValid" | "issues"> {
  const issues: FittingIssue[] = [];
  let slotsKnown = true;
  let hardpointsKnown = true;
  let slotsValid = true;
  let hardpointsValid = true;

  for (const slot of SLOT_TYPES) {
    const capacity = ship.slots?.[slot];
    if (!finiteNonNegative(capacity)) {
      slotsKnown = false;
      continue;
    }
    let used = 0;
    for (const module of modules.filter((entry) => entry.slot === slot)) {
      const count = quantity(module.quantity);
      if (count === null) {
        slotsKnown = false;
        continue;
      }
      used += count;
    }
    if (used > capacity) {
      slotsValid = false;
      issues.push({ code: `slot-${slot}-over`, summary: `${used} ${slot} slots used but only ${capacity} are available.` });
    }
  }

  for (const hardpoint of HARDPOINT_TYPES) {
    const capacity = ship.hardpoints?.[hardpoint];
    if (!finiteNonNegative(capacity)) {
      hardpointsKnown = false;
      continue;
    }
    let used = 0;
    for (const module of modules.filter((entry) => entry.hardpoint === hardpoint)) {
      const count = quantity(module.quantity);
      if (count === null) {
        hardpointsKnown = false;
        continue;
      }
      used += count;
    }
    if (used > capacity) {
      hardpointsValid = false;
      issues.push({
        code: `hardpoint-${hardpoint}-over`,
        summary: `${used} ${hardpoint} hardpoints used but only ${capacity} are available.`,
      });
    }
  }

  for (const module of modules) {
    if (module.slot === null || module.slot === undefined) {
      slotsKnown = false;
      issues.push({ code: "module-slot-unknown", summary: `${module.name ?? module.id} has unresolved slot Dogma.`, sourceId: module.id });
    }
  }

  return {
    slotsValid: slotsKnown ? slotsValid : slotsValid ? null : false,
    hardpointsValid: hardpointsKnown ? hardpointsValid : hardpointsValid ? null : false,
    issues,
  };
}

function droneLegality(
  ship: FittingShipInput,
  drones: readonly DroneGroupInput[],
): Pick<
  FittingCoreResult["legality"],
  "droneBandwidthValid" | "droneBayValid" | "activeDroneCountValid" | "issues"
> {
  const issues: FittingIssue[] = [];
  if (drones.length === 0) {
    return { droneBandwidthValid: true, droneBayValid: true, activeDroneCountValid: true, issues };
  }

  let bandwidthUsed = 0;
  let bayUsed = 0;
  let activeCount = 0;
  let bandwidthKnown = true;
  let bayKnown = true;
  let countKnown = true;

  for (const group of drones) {
    if (!Number.isInteger(group.quantityInBay) || group.quantityInBay < 0 ||
        !Number.isInteger(group.quantityActive) || group.quantityActive < 0 ||
        group.quantityActive > group.quantityInBay) {
      countKnown = false;
      continue;
    }
    activeCount += group.quantityActive;
    if (finiteNonNegative(group.bandwidthPerDrone)) {
      bandwidthUsed += group.quantityActive * group.bandwidthPerDrone;
    } else {
      bandwidthKnown = false;
    }
    if (finiteNonNegative(group.volumePerDrone)) {
      bayUsed += group.quantityInBay * group.volumePerDrone;
    } else {
      bayKnown = false;
    }
  }

  const bandwidthCapacity = scalarShipMetric(ship, "droneBandwidth", ship.droneBandwidth);
  const bayCapacity = scalarShipMetric(ship, "droneBay", ship.droneBay);
  const maxActive = ship.maxActiveDrones;

  const bandwidthValid = bandwidthKnown && finiteNonNegative(bandwidthCapacity)
    ? bandwidthUsed <= bandwidthCapacity
    : null;
  const bayValid = bayKnown && finiteNonNegative(bayCapacity) ? bayUsed <= bayCapacity : null;
  const activeCountValid = countKnown && finiteNonNegative(maxActive) ? activeCount <= maxActive : null;

  if (bandwidthValid === false) issues.push({ code: "drone-bandwidth-over", summary: "Active drones exceed the ship's resolved bandwidth." });
  if (bayValid === false) issues.push({ code: "drone-bay-over", summary: "Carried drones exceed the ship's resolved drone-bay volume." });
  if (activeCountValid === false) issues.push({ code: "active-drone-count-over", summary: "Active drones exceed the resolved pilot/ship active-drone limit." });

  return {
    droneBandwidthValid: bandwidthValid,
    droneBayValid: bayValid,
    activeDroneCountValid: activeCountValid,
    issues,
  };
}

export function calculateFitting(input: FittingCoreInput): FittingCoreResult {
  const modules = input.modules ?? [];
  const drones = input.drones ?? [];
  const metrics: Partial<Record<FittingMetric, number>> = {};
  const unknownMetrics: Partial<Record<FittingMetric, string>> = {};
  for (const metric of FITTING_SCOPE.flatMap((area) => area.metrics)) {
    unknownMetrics[metric] = "Required resolved Dogma/input is unavailable.";
  }

  const setMetric = (metric: FittingMetric, value: number | null, unknownReason?: string): void => {
    if (finite(value)) {
      metrics[metric] = value;
      delete unknownMetrics[metric];
    } else if (unknownReason) {
      unknownMetrics[metric] = unknownReason;
    }
  };

  const cpuCapacity = scalarShipMetric(input.ship, "cpuCapacity", input.ship.cpuCapacity);
  const powergridCapacity = scalarShipMetric(input.ship, "powergridCapacity", input.ship.powergridCapacity);
  const cpuUsed = sumModuleResource(modules, "cpu");
  const powergridUsed = sumModuleResource(modules, "powergrid");
  setMetric("cpuUsed", cpuUsed, "At least one fitted module has unresolved CPU use.");
  setMetric("powergridUsed", powergridUsed, "At least one fitted module has unresolved powergrid use.");

  for (const [slot, metric] of [
    ["high", "highSlots"],
    ["mid", "midSlots"],
    ["low", "lowSlots"],
    ["rig", "rigSlots"],
  ] as const) {
    setMetric(metric, finiteNonNegative(input.ship.slots?.[slot]) ? input.ship.slots?.[slot] ?? null : null, `Ship ${slot}-slot capacity is unresolved.`);
  }
  setMetric("turretHardpoints", finiteNonNegative(input.ship.hardpoints?.turret) ? input.ship.hardpoints?.turret ?? null : null, "Turret hardpoint capacity is unresolved.");
  setMetric("launcherHardpoints", finiteNonNegative(input.ship.hardpoints?.launcher) ? input.ship.hardpoints?.launcher ?? null : null, "Launcher hardpoint capacity is unresolved.");

  setMetric("maxVelocity", scalarShipMetric(input.ship, "maxVelocity", input.ship.maxVelocity));
  setMetric("mass", scalarShipMetric(input.ship, "mass", input.ship.mass));
  setMetric("signatureRadius", scalarShipMetric(input.ship, "signatureRadius", input.ship.signatureRadius));

  const hpByLayer: Record<TankLayer, number | null> = {
    shield: scalarShipMetric(input.ship, "shieldHp", input.ship.shieldHp),
    armor: scalarShipMetric(input.ship, "armorHp", input.ship.armorHp),
    structure: scalarShipMetric(input.ship, "structureHp", input.ship.structureHp),
  };
  setMetric("shieldHp", hpByLayer.shield);
  setMetric("armorHp", hpByLayer.armor);
  setMetric("structureHp", hpByLayer.structure);

  const resistByLayer: Record<TankLayer, ResistanceVector | null> = {
    shield: null,
    armor: null,
    structure: null,
  };
  for (const layer of ["shield", "armor", "structure"] as const) {
    const resolved = DAMAGE_TYPES.map((type) => resistanceFor(input.ship, layer, type));
    if (resolved.every(finite)) {
      resistByLayer[layer] = {
        em: resolved[0], thermal: resolved[1], kinetic: resolved[2], explosive: resolved[3],
      };
    }
  }

  setMetric("shieldEmResist", resistByLayer.shield?.em ?? null);
  setMetric("shieldThermalResist", resistByLayer.shield?.thermal ?? null);
  setMetric("shieldKineticResist", resistByLayer.shield?.kinetic ?? null);
  setMetric("shieldExplosiveResist", resistByLayer.shield?.explosive ?? null);
  setMetric("armorEmResist", resistByLayer.armor?.em ?? null);
  setMetric("armorThermalResist", resistByLayer.armor?.thermal ?? null);
  setMetric("armorKineticResist", resistByLayer.armor?.kinetic ?? null);
  setMetric("armorExplosiveResist", resistByLayer.armor?.explosive ?? null);

  const incomingDamage = normalizeDamageProfile(input.incomingDamage);
  if (incomingDamage && resistByLayer.shield && resistByLayer.armor && resistByLayer.structure &&
      finiteNonNegative(hpByLayer.shield) && finiteNonNegative(hpByLayer.armor) && finiteNonNegative(hpByLayer.structure)) {
    const layerEhp = [
      effectiveLayerHp(hpByLayer.shield, resistByLayer.shield, incomingDamage),
      effectiveLayerHp(hpByLayer.armor, resistByLayer.armor, incomingDamage),
      effectiveLayerHp(hpByLayer.structure, resistByLayer.structure, incomingDamage),
    ];
    setMetric("ehp", layerEhp.every(finite) ? layerEhp.reduce((sum, value) => sum + value, 0) : null);
  } else {
    unknownMetrics.ehp = "EHP requires complete HP, resistance, and incoming-damage inputs for every tank layer.";
  }

  const capacitorCapacity = scalarShipMetric(input.ship, "capacitorCapacity", input.ship.capacitorCapacity);
  const capacitorRechargeTime = scalarShipMetric(input.ship, "capacitorRechargeTime", input.ship.capacitorRechargeTime);
  setMetric("capacitorCapacity", capacitorCapacity);
  setMetric("capacitorRechargeTime", capacitorRechargeTime);
  let capDataKnown = true;
  let averageDrain = 0;
  for (const module of modules) {
    const activation = module.capActivation;
    if (!activation || activation.state === "inactive") continue;
    const count = quantity(module.quantity);
    if (count === null || !finiteNonNegative(activation.costGJ) || !positive(activation.cycleSeconds)) {
      capDataKnown = false;
      continue;
    }
    averageDrain += (activation.costGJ * count) / activation.cycleSeconds;
  }
  const peakRecharge = positive(capacitorCapacity) && positive(capacitorRechargeTime)
    ? (2.5 * capacitorCapacity) / capacitorRechargeTime
    : null;
  const stableFraction = capDataKnown && positive(capacitorCapacity) && positive(capacitorRechargeTime)
    ? capacitorStableFraction(capacitorCapacity, capacitorRechargeTime, averageDrain)
    : null;
  setMetric("capacitorStable", stableFraction, "Cap stability needs capacity, recharge, and complete active-module cycle/cost state.");

  let weaponDps = 0;
  let weaponDpsKnown = true;
  let volleyDamage = 0;
  let volleyKnown = true;
  const turretRanges: Array<{ optimal: number | null; falloff: number | null; tracking: number | null }> = [];
  const missileRanges: Array<{ range: number | null; radius: number | null; velocity: number | null }> = [];

  for (const module of modules) {
    const count = quantity(module.quantity);
    if (count === null) {
      weaponDpsKnown = false;
      volleyKnown = false;
      continue;
    }
    if (module.turret) {
      const rawDamage = damageTotal(module.turret.damage);
      const multiplier = module.turret.damageMultiplier;
      const cycle = module.turret.cycleSeconds;
      if (finiteNonNegative(rawDamage) && finiteNonNegative(multiplier) && positive(cycle)) {
        const perShot = rawDamage * multiplier;
        volleyDamage += perShot * count;
        weaponDps += (perShot * count) / cycle;
      } else {
        weaponDpsKnown = false;
        volleyKnown = false;
      }
      for (let index = 0; index < count; index += 1) {
        turretRanges.push({
          optimal: finiteNonNegative(module.turret.optimalRange) ? module.turret.optimalRange : null,
          falloff: finiteNonNegative(module.turret.falloffRange) ? module.turret.falloffRange : null,
          tracking: finiteNonNegative(module.turret.tracking) ? module.turret.tracking : null,
        });
      }
    }
    if (module.missile) {
      const rawDamage = damageTotal(module.missile.damage);
      const multiplier = module.missile.damageMultiplier ?? 1;
      const cycle = module.missile.cycleSeconds;
      if (finiteNonNegative(rawDamage) && finiteNonNegative(multiplier) && positive(cycle)) {
        const perShot = rawDamage * multiplier;
        volleyDamage += perShot * count;
        weaponDps += (perShot * count) / cycle;
      } else {
        weaponDpsKnown = false;
        volleyKnown = false;
      }
      const range = finiteNonNegative(module.missile.maxVelocity) && finiteNonNegative(module.missile.flightTimeSeconds)
        ? module.missile.maxVelocity * module.missile.flightTimeSeconds
        : null;
      for (let index = 0; index < count; index += 1) {
        missileRanges.push({
          range,
          radius: finiteNonNegative(module.missile.explosionRadius) ? module.missile.explosionRadius : null,
          velocity: finiteNonNegative(module.missile.explosionVelocity) ? module.missile.explosionVelocity : null,
        });
      }
    }
  }

  if (modules.some((module) => module.turret || module.missile)) {
    setMetric("weaponDps", weaponDpsKnown ? weaponDps : null, "Weapon DPS needs complete resolved damage/multiplier/cycle inputs for every weapon group.");
    setMetric("volleyDamage", volleyKnown ? volleyDamage : null, "Volley damage needs complete resolved damage inputs for every weapon group.");
  } else {
    unknownMetrics.weaponDps = "No supported weapon profile was supplied.";
    unknownMetrics.volleyDamage = "No supported weapon profile was supplied.";
  }
  setMetric("optimalRange", consensus(turretRanges.map((entry) => entry.optimal)), "A single resolved turret optimal range is unavailable or fitted turret groups disagree.");
  setMetric("falloffRange", consensus(turretRanges.map((entry) => entry.falloff)), "A single resolved turret falloff is unavailable or fitted turret groups disagree.");
  setMetric("tracking", consensus(turretRanges.map((entry) => entry.tracking)), "A single resolved turret tracking value is unavailable or fitted turret groups disagree.");
  setMetric("missileRange", consensus(missileRanges.map((entry) => entry.range)), "A single resolved missile paper range is unavailable or fitted missile groups disagree.");
  setMetric("missileExplosionRadius", consensus(missileRanges.map((entry) => entry.radius)), "A single resolved missile explosion radius is unavailable or fitted missile groups disagree.");
  setMetric("missileExplosionVelocity", consensus(missileRanges.map((entry) => entry.velocity)), "A single resolved missile explosion velocity is unavailable or fitted missile groups disagree.");

  let droneDps = 0;
  let droneDpsKnown = true;
  if (drones.length > 0) {
    for (const group of drones) {
      const damage = damageTotal(group.damage);
      if (!Number.isInteger(group.quantityActive) || group.quantityActive < 0 ||
          !finiteNonNegative(damage) || !finiteNonNegative(group.damageMultiplier) || !positive(group.cycleSeconds)) {
        droneDpsKnown = false;
        continue;
      }
      droneDps += (damage * group.damageMultiplier * group.quantityActive) / group.cycleSeconds;
    }
    setMetric("droneDps", droneDpsKnown ? droneDps : null, "Drone DPS needs complete resolved active-drone damage/multiplier/cycle inputs.");
  } else {
    setMetric("droneDps", 0);
  }
  setMetric("droneBandwidth", scalarShipMetric(input.ship, "droneBandwidth", input.ship.droneBandwidth));
  setMetric("droneBay", scalarShipMetric(input.ship, "droneBay", input.ship.droneBay));

  const slotLegality = slotAndHardpointLegality(input.ship, modules);
  const dronesLegality = droneLegality(input.ship, drones);
  const legalityIssues = [...slotLegality.issues, ...dronesLegality.issues];
  const cpuValid = finiteNonNegative(cpuCapacity) && finiteNonNegative(cpuUsed) ? cpuUsed <= cpuCapacity : null;
  const powergridValid = finiteNonNegative(powergridCapacity) && finiteNonNegative(powergridUsed)
    ? powergridUsed <= powergridCapacity
    : null;
  if (cpuValid === false) legalityIssues.push({ code: "cpu-over", summary: `CPU use ${cpuUsed} exceeds resolved capacity ${cpuCapacity}.` });
  if (powergridValid === false) legalityIssues.push({ code: "powergrid-over", summary: `Powergrid use ${powergridUsed} exceeds resolved capacity ${powergridCapacity}.` });
  const skillResult = resolveSkillGaps(input.ship, modules, drones, input.skills);

  const checks = [
    cpuValid,
    powergridValid,
    slotLegality.slotsValid,
    slotLegality.hardpointsValid,
    dronesLegality.droneBandwidthValid,
    dronesLegality.droneBayValid,
    dronesLegality.activeDroneCountValid,
    skillResult.valid,
  ];
  const fitValid = checks.some((check) => check === false)
    ? false
    : checks.some((check) => check === null)
      ? null
      : true;

  return {
    metrics,
    unknownMetrics,
    resources: {
      cpuCapacity,
      cpuUsed,
      cpuValid,
      powergridCapacity,
      powergridUsed,
      powergridValid,
    },
    legality: {
      slotsValid: slotLegality.slotsValid,
      hardpointsValid: slotLegality.hardpointsValid,
      droneBandwidthValid: dronesLegality.droneBandwidthValid,
      droneBayValid: dronesLegality.droneBayValid,
      activeDroneCountValid: dronesLegality.activeDroneCountValid,
      issues: legalityIssues,
    },
    skills: skillResult,
    capacitor: {
      averageDrainPerSecond: capDataKnown ? averageDrain : null,
      peakRechargePerSecond: peakRecharge,
      stableFraction,
    },
    fitValid,
  };
}
