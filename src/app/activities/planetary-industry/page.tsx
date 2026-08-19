import { AlertTriangle, ArrowLeft, CheckCircle2, CircleHelp, Orbit, RefreshCw } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import styles from "./planetary-industry.module.css";
import { getSession } from "@/lib/auth/session-store";
import { validAccessToken } from "@/lib/auth/sso";
import { esi, resolveNames } from "@/lib/esi/client";
import type { EsiPlanetSummary } from "@/lib/esi/types";
import {
  assessPlanetColony,
  type ColonyAttentionSeverity,
  type ColonyReadiness,
  type PlanetColonyDetail,
} from "@/lib/pi/colony-health";

export const dynamic = "force-dynamic";

interface ViewerState {
  connected: boolean;
  summaries: EsiPlanetSummary[] | null;
  colonies: ColonyReadiness[];
  names: Map<number, string>;
  detailFailures: number;
}

function severityClass(severity: ColonyAttentionSeverity): string {
  switch (severity) {
    case "ok": return styles.ok;
    case "warning": return styles.warning;
    case "unknown": return styles.unknown;
    default: return styles.info;
  }
}

function statusLabel(status: ColonyReadiness["status"]): string {
  if (status === "attention") return "Needs attention";
  if (status === "unknown") return "Partly unknown";
  return "No obvious issue";
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString() : "Unknown update time";
}

async function viewerState(): Promise<ViewerState> {
  const sessionId = (await cookies()).get("eve_session")?.value;
  if (!sessionId) return { connected: false, summaries: null, colonies: [], names: new Map(), detailFailures: 0 };

  const session = getSession(sessionId);
  if (!session) return { connected: false, summaries: null, colonies: [], names: new Map(), detailFailures: 0 };

  try {
    const token = await validAccessToken(session);
    let summaries: EsiPlanetSummary[];
    try {
      summaries = await esi<EsiPlanetSummary[]>(`/characters/${session.characterId}/planets`, { token });
    } catch (error) {
      console.warn("PI-02 colony summaries unavailable", error);
      return { connected: true, summaries: null, colonies: [], names: new Map(), detailFailures: 0 };
    }

    const details = await Promise.all(summaries.map(async (summary) => {
      try {
        return await esi<PlanetColonyDetail>(`/characters/${session.characterId}/planets/${summary.planet_id}`, { token });
      } catch (error) {
        console.warn(`PI-02 colony detail unavailable for planet ${summary.planet_id}`, error);
        return null;
      }
    }));

    const colonies = summaries.map((summary, index) => assessPlanetColony(summary, details[index] ?? null));
    const ids = [...new Set(summaries.flatMap((summary) => [summary.planet_id, summary.solar_system_id]))];
    let names = new Map<number, string>();
    try {
      names = await resolveNames(ids);
    } catch (error) {
      console.warn("PI-02 colony names unavailable", error);
    }
    return {
      connected: true,
      summaries,
      colonies,
      names,
      detailFailures: details.filter((detail) => detail === null).length,
    };
  } catch (error) {
    console.warn("PI-02 session unavailable", error);
    return { connected: true, summaries: null, colonies: [], names: new Map(), detailFailures: 0 };
  }
}

export default async function PlanetaryIndustryPage() {
  const state = await viewerState();

  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <header className={styles.header}>
        <div>
          <h1>Planetary Industry</h1>
          <p>Colony attention from the ESI-visible snapshot: extractors, configured routes, factories, and stored contents.</p>
        </div>
        {state.connected ? (
          <Link className={styles.action} href="/activities/planetary-industry">
            <RefreshCw size={16} /> Refresh snapshot
          </Link>
        ) : null}
      </header>

      {!state.connected ? (
        <section className={styles.notice}>
          <h2>Connect your EVE character</h2>
          <p>PI colony state is character-private ESI data. Connect a character before NEC can inspect your colonies.</p>
          <Link className={styles.action} href="/api/auth/login?profile=recommended">Connect EVE</Link>
        </section>
      ) : state.summaries === null ? (
        <section className={styles.notice}>
          <h2>Planetary Industry permission is unavailable</h2>
          <p>
            Your current login could not read the character Planetary Industry routes. Existing sessions created before PI support may need to be re-authorized with the recommended access profile.
          </p>
          <Link className={styles.action} href="/api/auth/login?profile=recommended">Reconnect EVE permissions</Link>
        </section>
      ) : state.summaries.length === 0 ? (
        <section className={styles.notice}>
          <h2>No colonies returned</h2>
          <p>ESI returned an empty colony list for this character. NEC will not infer whether you have never created a colony or whether one existed in the past.</p>
        </section>
      ) : (
        <>
          {state.detailFailures > 0 ? (
            <section className={styles.notice}>
              <strong>{state.detailFailures} colony snapshot{state.detailFailures === 1 ? "" : "s"} could not be read.</strong>
              <p>Those colonies remain Partly unknown rather than being treated as healthy or broken.</p>
            </section>
          ) : null}

          <section className={styles.grid} aria-label="Planetary colonies">
            {state.colonies.map((colony) => {
              const planetName = state.names.get(colony.planetId) ?? `Planet ${colony.planetId}`;
              const systemName = state.names.get(colony.solarSystemId) ?? `System ${colony.solarSystemId}`;
              const StatusIcon = colony.status === "attention" ? AlertTriangle : colony.status === "unknown" ? CircleHelp : CheckCircle2;
              return (
                <article className={styles.card} key={colony.planetId}>
                  <h2>{planetName}</h2>
                  <p>{systemName} · {colony.planetType}</p>
                  <div className={styles.meta}>
                    <span className={colony.status === "attention" ? styles.warning : colony.status === "unknown" ? styles.unknown : styles.ok}>
                      <StatusIcon size={14} /> {statusLabel(colony.status)}
                    </span>
                    <span className={styles.pill}>{colony.pinCount} pins</span>
                    <span className={styles.pill}>{colony.routeCount} routes</span>
                    <span className={styles.pill}>{colony.extractorCount} extractors</span>
                    <span className={styles.pill}>{colony.factoryCount} factories</span>
                  </div>
                  <p className={styles.small}>ESI colony last update: {formatDate(colony.lastUpdate)}</p>
                  <ul className={styles.attentionList}>
                    {colony.attention.map((item, index) => (
                      <li className={styles.attentionItem} key={`${item.pinId ?? "colony"}-${item.category}-${index}`}>
                        <span className={severityClass(item.severity)}>{item.severity}</span>
                        <strong>{item.title}</strong>
                        <span className={styles.small}>{item.detail}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </section>
        </>
      )}

      <section className={styles.boundary}>
        <h2><Orbit size={18} /> What NEC can and cannot see</h2>
        <p>
          ESI exposes a server-side colony snapshot with pins, links, routes, extractor timing, and visible pin contents. NEC can call attention to evidence in that snapshot, but it cannot see the in-game resource heatmap, your current screen, live threats, future resource density, or prove that a routed factory will remain supplied.
        </p>
        <p>
          Storage fullness is not inferred here. A stored-content warning means only that material is visible without an outgoing route in the returned snapshot.
        </p>
      </section>
    </main>
  );
}
