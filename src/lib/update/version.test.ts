import { describe, expect, it } from "vitest";

import { compareStableVersions, normalizeStableVersion } from "@/lib/update/version";

describe("update version helpers", () => {
  it("normalizes stable GitHub tags", () => {
    expect(normalizeStableVersion("v0.1.3")).toBe("0.1.3");
    expect(normalizeStableVersion("2.4.10")).toBe("2.4.10");
    expect(normalizeStableVersion("v0.2.0-beta.1")).toBeNull();
  });

  it("compares semantic version components numerically", () => {
    expect(compareStableVersions("0.1.3", "0.1.2")).toBe(1);
    expect(compareStableVersions("0.10.0", "0.9.9")).toBe(1);
    expect(compareStableVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareStableVersions("1.0.0", "1.0.1")).toBe(-1);
  });
});
