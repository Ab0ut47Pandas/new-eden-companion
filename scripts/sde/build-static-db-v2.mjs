import { buildStaticDatabase as buildBaseStaticDatabase } from "./build-static-db.mjs";
import {
  augmentRouteTopology,
  ROUTE_TOPOLOGY_DATASETS,
  ROUTE_TOPOLOGY_SCHEMA_VERSION,
} from "./augment-route-topology.mjs";

export const STATIC_DB_SCHEMA_VERSION = ROUTE_TOPOLOGY_SCHEMA_VERSION;

export async function buildStaticDatabase(options) {
  const result = await buildBaseStaticDatabase(options);
  const topologyCounts = await augmentRouteTopology({
    sourceDir: options.sourceDir,
    databasePath: result.outputPath,
  });
  return {
    ...result,
    counts: {
      ...result.counts,
      ...topologyCounts,
    },
    routeDatasets: ROUTE_TOPOLOGY_DATASETS,
  };
}
