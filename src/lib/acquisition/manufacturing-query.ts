import type { DatabaseSync } from "node:sqlite";

export interface ManufacturingTypeRef {
  typeId: number;
  name: string | null;
  isPlaceholder: boolean;
}

export interface ManufacturingMaterialRequirement extends ManufacturingTypeRef {
  quantity: number;
}

export interface ManufacturingSkillRequirement extends ManufacturingTypeRef {
  level: number;
}

export interface ManufacturingDependency {
  blueprint: ManufacturingTypeRef;
  product: ManufacturingTypeRef & { quantity: number };
  activity: {
    kind: "manufacturing";
    timeSeconds: number | null;
    materials: ManufacturingMaterialRequirement[];
    skills: ManufacturingSkillRequirement[];
  };
}

type ProductRow = {
  blueprint_type_id: number;
  blueprint_name: string | null;
  blueprint_is_placeholder: number;
  product_type_id: number;
  product_name: string | null;
  product_is_placeholder: number;
  quantity: number;
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

export function queryManufacturingDependenciesForProduct(db: DatabaseSync, productTypeId: number): ManufacturingDependency[] {
  const productRows = db.prepare(`
    SELECT
      product.blueprint_type_id,
      blueprint.name AS blueprint_name,
      blueprint.is_placeholder AS blueprint_is_placeholder,
      product.product_type_id,
      target.name AS product_name,
      target.is_placeholder AS product_is_placeholder,
      product.quantity,
      activity.time_seconds
    FROM blueprint_products product
    JOIN blueprint_activities activity
      ON activity.blueprint_type_id = product.blueprint_type_id
     AND activity.activity = product.activity
    JOIN types blueprint ON blueprint.type_id = product.blueprint_type_id
    JOIN types target ON target.type_id = product.product_type_id
    WHERE product.product_type_id = ?
      AND product.activity = 'manufacturing'
    ORDER BY
      CASE WHEN blueprint.name IS NULL THEN 1 ELSE 0 END,
      blueprint.name COLLATE NOCASE,
      product.blueprint_type_id
  `).all(productTypeId) as unknown as ProductRow[];

  const materialStatement = db.prepare(`
    SELECT
      material.material_type_id,
      type.name AS material_name,
      type.is_placeholder AS material_is_placeholder,
      material.quantity
    FROM blueprint_materials material
    JOIN types type ON type.type_id = material.material_type_id
    WHERE material.blueprint_type_id = ?
      AND material.activity = 'manufacturing'
    ORDER BY
      CASE WHEN type.name IS NULL THEN 1 ELSE 0 END,
      type.name COLLATE NOCASE,
      material.material_type_id
  `);

  const skillStatement = db.prepare(`
    SELECT
      skill.skill_type_id,
      type.name AS skill_name,
      type.is_placeholder AS skill_is_placeholder,
      skill.level
    FROM blueprint_skills skill
    JOIN types type ON type.type_id = skill.skill_type_id
    WHERE skill.blueprint_type_id = ?
      AND skill.activity = 'manufacturing'
    ORDER BY
      CASE WHEN type.name IS NULL THEN 1 ELSE 0 END,
      type.name COLLATE NOCASE,
      skill.skill_type_id
  `);

  return productRows.map((row) => {
    const materials = materialStatement.all(row.blueprint_type_id) as unknown as MaterialRow[];
    const skills = skillStatement.all(row.blueprint_type_id) as unknown as SkillRow[];

    return {
      blueprint: {
        typeId: row.blueprint_type_id,
        name: row.blueprint_name,
        isPlaceholder: row.blueprint_is_placeholder === 1,
      },
      product: {
        typeId: row.product_type_id,
        name: row.product_name,
        isPlaceholder: row.product_is_placeholder === 1,
        quantity: row.quantity,
      },
      activity: {
        kind: "manufacturing",
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
      },
    };
  });
}
