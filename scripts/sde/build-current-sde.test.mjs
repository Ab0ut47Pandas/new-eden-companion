import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseLatestBuild, parseOutputDirectoryArgument } from "./build-current-sde.mjs";

describe("parseLatestBuild", () => {
  it("reads CCP's current buildNumber metadata shape", () => {
    expect(parseLatestBuild('{"_key":"sde","buildNumber":3470007,"releaseDate":"2026-08-17T11:26:56Z"}\n')).toBe("3470007");
  });

  it("also accepts scalar JSON Lines records", () => {
    expect(parseLatestBuild('{"_key":"client","_value":123}\n{"_key":"sde","_value":3424810}\n')).toBe("3424810");
  });

  it("rejects metadata without a numeric sde record", () => {
    expect(() => parseLatestBuild('{"_key":"sde","buildNumber":"latest"}\n')).toThrow(/numeric sde build/i);
  });
});

describe("parseOutputDirectoryArgument", () => {
  it("accepts an isolated output directory for runtime updates", () => {
    expect(parseOutputDirectoryArgument(["--output-dir", "staging"]))
      .toBe(path.resolve("staging"));
  });

  it("rejects missing values and unknown arguments", () => {
    expect(() => parseOutputDirectoryArgument(["--output-dir"])).toThrow(/requires a path/i);
    expect(() => parseOutputDirectoryArgument(["--wat"])).toThrow(/unknown argument/i);
  });
});
