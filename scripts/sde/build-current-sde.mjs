import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { buildStaticDatabase, STATIC_DB_SCHEMA_VERSION } from "./build-static-db.mjs";

const LATEST_URL = "https://developers.eveonline.com/static-data/tranquility/latest.jsonl";
const ARCHIVE_URL = (build) => `https://developers.eveonline.com/static-data/tranquility/eve-online-static-data-${build}-jsonl.zip`;
const REQUIRED_DATASETS = ["categories.jsonl", "groups.jsonl", "types.jsonl", "typeMaterials.jsonl", "blueprints.jsonl", "typeDogma.jsonl"];

export function parseLatestBuild(text) {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const record = JSON.parse(line);
    const key = record?._key ?? record?.key;
    if (key !== "sde") continue;
    const candidate = record?.buildNumber ?? record?.build_number ?? record?._value ?? record?.value ?? record?.sde;
    const build = String(candidate ?? "").trim();
    if (/^\d+$/.test(build)) return build;
  }
  throw new Error("CCP latest.jsonl did not contain a numeric sde build record.");
}

export function parseOutputDirectoryArgument(args) {
  let outputDir = null;
  for (let index = 0; index < args.length; index++) {
    if (args[index] !== "--output-dir") throw new Error(`Unknown argument: ${args[index]}`);
    const value = args[index + 1];
    if (!value) throw new Error("--output-dir requires a path.");
    outputDir = path.resolve(value);
    index++;
  }
  return outputDir;
}

function sha256(filename) {
  const hash = createHash("sha256");
  hash.update(readFileSync(filename));
  return hash.digest("hex");
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "User-Agent": "New-Eden-Companion-SDE-Builder" } });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  return response.text();
}

async function download(url, filename) {
  const response = await fetch(url, { headers: { "User-Agent": "New-Eden-Companion-SDE-Builder" }, redirect: "follow" });
  if (!response.ok || !response.body) throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  await pipeline(response.body, createWriteStream(filename));
  return response.headers;
}

function findDatasetDirectory(root) {
  const queue = [root];
  while (queue.length) {
    const dir = queue.shift();
    if (REQUIRED_DATASETS.every((name) => existsSync(path.join(dir, name)))) return dir;
    const result = spawnSync(process.platform === "win32" ? "cmd.exe" : "find", process.platform === "win32" ? ["/c", "dir", "/b", "/ad", dir] : [dir, "-mindepth", "1", "-maxdepth", "1", "-type", "d"], { encoding: "utf8" });
    if (result.status !== 0) continue;
    const children = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const child of children) queue.push(process.platform === "win32" ? path.join(dir, child) : child);
  }
  throw new Error(`Extracted SDE does not contain all required datasets: ${REQUIRED_DATASETS.join(", ")}`);
}

function extractZip(archivePath, destination) {
  mkdirSync(destination, { recursive: true });
  const command = process.platform === "win32" ? "powershell.exe" : "unzip";
  const args = process.platform === "win32"
    ? ["-NoLogo", "-NoProfile", "-Command", `Expand-Archive -LiteralPath '${archivePath.replaceAll("'", "''")}' -DestinationPath '${destination.replaceAll("'", "''")}' -Force`]
    : ["-q", archivePath, "-d", destination];
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Failed to extract CCP SDE archive with ${command}.`);
}

function validateDatabase(filename, expectedBuild) {
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    const integrity = db.prepare("PRAGMA integrity_check").get();
    if (!integrity || Object.values(integrity)[0] !== "ok") throw new Error("SQLite integrity_check failed.");
    const foreignKeys = db.prepare("PRAGMA foreign_key_check").all();
    if (foreignKeys.length) throw new Error(`SQLite foreign_key_check found ${foreignKeys.length} violation(s).`);
    const metaRows = db.prepare("SELECT key, value FROM sde_meta").all();
    const meta = Object.fromEntries(metaRows.map((row) => [String(row.key), String(row.value)]));
    if (meta.sde_build !== String(expectedBuild)) throw new Error(`Database build ${meta.sde_build ?? "missing"} does not match expected CCP build ${expectedBuild}.`);
    if (meta.schema_version !== String(STATIC_DB_SCHEMA_VERSION)) throw new Error(`Unexpected static DB schema version ${meta.schema_version ?? "missing"}.`);
    const counts = {};
    for (const table of ["categories", "groups", "types", "blueprints", "blueprint_products", "type_skill_requirements"]) {
      const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get();
      counts[table] = Number(row?.count ?? 0);
      if (counts[table] <= 0) throw new Error(`Validation failed: ${table} is empty.`);
    }
    return { meta, counts };
  } finally {
    db.close();
  }
}

export async function buildCurrentSde({ outputDir = path.join(process.cwd(), "static") } = {}) {
  const latestText = await fetchText(LATEST_URL);
  const build = parseLatestBuild(latestText);
  const sourceUrl = ARCHIVE_URL(build);
  const tempRoot = path.join(os.tmpdir(), `nec-sde-${process.pid}-${Date.now()}`);
  const archivePath = path.join(tempRoot, `eve-online-static-data-${build}-jsonl.zip`);
  const extractRoot = path.join(tempRoot, "extracted");
  const outputPath = path.resolve(outputDir, "eve-static.db");
  const metadataPath = path.resolve(outputDir, "eve-static.metadata.json");
  const checksumPath = path.resolve(outputDir, "eve-static.db.sha256");

  mkdirSync(tempRoot, { recursive: true });
  mkdirSync(path.resolve(outputDir), { recursive: true });
  try {
    const headers = await download(sourceUrl, archivePath);
    extractZip(archivePath, extractRoot);
    const sourceDir = findDatasetDirectory(extractRoot);
    const lastModified = headers.get("last-modified");
    const createdAt = lastModified && !Number.isNaN(Date.parse(lastModified)) ? new Date(lastModified).toISOString() : new Date(0).toISOString();
    const buildResult = await buildStaticDatabase({ sourceDir, outputPath, buildNumber: build, createdAt });
    const validation = validateDatabase(outputPath, build);
    const databaseSha256 = sha256(outputPath);
    const archiveSha256 = sha256(archivePath);
    const metadata = {
      schemaVersion: STATIC_DB_SCHEMA_VERSION,
      sdeBuild: build,
      sourceFormat: "jsonl",
      latestMetadataUrl: LATEST_URL,
      sourceUrl,
      sourceArchiveSha256: archiveSha256,
      sourceLastModified: lastModified ?? null,
      databaseSha256,
      databaseBytes: readFileSync(outputPath).byteLength,
      validation: { integrityCheck: "ok", foreignKeyViolations: 0, counts: validation.counts },
      importerCounts: buildResult.counts,
    };
    writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    writeFileSync(checksumPath, `${databaseSha256}  eve-static.db\n`, "utf8");
    return { build, outputPath, metadataPath, checksumPath, metadata };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (match) => match.slice(1))) {
  try {
    const outputDir = parseOutputDirectoryArgument(process.argv.slice(2));
    const result = await buildCurrentSde(outputDir ? { outputDir } : undefined);
    console.log(`Built and validated CCP SDE ${result.build}: ${result.outputPath}`);
    console.log(`Metadata: ${result.metadataPath}`);
    console.log(`Checksum: ${result.checksumPath}`);
  } catch (error) {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  }
}
