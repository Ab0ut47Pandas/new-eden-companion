import { describe, expect, it } from "vitest";

import { MINING_FIT_METADATA, MINING_TASKS } from "@/lib/ships/mining-fits";

const allFits = MINING_TASKS.flatMap((task) => task.fits);

function fitById(id: string) {
  const fit = allFits.find((candidate) => candidate.id === id);
  if (!fit) throw new Error(`Missing mining fit: ${id}`);
  return fit;
}

describe("resource-specific mining fits", () => {
  it("gives every mining fit a source-backed EVE-format fitting", () => {
    expect(MINING_TASKS.length).toBeGreaterThanOrEqual(9);
    for (const task of MINING_TASKS) {
      expect(task.role).toBe("Mining");
      for (const fit of task.fits) {
        const source = MINING_FIT_METADATA[fit.id];
        expect(source, fit.id).toBeDefined();
        expect(source.sourceUrl).toMatch(/^https:\/\//);
        expect(source.validation.length).toBeGreaterThan(30);
        expect(source.eft.startsWith(`[${fit.shipName},`), fit.id).toBe(true);
      }
    }
  });

  it("uses current grouped Type A crystals for normal resource extraction", () => {
    const allEft = Object.values(MINING_FIT_METADATA).map((entry) => entry.eft).join("\n");
    expect(allEft).toContain("Simple Asteroid Mining Crystal Type A II");
    expect(allEft).toContain("Coherent Asteroid Mining Crystal Type A II");
    expect(allEft).toContain("Variegated Asteroid Mining Crystal Type A II");
    expect(allEft).toContain("Complex Asteroid Mining Crystal Type A II");
    expect(allEft).toContain("Abyssal Asteroid Mining Crystal Type A II");
    expect(allEft).toContain("Ubiquitous Moon Mining Crystal Type A II");
    expect(allEft).toContain("Exceptional Moon Mining Crystal Type A II");
    expect(allEft).not.toContain("Type C");
  });

  it("keeps Mercoxit on deep-core equipment and within Covetor calibration", () => {
    for (const id of ["mining-mercoxit-procurer", "mining-mercoxit-covetor"]) {
      const eft = MINING_FIT_METADATA[id].eft;
      expect(eft).toContain("Modulated Deep Core Strip Miner II, Mercoxit Asteroid Mining Crystal Type A II");
      expect(eft).toContain("Medium Deep Core Mining Optimization I");
      expect(fitById(id).skills).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: "Deep Core Mining", required: 2 }),
        expect.objectContaining({ name: "Mercoxit Ore Processing", required: 4 }),
      ]));
    }

    const covetor = fitById("mining-mercoxit-covetor");
    const rigs = covetor.loadout.find((section) => section.slot === "Rigs")?.items;
    expect(rigs).toEqual([
      "Medium Deep Core Mining Optimization I",
      "Medium Processor Overclocking Unit I",
    ]);
    expect(MINING_FIT_METADATA[covetor.id].eft).not.toContain("Medium Core Defense Field Extender I");
  });

  it("uses scoops on small gas ships and never pretends mining upgrades improve gas", () => {
    expect(MINING_FIT_METADATA["mining-gas-venture"].eft).toContain("Gas Cloud Scoop I");
    expect(MINING_FIT_METADATA["mining-gas-pioneer"].eft).toContain("Gas Cloud Scoop II");
    expect(MINING_FIT_METADATA["mining-gas-prospect"].eft).toContain("Gas Cloud Scoop II");
    for (const id of ["mining-gas-venture", "mining-gas-pioneer", "mining-gas-prospect"]) {
      expect(MINING_FIT_METADATA[id].eft).not.toContain("Mining Laser Upgrade");
    }
  });

  it("keeps Prismaticite on Erratic crystals and exposes the phase-anchor requirement", () => {
    const task = MINING_TASKS.find((candidate) => candidate.id === "mining-prismaticite");
    expect(task).toBeDefined();
    expect(task?.description).toContain("Erratic Ore Mining Crystal Type A II");
    expect(task?.caution).toContain("10% efficiency");
    expect(task?.caution).toContain("Mobile Phase Anchor");
    expect(task?.caution).toContain("1 Rorqual, 2 Orcas, 3 Porpoises");
    for (const fit of task?.fits ?? []) {
      expect(MINING_FIT_METADATA[fit.id].eft).toContain("Erratic Ore Mining Crystal Type A II");
      expect(fit.skills).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: "Erratic Ore Processing", required: 4 }),
      ]));
    }
  });
});
