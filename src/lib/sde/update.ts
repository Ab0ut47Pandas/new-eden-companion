import "server-only";

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  closeStaticDatabase,
  getStaticDatabaseMetadata,
  staticDatabaseAvailable,
  staticDatabasePath,
} from "./database";
import { installStaticDatabaseCandidate } from "./update-core";

export const CCP_LATEST_SDE_URL = "https://developers.eveonline.com/static-data/tranquility/latest.jsonl";
export const SUPPORTED_STATIC_DATABASE_SCHEMA_VERSION = 3;

export type StaticDatabaseFreshnessState = "missing" | "outdated" | "current" | "ahead";

export interface StaticDatabaseFreshness {
  installedBuild: number | null;
  installedSchemaVersion: number | null;
  availableBuild: number;
  supportedSchemaVersion: number;
  state: StaticDatabaseFreshnessState;
  updateAvailable: boolean;
}

interface BuiltStaticDatabaseMetadata {
  schemaVersion: number;
  sdeBuild: string | number;
  databaseSha256: string;
}

export function parseLatestSdeBuild(text: string): number {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const record = JSON.parse(line) as Record<string, unknown>;
    const key = record._key ?? record.key;
    if (key !== "sde") continue;
    const candidate = record.buildNumber ?? record.build_number ?? record._value ?? record.value ?? record.sde;
    const value = String(candidate ?? "").trim();
    if (/^\d+$/.test(value)) return Number(value);
  }
  throw new Error("CCP latest.jsonl did not contain a numeric sde build record.");
}

export async function getAvailableStaticDatabaseBuild(): Promise<number> {
  const response = await fetch(CCP_LATEST_SDE_URL, {
    cache: "no-store",
    headers: { "User-Agent": "New-Eden-Companion-Static-Data-Updater" },
  });
  if (!response.ok) {
    throw new Error(`CCP static-data metadata request failed: ${response.status} ${response.statusText}`);
  }
  return parseLatestSdeBuild(await response.text());
}

export async function getStaticDatabaseFreshness(): Promise<StaticDatabaseFreshness> {
  const availableBuild = await getAvailableStaticDatabaseBuild();
  const installed = staticDatabaseAvailable() ? getStaticDatabaseMetadata() : null;
  const installedBuild = installed?.sdeBuild ?? null;
  const installedSchemaVersion = installed?.schemaVersion ?? null;
  const base = {
    installedBuild,
    installedSchemaVersion,
    availableBuild,
    supportedSchemaVersion: SUPPORTED_STATIC_DATABASE_SCHEMA_VERSION,
  };

  if (installedBuild === null || installedSchemaVersion === null) {
    return { ...base, state: "missing", updateAvailable: true };
  }
  if (installedSchemaVersion !== SUPPORTED_STATIC_DATABASE_SCHEMA_VERSION) {
    return { ...base, state: "outdated", updateAvailable: true };
  }
  if (installedBuild < availableBuild) {
    return { ...base, state: "outdated", updateAvailable: true };
  }
  if (installedBuild > availableBuild) {
    return { ...base, state: "ahead", updateAvailable: false };
  }
  return { ...base, state: "current", updateAvailable: false };
}

function runCurrentSdeBuilder(outputDir: string): Promise<void> {
  const builderPath = path.join(process.cwd(), "scripts", "sde", "build-current-sde.mjs");
  if (!existsSync(builderPath)) {
    throw new Error("The packaged static-data builder is missing.");
  }

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [builderPath, "--output-dir", outputDir], {
      cwd: process.cwd(),
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 16_000) stderr = stderr.slice(-16_000);
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) return resolve();
      const suffix = signal ? `signal ${signal}` : `exit code ${code ?? "unknown"}`;
      reject(new Error(`Static-data builder failed (${suffix}). ${stderr.trim()}`.trim()));
    });
  });
}

export interface StaticDatabaseUpdateResult extends StaticDatabaseFreshness {
  updated: boolean;
  previousBuild: number | null;
}

export async function updateStaticDatabase(): Promise<StaticDatabaseUpdateResult> {
  const before = await getStaticDatabaseFreshness();
  if (!before.updateAvailable) {
    return { ...before, updated: false, previousBuild: before.installedBuild };
  }

  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "nec-static-update-"));
  try {
    await runCurrentSdeBuilder(tempRoot);
    const candidatePath = path.join(tempRoot, "eve-static.db");
    const metadataPath = path.join(tempRoot, "eve-static.metadata.json");
    if (!existsSync(candidatePath) || !existsSync(metadataPath)) {
      throw new Error("Static-data builder completed without the expected database and metadata files.");
    }

    const candidateMetadata = JSON.parse(readFileSync(metadataPath, "utf8")) as BuiltStaticDatabaseMetadata;
    const candidateBuild = Number(candidateMetadata.sdeBuild);
    const candidateSchema = Number(candidateMetadata.schemaVersion);
    const candidateSha256 = String(candidateMetadata.databaseSha256 ?? "").trim();
    if (!Number.isInteger(candidateBuild) || candidateBuild < before.availableBuild) {
      throw new Error(`Built static database ${candidateMetadata.sdeBuild} is older than the available CCP build ${before.availableBuild}.`);
    }
    if (candidateSchema !== SUPPORTED_STATIC_DATABASE_SCHEMA_VERSION) {
      throw new Error(`Built static database schema ${candidateMetadata.schemaVersion} is not supported by this copy of New Eden Companion.`);
    }
    if (!/^[a-f0-9]{64}$/i.test(candidateSha256)) {
      throw new Error("Built static database metadata is missing a valid SHA-256 digest.");
    }

    await installStaticDatabaseCandidate({
      candidatePath,
      targetPath: staticDatabasePath(),
      expectedBuild: candidateBuild,
      expectedSchemaVersion: SUPPORTED_STATIC_DATABASE_SCHEMA_VERSION,
      expectedSha256: candidateSha256,
      beforeSwap: closeStaticDatabase,
      afterSwap: () => {
        const installed = getStaticDatabaseMetadata();
        if (installed.sdeBuild !== candidateBuild) {
          throw new Error(`Static database reopened as build ${installed.sdeBuild}, expected ${candidateBuild}.`);
        }
        if (installed.schemaVersion !== SUPPORTED_STATIC_DATABASE_SCHEMA_VERSION) {
          throw new Error(`Static database reopened as schema ${installed.schemaVersion}, expected ${SUPPORTED_STATIC_DATABASE_SCHEMA_VERSION}.`);
        }
      },
    });

    return {
      installedBuild: candidateBuild,
      installedSchemaVersion: SUPPORTED_STATIC_DATABASE_SCHEMA_VERSION,
      availableBuild: candidateBuild,
      supportedSchemaVersion: SUPPORTED_STATIC_DATABASE_SCHEMA_VERSION,
      state: "current",
      updateAvailable: false,
      updated: true,
      previousBuild: before.installedBuild,
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}
