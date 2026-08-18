import type { DatabaseSync } from "node:sqlite";

import {
  queryManufacturingDependenciesForProduct,
  type ManufacturingDependency,
  type ManufacturingMaterialRequirement,
  type ManufacturingTypeRef,
} from "./manufacturing-query";

export type RecursiveManufacturingState =
  | "manufacturable"
  | "not-manufacturable"
  | "cycle"
  | "depth-limit"
  | "unknown-type";

export interface RecursiveManufacturingMaterial {
  requirement: ManufacturingMaterialRequirement;
  dependency: RecursiveManufacturingNode;
}

export interface RecursiveManufacturingAlternative {
  blueprint: ManufacturingDependency["blueprint"];
  product: ManufacturingDependency["product"];
  activity: Omit<ManufacturingDependency["activity"], "materials"> & {
    materials: RecursiveManufacturingMaterial[];
  };
}

export interface RecursiveManufacturingNode {
  item: ManufacturingTypeRef | null;
  typeId: number;
  depth: number;
  state: RecursiveManufacturingState;
  alternatives: RecursiveManufacturingAlternative[];
}

export interface RecursiveManufacturingOptions {
  maxDepth?: number;
}

type TypeRow = {
  type_id: number;
  name: string | null;
  is_placeholder: number;
};

const DEFAULT_MAX_DEPTH = 12;

function queryTypeRef(db: DatabaseSync, typeId: number): ManufacturingTypeRef | null {
  const row = db
    .prepare(`
      SELECT type_id, name, is_placeholder
      FROM types
      WHERE type_id = ?
    `)
    .get(typeId) as TypeRow | undefined;

  if (!row) return null;

  return {
    typeId: row.type_id,
    name: row.name,
    isPlaceholder: row.is_placeholder === 1,
  };
}

function normalizeMaxDepth(maxDepth: number | undefined): number {
  if (maxDepth === undefined) return DEFAULT_MAX_DEPTH;
  if (!Number.isInteger(maxDepth) || maxDepth < 0) {
    throw new RangeError("maxDepth must be a non-negative integer.");
  }
  return maxDepth;
}

export function expandManufacturingDependencies(
  db: DatabaseSync,
  productTypeId: number,
  options: RecursiveManufacturingOptions = {},
): RecursiveManufacturingNode {
  const maxDepth = normalizeMaxDepth(options.maxDepth);

  function expand(typeId: number, depth: number, path: ReadonlySet<number>, knownItem?: ManufacturingTypeRef): RecursiveManufacturingNode {
    const item = knownItem ?? queryTypeRef(db, typeId);
    if (!item) {
      return { item: null, typeId, depth, state: "unknown-type", alternatives: [] };
    }

    if (path.has(typeId)) {
      return { item, typeId, depth, state: "cycle", alternatives: [] };
    }

    const dependencies = queryManufacturingDependenciesForProduct(db, typeId);
    if (dependencies.length === 0) {
      return { item, typeId, depth, state: "not-manufacturable", alternatives: [] };
    }

    if (depth >= maxDepth) {
      return { item, typeId, depth, state: "depth-limit", alternatives: [] };
    }

    const nextPath = new Set(path);
    nextPath.add(typeId);

    return {
      item,
      typeId,
      depth,
      state: "manufacturable",
      alternatives: dependencies.map((dependency) => ({
        blueprint: dependency.blueprint,
        product: dependency.product,
        activity: {
          kind: dependency.activity.kind,
          timeSeconds: dependency.activity.timeSeconds,
          skills: dependency.activity.skills,
          materials: dependency.activity.materials.map((material) => ({
            requirement: material,
            dependency: expand(material.typeId, depth + 1, nextPath, material),
          })),
        },
      })),
    };
  }

  return expand(productTypeId, 0, new Set<number>());
}
