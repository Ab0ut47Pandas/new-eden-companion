import { ArrowLeft, CircleHelp, ClipboardList, Factory, Orbit, PackageSearch, TriangleAlert } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import styles from "../planetary-industry.module.css";
import { getSession } from "@/lib/auth/session-store";
import { validAccessToken } from "@/lib/auth/sso";
import { esi, resolveNames } from "@/lib/esi/client";
import type { EsiPlanetSummary } from "@/lib/esi/types";
import type { PlanetColonyDetail } from "@/lib/pi/colony-health";
import type { PlanetaryColonyEvidence, PlanetaryProductionNode } from "@/lib/pi/production-plan";
import { getPlanetaryProductionPlan } from "@/lib/pi/server";
import {
  getStaticDatabaseMetadata,
  getStaticItemIdentity,
  searchStaticItems,
  staticDatabaseAvailable,
  type StaticItemIdentity,
} from "@/lib/sde/database";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface PlannerViewerState {
  connected: boolean;
  permissionAvailable: boolean;
  colonies: PlanetaryColonyEvidence[];
}

function param(params: Record<string, string | string[] | undefined>, key: string): string {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

function positiveInt(value: string, fallback: number, max = 1_000_000_000): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function nullablePositiveInt(value: string): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function durationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const hours = seconds / 3600;
  return `${hours.toFixed(hours >= 10 ? 0 : 1)} hr`;
}

function searchableCommodities(query: string): StaticItemIdentity[] {
  if (!query.trim()) return [];
  return searchStaticItems(query, { limit: 40 })
    .filter((identity) => identity.published !== false && !identity.isPlaceholder && identity.kinds.includes("commodity"))
    .slice(0, 16);
}

async function viewerState(): Promise<PlannerViewerState> {
  const sessionId = (await cookies()).get("eve_session")?.value;
  if (!sessionId) return { connected: false, permissionAvailable: false, colonies: [] };
  const session = getSession(sessionId);
  if (!session) return { connected: false, permissionAvailable: false, colonies: [] };

  try {
    const token = await validAccessToken(session);
    let summaries: EsiPlanetSummary[];
    try {
      summaries = await esi<EsiPlanetSummary[]>(`/characters/${session.characterId}/planets`, { token });
    } catch (error) {
      console.warn("PI-03 colony summaries unavailable", error);
      return { connected: true, permissionAvailable: false, colonies: [] };
    }
    const details = await Promise.all(summaries.map(async (summary) => {
      try {
        return await esi<PlanetColonyDetail>(`/characters/${session.characterId}/planets/${summary.planet_id}`, { token });
      } catch (error) {
        console.warn(`PI-03 colony detail unavailable for planet ${summary.planet_id}`, error);
        return null;
      }
    }));
    const nameIds = [...new Set(summaries.flatMap((summary) => [summary.planet_id, summary.solar_system_id]))];
    let names = new Map<number, string>();
    try {
      names = await resolveNames(nameIds);
    } catch (error) {
      console.warn("PI-03 colony names unavailable", error);
    }
    return {
      connected: true,
      permissionAvailable: true,
      colonies: summaries.map((summary, index) => ({
        planetId: summary.planet_id,
        planetName: names.get(summary.planet_id) ?? null,
        planetType: summary.planet_type,
        solarSystemId: summary.solar_system_id,
        solarSystemName: names.get(summary.solar_system_id) ?? null,
        detail: details[index] ?? null,
      })),
    };
  } catch (error) {
    console.warn("PI-03 session unavailable", error);
    return { connected: true, permissionAvailable: false, colonies: [] };
  }
}

function coverageLabel(coverage: string): string {
  if (coverage === "factory-configured") return "Factory configured";
  if (coverage === "extractor-visible") return "Extractor visible";
  if (coverage === "stock-visible") return "Stock visible";
  if (coverage === "missing") return "Gap";
  return "Unknown";
}

function PlanNode({ node, depth = 0 }: { node: PlanetaryProductionNode; depth?: number }) {
  const label = node.name ?? `Type ${node.typeId}`;
  if (node.kind === "leaf") {
    return (
      <article className={styles.card} style={{ marginLeft: Math.min(depth, 4) * 14 }}>
        <h3>{label}</h3>
        <div className={styles.meta}>
          <span className={styles.pill}>{node.requiredQuantity.toLocaleString()} required</span>
          <span className={node.reason === "no-schematic" ? styles.info : styles.unknown}>{node.reason.replaceAll("-", " ")}</span>
        </div>
        <p className={styles.small}>
          {node.reason === "no-schematic"
            ? "No PI schematic in the installed SDE produces this input. NEC stops here rather than inventing an extraction planet or source."
            : "Recursive expansion stopped here to preserve an explicit boundary."}
        </p>
        <ul className={styles.attentionList}>
          {node.evidence.map((evidence, index) => (
            <li className={styles.attentionItem} key={`${evidence.coverage}-${evidence.planetId ?? "none"}-${index}`}>
              <span className={evidence.coverage === "missing" ? styles.warning : evidence.coverage === "unknown" ? styles.unknown : styles.info}>
                {coverageLabel(evidence.coverage)}
              </span>
              <span className={styles.small}>{evidence.detail}</span>
            </li>
          ))}
        </ul>
      </article>
    );
  }

  return (
    <article className={styles.card} style={{ marginLeft: Math.min(depth, 4) * 14 }}>
      <h3>{label}</h3>
      <div className={styles.meta}>
        <span className={styles.pill}>{node.requiredQuantity.toLocaleString()} required</span>
        <span className={styles.pill}>{node.cycles.toLocaleString()} cycle{node.cycles === 1 ? "" : "s"}</span>
        <span className={styles.pill}>{node.outputPerCycle.toLocaleString()} / cycle</span>
        <span className={styles.pill}>{durationLabel(node.cycleTimeSeconds)} / cycle</span>
      </div>
      <p>
        <strong>{node.schematicName ?? `Schematic ${node.schematicId}`}</strong> · facility type{node.facilityTypes.length === 1 ? "" : "s"}: {node.facilityTypes.map((facility) => facility.name ?? `Type ${facility.typeId}`).join(", ") || "unknown"}
      </p>
      {node.alternativeSchematicIds.length > 0 ? (
        <p className={styles.small}>Other SDE schematic alternatives: {node.alternativeSchematicIds.join(", ")}. NEC expands the first deterministic option here rather than pretending alternatives are equivalent.</p>
      ) : null}
      <ul className={styles.attentionList}>
        {node.evidence.map((evidence, index) => (
          <li className={styles.attentionItem} key={`${evidence.coverage}-${evidence.planetId ?? "none"}-${index}`}>
            <span className={evidence.coverage === "factory-configured" || evidence.coverage === "stock-visible" ? styles.ok : evidence.coverage === "missing" ? styles.warning : evidence.coverage === "unknown" ? styles.unknown : styles.info}>
              {coverageLabel(evidence.coverage)}
            </span>
            <span className={styles.small}>{evidence.detail}</span>
          </li>
        ))}
      </ul>
      <details style={{ marginTop: 16 }} open={depth === 0}>
        <summary>Inputs for this step</summary>
        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {node.inputs.map((input) => <PlanNode key={`${node.schematicId}-${input.typeId}`} node={input} depth={depth + 1} />)}
        </div>
      </details>
    </article>
  );
}

export default async function PlanetaryProductionPlannerPage({ searchParams }: PageProps) {
  const params = await searchParams;
  if (!staticDatabaseAvailable()) {
    return (
      <main className={styles.page}>
        <Link className={styles.back} href="/activities/planetary-industry"><ArrowLeft size={16} /> Back to Planetary Industry</Link>
        <section className={styles.notice}><h2>Static EVE data is unavailable</h2><p>Install or update the bundled static database before using the PI production planner.</p></section>
      </main>
    );
  }

  const q = param(params, "q").trim();
  const selectedTypeId = nullablePositiveInt(param(params, "typeId"));
  const quantity = positiveInt(param(params, "quantity"), 1);
  const results = searchableCommodities(q);
  const selectedIdentity = selectedTypeId ? getStaticItemIdentity(selectedTypeId) : null;
  const viewer = await viewerState();
  const plan = selectedTypeId ? getPlanetaryProductionPlan(selectedTypeId, quantity, viewer.colonies) : null;
  const metadata = getStaticDatabaseMetadata();

  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/activities/planetary-industry"><ArrowLeft size={16} /> Back to Planetary Industry</Link>

      <header className={styles.header}>
        <div>
          <h1>PI production planner</h1>
          <p>Choose a commodity goal. NEC expands current SDE schematics into the required input chain and compares each step with the colony snapshot ESI can actually see.</p>
        </div>
        <span className={styles.pill}><Factory size={14} /> PI-03 · SDE {metadata.sdeBuild}</span>
      </header>

      <section className={styles.notice}>
        <form method="get" style={{ display: "grid", gap: 10 }}>
          <label>
            <strong>Commodity search</strong>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <input name="q" defaultValue={q} placeholder="Robotics, Mechanical Parts, Coolant..." style={{ flex: 1, minWidth: 0, padding: 10 }} />
              <button type="submit" className={styles.action}><PackageSearch size={16} /> Search</button>
            </div>
          </label>
        </form>
        {results.length > 0 ? (
          <div className={styles.meta}>
            {results.map((identity) => (
              <Link className={styles.action} key={identity.typeId} href={`/activities/planetary-industry/planner?q=${encodeURIComponent(q)}&typeId=${identity.typeId}&quantity=${quantity}`}>
                {identity.name ?? `Type ${identity.typeId}`}
              </Link>
            ))}
          </div>
        ) : q ? <p className={styles.small}>No published commodity identities matched this search. Try a different EVE item name.</p> : null}
      </section>

      {selectedIdentity && plan ? (
        <>
          <section className={styles.notice}>
            <form method="get" style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
              <input type="hidden" name="q" value={q} />
              <input type="hidden" name="typeId" value={selectedIdentity.typeId} />
              <label>
                <strong>Goal quantity</strong>
                <input name="quantity" type="number" min="1" max="1000000000" defaultValue={quantity} style={{ display: "block", marginTop: 6, padding: 10, width: 180 }} />
              </label>
              <button type="submit" className={styles.action}>Recalculate</button>
            </form>
            <h2 style={{ marginBottom: 4 }}>{selectedIdentity.name ?? `Type ${selectedIdentity.typeId}`}</h2>
            <p className={styles.small}>Requested output: {quantity.toLocaleString()}. Quantities are schematic-cycle requirements from the installed CCP SDE, not predictions of extractor yield or factory uptime.</p>
          </section>

          {!viewer.connected ? (
            <section className={styles.notice}><CircleHelp size={17} /> Connect your EVE character to compare the chain with your actual ESI-visible colonies.</section>
          ) : !viewer.permissionAvailable ? (
            <section className={styles.notice}><TriangleAlert size={17} /> Your current login could not read PI colonies. Re-authorize the recommended EVE access profile before treating colony gaps as assessed.</section>
          ) : (
            <section className={styles.notice}>
              <strong>{viewer.colonies.length} ESI-visible colon{viewer.colonies.length === 1 ? "y" : "ies"} compared.</strong>
              <p className={styles.small}>A configured schematic, extractor product, or visible stored commodity is evidence of current snapshot coverage only. It is not proof of continuous supply, resource density, routing correctness, or future output.</p>
            </section>
          )}

          {plan.warnings.length > 0 ? (
            <section className={styles.notice}>
              <h2><TriangleAlert size={18} /> Boundaries</h2>
              <ul>{plan.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </section>
          ) : null}

          <section>
            <h2><Orbit size={18} /> Production chain</h2>
            <PlanNode node={plan.root} />
          </section>

          <section className={styles.boundary}>
            <h2><ClipboardList size={18} /> Copyable setup checklist</h2>
            <p className={styles.small}>Copy this into notes if you want a compact build order. Final routing, planet resource availability, extractor placement, taxes, facility capacity, links and live production still have to be verified in EVE.</p>
            <pre style={{ whiteSpace: "pre-wrap", userSelect: "text", overflowWrap: "anywhere" }}>{plan.checklist.map((line, index) => `${index + 1}. ${line}`).join("\n")}</pre>
          </section>
        </>
      ) : selectedTypeId ? (
        <section className={styles.notice}><h2>Commodity identity unavailable</h2><p>NEC could not resolve the selected type from the installed static database.</p></section>
      ) : (
        <section className={styles.notice}>
          <h2>Start with a commodity goal</h2>
          <p>Search for a Planetary Industry commodity above. NEC will reveal the immediate production step first and keep deeper input recursion inside expandable sections.</p>
        </section>
      )}

      <section className={styles.boundary}>
        <h2>Planner boundaries</h2>
        <p>Current CCP static data establishes PI schematics, cycle time, inputs, outputs and compatible pin types. ESI exposes your colony snapshot. Neither source gives NEC the live in-game resource heatmap or guarantees that a planet, route, extractor, factory, tax rate or future supply is suitable. Those facts remain explicit gaps to verify in EVE.</p>
      </section>
    </main>
  );
}
