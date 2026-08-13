import { randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { exchangeAuthorizationCode, tokenCharacter } from "@/lib/auth/sso";
import { saveSession } from "@/lib/auth/session-store";

export const runtime = "nodejs";

function sameValue(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const expectedState = request.cookies.get("eve_oauth_state")?.value;
  const verifier = request.cookies.get("eve_pkce_verifier")?.value;

  if (error) {
    const destination = new URL("/", request.url);
    destination.searchParams.set("auth", "denied");
    return NextResponse.redirect(destination);
  }
  if (!code || !returnedState || !expectedState || !verifier || !sameValue(returnedState, expectedState)) {
    const destination = new URL("/", request.url);
    destination.searchParams.set("auth", "invalid-state");
    return NextResponse.redirect(destination);
  }

  try {
    const { tokens, payload } = await exchangeAuthorizationCode(code, verifier);
    const character = tokenCharacter(payload);
    const sessionId = randomBytes(32).toString("base64url");
    const now = Date.now();
    saveSession({
      id: sessionId,
      ...character,
      tokens,
      createdAt: now,
      updatedAt: now,
    });

    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("eve_session", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    const expiredCookie = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/api/auth/callback",
      maxAge: 0,
    };
    response.cookies.set("eve_oauth_state", "", expiredCookie);
    response.cookies.set("eve_pkce_verifier", "", expiredCookie);
    return response;
  } catch (callbackError) {
    console.error("EVE SSO callback failed", callbackError);
    const destination = new URL("/", request.url);
    destination.searchParams.set("auth", "callback-failed");
    return NextResponse.redirect(destination);
  }
}
