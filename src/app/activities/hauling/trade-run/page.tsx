import { cookies } from "next/headers";

import { LiveDataUnavailable } from "@/components/live-data-unavailable";
import { TradeRunDiscoveryView } from "@/components/trade-run-discovery-view";
import { getSession } from "@/lib/auth/session-store";
import { validAccessToken } from "@/lib/auth/sso";
import { demoDashboard } from "@/lib/dashboard/demo";
import { buildLiveDashboard } from "@/lib/dashboard/live";

export const dynamic = "force-dynamic";

export default async function TradeRunPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("eve_session")?.value;

  if (!sessionId) {
    const dashboard = demoDashboard();
    return <TradeRunDiscoveryView data={dashboard} connected={false} />;
  }

  try {
    const session = getSession(sessionId);
    if (!session) {
      return (
        <LiveDataUnavailable
          title="Trade-run planner"
          detail="NEC found a character-session cookie, but the corresponding local session is unavailable. Your current wallet and location cannot be verified."
          backHref="/activities/hauling"
          backLabel="Hauling readiness"
        />
      );
    }
    const token = await validAccessToken(session);
    const dashboard = await buildLiveDashboard({
      characterId: session.characterId,
      characterName: session.characterName,
      token,
    });
    return <TradeRunDiscoveryView data={dashboard} connected />;
  } catch (error) {
    console.warn("Unable to build live trade-run discovery; live evidence remains unavailable", error instanceof Error ? error.name : "unknown error");
    return (
      <LiveDataUnavailable
        title="Trade-run planner"
        detail="NEC could not refresh the connected character evidence needed for this trade-run plan. Wallet and current-location evidence remain unverified until live access is restored."
        backHref="/activities/hauling"
        backLabel="Hauling readiness"
      />
    );
  }
}
