import type { DatabaseSync } from "node:sqlite";

export type AcquisitionSourceKind =
  | "npc-seeded"
  | "loot-drop"
  | "loyalty-points"
  | "exploration"
  | "planetary-industry"
  | "reaction"
  | "salvage"
  | "market"
  | "other";

export type AcquisitionSourceEvidence =
  | {
      kind: "sde";
      dataset: "blueprints" | "planetSchematics";
      sdeBuild: string | null;
      detail: string;
    }
  | {
      kind: "curated";
      authority: string;
      title: string;
      url: string;
      note?: string;
    };

export interface CuratedAcquisitionSource {
  typeId: number;
  sourceKind: AcquisitionSourceKind;
  label: string;
  evidence: Extract<AcquisitionSourceEvidence, { kind: "curated" }>;
}

export interface ResolvedAcquisitionSource {
  sourceKind: AcquisitionSourceKind;
  label: string;
  evidence: AcquisitionSourceEvidence;
}

export type ManufacturingBoundary = "ordinary-blueprint-available" | "no-ordinary-blueprint" | "unknown-type";

export interface AcquisitionSourceResolution {
  typeId: number;
  manufacturingBoundary: ManufacturingBoundary;
  sourceState: "known" | "unknown";
  sources: ResolvedAcquisitionSource[];
}

type ExistsRow = { exists_flag: number };
type ActivityRow = { activity: string };
type MetaRow = { value: string };

function validateCuratedSource(source: CuratedAcquisitionSource): void {
  if (!Number.isInteger(source.typeId) || source.typeId <= 0) {
    throw new TypeError("Curated acquisition source typeId must be a positive integer.");
  }
  if (!source.label.trim()) {
    throw new TypeError("Curated acquisition source label must not be empty.");
  }
  if (!source.evidence.authority.trim() || !source.evidence.title.trim() || !source.evidence.url.trim()) {
    throw new TypeError("Curated acquisition sources require authority, title, and URL evidence.");
  }
  let parsed: URL;
  try {
    parsed = new URL(source.evidence.url);
  } catch {
    throw new TypeError("Curated acquisition source evidence URL must be an absolute HTTP(S) URL.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new TypeError("Curated acquisition source evidence URL must use HTTP(S).");
  }
}

function querySdeBuild(db: DatabaseSync): string | null {
  try {
    const row = db.prepare("SELECT value FROM sde_meta WHERE key = 'sde_build'").get() as MetaRow | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

function typeExists(db: DatabaseSync, typeId: number): boolean {
  const row = db.prepare("SELECT 1 AS exists_flag FROM types WHERE type_id = ?").get(typeId) as ExistsRow | undefined;
  return row?.exists_flag === 1;
}

function hasManufacturingProduct(db: DatabaseSync, typeId: number): boolean {
  const row = db
    .prepare("SELECT 1 AS exists_flag FROM blueprint_products WHERE product_type_id = ? AND activity = 'manufacturing' LIMIT 1")
    .get(typeId) as ExistsRow | undefined;
  return row?.exists_flag === 1;
}

function hasPlanetarySchematicOutput(db: DatabaseSync, typeId: number): boolean {
  try {
    const row = db
      .prepare("SELECT 1 AS exists_flag FROM planet_schematic_types WHERE type_id = ? AND is_input = 0 LIMIT 1")
      .get(typeId) as ExistsRow | undefined;
    return row?.exists_flag === 1;
  } catch {
    return false;
  }
}

function queryNonManufacturingBlueprintActivities(db: DatabaseSync, typeId: number): string[] {
  const rows = db
    .prepare(`
      SELECT DISTINCT activity
      FROM blueprint_products
      WHERE product_type_id = ? AND activity <> 'manufacturing'
      ORDER BY activity ASC
    `)
    .all(typeId) as ActivityRow[];
  return rows.map((row) => row.activity);
}

function sourceKindForBlueprintActivity(activity: string): AcquisitionSourceKind {
  return activity === "reaction" ? "reaction" : "other";
}

function sourceLabelForBlueprintActivity(activity: string): string {
  if (activity === "reaction") return "Reaction industry activity";
  return `SDE blueprint activity: ${activity}`;
}

function compareSources(left: ResolvedAcquisitionSource, right: ResolvedAcquisitionSource): number {
  const byKind = left.sourceKind.localeCompare(right.sourceKind);
  if (byKind !== 0) return byKind;
  const byLabel = left.label.localeCompare(right.label);
  if (byLabel !== 0) return byLabel;
  return JSON.stringify(left.evidence).localeCompare(JSON.stringify(right.evidence));
}

export function resolveAcquisitionSources(
  db: DatabaseSync,
  typeId: number,
  curatedSources: readonly CuratedAcquisitionSource[] = [],
): AcquisitionSourceResolution {
  if (!Number.isInteger(typeId) || typeId <= 0) {
    throw new TypeError("typeId must be a positive integer.");
  }

  for (const source of curatedSources) validateCuratedSource(source);

  if (!typeExists(db, typeId)) {
    return {
      typeId,
      manufacturingBoundary: "unknown-type",
      sourceState: "unknown",
      sources: [],
    };
  }

  const sdeBuild = querySdeBuild(db);
  const sources: ResolvedAcquisitionSource[] = queryNonManufacturingBlueprintActivities(db, typeId).map((activity) => ({
    sourceKind: sourceKindForBlueprintActivity(activity),
    label: sourceLabelForBlueprintActivity(activity),
    evidence: {
      kind: "sde",
      dataset: "blueprints",
      sdeBuild,
      detail: `blueprint_products records product ${typeId} under activity ${activity}`,
    },
  }));

  if (hasPlanetarySchematicOutput(db, typeId)) {
    sources.push({
      sourceKind: "planetary-industry",
      label: "Planetary Industry schematic",
      evidence: {
        kind: "sde",
        dataset: "planetSchematics",
        sdeBuild,
        detail: `planet_schematic_types records type ${typeId} as a schematic output`,
      },
    });
  }

  for (const source of curatedSources) {
    if (source.typeId !== typeId) continue;
    sources.push({ sourceKind: source.sourceKind, label: source.label, evidence: source.evidence });
  }

  sources.sort(compareSources);

  return {
    typeId,
    manufacturingBoundary: hasManufacturingProduct(db, typeId) ? "ordinary-blueprint-available" : "no-ordinary-blueprint",
    sourceState: sources.length > 0 ? "known" : "unknown",
    sources,
  };
}
