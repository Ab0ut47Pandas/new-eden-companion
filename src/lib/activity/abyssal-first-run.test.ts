import { describe, expect, it } from "vitest";

import {
  buildAbyssalFirstRunDefinition,
  buildAbyssalFirstRunPackage,
  getAbyssalFirstRunOption,
  listAbyssalFirstRunOptions,
} from "./abyssal-first-run";

describe("Abyssal first-run briefing", () => {
  it("exposes the existing vetted T0 and T1 frigate options without promoting higher-tier fits", () => {
    const options = listAbyssalFirstRunOptions();
    expect(options).toHaveLength(6);
    expect(options.map((option) => option.tier)).toEqual([0, 0, 0, 0, 1, 1]);
    expect(options.some((option) => option.shipName === "Gila")).toBe(false);
    expect(options.every((option) => option.sourceUrl)).toBe(true);
    expect(options.every((option) => option.shipTypeId > 0)).toBe(true);
    expect(options.every((option) => option.eft.startsWith("["))).toBe(true);
  });

  it("keeps the fit-specific filament weather and supplies in the briefing", () => {
    const option = getAbyssalFirstRunOption("abyss-kestrel-t0-dark-community");
    expect(option).not.toBeNull();
    expect(option).toMatchObject({ tier: 0, weather: "dark", shipName: "Kestrel", shipTypeId: 602 });

    const definition = buildAbyssalFirstRunDefinition(option!);
    const supplies = definition.whatToBring.map((entry) => entry.label).join(" | ");
    expect(supplies).toMatch(/Tranquil Dark Filament ×3/);
    expect(supplies).toMatch(/Inferno Rocket/);
    expect(supplies).toMatch(/Nanite Repair Paste/);
    expect(definition.whatToBring[0].detail).toMatch(/Copy EVE fit/i);
    expect(definition.whatToBring[0].detail).not.toMatch(/Ballistic Control System/);
  });

  it("teaches the three-pocket gate flow and explicit 20-minute deadline", () => {
    const option = getAbyssalFirstRunOption("abyss-punisher-t0-electrical-community")!;
    const definition = buildAbyssalFirstRunDefinition(option);
    expect(definition.whatItIs).toMatch(/three-pocket/i);
    expect(definition.whatToDo).toHaveLength(4);
    expect(definition.whatToDo[0].label).toMatch(/20 minutes/i);
    expect(definition.whatToDo[3].label).toMatch(/Origin Gate/i);
  });

  it("uses current activation guidance for T0 versus T1", () => {
    const t0 = buildAbyssalFirstRunDefinition(getAbyssalFirstRunOption("abyss-kestrel-t0-dark-community")!);
    const t1 = buildAbyssalFirstRunDefinition(getAbyssalFirstRunOption("abyss-hookbill-t1-dark")!);
    expect(t0.howToStart[0].label).toMatch(/T0 filaments are also currently permitted in 0\.9 and 1\.0/i);
    expect(t1.howToStart[0].label).toMatch(/0\.8 security or lower/i);
    expect(t1.howToStart[0].label).toMatch(/do not permit filaments above T0 in 0\.9/i);
  });

  it("shows the main cache directly and only adds optional side nodes from T1", () => {
    const t0 = buildAbyssalFirstRunDefinition(getAbyssalFirstRunOption("abyss-kestrel-t0-dark-community")!);
    const t1 = buildAbyssalFirstRunDefinition(getAbyssalFirstRunOption("abyss-hookbill-t1-dark")!);
    expect(t0.lootKeepSell.map((entry) => entry.id)).toEqual(["main-cache"]);
    expect(t0.lootKeepSell[0].label).toMatch(/Bioadaptive Cache/i);
    expect(t1.lootKeepSell.map((entry) => entry.id)).toEqual(["main-cache", "extraction-node", "extraction-subnode"]);
    expect(t1.lootKeepSell[1].label).toMatch(/Optional at T1/i);
  });

  it("states timer, boundary, ship-loss, and disconnect failure conditions", () => {
    const definition = buildAbyssalFirstRunDefinition(getAbyssalFirstRunOption("abyss-worm-t1-electrical-a2o")!);
    expect(definition.failureConditions.map((entry) => entry.id)).toEqual([
      "timeout",
      "boundary",
      "ship-loss",
      "disconnect",
    ]);
  });

  it("builds both the full briefing and compact cheat sheet from one definition", () => {
    const option = getAbyssalFirstRunOption("abyss-tristan-t0-electrical-a2o")!;
    const result = buildAbyssalFirstRunPackage(option);
    expect(result.briefing.id).toContain(option.id);
    expect(result.briefing.readiness).toBeNull();
    expect(result.cheatSheet.readinessStatus).toBe("not-assessed");
    expect(result.cheatSheet.sections.find((section) => section.key === "execute")?.entries).toHaveLength(4);
  });

  it("returns null for unsupported fits rather than silently substituting another ship", () => {
    expect(getAbyssalFirstRunOption("abyss-gila-t4-electrical-active")).toBeNull();
    expect(getAbyssalFirstRunOption("not-a-fit")).toBeNull();
  });
});
