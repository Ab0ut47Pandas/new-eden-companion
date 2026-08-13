import { NextResponse } from "next/server";

import { getShipCatalog } from "@/lib/ships/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getShipCatalog());
  } catch (error) {
    console.error("Unable to build the ESI ship catalog", error);
    return NextResponse.json({ error: "The EVE ship catalog is temporarily unavailable." }, { status: 503 });
  }
}
