import type { DatabaseSync } from "node:sqlite";

export interface ReverseUseTypeRef {
  typeId: number;
  name: string | null;
  isPlaceholder: boolean;
}

export interface ReverseUseProduct extends ReverseUseTypeRef {
  quantity: number;
}

export interface ReverseUse {
  role: "material" | "blueprint";
  blueprint: ReverseUseTypeRef;
  activity: string;
  inputQuantity: number | null;
  products: ReverseUseProduct[];
}

type MaterialUseRow = {
  blueprint_type_id: number;
  blueprint_name: string | null;
  blueprint_is_placeholder: number;
  activity: string;
  input_quantity: number;
};

type BlueprintUseRow = {
  blueprint_type_id: number;
  blueprint_name: string | null;
  blueprint_is_placeholder: number;
  activity: string;
};

type ProductRow = {
  product_type_id: number;
  product_name: string | null;
  product_is_placeholder: number;
  quantity: number;
};

function productsForActivity(db: DatabaseSync, blueprintTypeId: number, activity: string): ReverseUseProduct[] {
  const rows = db.prepare(`
    SELECT
      product.product_type_id,
      type.name AS product_name,
      type.is_placeholder AS product_is_placeholder,
      product.quantity
    FROM blueprint_products product
    JOIN types type ON type.type_id = product.product_type_id
    WHERE product.blueprint_type_id = ?
      AND product.activity = ?
    ORDER BY
      CASE WHEN type.name IS NULL THEN 1 ELSE 0 END,
      type.name COLLATE NOCASE,
      product.product_type_id
  `).all(blueprintTypeId, activity) as unknown as ProductRow[];

  return rows.map((row) => ({
    typeId: row.product_type_id,
    name: row.product_name,
    isPlaceholder: row.product_is_placeholder === 1,
    quantity: row.quantity,
  }));
}

/**
 * Answers "What is this used for?" using only relationships present in the
 * installed SDE. A type can be used either as an activity material or as the
 * blueprint that defines an activity. Activities without products are omitted
 * because this query follows the material -> blueprint/activity -> product
 * relationship in reverse rather than guessing at unsupported purposes.
 */
export function queryReverseUsesForType(db: DatabaseSync, typeId: number): ReverseUse[] {
  const materialRows = db.prepare(`
    SELECT
      material.blueprint_type_id,
      blueprint.name AS blueprint_name,
      blueprint.is_placeholder AS blueprint_is_placeholder,
      material.activity,
      material.quantity AS input_quantity
    FROM blueprint_materials material
    JOIN types blueprint ON blueprint.type_id = material.blueprint_type_id
    WHERE material.material_type_id = ?
      AND EXISTS (
        SELECT 1
        FROM blueprint_products product
        WHERE product.blueprint_type_id = material.blueprint_type_id
          AND product.activity = material.activity
      )
    ORDER BY
      CASE WHEN blueprint.name IS NULL THEN 1 ELSE 0 END,
      blueprint.name COLLATE NOCASE,
      material.blueprint_type_id,
      material.activity COLLATE NOCASE
  `).all(typeId) as unknown as MaterialUseRow[];

  const blueprintRows = db.prepare(`
    SELECT DISTINCT
      product.blueprint_type_id,
      blueprint.name AS blueprint_name,
      blueprint.is_placeholder AS blueprint_is_placeholder,
      product.activity
    FROM blueprint_products product
    JOIN types blueprint ON blueprint.type_id = product.blueprint_type_id
    WHERE product.blueprint_type_id = ?
    ORDER BY
      product.activity COLLATE NOCASE
  `).all(typeId) as unknown as BlueprintUseRow[];

  const materialUses: ReverseUse[] = materialRows.map((row) => ({
    role: "material",
    blueprint: {
      typeId: row.blueprint_type_id,
      name: row.blueprint_name,
      isPlaceholder: row.blueprint_is_placeholder === 1,
    },
    activity: row.activity,
    inputQuantity: row.input_quantity,
    products: productsForActivity(db, row.blueprint_type_id, row.activity),
  }));

  const blueprintUses: ReverseUse[] = blueprintRows.map((row) => ({
    role: "blueprint",
    blueprint: {
      typeId: row.blueprint_type_id,
      name: row.blueprint_name,
      isPlaceholder: row.blueprint_is_placeholder === 1,
    },
    activity: row.activity,
    inputQuantity: null,
    products: productsForActivity(db, row.blueprint_type_id, row.activity),
  }));

  return [...materialUses, ...blueprintUses].sort((left, right) => {
    const leftName = left.blueprint.name;
    const rightName = right.blueprint.name;
    if (leftName === null && rightName !== null) return 1;
    if (leftName !== null && rightName === null) return -1;
    if (leftName !== null && rightName !== null) {
      const nameOrder = leftName.localeCompare(rightName, undefined, { sensitivity: "base" });
      if (nameOrder !== 0) return nameOrder;
    }
    if (left.blueprint.typeId !== right.blueprint.typeId) return left.blueprint.typeId - right.blueprint.typeId;
    const activityOrder = left.activity.localeCompare(right.activity, undefined, { sensitivity: "base" });
    if (activityOrder !== 0) return activityOrder;
    return left.role.localeCompare(right.role);
  });
}
