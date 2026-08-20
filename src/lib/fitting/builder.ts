import { calculateFitting, type DroneGroupInput, type FittingCoreInput, type FittingCoreResult, type FittingModuleInput, type FittingShipInput, type FittingSlot } from "./core";

export const FIT_BUILDER_SCHEMA_VERSION = 1;

export interface BuilderChargeDefinition {
  id: string;
  name: string;
  appliesTo: "turret" | "missile";
  turretPatch?: NonNullable<FittingModuleInput["turret"]>;
  missilePatch?: NonNullable<FittingModuleInput["missile"]>;
  provenance: string;
}

export interface BuilderModuleDefinition {
  id: string;
  name: string;
  slot: FittingSlot;
  module: FittingModuleInput;
  supportedChargeIds?: readonly string[];
  note?: string;
  provenance: string;
}

export interface BuilderDroneDefinition {
  id: string;
  name: string;
  drone: Omit<DroneGroupInput, "quantityInBay" | "quantityActive">;
  provenance: string;
}

export interface BuilderHullDefinition {
  id: string;
  name: string;
  ship: FittingShipInput;
  provenance: string;
}

export interface FitBuilderCatalog {
  hulls: readonly BuilderHullDefinition[];
  modules: readonly BuilderModuleDefinition[];
  charges: readonly BuilderChargeDefinition[];
  drones: readonly BuilderDroneDefinition[];
}

export interface BuilderModuleSelection {
  instanceId: string;
  definitionId: string;
  chargeId?: string | null;
}

export interface BuilderDroneSelection {
  definitionId: string;
  quantityInBay: number;
  quantityActive: number;
}

export interface FitBuilderState {
  version: number;
  name: string;
  hullId: string;
  modules: BuilderModuleSelection[];
  drones: BuilderDroneSelection[];
}

export interface CompiledFitBuilder {
  input: FittingCoreInput | null;
  result: FittingCoreResult | null;
  errors: string[];
  warnings: string[];
}

const CURRENT_SDE = "CCP SDE build 3424810, verified 2026-08-20";

const RIFTER: BuilderHullDefinition = {
  id: "rifter",
  name: "Rifter",
  provenance: CURRENT_SDE,
  ship: {
    typeId: 587,
    name: "Rifter",
    cpuCapacity: 130,
    powergridCapacity: 41,
    slots: { high: 3, mid: 3, low: 4, rig: 3 },
    hardpoints: { turret: 3, launcher: 2 },
    maxVelocity: 365,
    mass: 1_067_000,
    signatureRadius: 35,
    shieldHp: 450,
    armorHp: 450,
    structureHp: 350,
    resistances: {
      shield: { em: 0, thermal: 0.2, kinetic: 0.4, explosive: 0.5 },
      armor: { em: 0.6, thermal: 0.35, kinetic: 0.25, explosive: 0.1 },
      structure: { em: 0.33, thermal: 0.33, kinetic: 0.33, explosive: 0.33 },
    },
    capacitorCapacity: 250,
    capacitorRechargeTime: 125,
    droneBandwidth: 0,
    droneBay: 0,
    maxActiveDrones: 0,
  },
};

export const DEFAULT_FIT_BUILDER_CATALOG: FitBuilderCatalog = {
  hulls: [RIFTER],
  modules: [
    {
      id: "200mm-autocannon-i",
      name: "200mm AutoCannon I",
      slot: "high",
      provenance: CURRENT_SDE,
      supportedChargeIds: ["emp-s"],
      module: {
        id: "200mm-autocannon-i",
        name: "200mm AutoCannon I",
        slot: "high",
        hardpoint: "turret",
        cpu: 9,
        powergrid: 4,
        turret: { damageMultiplier: 2.8875, cycleSeconds: 3.75, optimalRange: 500, falloffRange: 5160, tracking: 315 },
      },
    },
    {
      id: "light-missile-launcher-i",
      name: "Light Missile Launcher I",
      slot: "high",
      provenance: CURRENT_SDE,
      supportedChargeIds: ["scourge-light-missile"],
      module: {
        id: "light-missile-launcher-i",
        name: "Light Missile Launcher I",
        slot: "high",
        hardpoint: "launcher",
        cpu: 21,
        powergrid: 6,
        missile: { cycleSeconds: 16 },
      },
    },
    {
      id: "unsupported-rig-slot-marker",
      name: "Rig slot (effect unresolved)",
      slot: "rig",
      provenance: "UI-only unresolved rig slot marker; no EVE item or effect is claimed",
      note: "Consumes one rig slot only. NEC does not invent a rig effect when Dogma materialization is unavailable.",
      module: { id: "unsupported-rig-slot-marker", name: "Rig slot (effect unresolved)", slot: "rig", cpu: 0, powergrid: 0 },
    },
  ],
  charges: [
    {
      id: "emp-s",
      name: "EMP S",
      appliesTo: "turret",
      provenance: CURRENT_SDE,
      turretPatch: { damage: { em: 9, thermal: 0, kinetic: 1, explosive: 2 } },
    },
    {
      id: "scourge-light-missile",
      name: "Scourge Light Missile",
      appliesTo: "missile",
      provenance: CURRENT_SDE,
      missilePatch: { damage: { em: 0, thermal: 0, kinetic: 83, explosive: 0 }, maxVelocity: 3750, flightTimeSeconds: 5, explosionRadius: 40, explosionVelocity: 170 },
    },
  ],
  drones: [
    {
      id: "hobgoblin-i",
      name: "Hobgoblin I",
      provenance: CURRENT_SDE,
      drone: { id: "hobgoblin-i", name: "Hobgoblin I", volumePerDrone: 5, bandwidthPerDrone: 5, damage: { em: 0, thermal: 20, kinetic: 0, explosive: 0 }, damageMultiplier: 1.6, cycleSeconds: 4 },
    },
  ],
};

function mergeTurret(base: FittingModuleInput["turret"], patch: BuilderChargeDefinition["turretPatch"]): FittingModuleInput["turret"] {
  return base || patch ? { ...(base ?? {}), ...(patch ?? {}) } : null;
}

function mergeMissile(base: FittingModuleInput["missile"], patch: BuilderChargeDefinition["missilePatch"]): FittingModuleInput["missile"] {
  return base || patch ? { ...(base ?? {}), ...(patch ?? {}) } : null;
}

export function createEmptyBuilderState(hullId = DEFAULT_FIT_BUILDER_CATALOG.hulls[0].id): FitBuilderState {
  return { version: FIT_BUILDER_SCHEMA_VERSION, name: "Untitled fit", hullId, modules: [], drones: [] };
}

export function compileBuilderState(state: FitBuilderState, catalog: FitBuilderCatalog = DEFAULT_FIT_BUILDER_CATALOG): CompiledFitBuilder {
  const errors: string[] = [];
  const warnings: string[] = [];
  const hull = catalog.hulls.find((entry) => entry.id === state.hullId);
  if (!hull) errors.push(`Unknown hull: ${state.hullId}`);

  const instanceIds = new Set<string>();
  const modules: FittingModuleInput[] = [];
  for (const selection of state.modules) {
    if (!selection.instanceId || instanceIds.has(selection.instanceId)) {
      errors.push(`Module instance ID must be unique: ${selection.instanceId || "(blank)"}`);
      continue;
    }
    instanceIds.add(selection.instanceId);
    const definition = catalog.modules.find((entry) => entry.id === selection.definitionId);
    if (!definition) {
      errors.push(`Unknown module: ${selection.definitionId}`);
      continue;
    }
    let module: FittingModuleInput = { ...definition.module, id: selection.instanceId };
    if (definition.note) warnings.push(`${definition.name}: ${definition.note}`);
    if (selection.chargeId) {
      const charge = catalog.charges.find((entry) => entry.id === selection.chargeId);
      if (!charge) {
        errors.push(`Unknown charge: ${selection.chargeId}`);
        continue;
      }
      if (!definition.supportedChargeIds?.includes(charge.id)) {
        errors.push(`${charge.name} is not validated for ${definition.name}`);
        continue;
      }
      module = { ...module, turret: mergeTurret(module.turret, charge.turretPatch), missile: mergeMissile(module.missile, charge.missilePatch) };
    } else if (definition.supportedChargeIds?.length) {
      warnings.push(`${definition.name} has no validated charge selected; weapon damage/range may remain unknown.`);
    }
    modules.push(module);
  }

  const drones: DroneGroupInput[] = [];
  for (const selection of state.drones) {
    if (!Number.isInteger(selection.quantityInBay) || selection.quantityInBay < 0 || !Number.isInteger(selection.quantityActive) || selection.quantityActive < 0 || selection.quantityActive > selection.quantityInBay) {
      errors.push(`Invalid drone quantities for ${selection.definitionId}`);
      continue;
    }
    const definition = catalog.drones.find((entry) => entry.id === selection.definitionId);
    if (!definition) {
      errors.push(`Unknown drone: ${selection.definitionId}`);
      continue;
    }
    drones.push({ ...definition.drone, quantityInBay: selection.quantityInBay, quantityActive: selection.quantityActive });
  }

  if (!hull || errors.length) return { input: null, result: null, errors, warnings };
  const input: FittingCoreInput = { ship: hull.ship, modules, drones, skills: null };
  return { input, result: calculateFitting(input), errors, warnings };
}

export function exportBuilderState(state: FitBuilderState): string {
  return JSON.stringify(state, null, 2);
}

export function importBuilderState(serialized: string): FitBuilderState {
  const value = JSON.parse(serialized) as Partial<FitBuilderState>;
  if (value.version !== FIT_BUILDER_SCHEMA_VERSION) throw new Error(`Unsupported fit schema version: ${String(value.version)}`);
  if (typeof value.name !== "string" || typeof value.hullId !== "string" || !Array.isArray(value.modules) || !Array.isArray(value.drones)) {
    throw new Error("Invalid NEC fit payload");
  }
  return { version: value.version, name: value.name, hullId: value.hullId, modules: value.modules as BuilderModuleSelection[], drones: value.drones as BuilderDroneSelection[] };
}
