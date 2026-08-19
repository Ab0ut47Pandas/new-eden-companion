import type { DatabaseSync } from "node:sqlite";

export type AdvancedIndustryActivityKind = "invention" | "reaction";

export interface AdvancedIndustryTypeRef {
  typeId: number;
  name: string | null;
  isPlaceholder: boolean;
}

export interface AdvancedIndustryMaterial extends AdvancedIndustryTypeRef {
  quantity: number;
}

export interface AdvancedIndustrySkill extends AdvancedIndustryTypeRef {
  level: number;
}

export interface AdvancedIndustryProduct extends AdvancedIndustryTypeRef {
  quantity: number;
  probability: number | null;
}

export interface AdvancedIndustryActivity {
  source: AdvancedIndustryTypeRef & { maxProductionLimit: number | null };
  kind: AdvancedIndustryActivityKind;
  timeSeconds: number | null;
  materials: AdvancedIndustryMaterial[];
  skills: AdvancedIndustrySkill[];
  products: AdvancedIndustryProduct[];
}

type ActivityRow = {
  blueprint_type_id: number;
  source_name: string | null;
  source_is_placeholder: number;
  max_production_limit: number | null;
  activity: AdvancedIndustryActivityKind;
  time_seconds: number | null;
};

type MaterialRow = {
  material_type_id: number;
  material_name: string | null;
  material_is_placeholder: number;
  quantity: number;
};

type SkillRow = {
  skill_type_id: number;
  skill_name: string | null;
  skill_is_placeholder: number;
  level: number;
};

type ProductRow = {
  product_type_id: number;
  product_name: string | null;
  product_is_placeholder: number;
  quantity: number;
  probability: number | null;
};

function activityFromRow(db: DatabaseSync, row: ActivityRow): AdvancedIndustryActivity {
  const materials = db.prepare(`
    SELECT
      material.material_type_id,
      type.name AS material_name,
      type.is_placeholder AS material_is_placeholder,
      material.quantity
    FROM blueprint_materials material
    JOIN types type ON type.type_id = material.material_type_id
    WHERE material.blueprint_type_id = ? AND material.activity = ?
    ORDER BY CASE WHEN type.name IS NULL THEN 1 ELSE 0 END, type.name COLLATE NOCASE, material.material_type_id
  `).all(row.blueprint_type_id, row.activity) as unknown as MaterialRow[];

  const skills = db.prepare(`
    SELECT
      skill.skill_type_id,
      type.name AS skill_name,
      type.is_placeholder AS skill_is_placeholder,
      skill.level
    FROM blueprint_skills skill
    JOIN types type ON type.type_id = skill.skill_type_id
    WHERE skill.blueprint_type_id = ? AND skill.activity = ?
    ORDER BY CASE WHEN type.name IS NULL THEN 1 ELSE 0 END, type.name COLLATE NOCASE, skill.skill_type_id
  `).all(row.blueprint_type_id, row.activity) as unknown as SkillRow[];

  const products = db.prepare(`
    SELECT
      product.product_type_id,
      type.name AS product_name,
      type.is_placeholder AS product_is_placeholder,
      product.quantity,
      product.probability
    FROM blueprint_products product
    JOIN types type ON type.type_id = product.product_type_id
    WHERE product.blueprint_type_id = ? AND product.activity = ?
    ORDER BY CASE WHEN type.name IS NULL THEN 1 ELSE 0 END, type.name COLLATE NOCASE, product.product_type_id
  `).all(row.blueprint_type_id, row.activity) as unknown as ProductRow[];

  return {
    source: {
      typeId: row.blueprint_type_id,
      name: row.source_name,
      isPlaceholder: row.source_is_placeholder === 1,
      maxProductionLimit: row.max_production_limit,
    },
    kind: row.activity,
    timeSeconds: row.time_seconds,
    materials: materials.map((material) => ({
      typeId: material.material_type_id,
      name: material.material_name,
      isPlaceholder: material.material_is_placeholder === 1,
      quantity: material.quantity,
    })),
    skills: skills.map((skill) => ({
      typeId: skill.skill_type_id,
      name: skill.skill_name,
      isPlaceholder: skill.skill_is_placeholder === 1,
      level: skill.level,
    })),
    products: products.map((product) => ({
      typeId: product.product_type_id,
      name: product.product_name,
      isPlaceholder: product.product_is_placeholder === 1,
      quantity: product.quantity,
      probability: product.probability,
    })),
  };
}

function activityRowsForSource(db: DatabaseSync, sourceTypeId: number): ActivityRow[] {
  return db.prepare(`
    SELECT
      activity.blueprint_type_id,
      type.name AS source_name,
      type.is_placeholder AS source_is_placeholder,
      bp.max_production_limit,
      activity.activity,
      activity.time_seconds
    FROM blueprint_activities activity
    JOIN blueprints bp ON bp.blueprint_type_id = activity.blueprint_type_id
    JOIN types type ON type.type_id = activity.blueprint_type_id
    WHERE activity.blueprint_type_id = ? AND activity.activity IN ('invention', 'reaction')
    ORDER BY CASE activity.activity WHEN 'invention' THEN 0 ELSE 1 END
  `).all(sourceTypeId) as unknown as ActivityRow[];
}

function activityRowsForProduct(db: DatabaseSync, productTypeId: number): ActivityRow[] {
  return db.prepare(`
    SELECT DISTINCT
      activity.blueprint_type_id,
      type.name AS source_name,
      type.is_placeholder AS source_is_placeholder,
      bp.max_production_limit,
      activity.activity,
      activity.time_seconds
    FROM blueprint_products product
    JOIN blueprint_activities activity
      ON activity.blueprint_type_id = product.blueprint_type_id
     AND activity.activity = product.activity
    JOIN blueprints bp ON bp.blueprint_type_id = activity.blueprint_type_id
    JOIN types type ON type.type_id = activity.blueprint_type_id
    WHERE product.product_type_id = ? AND product.activity IN ('invention', 'reaction')
    ORDER BY CASE activity.activity WHEN 'invention' THEN 0 ELSE 1 END,
      CASE WHEN type.name IS NULL THEN 1 ELSE 0 END,
      type.name COLLATE NOCASE,
      activity.blueprint_type_id
  `).all(productTypeId) as unknown as ActivityRow[];
}

export function queryAdvancedIndustryActivitiesForSource(db: DatabaseSync, sourceTypeId: number): AdvancedIndustryActivity[] {
  return activityRowsForSource(db, sourceTypeId).map((row) => activityFromRow(db, row));
}

export function queryAdvancedIndustryActivitiesForProduct(db: DatabaseSync, productTypeId: number): AdvancedIndustryActivity[] {
  return activityRowsForProduct(db, productTypeId).map((row) => activityFromRow(db, row));
}
