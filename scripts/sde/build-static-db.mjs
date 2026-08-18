import { createReadStream, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

export const STATIC_DB_SCHEMA_VERSION = 1;

const REQUIRED_SKILL_ATTRIBUTES = [182, 183, 184, 1285, 1289, 1290];
const REQUIRED_LEVEL_ATTRIBUTES = [277, 278, 279, 1286, 1287, 1288];
const DATASET_FILES = [
  "categories.jsonl",
  "groups.jsonl",
  "types.jsonl",
  "typeMaterials.jsonl",
  "blueprints.jsonl",
  "typeDogma.jsonl",
];

function integer(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function number(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanInteger(value) {
  if (value === null || value === undefined) return null;
  return value ? 1 : 0;
}

export function localizedText(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  for (const key of ["en", "en-us", "en_US", "en-US"]) {
    if (typeof value[key] === "string") return value[key];
  }
  const first = Object.values(value).find((candidate) => typeof candidate === "string");
  return typeof first === "string" ? first : null;
}

function recordKey(record, ...fallbacks) {
  const candidates = [record?._key, ...fallbacks.map((key) => record?.[key])];
  for (const candidate of candidates) {
    const parsed = integer(candidate);
    if (parsed !== null) return parsed;
  }
  return null;
}

async function readJsonLines(filename, visitor) {
  if (!existsSync(filename)) throw new Error(`Required SDE dataset is missing: ${filename}`);
  const stream = createReadStream(filename, { encoding: "utf8" });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lineNumber = 0;
  for await (const line of lines) {
    lineNumber += 1;
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      await visitor(JSON.parse(trimmed), lineNumber);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${path.basename(filename)}:${lineNumber}: ${message}`);
    }
  }
}

function createSchema(db) {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = DELETE;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE sde_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE categories (
      category_id INTEGER PRIMARY KEY,
      name TEXT,
      published INTEGER
    );

    CREATE TABLE groups (
      group_id INTEGER PRIMARY KEY,
      category_id INTEGER NOT NULL,
      name TEXT,
      published INTEGER,
      FOREIGN KEY (category_id) REFERENCES categories(category_id)
    );

    CREATE TABLE types (
      type_id INTEGER PRIMARY KEY,
      group_id INTEGER NOT NULL,
      name TEXT,
      description TEXT,
      published INTEGER,
      market_group_id INTEGER,
      volume REAL,
      packaged_volume REAL,
      mass REAL,
      portion_size INTEGER,
      base_price REAL,
      FOREIGN KEY (group_id) REFERENCES groups(group_id)
    );

    CREATE TABLE type_materials (
      type_id INTEGER NOT NULL,
      material_type_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      PRIMARY KEY (type_id, material_type_id),
      FOREIGN KEY (type_id) REFERENCES types(type_id),
      FOREIGN KEY (material_type_id) REFERENCES types(type_id)
    );

    CREATE TABLE blueprints (
      blueprint_type_id INTEGER PRIMARY KEY,
      max_production_limit INTEGER,
      FOREIGN KEY (blueprint_type_id) REFERENCES types(type_id)
    );

    CREATE TABLE blueprint_activities (
      blueprint_type_id INTEGER NOT NULL,
      activity TEXT NOT NULL,
      time_seconds INTEGER,
      PRIMARY KEY (blueprint_type_id, activity),
      FOREIGN KEY (blueprint_type_id) REFERENCES blueprints(blueprint_type_id)
    );

    CREATE TABLE blueprint_materials (
      blueprint_type_id INTEGER NOT NULL,
      activity TEXT NOT NULL,
      material_type_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      PRIMARY KEY (blueprint_type_id, activity, material_type_id),
      FOREIGN KEY (blueprint_type_id, activity) REFERENCES blueprint_activities(blueprint_type_id, activity),
      FOREIGN KEY (material_type_id) REFERENCES types(type_id)
    );

    CREATE TABLE blueprint_products (
      blueprint_type_id INTEGER NOT NULL,
      activity TEXT NOT NULL,
      product_type_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      probability REAL,
      PRIMARY KEY (blueprint_type_id, activity, product_type_id),
      FOREIGN KEY (blueprint_type_id, activity) REFERENCES blueprint_activities(blueprint_type_id, activity),
      FOREIGN KEY (product_type_id) REFERENCES types(type_id)
    );

    CREATE TABLE blueprint_skills (
      blueprint_type_id INTEGER NOT NULL,
      activity TEXT NOT NULL,
      skill_type_id INTEGER NOT NULL,
      level INTEGER NOT NULL,
      PRIMARY KEY (blueprint_type_id, activity, skill_type_id),
      FOREIGN KEY (blueprint_type_id, activity) REFERENCES blueprint_activities(blueprint_type_id, activity),
      FOREIGN KEY (skill_type_id) REFERENCES types(type_id)
    );

    CREATE TABLE type_skill_requirements (
      type_id INTEGER NOT NULL,
      skill_type_id INTEGER NOT NULL,
      level INTEGER NOT NULL,
      requirement_slot INTEGER NOT NULL,
      PRIMARY KEY (type_id, requirement_slot),
      FOREIGN KEY (type_id) REFERENCES types(type_id),
      FOREIGN KEY (skill_type_id) REFERENCES types(type_id)
    );

    CREATE INDEX idx_types_group ON types(group_id);
    CREATE INDEX idx_type_materials_material ON type_materials(material_type_id);
    CREATE INDEX idx_blueprint_products_product ON blueprint_products(product_type_id);
    CREATE INDEX idx_blueprint_materials_material ON blueprint_materials(material_type_id);
    CREATE INDEX idx_blueprint_skills_skill ON blueprint_skills(skill_type_id);
    CREATE INDEX idx_type_skill_requirements_skill ON type_skill_requirements(skill_type_id);
  `);
}

function prepareStatements(db) {
  return {
    meta: db.prepare("INSERT OR REPLACE INTO sde_meta (key, value) VALUES (?, ?)"),
    category: db.prepare("INSERT INTO categories (category_id, name, published) VALUES (?, ?, ?)"),
    group: db.prepare("INSERT INTO groups (group_id, category_id, name, published) VALUES (?, ?, ?, ?)"),
    type: db.prepare(`
      INSERT INTO types (
        type_id, group_id, name, description, published, market_group_id,
        volume, packaged_volume, mass, portion_size, base_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    typeMaterial: db.prepare("INSERT INTO type_materials (type_id, material_type_id, quantity) VALUES (?, ?, ?)"),
    blueprint: db.prepare("INSERT INTO blueprints (blueprint_type_id, max_production_limit) VALUES (?, ?)"),
    activity: db.prepare("INSERT INTO blueprint_activities (blueprint_type_id, activity, time_seconds) VALUES (?, ?, ?)"),
    material: db.prepare("INSERT INTO blueprint_materials (blueprint_type_id, activity, material_type_id, quantity) VALUES (?, ?, ?, ?)"),
    product: db.prepare("INSERT INTO blueprint_products (blueprint_type_id, activity, product_type_id, quantity, probability) VALUES (?, ?, ?, ?, ?)"),
    blueprintSkill: db.prepare("INSERT INTO blueprint_skills (blueprint_type_id, activity, skill_type_id, level) VALUES (?, ?, ?, ?)"),
    typeSkill: db.prepare("INSERT INTO type_skill_requirements (type_id, skill_type_id, level, requirement_slot) VALUES (?, ?, ?, ?)"),
  };
}

async function importCategories(sourceDir, statements, counts) {
  await readJsonLines(path.join(sourceDir, "categories.jsonl"), (record) => {
    const id = recordKey(record, "categoryID");
    if (id === null) throw new Error("category has no numeric key");
    statements.category.run(id, localizedText(record.name), booleanInteger(record.published));
    counts.categories += 1;
  });
}

async function importGroups(sourceDir, statements, counts) {
  await readJsonLines(path.join(sourceDir, "groups.jsonl"), (record) => {
    const id = recordKey(record, "groupID");
    const categoryId = integer(record.categoryID ?? record.categoryId);
    if (id === null || categoryId === null) throw new Error("group is missing group/category ID");
    statements.group.run(id, categoryId, localizedText(record.name), booleanInteger(record.published));
    counts.groups += 1;
  });
}

async function importTypes(sourceDir, statements, counts) {
  await readJsonLines(path.join(sourceDir, "types.jsonl"), (record) => {
    const id = recordKey(record, "typeID");
    const groupId = integer(record.groupID ?? record.groupId);
    if (id === null || groupId === null) throw new Error("type is missing type/group ID");
    statements.type.run(
      id,
      groupId,
      localizedText(record.name),
      localizedText(record.description),
      booleanInteger(record.published),
      integer(record.marketGroupID ?? record.marketGroupId),
      number(record.volume),
      number(record.packagedVolume),
      number(record.mass),
      integer(record.portionSize),
      number(record.basePrice),
    );
    counts.types += 1;
  });
}

async function importTypeMaterials(sourceDir, statements, counts) {
  await readJsonLines(path.join(sourceDir, "typeMaterials.jsonl"), (record) => {
    const typeId = recordKey(record, "typeID");
    if (typeId === null) throw new Error("typeMaterials record has no type ID");
    const materials = Array.isArray(record.materials) ? record.materials : [];
    for (const material of materials) {
      const materialTypeId = integer(material.materialTypeID ?? material.materialTypeId ?? material.typeID ?? material.typeId);
      const quantity = integer(material.quantity);
      if (materialTypeId === null || quantity === null) throw new Error("type material is missing type ID or quantity");
      statements.typeMaterial.run(typeId, materialTypeId, quantity);
      counts.typeMaterials += 1;
    }
  });
}

async function importBlueprints(sourceDir, statements, counts) {
  await readJsonLines(path.join(sourceDir, "blueprints.jsonl"), (record) => {
    const blueprintTypeId = recordKey(record, "blueprintTypeID", "blueprintTypeId");
    if (blueprintTypeId === null) throw new Error("blueprint has no blueprint type ID");
    statements.blueprint.run(blueprintTypeId, integer(record.maxProductionLimit));
    counts.blueprints += 1;

    const activities = record.activities && typeof record.activities === "object" ? record.activities : {};
    for (const [activityName, activity] of Object.entries(activities)) {
      if (!activity || typeof activity !== "object") continue;
      statements.activity.run(blueprintTypeId, activityName, integer(activity.time));
      counts.activities += 1;

      for (const material of Array.isArray(activity.materials) ? activity.materials : []) {
        const typeId = integer(material.typeID ?? material.typeId);
        const quantity = integer(material.quantity);
        if (typeId === null || quantity === null) throw new Error(`${activityName} material is missing type ID or quantity`);
        statements.material.run(blueprintTypeId, activityName, typeId, quantity);
        counts.blueprintMaterials += 1;
      }

      for (const product of Array.isArray(activity.products) ? activity.products : []) {
        const typeId = integer(product.typeID ?? product.typeId);
        const quantity = integer(product.quantity);
        if (typeId === null || quantity === null) throw new Error(`${activityName} product is missing type ID or quantity`);
        statements.product.run(blueprintTypeId, activityName, typeId, quantity, number(product.probability));
        counts.blueprintProducts += 1;
      }

      for (const skill of Array.isArray(activity.skills) ? activity.skills : []) {
        const typeId = integer(skill.typeID ?? skill.typeId);
        const level = integer(skill.level);
        if (typeId === null || level === null) throw new Error(`${activityName} skill is missing type ID or level`);
        statements.blueprintSkill.run(blueprintTypeId, activityName, typeId, level);
        counts.blueprintSkills += 1;
      }
    }
  });
}

function dogmaAttributeMap(record) {
  const result = new Map();
  const attributes = Array.isArray(record.dogmaAttributes)
    ? record.dogmaAttributes
    : Array.isArray(record.attributes)
      ? record.attributes
      : [];
  for (const attribute of attributes) {
    const id = integer(attribute.attributeID ?? attribute.attributeId);
    const value = number(attribute.value);
    if (id !== null && value !== null) result.set(id, value);
  }
  return result;
}

async function importSkillRequirements(sourceDir, statements, counts) {
  await readJsonLines(path.join(sourceDir, "typeDogma.jsonl"), (record) => {
    const typeId = recordKey(record, "typeID");
    if (typeId === null) throw new Error("typeDogma record has no type ID");
    const attributes = dogmaAttributeMap(record);
    for (let slot = 0; slot < REQUIRED_SKILL_ATTRIBUTES.length; slot += 1) {
      const skillTypeId = integer(attributes.get(REQUIRED_SKILL_ATTRIBUTES[slot]));
      if (skillTypeId === null || skillTypeId <= 0) continue;
      const level = integer(attributes.get(REQUIRED_LEVEL_ATTRIBUTES[slot])) ?? 0;
      statements.typeSkill.run(typeId, skillTypeId, level, slot + 1);
      counts.typeSkillRequirements += 1;
    }
  });
}

export async function buildStaticDatabase({ sourceDir, outputPath, buildNumber, createdAt = new Date().toISOString() }) {
  const resolvedSource = path.resolve(sourceDir);
  const resolvedOutput = path.resolve(outputPath);
  const build = String(buildNumber ?? "").trim();
  if (!build || !/^\d+$/.test(build)) throw new Error("A numeric CCP SDE build number is required.");
  for (const file of DATASET_FILES) {
    const filename = path.join(resolvedSource, file);
    if (!existsSync(filename)) throw new Error(`Required SDE dataset is missing: ${filename}`);
  }

  mkdirSync(path.dirname(resolvedOutput), { recursive: true });
  rmSync(resolvedOutput, { force: true });
  const db = new DatabaseSync(resolvedOutput);
  const counts = {
    categories: 0,
    groups: 0,
    types: 0,
    typeMaterials: 0,
    blueprints: 0,
    activities: 0,
    blueprintMaterials: 0,
    blueprintProducts: 0,
    blueprintSkills: 0,
    typeSkillRequirements: 0,
  };

  try {
    createSchema(db);
    const statements = prepareStatements(db);
    db.exec("BEGIN IMMEDIATE;");
    try {
      statements.meta.run("schema_version", String(STATIC_DB_SCHEMA_VERSION));
      statements.meta.run("sde_build", build);
      statements.meta.run("source_format", "jsonl");
      statements.meta.run("created_at", createdAt);
      statements.meta.run("datasets", DATASET_FILES.join(","));

      await importCategories(resolvedSource, statements, counts);
      await importGroups(resolvedSource, statements, counts);
      await importTypes(resolvedSource, statements, counts);
      await importTypeMaterials(resolvedSource, statements, counts);
      await importBlueprints(resolvedSource, statements, counts);
      await importSkillRequirements(resolvedSource, statements, counts);

      db.exec("COMMIT;");
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }
    db.exec("PRAGMA optimize;");
  } finally {
    db.close();
  }

  return { outputPath: resolvedOutput, buildNumber: build, counts };
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) continue;
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for ${current}`);
    values.set(current.slice(2), next);
    index += 1;
  }
  const sourceDir = values.get("source");
  const outputPath = values.get("output") ?? path.join(process.cwd(), "data", "eve-static.db");
  const buildNumber = values.get("build");
  if (!sourceDir) throw new Error("Usage: npm run sde:build -- --source <extracted-jsonl-dir> --build <sde-build> [--output <db-path>]");
  return { sourceDir, outputPath, buildNumber };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  try {
    const result = await buildStaticDatabase(parseArguments(process.argv.slice(2)));
    console.log(`Built ${result.outputPath} from CCP SDE ${result.buildNumber}.`);
    for (const [name, count] of Object.entries(result.counts)) console.log(`${name}: ${count}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
