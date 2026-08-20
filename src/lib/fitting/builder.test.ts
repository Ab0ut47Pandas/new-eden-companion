import { describe, expect, it } from "vitest";

import { compileBuilderState, createEmptyBuilderState, exportBuilderState, importBuilderState } from "./builder";

describe("FIT-03 fitting builder", () => {
  it("starts with a valid empty Rifter and recalculates immediately", () => {
    const compiled = compileBuilderState(createEmptyBuilderState());
    expect(compiled.errors).toEqual([]);
    expect(compiled.result?.fitValid).toBe(true);
    expect(compiled.result?.resources.cpuUsed).toBe(0);
    expect(compiled.result?.metrics.maxVelocity).toBe(365);
  });

  it("applies validated charges to selected weapons and reports hardpoint/resource legality", () => {
    const state = createEmptyBuilderState();
    state.modules = Array.from({ length: 3 }, (_, index) => ({
      instanceId: `gun-${index}`,
      definitionId: "200mm-autocannon-i",
      chargeId: "emp-s",
    }));
    const compiled = compileBuilderState(state);
    expect(compiled.errors).toEqual([]);
    expect(compiled.result?.resources.cpuUsed).toBe(27);
    expect(compiled.result?.metrics.weaponDps).toBeCloseTo(27.72, 8);
    expect(compiled.result?.fitValid).toBe(true);
  });

  it("fails closed for incompatible or unknown charge selections", () => {
    const state = createEmptyBuilderState();
    state.modules = [{ instanceId: "launcher-1", definitionId: "light-missile-launcher-i", chargeId: "emp-s" }];
    const compiled = compileBuilderState(state);
    expect(compiled.result).toBeNull();
    expect(compiled.errors[0]).toContain("not validated");
  });

  it("keeps unresolved rig effects visible instead of inventing bonuses", () => {
    const state = createEmptyBuilderState();
    state.modules = [{ instanceId: "rig-1", definitionId: "unsupported-rig-slot-marker" }];
    const compiled = compileBuilderState(state);
    expect(compiled.errors).toEqual([]);
    expect(compiled.warnings.join(" ")).toContain("does not invent a rig effect");
    expect(compiled.result?.fitValid).toBe(true);
  });

  it("round-trips the versioned local NEC fit format", () => {
    const state = createEmptyBuilderState();
    state.name = "Rifter sandbox";
    state.modules.push({ instanceId: "gun-1", definitionId: "200mm-autocannon-i", chargeId: "emp-s" });
    expect(importBuilderState(exportBuilderState(state))).toEqual(state);
  });

  it("rejects malformed or unsupported fit payloads", () => {
    expect(() => importBuilderState(JSON.stringify({ version: 99, name: "x", hullId: "rifter", modules: [], drones: [] }))).toThrow(/Unsupported fit schema/);
    expect(() => importBuilderState(JSON.stringify({ version: 1, name: "x" }))).toThrow(/Invalid NEC fit payload/);
  });
});
