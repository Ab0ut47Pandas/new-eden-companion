import "server-only";

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

import { config } from "@/lib/config";
import { saveSession, type EveSession, type TokenBundle } from "@/lib/auth/session-store";

interface SsoMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  issuer: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
}

let metadataPromise: Promise<SsoMetadata> | undefined;

async function getMetadata(): Promise<SsoMetadata> {
  metadataPromise ??= fetch(
    "https://login.eveonline.com/.well-known/oauth-authorization-server",
    { next: { revalidate: 86_400 } },
  ).then(async (response) => {
    if (!response.ok) throw new Error("EVE SSO metadata is unavailable");
    return (await response.json()) as SsoMetadata;
  });
  return metadataPromise;
}

function formBody(values: Record<string, string>): URLSearchParams {
  const body = new URLSearchParams();
  for (const [name, value] of Object.entries(values)) body.set(name, value);
  return body;
}

async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const metadata = await getMetadata();
  const jwks = createRemoteJWKSet(new URL(metadata.jwks_uri));
  const { payload } = await jwtVerify(token, jwks);

  if (![metadata.issuer, "https://login.eveonline.com/", "login.eveonline.com"].includes(String(payload.iss))) {
    throw new Error("EVE SSO token has an unexpected issuer");
  }
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audience.includes(config.eveClientId) || !audience.includes("EVE Online")) {
    throw new Error("EVE SSO token has an unexpected audience");
  }
  return payload;
}

export async function exchangeAuthorizationCode(
  code: string,
  codeVerifier: string,
): Promise<{ tokens: TokenBundle; payload: JWTPayload }> {
  const metadata = await getMetadata();
  const response = await fetch(metadata.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody({
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      client_id: config.eveClientId,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`EVE SSO code exchange failed (${response.status})`);
  const token = (await response.json()) as TokenResponse;
  if (!token.refresh_token) throw new Error("EVE SSO did not return a refresh token");
  const payload = await verifyAccessToken(token.access_token);
  return {
    payload,
    tokens: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + token.expires_in * 1_000,
    },
  };
}

export function tokenCharacter(payload: JWTPayload): {
  characterId: number;
  characterName: string;
  scopes: string[];
} {
  const subject = String(payload.sub ?? "");
  const match = /^CHARACTER:EVE:(\d+)$/.exec(subject);
  if (!match) throw new Error("EVE SSO token did not identify a character");
  return {
    characterId: Number(match[1]),
    characterName: String(payload.name ?? "Unknown capsuleer"),
    scopes: Array.isArray(payload.scp) ? payload.scp.map(String) : [],
  };
}

export async function validAccessToken(session: EveSession): Promise<string> {
  if (session.tokens.expiresAt > Date.now() + 60_000) return session.tokens.accessToken;

  const metadata = await getMetadata();
  const response = await fetch(metadata.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody({
      grant_type: "refresh_token",
      refresh_token: session.tokens.refreshToken,
      client_id: config.eveClientId,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`EVE SSO token refresh failed (${response.status})`);
  const token = (await response.json()) as TokenResponse;
  await verifyAccessToken(token.access_token);
  session.tokens = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? session.tokens.refreshToken,
    expiresAt: Date.now() + token.expires_in * 1_000,
  };
  session.updatedAt = Date.now();
  saveSession(session);
  return session.tokens.accessToken;
}
