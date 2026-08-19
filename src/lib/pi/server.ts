import "server-only";

import { DatabaseSync } from "node:sqlite";

import { staticDatabaseAvailable, staticDatabasePath } from "../sde/database";
import {
  buildPlanetaryProductionPlan,
  type PlanetaryColonyEvidence,
  type PlanetaryProductionPlan,
} from "./production-plan";

export type { PlanetaryColonyEvidence, PlanetaryProductionPlan } from "./production-plan";

export function getPlanetaryProductionPlan(
  targetTypeId: number,
  requestedQuantity = 1,
  colonies: PlanetaryColonyEvidence[] = [],
): PlanetaryProductionPlan {
  if (!staticDatabaseAvailable()) throw new Error("The EVE static database is not installed.");
  const db = new DatabaseSync(staticDatabasePath(), { readOnly: true });
  try {
    db.exec("PRAGMA foreign_keys = ON;");
    return buildPlanetaryProductionPlan(db, targetTypeId, requestedQuantity, { colonies });
  } finally {
    db.close();
  }
}
