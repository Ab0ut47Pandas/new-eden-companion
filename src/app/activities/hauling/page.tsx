import { cookies } from "next/headers";

import { HaulingReadinessView } from "@/components/hauling-readiness-view";
import { LiveDataUnavailable } from "@/components/live-data-unavailable";
import { getSession } from "@/lib/auth/session-store";
import { validAccessToken } from "@/lib/auth/sso";
import { demoDashboard } from "@/lib/dashboard/demo";
import { buildLiveDashboard } from "@/lib/dashboard/live";

export const dynamic = "force-dynamic";

export default async function HaulingActivityPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("eve_session")?.value;

  if (!sessionId) {
    const dashboard = demoDashboard();
    return <HaulingReadinessView data={dashboard} connected={false} />;
  }

  try {
    const session = getSession(sessionId);
    if (!session) {
      return (
        <LiveDataUnavailable
          title="Hauling readiness"
          detail="NEC found a character-session cookie, but the corresponding local session is unavailable. Your current skills, wallet, ships, and location cannot be verified."
        />
      );
    }
    const token = await validAccessToken(session);
    const dashboard = await buildLiveDashboard({
      characterId: session.characterId,
      characterName: session.characterName,
      token,
    });
    return <HaulingReadinessView data={dashboard} connected />;
  } catch (error) {
    console.warn("Unable to build live hauling readiness; live evidence remains unavailable", error instanceof Error ? error.name : "unknown error");
    return (
      <LiveDataUnavailable
        title="Hauling readiness"
        detail="NEC could not refresh the connected character evidence needed for hauling. Your current skills, wallet, ships, and location remain unverified until live access is restored."
      />
    );
  }
}
