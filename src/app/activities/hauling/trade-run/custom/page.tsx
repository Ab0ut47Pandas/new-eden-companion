import { cookies } from "next/headers";

import { TradeRunPlannerView } from "@/components/trade-run-planner-view";
import { getSession } from "@/lib/auth/session-store";
import { validAccessToken } from "@/lib/auth/sso";
import { demoDashboard } from "@/lib/dashboard/demo";
import { buildLiveDashboard } from "@/lib/dashboard/live";

export const dynamic = "force-dynamic";

export default async function CustomTradeRunPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("eve_session")?.value;
  let dashboard = demoDashboard();

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
      }
    } catch (error) {
      console.warn("Unable to build live custom trade-run planner; falling back to demo data", error);
    }
  }

  return <TradeRunPlannerView data={dashboard} connected={dashboard.mode === "live"} />;
}
