import { NextResponse } from "next/server";

import { getStaticDatabaseFreshness, updateStaticDatabase } from "@/lib/sde/update";

export const dynamic = "force-dynamic";

let updateRunning = false;

export async function GET() {
  try {
    return NextResponse.json(await getStaticDatabaseFreshness());
  } catch (error) {
    const message = error instanceof Error ? error.message : "The static-data freshness check failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST() {
  if (updateRunning) {
    return NextResponse.json({ error: "A static-data update is already running." }, { status: 409 });
  }

  updateRunning = true;
  try {
    const result = await updateStaticDatabase();
    return NextResponse.json(result, { status: result.updated ? 200 : 409 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The static-data update failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    updateRunning = false;
  }
}
