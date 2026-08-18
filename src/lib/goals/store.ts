import "server-only";

import path from "node:path";

import { GoalStore } from "./store-core";

export {
  type GoalKind,
  type GoalStatus,
  type GoalStep,
  type SavedGoal,
} from "./store-core";

let store: GoalStore | undefined;

function databasePath(): string {
  return process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.join(process.cwd(), "data", "eve-companion.db");
}

export function getGoalStore(): GoalStore {
  if (!store) store = new GoalStore(databasePath());
  return store;
}
