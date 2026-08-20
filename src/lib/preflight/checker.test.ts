import { describe, expect, it } from "vitest";

import { detectAbyssalScenario, detectedFleetScale, evaluatePreflight, type PreflightInput } from "@/lib/preflight/checker";

const base: PreflightInput = {
  activity: "combat",
  option: "abyssal",
  fleetScale: "solo",
  tripProfile: "session",
  shipName: "Test Ship",
  shipType: "Dragoon",
  shipGroupId: 420,
  docked: true,
  systemName: "Amarr",
  systemSecurity: 1,
  inventoryReadable: true,
  activeImplants: 0,
  fleetMemberCount: 1,
  abyssalTier: 0,
  abyssalWeather: "electrical",
  storedSupplies: [],
  contents: [
    { itemId: 1, typeId: 1, name: "Light Missile Launcher I", quantity: 3, locationFlag: "HiSlot0", estimatedValue: 10 },
    { itemId: 2, typeId: 2, name: "Small Armor Repairer II", quantity: 1, locationFlag: "LoSlot0", estimatedValue: 10 },
    { itemId: 3, typeId: 3, name: "Scourge Light Missile", quantity: 1500, locationFlag: "Cargo", estimatedValue: 10 },
    { itemId: 4, typeId: 4, name: "Tranquil Electrical Filament", quantity: 3, locationFlag: "Cargo", estimatedValue: 10 },
  ],
};

describe("preflight checker", () => {
  it("detects common fleet sizes", () => {
    expect(detectedFleetScale()).toBe("solo");
    expect(detectedFleetScale(4)).toBe("small");
    expect(detectedFleetScale(25)).toBe("organized");
  });

  it("recognizes a basic stocked Abyssal fit without claiming it can clear", () => {
    const checks = evaluatePreflight(base);
    expect(checks.find((check) => check.id === "offense")?.status).toBe("pass");
    expect(checks.find((check) => check.id === "matched-ammo")?.status).toBe("pass");
    expect(checks.find((check) => check.id === "filament")?.status).toBe("pass");
    expect(checks.find((check) => check.id === "abyssal-timer")?.status).toBe("info");
    expect(checks.find((check) => check.id === "abyssal-verdict")?.status).toBe("warning");
  });

  it("detects tier and weather from a carried filament", () => {
    expect(detectAbyssalScenario(base.contents)).toEqual({ tier: 0, weather: "electrical" });
  });

  it("hard-stops this basic Dragoon fit above T0", () => {
    const checks = evaluatePreflight({ ...base, abyssalTier: 1 });
    expect(checks.find((check) => check.id === "abyssal-verdict")?.status).toBe("danger");
    expect(checks.find((check) => check.id === "filament")?.status).toBe("danger");
  });

  it("flags dark weather for a drone and turret fit", () => {
    const checks = evaluatePreflight({
      ...base,
      abyssalWeather: "dark",
      contents: [...base.contents, { itemId: 20, typeId: 20, name: "Acolyte II", quantity: 5, locationFlag: "DroneBay", estimatedValue: 10 }],
    });
    expect(checks.find((check) => check.id === "abyssal-weather")?.status).toBe("danger");
  });

  it("requires a fleet for destroyer filament activation", () => {
    const checks = evaluatePreflight({ ...base, fleetMemberCount: undefined });
    expect(checks.find((check) => check.id === "abyssal-fleet")?.status).toBe("danger");
  });

  it("does not demand a replacement filament after the pilot is already inside", () => {
    const checks = evaluatePreflight({ ...base, systemName: "AD083", contents: base.contents.filter((item) => !/filament/i.test(item.name)) });
    expect(checks.find((check) => check.id === "filament")?.status).toBe("info");
    expect(checks.find((check) => check.id === "filament")?.title).toContain("already consumed");
  });

  it("blocks non-T0 activation in 0.9 or 1.0 security", () => {
    const checks = evaluatePreflight({ ...base, abyssalTier: 1, systemSecurity: 0.9 });
    expect(checks.find((check) => check.id === "abyssal-security")?.status).toBe("danger");
  });

  it("uses outing length to require drone reserves", () => {
    const contents = [...base.contents, { itemId: 21, typeId: 21, name: "Acolyte II", quantity: 9, locationFlag: "DroneBay", estimatedValue: 10 }];
    const oneRun = evaluatePreflight({ ...base, tripProfile: "one", contents });
    const session = evaluatePreflight({ ...base, tripProfile: "session", contents });
    expect(oneRun.find((check) => check.id === "abyssal-drone-reserve")?.status).toBe("pass");
    expect(session.find((check) => check.id === "abyssal-drone-reserve")?.status).toBe("warning");
  });

  it("warns when a relic explorer has no analyzer", () => {
    const checks = evaluatePreflight({ ...base, activity: "exploration", option: "relic", contents: [] });
    expect(checks.find((check) => check.id === "analyzer")?.status).toBe("warning");
  });

  it("composes exploration probe supply checks from accessible active-ship cargo", () => {
    const checks = evaluatePreflight({
      ...base,
      activity: "exploration",
      option: "wormhole",
      tripProfile: "expedition",
      contents: [
        { itemId: 30, typeId: 30, name: "Core Probe Launcher I", quantity: 1, locationFlag: "HiSlot0", estimatedValue: 10 },
        { itemId: 31, typeId: 31, name: "Core Scanner Probe I", quantity: 16, locationFlag: "Cargo", estimatedValue: 10 },
        { itemId: 32, typeId: 32, name: "5MN Microwarpdrive I", quantity: 1, locationFlag: "MedSlot0", estimatedValue: 10 },
      ],
    });
    expect(checks.find((check) => check.id === "probe-launcher")?.status).toBe("pass");
    expect(checks.find((check) => check.id === "probes")?.status).toBe("pass");
  });

  it("composes script and capacitor-charge checks from the fitted modules and cargo", () => {
    const checks = evaluatePreflight({
      ...base,
      option: "pve",
      contents: [
        ...base.contents,
        { itemId: 40, typeId: 40, name: "Small Capacitor Booster II", quantity: 1, locationFlag: "MedSlot0", estimatedValue: 10 },
        { itemId: 41, typeId: 41, name: "Sensor Booster II", quantity: 1, locationFlag: "MedSlot1", estimatedValue: 10 },
        { itemId: 42, typeId: 42, name: "Cap Booster 400", quantity: 8, locationFlag: "Cargo", estimatedValue: 10 },
        { itemId: 43, typeId: 43, name: "Scan Resolution Script", quantity: 2, locationFlag: "Cargo", estimatedValue: 10 },
      ],
    });
    expect(checks.find((check) => check.id === "cap-charges")?.status).toBe("pass");
    expect(checks.find((check) => check.id === "scripts")?.status).toBe("pass");
  });

  it("keeps supply readiness unknown when active-ship inventory is unavailable", () => {
    const checks = evaluatePreflight({
      ...base,
      inventoryReadable: false,
      activity: "exploration",
      option: "relic",
      contents: [],
    });
    expect(checks.find((check) => check.id === "probe-launcher")?.status).toBe("unknown");
    expect(checks.find((check) => check.id === "probes")?.status).toBe("unknown");
    expect(checks.find((check) => check.id === "analyzer")?.status).toBe("unknown");
  });

  it("tells organized fleets that doctrine wins", () => {
    const checks = evaluatePreflight({ ...base, fleetScale: "organized" });
    expect(checks.find((check) => check.id === "fleet")?.title).toContain("doctrine");
  });

  it("requires paste for an ancillary armor repairer", () => {
    const checks = evaluatePreflight({
      ...base,
      option: "pvp",
      contents: [...base.contents, { itemId: 8, typeId: 8, name: "Small Ancillary Armor Repairer", quantity: 1, locationFlag: "LoSlot1", estimatedValue: 10 }],
    });
    expect(checks.find((check) => check.id === "paste")?.status).toBe("warning");
    expect(checks.find((check) => check.id === "paste")?.title).toContain("required");
  });

  it("reports actual nanite paste quantity", () => {
    const checks = evaluatePreflight({
      ...base,
      contents: [...base.contents, { itemId: 9, typeId: 9, name: "Nanite Repair Paste", quantity: 100, locationFlag: "Cargo", estimatedValue: 10 }],
    });
    expect(checks.find((check) => check.id === "paste")?.status).toBe("pass");
    expect(checks.find((check) => check.id === "paste")?.title).toContain("100");
  });

  it("matches supplies for mixed missile and energy-beam weapons", () => {
    const checks = evaluatePreflight({
      ...base,
      contents: [
        ...base.contents,
        { itemId: 10, typeId: 10, name: "Dual Modulated Light Energy Beam I", quantity: 1, locationFlag: "HiSlot1", estimatedValue: 10 },
        { itemId: 11, typeId: 11, name: "Imperial Navy Radio S", quantity: 3, locationFlag: "Cargo", estimatedValue: 10 },
      ],
    });
    expect(checks.find((check) => check.id === "matched-ammo")?.title).toContain("2/2");
  });

  it("turns conflicting stored paste data into a manual confirmation", () => {
    const checks = evaluatePreflight({
      ...base,
      storedSupplies: [{ typeId: 28668, name: "Nanite Repair Paste", quantity: 998, location: "Amarr VIII", locationFlag: "Hangar" }],
    });
    expect(checks.find((check) => check.id === "paste")?.status).toBe("manual");
    expect(checks.find((check) => check.id === "paste")?.detail).toContain("998");
  });
});