import "server-only";

import { statSync } from "node:fs";

import {
  getStaticDatabaseMetadata,
  staticDatabaseAvailable,
  staticDatabasePath,
} from "@/lib/sde/database";
import { staticDatabaseAgeSeconds } from "@/lib/sde/health-core";

export interface StaticDatabaseHealth {
  available: boolean;
  schemaVersion: number | null;
  sdeBuild: number | null;
  ageSeconds: number | null;
  createdAt: string | null;
  placeholderTypes: number | null;
  status: "ok" | "missing" | "invalid";
  error?: string;
}

export function getStaticDatabaseHealth(now = new Date()): StaticDatabaseHealth {
  if (!staticDatabaseAvailable()) {
    return {
      available: false,
      schemaVersion: null,
      sdeBuild: null,
      ageSeconds: null,
      createdAt: null,
      placeholderTypes: null,
      status: "missing",
    };
  }

  try {
    const metadata = getStaticDatabaseMetadata();
    const createdAt = metadata.createdAt === "unknown" ? null : metadata.createdAt;
    const fileMtimeMs = statSync(staticDatabasePath()).mtimeMs;

    return {
      available: true,
      schemaVersion: metadata.schemaVersion,
      sdeBuild: metadata.sdeBuild,
      ageSeconds: staticDatabaseAgeSeconds(now, createdAt, fileMtimeMs),
      createdAt,
      placeholderTypes: metadata.placeholderTypes,
      status: "ok",
    };
  } catch (error) {
    return {
      available: true,
      schemaVersion: null,
      sdeBuild: null,
      ageSeconds: null,
      createdAt: null,
      placeholderTypes: null,
      status: "invalid",
      error: error instanceof Error ? error.message : "The EVE static database could not be inspected.",
    };
  }
}
