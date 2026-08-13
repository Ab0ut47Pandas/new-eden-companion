import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { getSession, type EveSession } from "@/lib/auth/session-store";
import { validAccessToken } from "@/lib/auth/sso";
import { EsiError } from "@/lib/esi/client";

export async function mapSession(
  request: NextRequest,
  requiredScope?: string,
): Promise<{ session: EveSession; token: string }> {
  const sessionId = request.cookies.get("eve_session")?.value;
  const session = sessionId ? getSession(sessionId) : null;
  if (!session) throw new MapApiError("Connect your EVE character to use the live map.", 401);
  if (requiredScope && !session.scopes.includes(requiredScope)) {
    throw new MapApiError(`Reconnect EVE to grant the ${requiredScope} permission.`, 403);
  }
  return { session, token: await validAccessToken(session) };
}

export class MapApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export function mapApiError(error: unknown): NextResponse {
  console.error("EVE map request failed", error);
  if (error instanceof MapApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof EsiError) {
    const status = error.status >= 400 && error.status < 500 ? error.status : 502;
    const message = error.status === 404
      ? "EVE could not find a route between those systems."
      : error.status === 403
        ? "EVE rejected this action. Reconnect the character and check its scopes."
        : "EVE's route service did not answer successfully. Try again in a moment.";
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "The map request failed." },
    { status: 500 },
  );
}

