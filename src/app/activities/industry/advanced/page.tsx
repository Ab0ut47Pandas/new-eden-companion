import {
  ArrowLeft,
  Atom,
  Beaker,
  BookOpenCheck,
  CheckCircle2,
  CircleHelp,
  Factory,
  FlaskConical,
  Search,
  TriangleAlert,
} from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import styles from "@/app/items/item-explorer.module.css";
import { getSession } from "@/lib/auth/session-store";
import { validAccessToken } from "@/lib/auth/sso";
import { esi, esiPaginated } from "@/lib/esi/client";
import type { EsiAsset, EsiBlueprint, EsiLocation, EsiSkills, EsiSystem } from "@/lib/esi/types";
import {
  getAdvancedIndustryAcquisitionGraph,
  getAdvancedIndustryActivitiesForProduct,
  getAdvancedIndustryActivitiesForSource,
  getStaticDatabaseMetadata,
  getStaticItemIdentity,
  searchStaticItems,
  staticDatabaseAvailable,
  type AdvancedIndustryActivity,
  type StaticItemIdentity,
} from "@/lib/sde/database";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface ViewerState {
  connected: boolean;
  blueprints: EsiBlueprint[] | null;
  skills: EsiSkills | null;
  assets: EsiAsset[] | null;
  system: { id: number; name: string; security: number } | null;
}

function param(params: Record<string, string | string[] | undefined>, key: string): string {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

function positiveInt(value: string, fallback: number, max = 10_000): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(max, parsed);
}

function nullablePositiveInt(value: string): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function durationLabel(seconds: number | null): string {
  if (seconds === null) return "SDE base time unavailable";
  if (seconds < 60) return `${seconds}s SDE base time`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m SDE base time`;
  const hours = seconds / 3600;
  return hours < 48 ? `${hours.toFixed(hours >= 10 ? 0 : 1)}h SDE base time` : `${(hours / 24).toFixed(1)}d SDE base time`;
}

function probabilityLabel(probability: number | null): string {
  if (probability === null) return "deterministic SDE output";
  return `${(probability * 100).toFixed(probability * 100 >= 10 ? 0 : 1)}% SDE base probability`;
}

async function viewerState(): Promise<ViewerState> {
  const sessionId = (await cookies()).get("eve_session")?.value;
  if (!sessionId) return { connected: false, blueprints: null, skills: null, assets: null, system: null };
  try {
    const session = getSession(sessionId);
    if (!session) return { connected: false, blueprints: null, skills: null, assets: null, system: null };
    const token = await validAccessToken(session);
    async function read<T>(label: string, operation: () => Promise<T>): Promise<T | null> {
      try {
        return await operation();
      } catch (error) {
        console.warn(`IND-03 ESI category unavailable: ${label}`, error);
        return null;
      }
    }
    const [blueprints, skills, assets, location] = await Promise.all([
      read("blueprints", () => esiPaginated<EsiBlueprint>(`/characters/${session.characterId}/blueprints`, token, 20)),
      read("skills", () => esi<EsiSkills>(`/characters/${session.characterId}/skills`, { token })),
      read("assets", () => esiPaginated<EsiAsset>(`/characters/${session.characterId}/assets`, token)),
      read("location", () => esi<EsiLocation>(`/characters/${session.characterId}/location`, { token })),
    ]);
    let system: ViewerState["system"] = null;
    if (location?.solar_system_id) {
      const systemData = await read("solar system", () => esi<EsiSystem>(`/universe/systems/${location.solar_system_id}`));
      if (systemData) system = { id: location.solar_system_id, name: systemData.name, security: systemData.security_status };
    }
    return { connected: true, blueprints, skills, assets, system };
  } catch (error) {
    console.warn("Unable to prepare IND-03 player state", error);
    return { connected: false, blueprints: null, skills: null, assets: null, system: null };
  }
}

function activitiesForIdentity(identity: StaticItemIdentity): AdvancedIndustryActivity[] {
  const bySource = getAdvancedIndustryActivitiesForSource(identity.typeId);
  const byProduct = getAdvancedIndustryActivitiesForProduct(identity.typeId);
  const seen = new Set<string>();
  const result: AdvancedIndustryActivity[] = [];
  for (const activity of [...bySource, ...byProduct]) {
    const key = `${activity.kind}:${activity.source.typeId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(activity);
  }
  return result;
}

function searchAdvanced(query: string): StaticItemIdentity[] {
  if (!query.trim()) return [];
  return searchStaticItems(query, { limit: 60 })
    .filter((identity) => identity.published !== false && !identity.isPlaceholder)
    .filter((identity) => activitiesForIdentity(identity).length > 0)
    .slice(0, 18);
}

function selectedHref(q: string, typeId: number, runs = 1): string {
  const query = new URLSearchParams({ q, typeId: String(typeId), runs: String(runs) });
  return `/activities/industry/advanced?${query.toString()}`;
}

function aggregateAssets(assets: readonly EsiAsset[] | null): Map<number, number> {
  const totals = new Map<number, number>();
  for (const asset of assets ?? []) {
    if (asset.quantity <= 0) continue;
    totals.set(asset.type_id, (totals.get(asset.type_id) ?? 0) + asset.quantity);
  }
  return totals;
}

function skillLevels(skills: EsiSkills | null): Map<number, number> {
  return new Map((skills?.skills ?? []).map((skill) => [skill.skill_id, skill.trained_skill_level]));
}

function sourceVisibility(
  activity: AdvancedIndustryActivity,
  blueprints: readonly EsiBlueprint[] | null,
  assets: ReadonlyMap<number, number>,
): { label: string; status: "known" | "missing" | "unknown" } {
  if (blueprints === null) return { label: "source blueprint/relic visibility unavailable", status: "unknown" };
  const matchingBlueprints = blueprints.filter((blueprint) => blueprint.type_id === activity.source.typeId);
  const copies = matchingBlueprints.filter((blueprint) => blueprint.runs >= 0 && blueprint.runs > 0);
  const originals = matchingBlueprints.filter((blueprint) => blueprint.runs === -1);
  const assetQuantity = assets.get(activity.source.typeId) ?? 0;
  if (activity.kind === "invention") {
    if (copies.length > 0) return { label: `${copies.length} BPC instance${copies.length === 1 ? "" : "s"} visible`, status: "known" };
    if (assetQuantity > 0) return { label: `${assetQuantity.toLocaleString()} source item${assetQuantity === 1 ? "" : "s"} visible in assets`, status: "known" };
    if (originals.length > 0) return { label: "BPO visible, but invention does not consume a BPO directly", status: "missing" };
    return { label: "no usable source instance is visible in character data", status: "missing" };
  }
  if (assetQuantity > 0 || matchingBlueprints.length > 0) {
    return { label: `${Math.max(assetQuantity, matchingBlueprints.length).toLocaleString()} formula/source instance${Math.max(assetQuantity, matchingBlueprints.length) === 1 ? "" : "s"} visible`, status: "known" };
  }
  return { label: "reaction formula is not visible in character assets", status: "missing" };
}

function ActivityCard({
  activity,
  selectedTypeId,
  runs,
  assets,
  skills,
  blueprints,
}: {
  activity: AdvancedIndustryActivity;
  selectedTypeId: number;
  runs: number;
  assets: ReadonlyMap<number, number>;
  skills: ReadonlyMap<number, number>;
  blueprints: readonly EsiBlueprint[] | null;
}) {
  const source = sourceVisibility(activity, blueprints, assets);
  const selectedProduct = activity.products.find((product) => product.typeId === selectedTypeId) ?? activity.products[0] ?? null;
  return (
    <div className={styles.alternative}>
      <div className={styles.alternativeHeader}>
        <div>
          <strong>{activity.kind === "invention" ? "Invention" : "Reaction"} via {activity.source.name ?? `type ${activity.source.typeId}`}</strong>
          <p className={styles.treeNote}>{activity.kind === "invention"
            ? "Chance-based blueprint acquisition. A completed job can fail and produce no result."
            : "Deterministic Reaction Formula activity. Reaction Formulas are not ordinary BPOs and cannot be researched, copied or invented."}</p>
        </div>
        <span className={styles.mutedPill}>{durationLabel(activity.timeSeconds)}</span>
      </div>

      <div className={styles.requirementTop}>
        <span>Source</span>
        <span className={source.status === "known" ? styles.kindPill : source.status === "missing" ? styles.warnPill : styles.mutedPill}>{source.label}</span>
      </div>

      {activity.products.length > 0 && (
        <div>
          <div className={styles.eyebrow}>SDE outputs</div>
          <div className={styles.productLinks}>
            {activity.products.map((product) => (
              <Link className={product.typeId === selectedTypeId ? styles.kindPill : styles.pill} href={selectedHref(product.name ?? "", product.typeId, runs)} key={product.typeId}>
                {product.name ?? `Type ${product.typeId}`} × {(product.quantity * runs).toLocaleString()} · {probabilityLabel(product.probability)}
              </Link>
            ))}
          </div>
          {selectedProduct?.probability !== null && selectedProduct?.probability !== undefined && (
            <p className={styles.treeNote}>The probability above is the SDE base probability for one invention attempt. Do not multiply it by runs and treat that as a promised yield; actual invention jobs are independent chance-based outcomes and EVE&apos;s Industry window shows the final chance after skills/decryptor choices.</p>
          )}
        </div>
      )}

      <div>
        <div className={styles.eyebrow}>Required materials · {runs.toLocaleString()} job run{runs === 1 ? "" : "s"}</div>
        {activity.materials.length === 0 ? <p className={styles.treeNote}>No required material rows are recorded in the SDE for this activity.</p> : (
          <ul className={styles.skillList}>
            {activity.materials.map((material) => {
              const required = material.quantity * runs;
              const owned = assets.get(material.typeId);
              return (
                <li key={material.typeId}>
                  <span>{material.name ?? `Unknown type ${material.typeId}`} × {required.toLocaleString()}</span>
                  {owned === undefined
                    ? <span className={styles.warnPill}>0 visible globally</span>
                    : owned >= required
                      ? <span className={styles.kindPill}>{owned.toLocaleString()} visible globally</span>
                      : <span className={styles.warnPill}>{owned.toLocaleString()} visible · short {(required - owned).toLocaleString()}</span>}
                </li>
              );
            })}
          </ul>
        )}
        <p className={styles.treeNote}>Global ownership is not job readiness. Inputs still need to be staged at the chosen facility/input location.</p>
      </div>

      <div>
        <div className={styles.eyebrow}>Required skills</div>
        {activity.skills.length === 0 ? <p className={styles.treeNote}>No activity skill rows are recorded in the SDE.</p> : (
          <ul className={styles.skillList}>
            {activity.skills.map((skill) => {
              const trained = skills.get(skill.typeId);
              return (
                <li key={skill.typeId}>
                  <span>{skill.name ?? `Unknown type ${skill.typeId}`} {skill.level}</span>
                  {trained === undefined
                    ? <span className={styles.mutedPill}>not visible / 0</span>
                    : trained >= skill.level
                      ? <span className={styles.kindPill}>trained {trained} · met</span>
                      : <span className={styles.warnPill}>trained {trained} · needs {skill.level}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default async function AdvancedIndustryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  if (!staticDatabaseAvailable()) {
    return <main className={styles.shell}><div className={styles.container}><Link className={styles.backLink} href="/"><ArrowLeft size={15} /> Back to companion</Link><div className={styles.error}>The local static EVE database is not installed yet.</div></div></main>;
  }

  const q = param(params, "q").trim();
  const selectedTypeId = nullablePositiveInt(param(params, "typeId"));
  const runs = positiveInt(param(params, "runs"), 1, 1000);
  const results = searchAdvanced(q);
  const identity = selectedTypeId ? getStaticItemIdentity(selectedTypeId) : null;
  const activities = identity ? activitiesForIdentity(identity) : [];
  const productActivities = selectedTypeId ? getAdvancedIndustryActivitiesForProduct(selectedTypeId) : [];
  const graph = selectedTypeId && productActivities.length > 0 ? getAdvancedIndustryAcquisitionGraph(selectedTypeId) : null;
  const viewer = await viewerState();
  const assets = aggregateAssets(viewer.assets);
  const skills = skillLevels(viewer.skills);
  const metadata = getStaticDatabaseMetadata();

  let nextAction = "Search for an invention output, reaction material, source blueprint, Ancient Relic or Reaction Formula.";
  if (identity && activities.length === 0) nextAction = "The installed SDE does not record an invention or reaction relationship for this item.";
  if (activities.length > 0) {
    const activity = activities[0];
    const source = sourceVisibility(activity, viewer.blueprints, assets);
    const missingSkill = activity.skills.find((skill) => (skills.get(skill.typeId) ?? 0) < skill.level);
    const missingMaterial = activity.materials.find((material) => (assets.get(material.typeId) ?? 0) < material.quantity * runs);
    if (source.status === "missing") nextAction = `Obtain or stage the required source item: ${activity.source.name ?? `type ${activity.source.typeId}`}.`;
    else if (missingSkill) nextAction = `Train ${missingSkill.name ?? `skill ${missingSkill.typeId}`} to level ${missingSkill.level}.`;
    else if (missingMaterial) nextAction = `Acquire at least ${(missingMaterial.quantity * runs - (assets.get(missingMaterial.typeId) ?? 0)).toLocaleString()} more ${missingMaterial.name ?? `type ${missingMaterial.typeId}`}.`;
    else if (activity.kind === "reaction") nextAction = "Choose an eligible refinery with the correct online reactor, stage the formula/materials there, then verify the reaction job in EVE.";
    else nextAction = "Open EVE Industry, choose the invention source and output, then verify the final success chance and optional decryptor before installing the job.";
  }

  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <div className={styles.topbar}>
          <Link className={styles.backLink} href="/"><ArrowLeft size={15} /> Back to companion</Link>
          <div className={styles.pills}>
            <Link className={styles.secondaryLink} href="/activities/industry/manufacturing"><Factory size={15} /> Manufacturing</Link>
            <Link className={styles.secondaryLink} href="/activities/industry/blueprints"><BookOpenCheck size={15} /> Blueprint Lab</Link>
            <span className={styles.dataBadge}><Atom size={14} /> IND-03 · SDE {metadata.sdeBuild}</span>
          </div>
        </div>

        <section className={styles.hero}>
          <div className={styles.eyebrow}>Advanced industry</div>
          <h1>Invention &amp; Reactions</h1>
          <p>Trace invention and reaction relationships directly from the installed CCP SDE, then overlay your visible source items, materials and trained skills without pretending a chance-based invention result or an unverified facility is guaranteed.</p>
        </section>

        {!viewer.connected && <div className={styles.notice}><CircleHelp size={17} /> Connect your character to overlay visible sources, materials and trained skills.</div>}
        <div className={styles.notice}><TriangleAlert size={17} /> Invention can fail. NEC shows the SDE base probability as evidence, not a promised result. EVE&apos;s Industry window remains authoritative for the final chance after skills and optional decryptors.</div>
        <div className={styles.notice}><FlaskConical size={17} /> Reactions require a Refinery with the appropriate reactor online; CCP states reactors can only be installed in Refineries in systems with security 0.4 or lower.</div>
        {viewer.system && <div className={styles.notice}>Current system: <strong>{viewer.system.name}</strong> · security {viewer.system.security.toFixed(2)}. {viewer.system.security > 0.4 ? "This current system is above CCP's reactor-installation security limit; plan the reaction at another eligible refinery." : "The system security itself is within the reactor-installation limit, but NEC still does not know whether an eligible refinery/reactor and access are available."}</div>}

        <section className={styles.section}>
          <div className={styles.sectionHeader}><div><div className={styles.eyebrow}>Step 1</div><h2>Find the relationship</h2></div></div>
          <form className={styles.searchForm} method="get">
            <label className={styles.searchBox}><Search size={17} /><input name="q" defaultValue={q} placeholder="Search invention blueprint, datacore chain, reaction material or formula..." /></label>
            <button className={styles.primaryButton} type="submit">Search advanced industry</button>
          </form>
          {q && results.length === 0 && <p className={styles.treeNote}>No invention/reaction relationship matched those published SDE items.</p>}
          {results.length > 0 && (
            <div className={styles.searchResults}>
              {results.map((result) => {
                const resultActivities = activitiesForIdentity(result);
                const kinds = [...new Set(resultActivities.map((activity) => activity.kind))];
                return (
                  <Link className={styles.searchResult} href={selectedHref(q, result.typeId, runs)} key={result.typeId}>
                    <span><strong>{result.name ?? `Unknown type ${result.typeId}`}</strong><small> · {result.groupName ?? result.categoryName ?? "SDE item"}</small></span>
                    <span className={styles.kindPill}>{kinds.join(" + ")}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {identity && (
          <>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div><div className={styles.eyebrow}>One next action</div><h2>{identity.name ?? `Type ${identity.typeId}`}</h2></div>
                <span className={activities.length > 0 ? styles.kindPill : styles.mutedPill}>{activities.length} advanced path{activities.length === 1 ? "" : "s"}</span>
              </div>
              <div className={styles.notice}><CheckCircle2 size={17} /> <strong>{nextAction}</strong></div>
              {graph && <p className={styles.treeNote}>Acquisition graph: {graph.options.length} alternative{graph.options.length === 1 ? "" : "s"}, {graph.nodes.length} evidence node{graph.nodes.length === 1 ? "" : "s"}, {graph.edges.length} relationship edge{graph.edges.length === 1 ? "" : "s"}. Unknown material sources stay explicit terminal nodes.</p>}
            </section>

            {activities.length > 0 && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div><div className={styles.eyebrow}>Plan</div><h2>Invention / reaction evidence</h2></div>
                  <form className={styles.searchForm} method="get">
                    <input type="hidden" name="q" value={q} />
                    <input type="hidden" name="typeId" value={identity.typeId} />
                    <label className={styles.searchBox}>Job runs<input type="number" min="1" max="1000" name="runs" defaultValue={runs} /></label>
                    <button className={styles.primaryButton} type="submit">Update runs</button>
                  </form>
                </div>
                <div className={styles.alternatives}>
                  {activities.map((activity) => (
                    <ActivityCard
                      activity={activity}
                      selectedTypeId={identity.typeId}
                      runs={runs}
                      assets={assets}
                      skills={skills}
                      blueprints={viewer.blueprints}
                      key={`${activity.kind}-${activity.source.typeId}`}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className={styles.section}>
              <div className={styles.sectionHeader}><div><div className={styles.eyebrow}>Mechanics boundary</div><h2>What NEC will not fake</h2></div></div>
              <div className={styles.alternatives}>
                <div className={styles.alternative}>
                  <strong>Invention</strong>
                  <p>CCP documents that Tech II invention consumes one licensed run from the base Tech I BPC per invention run, while Tech III invention uses and consumes an Ancient Relic. Required datacores are consumed regardless of success. Optional decryptors are also consumed and can modify chance and resulting BPC ME/TE/runs.</p>
                  <p>NEC does not turn the SDE base probability into a guaranteed output count or claim the final probability before EVE applies the chosen character/facility/optional-item state.</p>
                  <div className={styles.productLinks}>
                    <a className={styles.secondaryLink} href="https://support.eveonline.com/hc/en-us/articles/203210642-Invention" target="_blank" rel="noreferrer">CCP Invention</a>
                    <a className={styles.secondaryLink} href="https://support.eveonline.com/hc/en-us/articles/203210652-Datacores" target="_blank" rel="noreferrer">CCP Datacores</a>
                    <a className={styles.secondaryLink} href="https://support.eveonline.com/hc/en-us/articles/203270631-Decryptors" target="_blank" rel="noreferrer">CCP Decryptors</a>
                  </div>
                </div>
                <div className={styles.alternative}>
                  <strong>Reactions</strong>
                  <p>CCP documents Reaction Formulas as separate from normal blueprints: they cannot be researched, copied or invented. Reactions create intermediate materials for Tech II, Tech III and combat-booster production.</p>
                  <p>Formula/material/skill ownership does not prove facility access. NEC leaves the specific refinery, reactor, structure permissions, taxes/costs and final job installation to EVE.</p>
                  <a className={styles.secondaryLink} href="https://support.eveonline.com/hc/en-us/articles/115005405785-Reactions" target="_blank" rel="noreferrer"><Beaker size={15} /> CCP Reactions</a>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
