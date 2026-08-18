import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { installStaticDatabaseCandidate, validateStaticDatabaseCandidate } from "./update-core";

const tempRoots: string[] = [];

function tempRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "nec-static-update-test-"));
  tempRoots.push(root);
  return root;
}

function writeDatabase(filename: string, build: number, schemaVersion = 1) {
  mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  try {
    db.exec("CREATE TABLE sde_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL); PRAGMA foreign_keys = ON;");
    const insert = db.prepare("INSERT INTO sde_meta (key, value) VALUES (?, ?)");
    insert.run("schema_version", String(schemaVersion));
    insert.run("sde_build", String(build));
  } finally {
    db.close();
  }
}

function sha256(filename: string): string {
  return createHash("sha256").update(readFileSync(filename)).digest("hex");
}

function readBuild(filename: string): number {
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    return Number((db.prepare("SELECT value FROM sde_meta WHERE key = 'sde_build'").get() as { value: string }).value);
  } finally {
    db.close();
  }
}

afterEach(() => {
  while (tempRoots.length) rmSync(tempRoots.pop()!, { recursive: true, force: true });
});

describe("static database update core", () => {
  it("validates and installs a newer database while replacing the old copy", async () => {
    const root = tempRoot();
    const target = path.join(root, "static", "eve-static.db");
    const candidate = path.join(root, "candidate.db");
    writeDatabase(target, 100);
    writeDatabase(candidate, 101);
    const digest = sha256(candidate);
    const result = await installStaticDatabaseCandidate({ candidatePath: candidate, targetPath: target, expectedBuild: 101, expectedSchemaVersion: 1, expectedSha256: digest });
    expect(result.sdeBuild).toBe(101);
    expect(readBuild(target)).toBe(101);
  });

  it("rejects a bad checksum before touching the known-good database", async () => {
    const root = tempRoot();
    const target = path.join(root, "eve-static.db");
    const candidate = path.join(root, "candidate.db");
    writeDatabase(target, 200);
    writeDatabase(candidate, 201);
    await expect(installStaticDatabaseCandidate({ candidatePath: candidate, targetPath: target, expectedBuild: 201, expectedSchemaVersion: 1, expectedSha256: "0".repeat(64) })).rejects.toThrow("SHA-256");
    expect(readBuild(target)).toBe(200);
  });

  it("rolls back when the application cannot reopen the replacement", async () => {
    const root = tempRoot();
    const target = path.join(root, "eve-static.db");
    const candidate = path.join(root, "candidate.db");
    writeDatabase(target, 400);
    writeDatabase(candidate, 401);
    await expect(installStaticDatabaseCandidate({
      candidatePath: candidate,
      targetPath: target,
      expectedBuild: 401,
      expectedSchemaVersion: 1,
      expectedSha256: sha256(candidate),
      afterSwap: () => { throw new Error("reopen failed"); },
    })).rejects.toThrow("reopen failed");
    expect(readBuild(target)).toBe(400);
  });

  it("rejects an unsupported schema before replacement", async () => {
    const root = tempRoot();
    const candidate = path.join(root, "candidate.db");
    writeDatabase(candidate, 301, 2);
    await expect(validateStaticDatabaseCandidate(candidate, 301, 1, sha256(candidate))).rejects.toThrow("not supported");
  });
});
