import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { EVE_SCOPE_STRING, RECOMMENDED_EVE_SCOPE_STRING } from "@/lib/auth/scopes";
import { assertConfigured, config } from "@/lib/config";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    assertConfigured();
  } catch (error) {
    const url = new URL("/", request.url);
    url.searchParams.set("auth", "not-configured");
    url.searchParams.set("detail", error instanceof Error ? error.message : "Configuration is incomplete");
    return NextResponse.redirect(url);
  }

  const requestUrl = new URL(request.url);
  const accessProfile = requestUrl.searchParams.get("profile") === "full" ? "full" : "recommended";
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authorize = new URL("https://login.eveonline.com/v2/oauth/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("redirect_uri", config.eveRedirectUri);
  authorize.searchParams.set("client_id", config.eveClientId);
  authorize.searchParams.set("scope", accessProfile === "full" ? EVE_SCOPE_STRING : RECOMMENDED_EVE_SCOPE_STRING);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(authorize);
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set("eve_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/api/auth/callback",
    maxAge: 600,
  });
  response.cookies.set("eve_pkce_verifier", verifier, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/api/auth/callback",
    maxAge: 600,
  });
  return response;
}
