import { describe, expect, it } from "vitest";
import { parseLatestBuild } from "./build-current-sde.mjs";

describe("parseLatestBuild", () => {
  it("reads CCP JSON Lines scalar records", () => {
    expect(parseLatestBuild('{"_key":"client","_value":123}\n{"_key":"sde","_value":3424810}\n')).toBe("3424810");
  });

  it("rejects metadata without a numeric sde record", () => {
    expect(() => parseLatestBuild('{"_key":"sde","_value":"latest"}\n')).toThrow(/numeric sde build/i);
  });
});
