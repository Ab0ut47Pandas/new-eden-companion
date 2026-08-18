import { describe, expect, it } from "vitest";

import { staticDatabaseAgeSeconds } from "@/lib/sde/health-core";

describe("staticDatabaseAgeSeconds", () => {
  it("uses the database creation timestamp when valid", () => {
    const now = new Date("2026-08-18T08:00:00.000Z");
    expect(staticDatabaseAgeSeconds(now, "2026-08-18T07:00:00.000Z", 0)).toBe(3600);
  });

  it("falls back to the database file mtime when creation metadata is unavailable", () => {
    const now = new Date("2026-08-18T08:00:00.000Z");
    const fileMtime = new Date("2026-08-18T07:30:00.000Z").getTime();
    expect(staticDatabaseAgeSeconds(now, null, fileMtime)).toBe(1800);
  });

  it("never reports a negative age for future-skewed timestamps", () => {
    const now = new Date("2026-08-18T08:00:00.000Z");
    expect(staticDatabaseAgeSeconds(now, "2026-08-18T09:00:00.000Z", 0)).toBe(0);
  });
});
