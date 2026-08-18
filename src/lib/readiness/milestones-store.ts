import "server-only";

import path from "node:path";

import { ExperienceMilestoneStore } from "./milestones-store-core";

export {
  milestoneRequirementResult,
  type ExperienceMilestoneRecord,
  type ExperienceMilestoneState,
} from "./milestones-store-core";

let store: ExperienceMilestoneStore | undefined;

function databasePath(): string {
  return process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.join(process.cwd(), "data", "eve-companion.db");
}

export function getExperienceMilestoneStore(): ExperienceMilestoneStore {
  if (!store) store = new ExperienceMilestoneStore(databasePath());
  return store;
}
