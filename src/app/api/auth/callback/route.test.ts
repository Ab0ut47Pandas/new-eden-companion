import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const exchangeAuthorizationCode = vi.fn();

vi.mock("@/lib/auth/sso", () => ({
  exchangeAuthorizationCode,
  tokenCharacter: vi.fn(),
}));
vi.mock("@/lib/auth/session-store", () => ({ saveSession: vi.fn() }));

import { GET } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
  exchangeAuthorizationCode.mockReset();
});

describe("EVE SSO callback credential containment", () => {
  it("returns only a generic browser error and logs no thrown credential values", async () => {
    const secrets = {
      access: "access-token-must-not-leak",
      refresh: "refresh-token-must-not-leak",
      code: "authorization-code-must-not-leak",
      verifier: "pkce-verifier-must-not-leak",
      session: "session-id-must-not-leak",
    };
    exchangeAuthorizationCode.mockRejectedValueOnce(
      new Error(`${secrets.access} ${secrets.refresh} ${secrets.code} ${secrets.verifier} ${secrets.session}`),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const request = new NextRequest(
      `http://localhost:3000/api/auth/callback?code=${secrets.code}&state=expected-state`,
      {
        headers: {
          cookie: `eve_oauth_state=expected-state; eve_pkce_verifier=${secrets.verifier}`,
        },
      },
    );

    const response = await GET(request);
    const location = response.headers.get("location") ?? "";
    const logged = JSON.stringify(log.mock.calls);

    expect(location).toBe("http://localhost:3000/?auth=callback-failed");
    expect(log).toHaveBeenCalledWith("EVE SSO callback failed", { errorType: "Error" });
    for (const secret of Object.values(secrets)) {
      expect(location).not.toContain(secret);
      expect(logged).not.toContain(secret);
    }
  });
});
