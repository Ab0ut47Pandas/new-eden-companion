import { cookies } from "next/headers";

import { AbyssalActivityShortcut } from "@/components/abyssal-activity-shortcut";
import { AssetCleanupShortcut } from "@/components/asset-cleanup-shortcut";
import { DashboardShell } from "@/components/dashboard-shell";
import { ExplorationActivityShortcut } from "@/components/exploration-activity-shortcut";
import { FirstRunOnboarding } from "@/components/first-run-onboarding";
import { FittingBuilderShortcut } from "@/components/fitting-builder-shortcut";
import { HaulingActivityShortcut } from "@/components/hauling-activity-shortcut";
import { IndustryActivityShortcut } from "@/components/industry-activity-shortcut";
import { ItemExplorerShortcut } from "@/components/item-explorer-shortcut";
import { MissionActivityShortcut } from "@/components/mission-activity-shortcut";
import { ProgressionHome } from "@/components/progression-home";
import { SkillExportButton } from "@/components/skill-export-button";
import { UpdateControl } from "@/components/update-control";
import { getSession } from "@/lib/auth/session-store";
import { validAccessToken } from "@/lib/auth/sso";
import { getConfigurationIssues } from "@/lib/config";
import { demoDashboard } from "@/lib/dashboard/demo";
import { buildLiveDashboard } from "@/lib/dashboard/live";
import {
  onboardingComplete,
  onboardingPreferences,
  ONBOARDING_COMPLETE_COOKIE,
  SESSION_LENGTH_COOKIE,
  SESSION_RISK_COOKIE,
} from "@/lib/onboarding/preferences";
import { buildDashboardSuggestedSession } from "@/lib/session/dashboard-suggested-session";

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
  const configured = getConfigurationIssues().length === 0;
  const preferences = onboardingPreferences({
    sessionLength: cookieStore.get(SESSION_LENGTH_COOKIE)?.value,
    risk: cookieStore.get(SESSION_RISK_COOKIE)?.value,
  });
  const firstRunComplete = connected || onboardingComplete(cookieStore.get(ONBOARDING_COMPLETE_COOKIE)?.value);
  const suggestedSession = buildDashboardSuggestedSession(dashboard, preferences);

  return (
    <>
      {!firstRunComplete && <FirstRunOnboarding configured={configured} />}
      {firstRunComplete && (
        <ProgressionHome
          result={suggestedSession}
          characterName={dashboard.character.name}
          connected={connected}
          dataGapCount={dashboard.dataQuality.unavailable.length}
        />
      )}
      <div id="detailed-dashboard">
        <DashboardShell
          data={dashboard}
          configured={configured}
          connected={connected}
          authStatus={authStatus}
          authDetail={detail}
          liveError={liveError}
        />
      </div>
      <ItemExplorerShortcut />
      <AssetCleanupShortcut />
      <AbyssalActivityShortcut />
      <HaulingActivityShortcut />
      <IndustryActivityShortcut />
      <ExplorationActivityShortcut />
      <MissionActivityShortcut />
      <FittingBuilderShortcut />
      <SkillExportButton
        characterName={dashboard.character.name}
        skills={dashboard.skills}
        connected={connected}
      />
      <UpdateControl />
    </>
  );
}
