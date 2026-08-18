import { NextResponse } from "next/server";

import { getStaticDatabaseHealth } from "@/lib/sde/health";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getStaticDatabaseHealth());
}
