import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildStaticDatabase as buildBaseStaticDatabase } from "./build-static-db.mjs";
import {
  augmentPlanetaryIndustry,
  PLANETARY_INDUSTRY_DATASETS,
  PLANETARY_INDUSTRY_SCHEMA_VERSION,
} from "./augment-planetary-industry.mjs";
import {
  augmentRouteTopology,
  ROUTE_TOPOLOGY_DATASETS,
} from "./augment-route-topology.mjs";

export const STATIC_DB_SCHEMA_VERSION = PLANETARY_INDUSTRY_SCHEMA_VERSION;

export async function buildStaticDatabase(options) {
  const result = await buildBaseStaticDatabase(options);
  const topologyCounts = await augmentRouteTopology({
    sourceDir: options.sourceDir,
    databasePath: result.outputPath,
  });
  const planetaryCounts = await augmentPlanetaryIndustry({
    sourceDir: options.sourceDir,
    databasePath: result.outputPath,
  });
  return {
    ...result,
    counts: {
      ...result.counts,
      ...topologyCounts,
      ...planetaryCounts,
    },
    routeDatasets: ROUTE_TOPOLOGY_DATASETS,
    planetaryDatasets: PLANETARY_INDUSTRY_DATASETS,
  };
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) continue;
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for ${current}`);
    values.set(current.slice(2), next);
    index += 1;
  }
  const sourceDir = values.get("source");
  const outputPath = values.get("output") ?? path.join(process.cwd(), "static", "eve-static.db");
  const buildNumber = values.get("build");
  if (!sourceDir) throw new Error("Usage: npm run sde:build -- --source <extracted-jsonl-dir> --build <sde-build> [--output <db-path>]");
  return { sourceDir, outputPath, buildNumber };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  try {
    const result = await buildStaticDatabase(parseArguments(process.argv.slice(2)));
    console.log(`Built ${result.outputPath} from CCP SDE ${result.buildNumber} with route topology and Planetary Industry schematics.`);
    for (const [name, count] of Object.entries(result.counts)) console.log(`${name}: ${count}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
