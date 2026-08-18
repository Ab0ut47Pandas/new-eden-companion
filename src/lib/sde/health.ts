import "server-only";

import { statSync } from "node:fs";

import {
  getStaticDatabaseMetadata,
  staticDatabaseAvailable,
  staticDatabasePath,
} from "@/lib/sde/database";

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
    const createdAtMs = Date.parse(metadata.createdAt);
    const fileMtimeMs = statSync(staticDatabasePath()).mtimeMs;
    const referenceMs = Number.isFinite(createdAtMs) ? createdAtMs : fileMtimeMs;
    const ageSeconds = Math.max(0, Math.floor((now.getTime() - referenceMs) / 1000));

    return {
      available: true,
      schemaVersion: metadata.schemaVersion,
      sdeBuild: metadata.sdeBuild,
      ageSeconds,
      createdAt: metadata.createdAt === "unknown" ? null : metadata.createdAt,
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
