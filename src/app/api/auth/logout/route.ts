import { NextRequest, NextResponse } from "next/server";

import { deleteSession } from "@/lib/auth/session-store";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const sessionId = request.cookies.get("eve_session")?.value;
  if (sessionId) deleteSession(sessionId);
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.delete("eve_session");
  return response;
}
