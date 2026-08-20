import { describe, expect, it } from "vitest";

import { safeAuthErrorSummary } from "./security";

describe("safeAuthErrorSummary", () => {
  it("never exposes access tokens, refresh tokens, authorization codes, PKCE verifiers, or session IDs from Error messages", () => {
    const secrets = [
      "eyJhbGciOiJSUzI1NiJ9.access-token-payload.signature",
      "refresh-token-value-should-never-leak",
      "authorization-code-should-never-leak",
      "pkce-verifier-should-never-leak",
      "session-cookie-id-should-never-leak",
    ];
    const summary = safeAuthErrorSummary(new Error(secrets.join(" | ")));
    const serialized = JSON.stringify(summary);

    expect(summary).toEqual({ errorType: "Error" });
    for (const secret of secrets) expect(serialized).not.toContain(secret);
  });

  it("does not stringify arbitrary thrown objects that may contain credentials", () => {
    const summary = safeAuthErrorSummary({
      access_token: "access-secret",
      refresh_token: "refresh-secret",
      code_verifier: "pkce-secret",
    });

    expect(summary).toEqual({ errorType: "object" });
    expect(JSON.stringify(summary)).not.toMatch(/access-secret|refresh-secret|pkce-secret/);
  });
});
