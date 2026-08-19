import type { DatabaseSync } from "node:sqlite";

export type BlueprintScienceActivityKind = "copying" | "research_material" | "research_time";

export interface BlueprintActivityTypeRef {
  typeId: number;
  name: string | null;
  isPlaceholder: boolean;
}

export interface BlueprintActivityMaterial extends BlueprintActivityTypeRef {
  quantity: number;
}

export interface BlueprintActivitySkill extends BlueprintActivityTypeRef {
  level: number;
}

export interface BlueprintScienceActivity {
  kind: BlueprintScienceActivityKind;
  timeSeconds: number | null;
  materials: BlueprintActivityMaterial[];
  skills: BlueprintActivitySkill[];
}

export interface BlueprintScienceProfile {
  blueprint: BlueprintActivityTypeRef & {
    maxProductionLimit: number | null;
  };
  activities: BlueprintScienceActivity[];
}

type BlueprintRow = {
  blueprint_type_id: number;
  blueprint_name: string | null;
  blueprint_is_placeholder: number;
  max_production_limit: number | null;
};

type ActivityRow = {
  activity: BlueprintScienceActivityKind;
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

const SCIENCE_ACTIVITIES: readonly BlueprintScienceActivityKind[] = [
  "research_material",
  "research_time",
  "copying",
];

export function queryBlueprintScienceProfile(
  db: DatabaseSync,
  blueprintTypeId: number,
): BlueprintScienceProfile | null {
  const blueprint = db.prepare(`
    SELECT
      bp.blueprint_type_id,
      type.name AS blueprint_name,
      type.is_placeholder AS blueprint_is_placeholder,
      bp.max_production_limit
    FROM blueprints bp
    JOIN types type ON type.type_id = bp.blueprint_type_id
    WHERE bp.blueprint_type_id = ?
  `).get(blueprintTypeId) as unknown as BlueprintRow | undefined;

  if (!blueprint) return null;

  const activityRows = db.prepare(`
    SELECT activity, time_seconds
    FROM blueprint_activities
    WHERE blueprint_type_id = ?
      AND activity IN ('copying', 'research_material', 'research_time')
  `).all(blueprintTypeId) as unknown as ActivityRow[];

  const byKind = new Map(activityRows.map((row) => [row.activity, row]));
  const materialStatement = db.prepare(`
    SELECT
      material.material_type_id,
      type.name AS material_name,
      type.is_placeholder AS material_is_placeholder,
      material.quantity
    FROM blueprint_materials material
    JOIN types type ON type.type_id = material.material_type_id
    WHERE material.blueprint_type_id = ? AND material.activity = ?
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
    WHERE skill.blueprint_type_id = ? AND skill.activity = ?
    ORDER BY
      CASE WHEN type.name IS NULL THEN 1 ELSE 0 END,
      type.name COLLATE NOCASE,
      skill.skill_type_id
  `);

  const activities: BlueprintScienceActivity[] = [];
  for (const kind of SCIENCE_ACTIVITIES) {
    const activity = byKind.get(kind);
    if (!activity) continue;
    const materials = materialStatement.all(blueprintTypeId, kind) as unknown as MaterialRow[];
    const skills = skillStatement.all(blueprintTypeId, kind) as unknown as SkillRow[];
    activities.push({
      kind,
      timeSeconds: activity.time_seconds,
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
    });
  }

  return {
    blueprint: {
      typeId: blueprint.blueprint_type_id,
      name: blueprint.blueprint_name,
      isPlaceholder: blueprint.blueprint_is_placeholder === 1,
      maxProductionLimit: blueprint.max_production_limit,
    },
    activities,
  };
}
