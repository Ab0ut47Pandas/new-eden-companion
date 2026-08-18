import { describe, expect, it } from "vitest";

import { ABYSSAL_FIT_METADATA, ABYSSAL_TASKS } from "@/lib/ships/abyssal-fits";

describe("vetted Abyssal fit library", () => {
  it("defines a conservative researched tier progression", () => {
    expect(ABYSSAL_TASKS.map((task) => task.id)).toEqual([
      "abyssal-vetted-t0-frigate",
      "abyssal-vetted-t1-frigate",
      "abyssal-vetted-t3-cruiser",
      "abyssal-vetted-t4-cruiser",
    ]);

    expect(ABYSSAL_TASKS[0].fits.map((fit) => fit.shipName)).toEqual([
      "Punisher",
      "Kestrel",
      "Rifter",
      "Tristan",
    ]);
  });

  it("ships every vetted fit with attribution and importable EVE fitting text", () => {
    for (const fit of ABYSSAL_TASKS.flatMap((task) => task.fits)) {
      const metadata = ABYSSAL_FIT_METADATA[fit.id];
      expect(metadata).toBeDefined();
      expect(metadata.sourceUrl).toMatch(/^https:\/\//);
      expect(metadata.validation.length).toBeGreaterThan(30);
      expect(metadata.eft).toContain(`[${fit.shipName},`);
    }
  });

  it("does not silently promote the passive Gamma Gila to T4", () => {
    const t3 = ABYSSAL_TASKS.find((task) => task.id === "abyssal-vetted-t3-cruiser");
    const t4 = ABYSSAL_TASKS.find((task) => task.id === "abyssal-vetted-t4-cruiser");

    expect(t3?.fits[0].name).toContain("T3");
    expect(t3?.caution).toContain("T4");
    expect(t4?.fits[0].name).toContain("Electrical");
    expect(t4?.fits[0].loadout.flatMap((section) => section.items)).toContain(
      "2× Pithum C-Type Medium Shield Booster",
    );
  });
});
