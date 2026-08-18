import "server-only";

import { existsSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export interface StaticDatabaseMetadata {
  schemaVersion: number;
  sdeBuild: number;
  sourceFormat: string;
  createdAt: string;
  datasets: string[];
  placeholderTypes: number;
}

export interface StaticType {
  typeId: number;
  groupId: number | null;
  name: string | null;
  description: string | null;
  published: boolean | null;
  marketGroupId: number | null;
  isPlaceholder: boolean;
}

export interface TypeSkillRequirement {
  skillTypeId: number;
  skillName: string | null;
  level: number;
  requirementSlot: number;
}

export interface ManufacturingBlueprint {
  blueprintTypeId: number;
  blueprintName: string | null;
  quantity: number;
  timeSeconds: number | null;
}

let database: DatabaseSync | undefined;
let openedPath: string | undefined;

export function staticDatabasePath(): string {
  return process.env.STATIC_DATABASE_PATH
    ? path.resolve(process.env.STATIC_DATABASE_PATH)
    : path.join(process.cwd(), "static", "eve-static.db");
}

export function staticDatabaseAvailable(): boolean {
  return existsSync(staticDatabasePath());
}

export function closeStaticDatabase(): void {
  database?.close();
  database = undefined;
  openedPath = undefined;
}

function getDatabase(): DatabaseSync {
  const filename = staticDatabasePath();
  if (database && openedPath === filename) return database;
  if (!existsSync(filename)) {
    throw new Error(`The EVE static database is not available at ${filename}. Build or install an SDE database first.`);
  }
  closeStaticDatabase();
  database = new DatabaseSync(filename);
  database.exec("PRAGMA foreign_keys = ON;");
  openedPath = filename;
  return database;
}

function metaMap(): Map<string, string> {
  const rows = getDatabase().prepare("SELECT key, value FROM sde_meta").all() as unknown as Array<{ key: string; value: string }>;
  return new Map(rows.map((row) => [row.key, row.value]));
}

export function getStaticDatabaseMetadata(): StaticDatabaseMetadata {
  const metadata = metaMap();
  const schemaVersion = Number(metadata.get("schema_version"));
  const sdeBuild = Number(metadata.get("sde_build"));
  const placeholderTypes = Number(metadata.get("placeholder_types") ?? "0");
  if (!Number.isInteger(schemaVersion) || !Number.isInteger(sdeBuild) || !Number.isInteger(placeholderTypes)) {
    throw new Error("The EVE static database metadata is missing or invalid.");
  }
  return {
    schemaVersion,
    sdeBuild,
    sourceFormat: metadata.get("source_format") ?? "unknown",
    createdAt: metadata.get("created_at") ?? "unknown",
    datasets: (metadata.get("datasets") ?? "").split(",").filter(Boolean),
    placeholderTypes,
  };
}

export function getStaticType(typeId: number): StaticType | null {
  const row = getDatabase().prepare(`
    SELECT type_id, group_id, name, description, published, market_group_id, is_placeholder
    FROM types
    WHERE type_id = ?
  `).get(typeId) as unknown as {
    type_id: number;
    group_id: number | null;
    name: string | null;
    description: string | null;
    published: number | null;
    market_group_id: number | null;
    is_placeholder: number;
  } | undefined;
  if (!row) return null;
  return {
    typeId: row.type_id,
    groupId: row.group_id,
    name: row.name,
    description: row.description,
    published: row.published === null ? null : row.published === 1,
    marketGroupId: row.market_group_id,
    isPlaceholder: row.is_placeholder === 1,
  };
}

export function getTypeSkillRequirements(typeId: number): TypeSkillRequirement[] {
  const rows = getDatabase().prepare(`
    SELECT req.skill_type_id, skill.name AS skill_name, req.level, req.requirement_slot
    FROM type_skill_requirements req
    JOIN types skill ON skill.type_id = req.skill_type_id
    WHERE req.type_id = ?
    ORDER BY req.requirement_slot
  `).all(typeId) as unknown as Array<{
    skill_type_id: number;
    skill_name: string | null;
    level: number;
    requirement_slot: number;
  }>;
  return rows.map((row) => ({
    skillTypeId: row.skill_type_id,
    skillName: row.skill_name,
    level: row.level,
    requirementSlot: row.requirement_slot,
  }));
}

export function getManufacturingBlueprintsForProduct(productTypeId: number): ManufacturingBlueprint[] {
  const rows = getDatabase().prepare(`
    SELECT product.blueprint_type_id, bp.name AS blueprint_name, product.quantity, activity.time_seconds
    FROM blueprint_products product
    JOIN blueprint_activities activity
      ON activity.blueprint_type_id = product.blueprint_type_id
     AND activity.activity = product.activity
    JOIN types bp ON bp.type_id = product.blueprint_type_id
    WHERE product.product_type_id = ? AND product.activity = 'manufacturing'
    ORDER BY bp.name, product.blueprint_type_id
  `).all(productTypeId) as unknown as Array<{
    blueprint_type_id: number;
    blueprint_name: string | null;
    quantity: number;
    time_seconds: number | null;
  }>;
  return rows.map((row) => ({
    blueprintTypeId: row.blueprint_type_id,
    blueprintName: row.blueprint_name,
    quantity: row.quantity,
    timeSeconds: row.time_seconds,
  }));
}
