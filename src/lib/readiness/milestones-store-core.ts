import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { ActivityRequirementResult } from "./activity-graph";

export type ExperienceMilestoneState = "confirmed" | "not-yet";

export interface ExperienceMilestoneRecord {
  characterId: number;
  milestoneKey: string;
  label: string;
  state: ExperienceMilestoneState;
  updatedAt: number;
  confirmedAt: number | null;
}

interface ExperienceMilestoneRow {
  character_id: number;
  milestone_key: string;
  label: string;
  state: ExperienceMilestoneState;
  updated_at: number;
  confirmed_at: number | null;
}

function normalizeKey(value: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error("Milestone key is required.");
  return normalized.slice(0, 240);
}

function normalizeLabel(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) throw new Error("Milestone label is required.");
  return normalized.slice(0, 240);
}

function validateCharacterId(characterId: number): void {
  if (!Number.isSafeInteger(characterId) || characterId <= 0) throw new Error("Invalid character ID.");
}

function fromRow(row: ExperienceMilestoneRow): ExperienceMilestoneRecord {
  return {
    characterId: row.character_id,
    milestoneKey: row.milestone_key,
    label: row.label,
    state: row.state,
    updatedAt: row.updated_at,
    confirmedAt: row.confirmed_at,
  };
}

export class ExperienceMilestoneStore {
  private readonly database: DatabaseSync;

  constructor(filename: string) {
    mkdirSync(path.dirname(filename), { recursive: true });
    this.database = new DatabaseSync(filename);
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS experience_milestones (
        character_id INTEGER NOT NULL,
        milestone_key TEXT NOT NULL,
        label TEXT NOT NULL,
        state TEXT NOT NULL CHECK(state IN ('confirmed', 'not-yet')),
        updated_at INTEGER NOT NULL,
        confirmed_at INTEGER,
        PRIMARY KEY(character_id, milestone_key)
      );
      CREATE INDEX IF NOT EXISTS idx_experience_milestones_character_state
        ON experience_milestones(character_id, state, updated_at DESC);
    `);
  }

  close(): void {
    this.database.close();
  }

  setState(input: {
    characterId: number;
    milestoneKey: string;
    label: string;
    state: ExperienceMilestoneState;
    now?: number;
  }): ExperienceMilestoneRecord {
    validateCharacterId(input.characterId);
    const milestoneKey = normalizeKey(input.milestoneKey);
    const label = normalizeLabel(input.label);
    const now = input.now ?? Date.now();
    if (!Number.isSafeInteger(now) || now < 0) throw new Error("Invalid milestone timestamp.");
    const confirmedAt = input.state === "confirmed" ? now : null;

    this.database.prepare(`
      INSERT INTO experience_milestones (
        character_id, milestone_key, label, state, updated_at, confirmed_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(character_id, milestone_key) DO UPDATE SET
        label = excluded.label,
        state = excluded.state,
        updated_at = excluded.updated_at,
        confirmed_at = excluded.confirmed_at
    `).run(input.characterId, milestoneKey, label, input.state, now, confirmedAt);

    return this.get(input.characterId, milestoneKey)!;
  }

  get(characterId: number, milestoneKeyValue: string): ExperienceMilestoneRecord | null {
    validateCharacterId(characterId);
    const milestoneKey = normalizeKey(milestoneKeyValue);
    const row = this.database.prepare(`
      SELECT character_id, milestone_key, label, state, updated_at, confirmed_at
      FROM experience_milestones
      WHERE character_id = ? AND milestone_key = ?
    `).get(characterId, milestoneKey) as unknown as ExperienceMilestoneRow | undefined;
    return row ? fromRow(row) : null;
  }

  list(characterId: number): ExperienceMilestoneRecord[] {
    validateCharacterId(characterId);
    const rows = this.database.prepare(`
      SELECT character_id, milestone_key, label, state, updated_at, confirmed_at
      FROM experience_milestones
      WHERE character_id = ?
      ORDER BY updated_at DESC, milestone_key ASC
    `).all(characterId) as unknown as ExperienceMilestoneRow[];
    return rows.map(fromRow);
  }

  clear(characterId: number, milestoneKeyValue: string): boolean {
    validateCharacterId(characterId);
    const milestoneKey = normalizeKey(milestoneKeyValue);
    const result = this.database.prepare(`
      DELETE FROM experience_milestones
      WHERE character_id = ? AND milestone_key = ?
    `).run(characterId, milestoneKey);
    return Number(result.changes) === 1;
  }
}

export function milestoneRequirementResult(
  requirementId: string,
  record: ExperienceMilestoneRecord | null,
): ActivityRequirementResult {
  const id = requirementId.trim();
  if (!id) throw new Error("Milestone requirement ID is required.");

  if (!record) {
    return {
      requirementId: id,
      state: "unknown",
      why: "The player has not recorded whether this milestone is complete. NEC does not infer gameplay experience from missing local state or ESI.",
    };
  }

  if (record.state === "confirmed") {
    return {
      requirementId: id,
      state: "met",
      summary: `${record.label} — confirmed`,
      why: "The player explicitly confirmed this experience milestone in NEC.",
      evidence: [{ source: "user", label: "Player-confirmed local milestone" }],
    };
  }

  return {
    requirementId: id,
    state: "unmet",
    summary: `${record.label} — not yet`,
    why: "The player explicitly marked this experience milestone as not completed yet.",
    evidence: [{ source: "user", label: "Player-marked local milestone" }],
  };
}
