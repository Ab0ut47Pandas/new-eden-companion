import type { DatabaseSync } from "node:sqlite";

export type StaticItemKind =
  | "placeholder"
  | "blueprint"
  | "ship"
  | "module"
  | "skill"
  | "commodity"
  | "material"
  | "other";

export interface StaticItemIdentity {
  typeId: number;
  name: string | null;
  groupId: number | null;
  groupName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  published: boolean | null;
  marketGroupId: number | null;
  isPlaceholder: boolean;
  kinds: StaticItemKind[];
}

export interface StaticItemSearchOptions {
  limit?: number;
}

interface IdentityRow {
  type_id: number;
  name: string | null;
  group_id: number | null;
  group_name: string | null;
  category_id: number | null;
  category_name: string | null;
  published: number | null;
  market_group_id: number | null;
  is_placeholder: number;
  is_blueprint: number;
  is_material: number;
}

const IDENTITY_SELECT = `
  SELECT
    type.type_id,
    type.name,
    type.group_id,
    grp.name AS group_name,
    category.category_id,
    category.name AS category_name,
    type.published,
    type.market_group_id,
    type.is_placeholder,
    EXISTS (
      SELECT 1 FROM blueprints blueprint
      WHERE blueprint.blueprint_type_id = type.type_id
    ) AS is_blueprint,
    (
      EXISTS (
        SELECT 1 FROM blueprint_materials material
        WHERE material.material_type_id = type.type_id
      )
      OR EXISTS (
        SELECT 1 FROM type_materials material
        WHERE material.material_type_id = type.type_id
      )
    ) AS is_material
  FROM types type
  LEFT JOIN groups grp ON grp.group_id = type.group_id
  LEFT JOIN categories category ON category.category_id = grp.category_id
`;

function normalized(value: string | null): string {
  return value?.trim().toLocaleLowerCase("en-US") ?? "";
}

function classify(row: IdentityRow): StaticItemKind[] {
  if (row.is_placeholder === 1) return ["placeholder"];

  const category = normalized(row.category_name);
  const group = normalized(row.group_name);
  const kinds: StaticItemKind[] = [];

  if (row.is_blueprint === 1 || category === "blueprint") kinds.push("blueprint");
  if (category === "ship") kinds.push("ship");
  if (category === "module") kinds.push("module");
  if (category === "skill") kinds.push("skill");
  if (category.includes("commodit") || group.includes("commodit")) kinds.push("commodity");
  if (row.is_material === 1 || category === "material") kinds.push("material");

  if (kinds.length === 0) kinds.push("other");
  return kinds;
}

function mapRow(row: IdentityRow): StaticItemIdentity {
  return {
    typeId: row.type_id,
    name: row.name,
    groupId: row.group_id,
    groupName: row.group_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    published: row.published === null ? null : row.published === 1,
    marketGroupId: row.market_group_id,
    isPlaceholder: row.is_placeholder === 1,
    kinds: classify(row),
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function normalizedLimit(limit: number | undefined): number {
  if (limit === undefined) return 30;
  if (!Number.isFinite(limit)) return 30;
  return Math.min(100, Math.max(1, Math.trunc(limit)));
}

export function queryStaticItemIdentity(db: DatabaseSync, typeId: number): StaticItemIdentity | null {
  const row = db.prepare(`${IDENTITY_SELECT}\nWHERE type.type_id = ?`).get(typeId) as unknown as IdentityRow | undefined;
  return row ? mapRow(row) : null;
}

export function searchStaticItems(
  db: DatabaseSync,
  searchText: string,
  options: StaticItemSearchOptions = {},
): StaticItemIdentity[] {
  const query = searchText.trim();
  if (!query) return [];

  const escaped = escapeLike(query);
  const contains = `%${escaped}%`;
  const prefix = `${escaped}%`;
  const limit = normalizedLimit(options.limit);

  const rows = db.prepare(`
    ${IDENTITY_SELECT}
    WHERE
      type.name LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR grp.name LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR category.name LIKE ? ESCAPE '\\' COLLATE NOCASE
    ORDER BY
      CASE
        WHEN type.name = ? COLLATE NOCASE THEN 0
        WHEN type.name LIKE ? ESCAPE '\\' COLLATE NOCASE THEN 1
        WHEN grp.name = ? COLLATE NOCASE THEN 2
        WHEN category.name = ? COLLATE NOCASE THEN 3
        ELSE 4
      END,
      CASE WHEN type.published = 1 THEN 0 ELSE 1 END,
      type.is_placeholder,
      type.name COLLATE NOCASE,
      type.type_id
    LIMIT ?
  `).all(contains, contains, contains, query, prefix, query, query, limit) as unknown as IdentityRow[];

  return rows.map(mapRow);
}
