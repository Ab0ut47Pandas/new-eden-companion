import { cookies } from "next/headers";

import { AssetCleanupView } from "@/components/asset-cleanup-view";
import { getSession } from "@/lib/auth/session-store";
import { validAccessToken } from "@/lib/auth/sso";
import { demoDashboard } from "@/lib/dashboard/demo";
import { buildLiveDashboard } from "@/lib/dashboard/live";
import { esiPaginated } from "@/lib/esi/client";
import type { EsiBlueprint } from "@/lib/esi/types";

export const dynamic = "force-dynamic";

export default async function AssetCleanupPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("eve_session")?.value;
  let dashboard = demoDashboard();
  let blueprints: EsiBlueprint[] = [];

  if (sessionId) {
    try {
      const session = getSession(sessionId);
      if (session) {
        const token = await validAccessToken(session);
        dashboard = await buildLiveDashboard({
          characterId: session.characterId,
          characterName: session.characterName,
          token,
        });
        try {
          blueprints = await esiPaginated<EsiBlueprint>(`/characters/${session.characterId}/blueprints`, token, 20);
        } catch (error) {
          console.warn("Blueprint preservation evidence unavailable for asset cleanup", error);
        }
      }
    } catch (error) {
      console.warn("Unable to build live asset cleanup view; falling back to demo data", error);
    }
  }

  return <AssetCleanupView data={dashboard} blueprints={blueprints} />;
}
