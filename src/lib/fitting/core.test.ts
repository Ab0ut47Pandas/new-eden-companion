import { describe, expect, it } from "vitest";

import {
  applyMultiplicativeModifiers,
  applyResistanceBonuses,
  calculateFitting,
  stackingPenaltyCoefficient,
  type FittingCoreInput,
  type FittingShipInput,
} from "./core";

// Current-SDE primitive values below were rechecked for CCP build 3424810 on 2026-08-20.
// EVE Ref is used only as an independent current-SDE mirror cross-check, per FIT-01 policy.
const CURRENT_RIFTER: FittingShipInput = {
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
};

function withKnownEmptyFit(overrides: Partial<FittingCoreInput> = {}): FittingCoreInput {
  return {
    ship: CURRENT_RIFTER,
    modules: [],
    drones: [],
    skills: { levels: {} },
    ...overrides,
  };
}

describe("FIT-02 deterministic fitting core", () => {
  it("reproduces current Rifter base fitting and ship metrics without inventing absent weapon state", () => {
    const result = calculateFitting(withKnownEmptyFit());

    expect(result.metrics).toMatchObject({
      cpuUsed: 0,
      powergridUsed: 0,
      highSlots: 3,
      midSlots: 3,
      lowSlots: 4,
      rigSlots: 3,
      turretHardpoints: 3,
      launcherHardpoints: 2,
      maxVelocity: 365,
      mass: 1_067_000,
      signatureRadius: 35,
      shieldHp: 450,
      armorHp: 450,
      structureHp: 350,
      capacitorCapacity: 250,
      capacitorRechargeTime: 125,
      capacitorStable: 1,
      droneDps: 0,
      droneBandwidth: 0,
      droneBay: 0,
    });
    expect(result.metrics.shieldEmResist).toBeCloseTo(0, 12);
    expect(result.metrics.shieldThermalResist).toBeCloseTo(0.2, 12);
    expect(result.metrics.shieldKineticResist).toBeCloseTo(0.4, 12);
    expect(result.metrics.shieldExplosiveResist).toBeCloseTo(0.5, 12);
    expect(result.metrics.armorEmResist).toBeCloseTo(0.6, 12);
    expect(result.metrics.armorThermalResist).toBeCloseTo(0.35, 12);
    expect(result.metrics.armorKineticResist).toBeCloseTo(0.25, 12);
    expect(result.metrics.armorExplosiveResist).toBeCloseTo(0.1, 12);
    expect(result.metrics.ehp).toBeCloseTo(1809.7443815405732, 8);
    expect(result.unknownMetrics.weaponDps).toContain("No supported weapon profile");
    expect(result.unknownMetrics.optimalRange).toBeDefined();
    expect(result.fitValid).toBe(true);
  });

  it("reproduces a three-gun current-SDE 200mm AutoCannon I + EMP S primitive case", () => {
    const result = calculateFitting(withKnownEmptyFit({
      modules: [{
        id: "200mm-ac-i",
        name: "200mm AutoCannon I",
        quantity: 3,
        slot: "high",
        hardpoint: "turret",
        cpu: 9,
        powergrid: 4,
        turret: {
          damage: { em: 9, thermal: 0, kinetic: 1, explosive: 2 },
          damageMultiplier: 2.8875,
          cycleSeconds: 3.75,
          optimalRange: 500,
          falloffRange: 5160,
          tracking: 315,
        },
      }],
    }));

    expect(result.resources).toMatchObject({ cpuUsed: 27, cpuValid: true, powergridUsed: 12, powergridValid: true });
    expect(result.metrics.weaponDps).toBeCloseTo(27.72, 10);
    expect(result.metrics.volleyDamage).toBeCloseTo(103.95, 10);
    expect(result.metrics.optimalRange).toBe(500);
    expect(result.metrics.falloffRange).toBe(5160);
    expect(result.metrics.tracking).toBe(315);
    expect(result.fitValid).toBe(true);
  });

  it("computes current light-missile paper range and application primitives separately from target application", () => {
    const result = calculateFitting(withKnownEmptyFit({
      modules: [{
        id: "light-missile-launcher-i",
        name: "Light Missile Launcher I",
        slot: "high",
        hardpoint: "launcher",
        cpu: 21,
        powergrid: 6,
        missile: {
          damage: { em: 0, thermal: 0, kinetic: 83, explosive: 0 },
          cycleSeconds: 16,
          maxVelocity: 3750,
          flightTimeSeconds: 5,
          explosionRadius: 40,
          explosionVelocity: 170,
        },
      }],
    }));

    expect(result.metrics.weaponDps).toBeCloseTo(5.1875, 10);
    expect(result.metrics.volleyDamage).toBe(83);
    expect(result.metrics.missileRange).toBe(18_750);
    expect(result.metrics.missileExplosionRadius).toBe(40);
    expect(result.metrics.missileExplosionVelocity).toBe(170);
  });

  it("calculates active-drone paper DPS and validates bay, bandwidth, and active count", () => {
    const droneShip: FittingShipInput = {
      ...CURRENT_RIFTER,
      droneBandwidth: 25,
      droneBay: 25,
      maxActiveDrones: 5,
    };
    const result = calculateFitting({
      ship: droneShip,
      modules: [],
      skills: { levels: {} },
      drones: [{
        id: "hobgoblin-i",
        name: "Hobgoblin I",
        quantityInBay: 5,
        quantityActive: 5,
        volumePerDrone: 5,
        bandwidthPerDrone: 5,
        damage: { em: 0, thermal: 20, kinetic: 0, explosive: 0 },
        damageMultiplier: 1.6,
        cycleSeconds: 4,
      }],
    });

    expect(result.metrics.droneDps).toBe(40);
    expect(result.legality).toMatchObject({
      droneBandwidthValid: true,
      droneBayValid: true,
      activeDroneCountValid: true,
    });
    expect(result.fitValid).toBe(true);
  });

  it("fails a fit when known CPU, slot, hardpoint, or drone constraints are exceeded", () => {
    const result = calculateFitting({
      ship: { ...CURRENT_RIFTER, droneBandwidth: 5, droneBay: 5, maxActiveDrones: 1 },
      modules: [{
        id: "oversized-fictional-resolved-test-module",
        quantity: 4,
        slot: "high",
        hardpoint: "turret",
        cpu: 40,
        powergrid: 1,
      }],
      drones: [{
        id: "resolved-test-drone",
        quantityInBay: 2,
        quantityActive: 2,
        volumePerDrone: 5,
        bandwidthPerDrone: 5,
      }],
      skills: { levels: {} },
    });

    expect(result.resources.cpuValid).toBe(false);
    expect(result.legality.slotsValid).toBe(false);
    expect(result.legality.hardpointsValid).toBe(false);
    expect(result.legality.droneBandwidthValid).toBe(false);
    expect(result.legality.droneBayValid).toBe(false);
    expect(result.legality.activeDroneCountValid).toBe(false);
    expect(result.fitValid).toBe(false);
  });

  it("preserves unresolved module fitting cost as unknown instead of treating it as zero", () => {
    const result = calculateFitting(withKnownEmptyFit({
      modules: [{ id: "unresolved-module", slot: "mid", cpu: null, powergrid: 1 }],
    }));

    expect(result.resources.cpuUsed).toBeNull();
    expect(result.resources.cpuValid).toBeNull();
    expect(result.unknownMetrics.cpuUsed).toContain("unresolved CPU");
    expect(result.fitValid).toBeNull();
  });

  it("requires explicit stacking groups and matches CCP's documented current effectiveness sequence", () => {
    expect(stackingPenaltyCoefficient(0)).toBe(1);
    expect(stackingPenaltyCoefficient(1)).toBeCloseTo(0.86912, 5);
    expect(stackingPenaltyCoefficient(2)).toBeCloseTo(0.57058, 5);
    expect(stackingPenaltyCoefficient(3)).toBeCloseTo(0.28296, 5);
    expect(stackingPenaltyCoefficient(4)).toBeCloseTo(0.10599, 5);

    const modified = applyMultiplicativeModifiers(100, [
      { factor: 1.1, stackingPenalized: true, stackingGroup: "speed", source: "A" },
      { factor: 1.05, stackingPenalized: true, stackingGroup: "speed", source: "B" },
      { factor: 1.2, stackingPenalized: true, stackingGroup: "speed", source: "C" },
    ]);
    expect(modified).toBeCloseTo(134.1504817571, 9);

    expect(applyMultiplicativeModifiers(100, [
      { factor: 1.2, stackingPenalized: true, source: "unresolved group" },
    ])).toBeNull();
  });

  it("applies resistance bonuses to remaining damage and stacking-penalizes only explicitly grouped effects", () => {
    const resistance = applyResistanceBonuses(0, [
      { bonus: 0.3, stackingPenalized: true, stackingGroup: "shield-em", source: "A" },
      { bonus: 0.3, stackingPenalized: true, stackingGroup: "shield-em", source: "B" },
    ]);
    expect(resistance).toBeCloseTo(1 - 0.7 * (1 - 0.3 * stackingPenaltyCoefficient(1)), 10);
  });

  it("calculates capacitor peak recharge and equilibrium fraction only with complete active-cycle state", () => {
    const stable = calculateFitting(withKnownEmptyFit({
      modules: [{
        id: "cap-test",
        slot: "mid",
        cpu: 0,
        powergrid: 0,
        capActivation: { state: "active", costGJ: 10, cycleSeconds: 5 },
      }],
    }));
    expect(stable.capacitor.averageDrainPerSecond).toBe(2);
    expect(stable.capacitor.peakRechargePerSecond).toBe(5);
    expect(stable.capacitor.stableFraction).toBeCloseTo(0.7872983346, 9);
    expect(stable.metrics.capacitorStable).toBeCloseTo(0.7872983346, 9);

    const unresolved = calculateFitting(withKnownEmptyFit({
      modules: [{
        id: "cap-unknown",
        slot: "mid",
        cpu: 0,
        powergrid: 0,
        capActivation: { state: "active", costGJ: 10, cycleSeconds: null },
      }],
    }));
    expect(unresolved.capacitor.stableFraction).toBeNull();
    expect(unresolved.unknownMetrics.capacitorStable).toBeDefined();
  });

  it("reports skill gaps separately and does not pretend missing character skill data is a failure", () => {
    const required = {
      id: "skill-gated-module",
      slot: "mid" as const,
      cpu: 1,
      powergrid: 1,
      requiredSkills: [{ typeId: 12345, level: 4, source: "resolved Dogma requirement" }],
    };

    const unknown = calculateFitting({ ship: CURRENT_RIFTER, modules: [required], drones: [], skills: null });
    expect(unknown.skills).toMatchObject({ known: false, valid: null });
    expect(unknown.skills.gaps[0]).toMatchObject({ typeId: 12345, requiredLevel: 4, trainedLevel: null });
    expect(unknown.fitValid).toBeNull();

    const insufficient = calculateFitting({ ship: CURRENT_RIFTER, modules: [required], drones: [], skills: { levels: { 12345: 3 } } });
    expect(insufficient.skills.valid).toBe(false);
    expect(insufficient.fitValid).toBe(false);

    const trained = calculateFitting({ ship: CURRENT_RIFTER, modules: [required], drones: [], skills: { levels: { 12345: 4 } } });
    expect(trained.skills.valid).toBe(true);
    expect(trained.fitValid).toBe(true);
  });

  it("does not collapse heterogeneous weapon groups into a misleading single range", () => {
    const result = calculateFitting(withKnownEmptyFit({
      modules: [
        {
          id: "turret-a",
          slot: "high",
          hardpoint: "turret",
          cpu: 1,
          powergrid: 1,
          turret: {
            damage: { em: 1, thermal: 0, kinetic: 0, explosive: 0 },
            damageMultiplier: 1,
            cycleSeconds: 1,
            optimalRange: 1000,
            falloffRange: 5000,
            tracking: 100,
          },
        },
        {
          id: "turret-b",
          slot: "high",
          hardpoint: "turret",
          cpu: 1,
          powergrid: 1,
          turret: {
            damage: { em: 1, thermal: 0, kinetic: 0, explosive: 0 },
            damageMultiplier: 1,
            cycleSeconds: 1,
            optimalRange: 2000,
            falloffRange: 5000,
            tracking: 100,
          },
        },
      ],
    }));

    expect(result.metrics.weaponDps).toBe(2);
    expect(result.metrics.optimalRange).toBeUndefined();
    expect(result.unknownMetrics.optimalRange).toContain("groups disagree");
    expect(result.metrics.falloffRange).toBe(5000);
  });
});
