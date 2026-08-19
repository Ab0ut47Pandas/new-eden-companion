import type { DatabaseSync } from "node:sqlite";

export interface PlanetaryTypeRef {
  typeId: number;
  name: string | null;
  isPlaceholder: boolean;
}

export interface PlanetarySchematicRequirement extends PlanetaryTypeRef {
  quantity: number;
}

export interface PlanetarySchematicProduct extends PlanetaryTypeRef {
  quantity: number;
}

export type PlanetarySchematicPin = PlanetaryTypeRef;

export interface PlanetarySchematic {
  schematicId: number;
  name: string | null;
  cycleTimeSeconds: number;
  pins: PlanetarySchematicPin[];
  inputs: PlanetarySchematicRequirement[];
  outputs: PlanetarySchematicProduct[];
}

type SchematicRow = {
  schematic_id: number;
  name: string | null;
  cycle_time_seconds: number;
};

type TypeRow = {
  type_id: number;
  type_name: string | null;
  is_placeholder: number;
  quantity: number;
};

type PinRow = {
  pin_type_id: number;
  pin_name: string | null;
  is_placeholder: number;
};

function mapSchematic(db: DatabaseSync, row: SchematicRow): PlanetarySchematic {
  const pins = db.prepare(`
    SELECT pin.pin_type_id, type.name AS pin_name, type.is_placeholder
    FROM planet_schematic_pins pin
    JOIN types type ON type.type_id = pin.pin_type_id
    WHERE pin.schematic_id = ?
    ORDER BY CASE WHEN type.name IS NULL THEN 1 ELSE 0 END, type.name COLLATE NOCASE, pin.pin_type_id
  `).all(row.schematic_id) as unknown as PinRow[];
  const inputs = db.prepare(`
    SELECT item.type_id, type.name AS type_name, type.is_placeholder, item.quantity
    FROM planet_schematic_types item
    JOIN types type ON type.type_id = item.type_id
    WHERE item.schematic_id = ? AND item.is_input = 1
    ORDER BY CASE WHEN type.name IS NULL THEN 1 ELSE 0 END, type.name COLLATE NOCASE, item.type_id
  `).all(row.schematic_id) as unknown as TypeRow[];
  const outputs = db.prepare(`
    SELECT item.type_id, type.name AS type_name, type.is_placeholder, item.quantity
    FROM planet_schematic_types item
    JOIN types type ON type.type_id = item.type_id
    WHERE item.schematic_id = ? AND item.is_input = 0
    ORDER BY CASE WHEN type.name IS NULL THEN 1 ELSE 0 END, type.name COLLATE NOCASE, item.type_id
  `).all(row.schematic_id) as unknown as TypeRow[];
  return {
    schematicId: row.schematic_id,
    name: row.name,
    cycleTimeSeconds: row.cycle_time_seconds,
    pins: pins.map((pin) => ({
      typeId: pin.pin_type_id,
      name: pin.pin_name,
      isPlaceholder: pin.is_placeholder === 1,
    })),
    inputs: inputs.map((input) => ({
      typeId: input.type_id,
      name: input.type_name,
      isPlaceholder: input.is_placeholder === 1,
      quantity: input.quantity,
    })),
    outputs: outputs.map((output) => ({
      typeId: output.type_id,
      name: output.type_name,
      isPlaceholder: output.is_placeholder === 1,
      quantity: output.quantity,
    })),
  };
}

export function queryPlanetarySchematic(db: DatabaseSync, schematicId: number): PlanetarySchematic | null {
  if (!Number.isSafeInteger(schematicId) || schematicId <= 0) throw new TypeError("schematicId must be a positive integer.");
  const row = db.prepare(`
    SELECT schematic_id, name, cycle_time_seconds
    FROM planet_schematics
    WHERE schematic_id = ?
  `).get(schematicId) as unknown as SchematicRow | undefined;
  return row ? mapSchematic(db, row) : null;
}

export function queryPlanetarySchematicsForOutput(db: DatabaseSync, outputTypeId: number): PlanetarySchematic[] {
  if (!Number.isSafeInteger(outputTypeId) || outputTypeId <= 0) throw new TypeError("outputTypeId must be a positive integer.");
  const rows = db.prepare(`
    SELECT DISTINCT schematic.schematic_id, schematic.name, schematic.cycle_time_seconds
    FROM planet_schematic_types item
    JOIN planet_schematics schematic ON schematic.schematic_id = item.schematic_id
    WHERE item.type_id = ? AND item.is_input = 0
    ORDER BY CASE WHEN schematic.name IS NULL THEN 1 ELSE 0 END, schematic.name COLLATE NOCASE, schematic.schematic_id
  `).all(outputTypeId) as unknown as SchematicRow[];
  return rows.map((row) => mapSchematic(db, row));
}

export function queryPlanetarySchematicsUsingInput(db: DatabaseSync, inputTypeId: number): PlanetarySchematic[] {
  if (!Number.isSafeInteger(inputTypeId) || inputTypeId <= 0) throw new TypeError("inputTypeId must be a positive integer.");
  const rows = db.prepare(`
    SELECT DISTINCT schematic.schematic_id, schematic.name, schematic.cycle_time_seconds
    FROM planet_schematic_types item
    JOIN planet_schematics schematic ON schematic.schematic_id = item.schematic_id
    WHERE item.type_id = ? AND item.is_input = 1
    ORDER BY CASE WHEN schematic.name IS NULL THEN 1 ELSE 0 END, schematic.name COLLATE NOCASE, schematic.schematic_id
  `).all(inputTypeId) as unknown as SchematicRow[];
  return rows.map((row) => mapSchematic(db, row));
}
