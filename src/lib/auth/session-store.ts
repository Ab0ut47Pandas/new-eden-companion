import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { decrypt, encrypt } from "@/lib/auth/crypto";

export interface TokenBundle {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface EveSession {
  id: string;
  characterId: number;
  characterName: string;
  scopes: string[];
  tokens: TokenBundle;
  createdAt: number;
  updatedAt: number;
}

let database: DatabaseSync | undefined;

function getDatabase(): DatabaseSync {
  if (database) return database;
  const filename = process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.join(process.cwd(), "data", "eve-companion.db");
  mkdirSync(path.dirname(filename), { recursive: true });
  database = new DatabaseSync(filename);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      character_id INTEGER NOT NULL,
      character_name TEXT NOT NULL,
      scopes_json TEXT NOT NULL,
      token_bundle TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  return database;
}

interface SessionRow {
  id: string;
  character_id: number;
  character_name: string;
  scopes_json: string;
  token_bundle: string;
  created_at: number;
  updated_at: number;
}

export function saveSession(session: EveSession): void {
  getDatabase()
    .prepare(`
      INSERT INTO sessions (
        id, character_id, character_name, scopes_json, token_bundle, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        character_id = excluded.character_id,
        character_name = excluded.character_name,
        scopes_json = excluded.scopes_json,
        token_bundle = excluded.token_bundle,
        updated_at = excluded.updated_at
    `)
    .run(
      session.id,
      session.characterId,
      session.characterName,
      JSON.stringify(session.scopes),
      encrypt(JSON.stringify(session.tokens)),
      session.createdAt,
      session.updatedAt,
    );
}

export function getSession(id: string): EveSession | null {
  const row = getDatabase()
    .prepare("SELECT * FROM sessions WHERE id = ?")
    .get(id) as unknown as SessionRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    characterId: row.character_id,
    characterName: row.character_name,
    scopes: JSON.parse(row.scopes_json) as string[],
    tokens: JSON.parse(decrypt(row.token_bundle)) as TokenBundle,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function deleteSession(id: string): void {
  getDatabase().prepare("DELETE FROM sessions WHERE id = ?").run(id);
}
