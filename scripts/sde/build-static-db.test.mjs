import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { buildStaticDatabase, STATIC_DB_SCHEMA_VERSION } from "./build-static-db.mjs";

const tempRoots = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function writeJsonl(directory, filename, records) {
  writeFileSync(path.join(directory, filename), `${records.map((record) => JSON.stringify(record)).join("\n")}\n`, "utf8");
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "nec-sde-test-"));
  tempRoots.push(root);
  const sourceDir = path.join(root, "jsonl");
  mkdirSync(sourceDir);

  writeJsonl(sourceDir, "categories.jsonl", [
    { _key: 4, name: { en: "Material" }, published: true },
    { _key: 6, name: { en: "Ship" }, published: true },
    { _key: 9, name: { en: "Blueprint" }, published: true },
    { _key: 16, name: { en: "Skill" }, published: true },
  ]);
  writeJsonl(sourceDir, "groups.jsonl", [
    { _key: 18, categoryID: 4, name: { en: "Mineral" }, published: true },
    { _key: 25, categoryID: 6, name: { en: "Frigate" }, published: true },
    { _key: 105, categoryID: 9, name: { en: "Frigate Blueprint" }, published: true },
    { _key: 257, categoryID: 16, name: { en: "Spaceship Command" }, published: true },
  ]);
  writeJsonl(sourceDir, "types.jsonl", [
    { _key: 34, groupID: 18, name: { en: "Tritanium" }, published: true, portionSize: 1 },
    { _key: 587, groupID: 25, name: { en: "Rifter" }, description: { en: "Test frigate" }, published: true, volume: 27289 },
    { _key: 1000, groupID: 105, name: { en: "Rifter Blueprint" }, published: true },
    { _key: 3328, groupID: 257, name: { en: "Minmatar Frigate" }, published: true },
    { _key: 3380, groupID: 257, name: { en: "Industry" }, published: true },
  ]);
  writeJsonl(sourceDir, "typeMaterials.jsonl", [
    { _key: 587, materials: [{ materialTypeID: 34, quantity: 1000 }] },
  ]);
  writeJsonl(sourceDir, "blueprints.jsonl", [
    {
      _key: 1000,
      maxProductionLimit: 10,
      activities: {
        manufacturing: {
          time: 120,
          materials: [{ typeID: 34, quantity: 21111 }],
          products: [{ typeID: 587, quantity: 1 }],
          skills: [{ typeID: 3380, level: 1 }],
        },
      },
    },
  ]);
  writeJsonl(sourceDir, "typeDogma.jsonl", [
    {
      _key: 587,
      dogmaAttributes: [
        { attributeID: 182, value: 3328 },
        { attributeID: 277, value: 3 },
      ],
    },
    { _key: 34, dogmaAttributes: [] },
    { _key: 1000, dogmaAttributes: [] },
    { _key: 3328, dogmaAttributes: [] },
    { _key: 3380, dogmaAttributes: [] },
  ]);

  return { root, sourceDir, outputPath: path.join(root, "eve-static.db") };
}

describe("SDE static database importer", () => {
  it("builds a versioned SQLite graph for types, blueprints, materials, and skills", async () => {
    const { sourceDir, outputPath } = fixture();
    const result = await buildStaticDatabase({
      sourceDir,
      outputPath,
      buildNumber: 3424810,
      createdAt: "2026-07-07T00:00:00.000Z",
    });

    expect(result.counts).toMatchObject({
      categories: 4,
      groups: 4,
      types: 5,
      typeMaterials: 1,
      blueprints: 1,
      activities: 1,
      blueprintMaterials: 1,
      blueprintProducts: 1,
      blueprintSkills: 1,
      typeSkillRequirements: 1,
    });

    const db = new DatabaseSync(outputPath);
    try {
      const metadata = Object.fromEntries(
        db.prepare("SELECT key, value FROM sde_meta").all().map((row) => [row.key, row.value]),
      );
      expect(metadata).toMatchObject({
        schema_version: String(STATIC_DB_SCHEMA_VERSION),
        sde_build: "3424810",
        source_format: "jsonl",
      });

      const production = db.prepare(`
        SELECT bp.name AS blueprint, product.name AS product, material.name AS material,
               bm.quantity AS material_quantity, bs.level AS industry_level
        FROM blueprint_products bprod
        JOIN types product ON product.type_id = bprod.product_type_id
        JOIN types bp ON bp.type_id = bprod.blueprint_type_id
        JOIN blueprint_materials bm
          ON bm.blueprint_type_id = bprod.blueprint_type_id AND bm.activity = bprod.activity
        JOIN types material ON material.type_id = bm.material_type_id
        JOIN blueprint_skills bs
          ON bs.blueprint_type_id = bprod.blueprint_type_id AND bs.activity = bprod.activity
        WHERE bprod.product_type_id = 587 AND bprod.activity = 'manufacturing'
      `).get();
      expect(production).toEqual({
        blueprint: "Rifter Blueprint",
        product: "Rifter",
        material: "Tritanium",
        material_quantity: 21111,
        industry_level: 1,
      });

      const requirement = db.prepare(`
        SELECT skill.name AS skill, req.level
        FROM type_skill_requirements req
        JOIN types skill ON skill.type_id = req.skill_type_id
        WHERE req.type_id = 587
      `).get();
      expect(requirement).toEqual({ skill: "Minmatar Frigate", level: 3 });

      const reprocessing = db.prepare(`
        SELECT material.name, tm.quantity
        FROM type_materials tm
        JOIN types material ON material.type_id = tm.material_type_id
        WHERE tm.type_id = 587
      `).get();
      expect(reprocessing).toEqual({ name: "Tritanium", quantity: 1000 });
    } finally {
      db.close();
    }
  });

  it("refuses to build without a real SDE build number", async () => {
    const { sourceDir, outputPath } = fixture();
    await expect(buildStaticDatabase({ sourceDir, outputPath, buildNumber: "latest" }))
      .rejects.toThrow("numeric CCP SDE build number");
  });

  it("fails before replacing anything when a required dataset is missing", async () => {
    const { sourceDir, outputPath } = fixture();
    rmSync(path.join(sourceDir, "blueprints.jsonl"));
    writeFileSync(outputPath, "known-good", "utf8");

    await expect(buildStaticDatabase({ sourceDir, outputPath, buildNumber: 3424810 }))
      .rejects.toThrow("blueprints.jsonl");
    expect(readFileSync(outputPath, "utf8")).toBe("known-good");
  });
});
