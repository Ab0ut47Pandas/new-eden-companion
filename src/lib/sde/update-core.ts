import { createHash, randomUUID } from "node:crypto";
import { createReadStream, copyFileSync, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export interface StaticDatabaseCandidateInfo {
  schemaVersion: number;
  sdeBuild: number;
  sha256: string;
}

async function sha256File(filename: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filename);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

export async function validateStaticDatabaseCandidate(
  filename: string,
  expectedBuild: number,
  expectedSchemaVersion: number,
  expectedSha256?: string,
): Promise<StaticDatabaseCandidateInfo> {
  if (!existsSync(filename)) throw new Error(`Static database candidate is missing: ${filename}`);

  const actualSha256 = await sha256File(filename);
  if (expectedSha256 && actualSha256.toLowerCase() !== expectedSha256.trim().toLowerCase()) {
    throw new Error("Static database candidate failed SHA-256 verification.");
  }

  const database = new DatabaseSync(filename, { readOnly: true });
  try {
    const integrity = database.prepare("PRAGMA integrity_check").get() as Record<string, unknown> | undefined;
    if (!integrity || Object.values(integrity)[0] !== "ok") {
      throw new Error("Static database candidate failed SQLite integrity_check.");
    }
    const foreignKeys = database.prepare("PRAGMA foreign_key_check").all();
    if (foreignKeys.length > 0) {
      throw new Error(`Static database candidate has ${foreignKeys.length} foreign-key violation(s).`);
    }
    const rows = database.prepare("SELECT key, value FROM sde_meta").all() as Array<{ key: string; value: string }>;
    const metadata = new Map(rows.map((row) => [String(row.key), String(row.value)]));
    const schemaVersion = Number(metadata.get("schema_version"));
    const sdeBuild = Number(metadata.get("sde_build"));
    if (!Number.isInteger(schemaVersion) || schemaVersion !== expectedSchemaVersion) {
      throw new Error(`Static database schema ${metadata.get("schema_version") ?? "missing"} is not supported (expected ${expectedSchemaVersion}).`);
    }
    if (!Number.isInteger(sdeBuild) || sdeBuild !== expectedBuild) {
      throw new Error(`Static database build ${metadata.get("sde_build") ?? "missing"} does not match expected build ${expectedBuild}.`);
    }
    return { schemaVersion, sdeBuild, sha256: actualSha256 };
  } finally {
    database.close();
  }
}

export interface InstallStaticDatabaseCandidateOptions {
  candidatePath: string;
  targetPath: string;
  expectedBuild: number;
  expectedSchemaVersion: number;
  expectedSha256: string;
  beforeSwap?: () => void;
  afterSwap?: () => void;
}

export async function installStaticDatabaseCandidate({
  candidatePath,
  targetPath,
  expectedBuild,
  expectedSchemaVersion,
  expectedSha256,
  beforeSwap,
  afterSwap,
}: InstallStaticDatabaseCandidateOptions): Promise<StaticDatabaseCandidateInfo> {
  const target = path.resolve(targetPath);
  const targetDirectory = path.dirname(target);
  mkdirSync(targetDirectory, { recursive: true });

  const suffix = randomUUID().replaceAll("-", "");
  const staged = `${target}.update-${suffix}`;
  const backup = `${target}.backup-${suffix}`;
  let oldMoved = false;
  let newInstalled = false;

  try {
    copyFileSync(candidatePath, staged);
    const validated = await validateStaticDatabaseCandidate(staged, expectedBuild, expectedSchemaVersion, expectedSha256);
    beforeSwap?.();

    if (existsSync(target)) {
      renameSync(target, backup);
      oldMoved = true;
    }
    try {
      renameSync(staged, target);
      newInstalled = true;
    } catch (error) {
      if (oldMoved) {
        renameSync(backup, target);
        oldMoved = false;
      }
      throw error;
    }

    await validateStaticDatabaseCandidate(target, expectedBuild, expectedSchemaVersion, expectedSha256);
    afterSwap?.();

    if (oldMoved && existsSync(backup)) {
      rmSync(backup, { force: true });
      oldMoved = false;
    }
    return validated;
  } catch (error) {
    if (newInstalled && existsSync(target)) {
      try { rmSync(target, { force: true }); } catch {}
    }
    if (oldMoved && existsSync(backup)) {
      try {
        renameSync(backup, target);
        oldMoved = false;
      } catch (rollbackError) {
        const original = error instanceof Error ? error.message : String(error);
        const rollback = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
        throw new Error(`${original} Rollback also failed: ${rollback}`);
      }
    }
    throw error;
  } finally {
    if (existsSync(staged)) {
      try { rmSync(staged, { force: true }); } catch {}
    }
    if (!oldMoved && existsSync(backup)) {
      try { rmSync(backup, { force: true }); } catch {}
    }
  }
}
