import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

export type GoalKind = "item" | "activity";
export type GoalStatus = "active" | "completed";

export interface GoalStep {
  id: string;
  goalId: string;
  position: number;
  label: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SavedGoal {
  id: string;
  characterId: number;
  kind: GoalKind;
  targetKey: string;
  targetTypeId: number | null;
  title: string;
  status: GoalStatus;
  createdAt: number;
  updatedAt: number;
  steps: GoalStep[];
}

interface GoalRow {
  id: string;
  character_id: number;
  kind: GoalKind;
  target_key: string;
  target_type_id: number | null;
  title: string;
  status: GoalStatus;
  created_at: number;
  updated_at: number;
}

interface StepRow {
  id: string;
  goal_id: string;
  position: number;
  label: string;
  completed: number;
  created_at: number;
  updated_at: number;
}

function normalizeTitle(value: string): string {
  const title = value.trim().replace(/\s+/g, " ");
  if (!title) throw new Error("Goal title is required.");
  return title.slice(0, 160);
}

function normalizeTargetKey(value: string): string {
  const key = value.trim();
  if (!key) throw new Error("Goal target key is required.");
  return key.slice(0, 240);
}

function normalizeStepLabel(value: string): string {
  const label = value.trim().replace(/\s+/g, " ");
  if (!label) throw new Error("Checklist step is required.");
  return label.slice(0, 240);
}

export class GoalStore {
  private readonly database: DatabaseSync;

  constructor(filename: string) {
    mkdirSync(path.dirname(filename), { recursive: true });
    this.database = new DatabaseSync(filename);
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS saved_goals (
        id TEXT PRIMARY KEY,
        character_id INTEGER NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('item', 'activity')),
        target_key TEXT NOT NULL,
        target_type_id INTEGER,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(character_id, kind, target_key)
      );
      CREATE INDEX IF NOT EXISTS idx_saved_goals_character_status
        ON saved_goals(character_id, status, updated_at DESC);
      CREATE TABLE IF NOT EXISTS goal_steps (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL REFERENCES saved_goals(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        label TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_goal_steps_goal_position
        ON goal_steps(goal_id, position, created_at);
    `);
  }

  close(): void {
    this.database.close();
  }

  saveGoal(input: {
    characterId: number;
    kind: GoalKind;
    targetKey: string;
    targetTypeId?: number | null;
    title: string;
  }): SavedGoal {
    if (!Number.isSafeInteger(input.characterId) || input.characterId <= 0) throw new Error("Invalid character ID.");
    const targetKey = normalizeTargetKey(input.targetKey);
    const title = normalizeTitle(input.title);
    const targetTypeId = input.targetTypeId && Number.isSafeInteger(input.targetTypeId) && input.targetTypeId > 0
      ? input.targetTypeId
      : null;
    const now = Date.now();
    const id = randomUUID();

    this.database.prepare(`
      INSERT INTO saved_goals (
        id, character_id, kind, target_key, target_type_id, title, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
      ON CONFLICT(character_id, kind, target_key) DO UPDATE SET
        target_type_id = excluded.target_type_id,
        title = excluded.title,
        status = 'active',
        updated_at = excluded.updated_at
    `).run(id, input.characterId, input.kind, targetKey, targetTypeId, title, now, now);

    const saved = this.getGoalByTarget(input.characterId, input.kind, targetKey);
    if (!saved) throw new Error("Saved goal could not be reloaded.");
    return saved;
  }

  listGoals(characterId: number): SavedGoal[] {
    const rows = this.database.prepare(`
      SELECT * FROM saved_goals
      WHERE character_id = ?
      ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, updated_at DESC, created_at DESC
    `).all(characterId) as unknown as GoalRow[];
    return rows.map((row) => this.inflateGoal(row));
  }

  getGoalByTarget(characterId: number, kind: GoalKind, targetKey: string): SavedGoal | null {
    const row = this.database.prepare(`
      SELECT * FROM saved_goals
      WHERE character_id = ? AND kind = ? AND target_key = ?
    `).get(characterId, kind, targetKey) as unknown as GoalRow | undefined;
    return row ? this.inflateGoal(row) : null;
  }

  setGoalCompleted(characterId: number, goalId: string, completed: boolean): boolean {
    const result = this.database.prepare(`
      UPDATE saved_goals SET status = ?, updated_at = ?
      WHERE id = ? AND character_id = ?
    `).run(completed ? "completed" : "active", Date.now(), goalId, characterId);
    return Number(result.changes) === 1;
  }

  addStep(characterId: number, goalId: string, labelValue: string): GoalStep | null {
    if (!this.ownsGoal(characterId, goalId)) return null;
    const label = normalizeStepLabel(labelValue);
    const positionRow = this.database.prepare(`
      SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM goal_steps WHERE goal_id = ?
    `).get(goalId) as unknown as { next_position: number };
    const id = randomUUID();
    const now = Date.now();
    this.database.prepare(`
      INSERT INTO goal_steps (id, goal_id, position, label, completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `).run(id, goalId, positionRow.next_position, label, now, now);
    return {
      id,
      goalId,
      position: positionRow.next_position,
      label,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  setStepCompleted(characterId: number, goalId: string, stepId: string, completed: boolean): boolean {
    if (!this.ownsGoal(characterId, goalId)) return false;
    const now = Date.now();
    const result = this.database.prepare(`
      UPDATE goal_steps SET completed = ?, updated_at = ?
      WHERE id = ? AND goal_id = ?
    `).run(completed ? 1 : 0, now, stepId, goalId);
    if (Number(result.changes) === 1) {
      this.database.prepare("UPDATE saved_goals SET updated_at = ? WHERE id = ? AND character_id = ?")
        .run(now, goalId, characterId);
      return true;
    }
    return false;
  }

  private ownsGoal(characterId: number, goalId: string): boolean {
    const row = this.database.prepare("SELECT 1 AS ok FROM saved_goals WHERE id = ? AND character_id = ?")
      .get(goalId, characterId) as unknown as { ok: number } | undefined;
    return Boolean(row);
  }

  private inflateGoal(row: GoalRow): SavedGoal {
    const steps = this.database.prepare(`
      SELECT * FROM goal_steps WHERE goal_id = ? ORDER BY position ASC, created_at ASC
    `).all(row.id) as unknown as StepRow[];
    return {
      id: row.id,
      characterId: row.character_id,
      kind: row.kind,
      targetKey: row.target_key,
      targetTypeId: row.target_type_id,
      title: row.title,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      steps: steps.map((step) => ({
        id: step.id,
        goalId: step.goal_id,
        position: step.position,
        label: step.label,
        completed: Boolean(step.completed),
        createdAt: step.created_at,
        updatedAt: step.updated_at,
      })),
    };
  }
}
