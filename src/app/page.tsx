import { cookies } from "next/headers";

import { AbyssalActivityShortcut } from "@/components/abyssal-activity-shortcut";
import { DashboardShell } from "@/components/dashboard-shell";
import { ItemExplorerShortcut } from "@/components/item-explorer-shortcut";
import { SkillExportButton } from "@/components/skill-export-button";
import { UpdateControl } from "@/components/update-control";
import { getSession } from "@/lib/auth/session-store";
import { validAccessToken } from "@/lib/auth/sso";
import { getConfigurationIssues } from "@/lib/config";
import { demoDashboard } from "@/lib/dashboard/demo";
import { buildLiveDashboard } from "@/lib/dashboard/live";

export const dynamic = "force-dynamic";

interface HomeProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("eve_session")?.value;
  let session = null;
  let dashboard = demoDashboard();
  let liveError: string | undefined;

  if (sessionId) {
    try {
      session = getSession(sessionId);
    } catch (error) {
      console.warn("The local EVE session could not be decrypted", error);
      liveError = "The local session no longer matches this encryption secret. Reconnect the character to create a new session.";
    }
  }

  if (session) {
    try {
      const token = await validAccessToken(session);
      dashboard = await buildLiveDashboard({
        characterId: session.characterId,
        characterName: session.characterName,
        token,
      });
    } catch (error) {
      console.error("Unable to build the live dashboard", error);
      liveError = "Your EVE session could not be refreshed. Reconnect the character to restore live data.";
    }
  }

  const authStatus = typeof params.auth === "string" ? params.auth : undefined;
  const detail = typeof params.detail === "string" ? params.detail : undefined;
  const connected = dashboard.mode === "live";

  return (
    <>
      <DashboardShell
        data={dashboard}
        configured={getConfigurationIssues().length === 0}
        connected={connected}
        authStatus={authStatus}
        authDetail={detail}
        liveError={liveError}
      />
      <ItemExplorerShortcut />
      <AbyssalActivityShortcut />
      <SkillExportButton
        characterName={dashboard.character.name}
        skills={dashboard.skills}
        connected={connected}
      />
      <UpdateControl />
    </>
  );
}