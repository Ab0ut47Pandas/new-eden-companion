import {
  ArrowLeft,
  BookCopy,
  CheckCircle2,
  CircleHelp,
  FlaskConical,
  PackageSearch,
  Search,
  TriangleAlert,
} from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import styles from "@/app/items/item-explorer.module.css";
import { getSession } from "@/lib/auth/session-store";
import { validAccessToken } from "@/lib/auth/sso";
import { esi, esiPaginated, resolveNames } from "@/lib/esi/client";
import type { EsiAsset, EsiBlueprint, EsiSkills } from "@/lib/esi/types";
import {
  getBlueprintScienceProfile,
  getStaticDatabaseMetadata,
  getStaticItemIdentity,
  searchStaticItems,
  staticDatabaseAvailable,
  type BlueprintScienceActivity,
  type StaticItemIdentity,
} from "@/lib/sde/database";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface BlueprintViewerState {
  connected: boolean;
  blueprints: EsiBlueprint[] | null;
  skills: EsiSkills | null;
  assets: EsiAsset[] | null;
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
  if (hours < 48) return `${hours.toFixed(hours >= 10 ? 0 : 1)}h SDE base time`;
  return `${(hours / 24).toFixed(1)}d SDE base time`;
}

function activityTitle(kind: BlueprintScienceActivity["kind"]): string {
  if (kind === "research_material") return "Material Efficiency research";
  if (kind === "research_time") return "Time Efficiency research";
  return "Copying";
}

function activitySummary(kind: BlueprintScienceActivity["kind"]): string {
  if (kind === "research_material") return "BPO only. Each completed research level adds 1 percentage point of ME, up to ME 10.";
  if (kind === "research_time") return "BPO only. Each completed research level adds 2 percentage points of TE, up to TE 20.";
  return "BPO only. Produces limited-run BPCs that inherit the original's ME/TE at copy time.";
}

async function viewerState(): Promise<BlueprintViewerState> {
  const sessionId = (await cookies()).get("eve_session")?.value;
  if (!sessionId) return { connected: false, blueprints: null, skills: null, assets: null };
  try {
    const session = getSession(sessionId);
    if (!session) return { connected: false, blueprints: null, skills: null, assets: null };
    const token = await validAccessToken(session);
    async function read<T>(label: string, operation: () => Promise<T>): Promise<T | null> {
      try {
        return await operation();
      } catch (error) {
        console.warn(`IND-02 ESI category unavailable: ${label}`, error);
        return null;
      }
    }
    const [blueprints, skills, assets] = await Promise.all([
      read("blueprints", () => esiPaginated<EsiBlueprint>(`/characters/${session.characterId}/blueprints`, token, 20)),
      read("skills", () => esi<EsiSkills>(`/characters/${session.characterId}/skills`, { token })),
      read("assets", () => esiPaginated<EsiAsset>(`/characters/${session.characterId}/assets`, token)),
    ]);
    return { connected: true, blueprints, skills, assets };
  } catch (error) {
    console.warn("Unable to prepare live IND-02 blueprint state", error);
    return { connected: false, blueprints: null, skills: null, assets: null };
  }
}

function searchableBlueprints(query: string): StaticItemIdentity[] {
  if (!query.trim()) return [];
  return searchStaticItems(query, { limit: 40 })
    .filter((identity) => identity.published !== false && !identity.isPlaceholder && identity.kinds.includes("blueprint"))
    .slice(0, 16);
}

function rootLocationId(locationId: number, assetsById: ReadonlyMap<number, EsiAsset>): number {
  let currentId = locationId;
  const visited = new Set<number>();
  while (assetsById.has(currentId) && !visited.has(currentId)) {
    visited.add(currentId);
    currentId = assetsById.get(currentId)!.location_id;
  }
  return currentId;
}

function selectedHref(q: string, typeId: number, copies = 1, runsPerCopy = 1): string {
  const query = new URLSearchParams({ q, typeId: String(typeId), copies: String(copies), runsPerCopy: String(runsPerCopy) });
  return `/activities/industry/blueprints?${query.toString()}`;
}

function activityEvidence(
  activity: BlueprintScienceActivity,
  skillLevels: ReadonlyMap<number, number>,
  ownedTotals: ReadonlyMap<number, number>,
  visibility: { skills: boolean; assets: boolean },
) {
  return (
    <div className={styles.alternative} key={activity.kind}>
      <div className={styles.alternativeHeader}>
        <div>
          <strong>{activityTitle(activity.kind)}</strong>
          <p className={styles.treeNote}>{activitySummary(activity.kind)}</p>
        </div>
        <span className={styles.mutedPill}>{durationLabel(activity.timeSeconds)}</span>
      </div>
      {activity.materials.length > 0 ? (
        <div>
          <div className={styles.eyebrow}>SDE-required input per activity run</div>
          <ul className={styles.skillList}>
            {activity.materials.map((material) => {
              const owned = visibility.assets ? ownedTotals.get(material.typeId) ?? 0 : null;
              return (
                <li key={material.typeId}>
                  <span>{material.name ?? `Unknown type ${material.typeId}`} × {material.quantity}</span>
                  {owned === null
                    ? <span className={styles.mutedPill}>asset visibility unavailable</span>
                    : owned >= material.quantity
                      ? <span className={styles.kindPill}>own {owned.toLocaleString()} total</span>
                      : <span className={styles.warnPill}>own {owned.toLocaleString()} total</span>}
                </li>
              );
            })}
          </ul>
          <p className={styles.treeNote}>Global ownership is informational only. The actual science job still needs the required inputs at its selected input location.</p>
        </div>
      ) : <p className={styles.treeNote}>The current SDE records no consumed materials for this activity on this blueprint.</p>}
      {activity.skills.length > 0 ? (
        <div>
          <div className={styles.eyebrow}>SDE-required activity skills</div>
          <ul className={styles.skillList}>
            {activity.skills.map((skill) => {
              const trained = visibility.skills ? skillLevels.get(skill.typeId) ?? 0 : null;
              return (
                <li key={skill.typeId}>
                  <span>{skill.name ?? `Unknown type ${skill.typeId}`} {skill.level}</span>
                  {trained === null
                    ? <span className={styles.mutedPill}>skill visibility unavailable</span>
                    : trained >= skill.level
                      ? <span className={styles.kindPill}>trained {trained} · met</span>
                      : <span className={styles.warnPill}>trained {trained} · needs {skill.level}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      ) : <p className={styles.treeNote}>The current SDE records no blueprint-specific skill requirement for this activity.</p>}
    </div>
  );
}

export default async function BlueprintLabPage({ searchParams }: PageProps) {
  const params = await searchParams;
  if (!staticDatabaseAvailable()) {
    return (
      <main className={styles.shell}><div className={styles.container}>
        <Link className={styles.backLink} href="/"><ArrowLeft size={15} /> Back to companion</Link>
        <div className={styles.error}>The local static EVE database is not installed. Update static data before using Blueprint Lab.</div>
      </div></main>
    );
  }

  const q = param(params, "q").trim();
  const selectedTypeId = nullablePositiveInt(param(params, "typeId"));
  const copies = positiveInt(param(params, "copies"), 1, 1000);
  const runsPerCopy = positiveInt(param(params, "runsPerCopy"), 1, 100_000);
  const results = searchableBlueprints(q);
  const identity = selectedTypeId ? getStaticItemIdentity(selectedTypeId) : null;
  const profile = selectedTypeId ? getBlueprintScienceProfile(selectedTypeId) : null;
  const viewer = await viewerState();
  const owned = viewer.blueprints?.filter((blueprint) => blueprint.type_id === selectedTypeId) ?? [];
  const originals = [...owned]
    .filter((blueprint) => blueprint.runs === -1)
    .sort((left, right) => right.material_efficiency - left.material_efficiency || right.time_efficiency - left.time_efficiency || left.item_id - right.item_id);
  const copiesOwned = [...owned]
    .filter((blueprint) => blueprint.runs >= 0)
    .sort((left, right) => right.material_efficiency - left.material_efficiency || right.time_efficiency - left.time_efficiency || right.runs - left.runs || left.item_id - right.item_id);
  const bestOriginal = originals[0] ?? null;
  const assetsById = new Map((viewer.assets ?? []).map((asset) => [asset.item_id, asset]));
  const locationIds = [...new Set(owned.map((blueprint) => rootLocationId(blueprint.location_id, assetsById)).filter((id) => id > 0))];
  let locationNames = new Map<number, string>();
  if (locationIds.length > 0) {
    try {
      locationNames = await resolveNames(locationIds);
    } catch (error) {
      console.warn("Unable to resolve IND-02 blueprint locations", error);
    }
  }
  const locationLabel = (blueprint: EsiBlueprint): string => {
    const locationId = rootLocationId(blueprint.location_id, assetsById);
    return locationNames.get(locationId) ?? (locationId > 1_000_000_000_000 ? `Private structure ${locationId}` : `Location ${locationId}`);
  };
  const skillLevels = new Map((viewer.skills?.skills ?? []).map((skill) => [skill.skill_id, skill.trained_skill_level]));
  const ownedTotals = new Map<number, number>();
  for (const asset of viewer.assets ?? []) {
    if (asset.quantity <= 0) continue;
    ownedTotals.set(asset.type_id, (ownedTotals.get(asset.type_id) ?? 0) + asset.quantity);
  }
  const metadata = getStaticDatabaseMetadata();
  const copying = profile?.activities.find((activity) => activity.kind === "copying") ?? null;
  const meResearch = profile?.activities.find((activity) => activity.kind === "research_material") ?? null;
  const teResearch = profile?.activities.find((activity) => activity.kind === "research_time") ?? null;
  const copyLimit = profile?.blueprint.maxProductionLimit ?? null;
  const copyPlanValid = copyLimit === null || runsPerCopy <= copyLimit;
  const totalLicensedRuns = copies * runsPerCopy;

  let nextAction = "Search for a blueprint to inspect.";
  if (profile) {
    if (viewer.blueprints === null) nextAction = "Reconnect blueprint visibility or confirm your blueprint state in EVE.";
    else if (owned.length === 0) nextAction = `Obtain a usable ${profile.blueprint.name ?? "blueprint"}; NEC does not yet have evidence for this specific BPO acquisition source.`;
    else if (!bestOriginal && (meResearch || teResearch || copying)) nextAction = "You own BPCs, but research and copying require a BPO. Obtain the original if you want to improve or duplicate it.";
    else if (bestOriginal && meResearch && bestOriginal.material_efficiency < 10) nextAction = `Consider whether to research this BPO from ME ${bestOriginal.material_efficiency} toward ME 10 before making long-lived copies.`;
    else if (bestOriginal && teResearch && bestOriginal.time_efficiency < 20) nextAction = `Consider whether to research this BPO from TE ${bestOriginal.time_efficiency} toward TE 20 before making long-lived copies.`;
    else if (bestOriginal && copying) nextAction = "If you need expendable or invention-ready copies, configure a copy job in EVE and verify the facility, runs per copy and final duration.";
    else nextAction = "Use the activities supported by this blueprint in EVE's Industry window; NEC will not invent an unavailable research/copy action.";
  }

  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <div className={styles.topbar}>
          <Link className={styles.backLink} href="/"><ArrowLeft size={15} /> Back to companion</Link>
          <div className={styles.pills}>
            <Link className={styles.secondaryLink} href="/activities/industry/manufacturing"><PackageSearch size={15} /> Manufacturing</Link>
            <span className={styles.dataBadge}><FlaskConical size={14} /> IND-02 · SDE {metadata.sdeBuild}</span>
          </div>
        </div>

        <section className={styles.hero}>
          <div className={styles.eyebrow}>Blueprint acquisition, research and copying</div>
          <h1>Blueprint Lab</h1>
          <p>Search a blueprint to see what CCP&apos;s current SDE actually allows, what BPO/BPC instances your character owns, what can be researched, what can be copied, and which acquisition claims are still unknown.</p>
        </section>

        {!viewer.connected && <div className={styles.notice}><CircleHelp size={17} /> Connect your EVE character to compare this guidance with your actual BPOs, BPCs, skills and material inventory.</div>}
        <div className={styles.notice}><TriangleAlert size={17} /> NEC does not infer a blueprint&apos;s exact NPC seeding, contract availability or tech origin from its name. If the SDE/source model does not establish the specific acquisition source, it stays unknown.</div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}><div><div className={styles.eyebrow}>Step 1</div><h2>Choose a blueprint</h2></div></div>
          <form className={styles.searchForm} method="get">
            <label className={styles.searchBox}><Search size={17} /><input name="q" defaultValue={q} placeholder="Search: Drake Blueprint, Scourge Blueprint..." /></label>
            <button className={styles.primaryButton} type="submit">Search blueprints</button>
          </form>
          {q && results.length === 0 && <p className={styles.treeNote}>No published SDE blueprint matched this search.</p>}
          {results.length > 0 && (
            <div className={styles.searchResults}>
              {results.map((result) => (
                <Link className={styles.searchResult} href={selectedHref(q, result.typeId)} key={result.typeId}>
                  <span><strong>{result.name ?? `Unknown type ${result.typeId}`}</strong><small> · {result.groupName ?? "Blueprint"}</small></span>
                  <span className={styles.kindPill}>Blueprint</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {identity && !profile && <div className={styles.error}>This type is not represented as a blueprint in the installed SDE.</div>}

        {profile && (
          <>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div><div className={styles.eyebrow}>One next action</div><h2>{profile.blueprint.name ?? `Blueprint ${profile.blueprint.typeId}`}</h2></div>
                <span className={owned.length > 0 ? styles.kindPill : styles.warnPill}>{viewer.blueprints === null ? "ownership unknown" : `${owned.length} owned instance${owned.length === 1 ? "" : "s"}`}</span>
              </div>
              <div className={styles.notice}><CheckCircle2 size={17} /> <strong>{nextAction}</strong></div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div><div className={styles.eyebrow}>Your actual blueprint state</div><h2>BPO versus BPC</h2></div>
                <p>Research and copying require originals. Manufacturing can use originals or copies; invention consumes licensed runs from eligible copies.</p>
              </div>
              {viewer.blueprints === null ? (
                <div className={styles.notice}>Blueprint visibility is unavailable, so NEC will not assume whether you own an original or a copy.</div>
              ) : owned.length === 0 ? (
                <div className={styles.notice}>No owned instance of this blueprint is visible through ESI.</div>
              ) : (
                <div className={styles.alternatives}>
                  {originals.map((blueprint) => (
                    <div className={styles.alternative} key={blueprint.item_id}>
                      <div className={styles.alternativeHeader}><strong>BPO · item {blueprint.item_id}</strong><span className={styles.kindPill}>infinite manufacturing runs</span></div>
                      <div className={styles.productLinks}>
                        <span className={styles.pill}>ME {blueprint.material_efficiency}/10</span>
                        <span className={styles.pill}>TE {blueprint.time_efficiency}/20</span>
                        <span className={styles.mutedPill}>{locationLabel(blueprint)}</span>
                      </div>
                    </div>
                  ))}
                  {copiesOwned.map((blueprint) => (
                    <div className={styles.alternative} key={blueprint.item_id}>
                      <div className={styles.alternativeHeader}><strong>BPC · item {blueprint.item_id}</strong><span className={styles.mutedPill}>{Math.max(0, blueprint.runs)} licensed runs left</span></div>
                      <div className={styles.productLinks}>
                        <span className={styles.pill}>ME {blueprint.material_efficiency}</span>
                        <span className={styles.pill}>TE {blueprint.time_efficiency}</span>
                        <span className={styles.mutedPill}>{locationLabel(blueprint)}</span>
                      </div>
                      <p className={styles.treeNote}>A BPC cannot be researched or copied further. Its ME/TE do not change if the original is researched later.</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div><div className={styles.eyebrow}>Exact SDE capability</div><h2>What this blueprint can do</h2></div>
                <p>Unavailable activities are not invented or generalized from other blueprints.</p>
              </div>
              {profile.activities.length === 0 ? (
                <div className={styles.notice}>The current SDE lists no ME research, TE research or copying activity for this blueprint.</div>
              ) : (
                <div className={styles.alternatives}>
                  {profile.activities.map((activity) => activityEvidence(activity, skillLevels, ownedTotals, { skills: viewer.skills !== null, assets: viewer.assets !== null }))}
                </div>
              )}
            </section>

            {copying && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div><div className={styles.eyebrow}>Copy planner</div><h2>How many copies do you want?</h2></div>
                  <span className={copyPlanValid ? styles.kindPill : styles.warnPill}>{copyLimit === null ? "SDE copy limit unknown" : `max ${copyLimit} runs/copy`}</span>
                </div>
                <form className={styles.searchForm} method="get">
                  <input type="hidden" name="q" value={q} />
                  <input type="hidden" name="typeId" value={profile.blueprint.typeId} />
                  <label className={styles.searchBox}>Copies<input name="copies" type="number" min="1" max="1000" defaultValue={copies} /></label>
                  <label className={styles.searchBox}>Runs per copy<input name="runsPerCopy" type="number" min="1" max={copyLimit ?? 100000} defaultValue={runsPerCopy} /></label>
                  <button className={styles.primaryButton} type="submit">Update copy plan</button>
                </form>
                <div className={styles.requirementTop}>
                  <span><strong>{copies.toLocaleString()} BPC{copies === 1 ? "" : "s"}</strong> × {runsPerCopy.toLocaleString()} licensed runs each</span>
                  <span className={styles.mutedPill}>{totalLicensedRuns.toLocaleString()} licensed production runs total</span>
                </div>
                {!copyPlanValid && <div className={styles.error}>This exceeds the SDE maxProductionLimit of {copyLimit?.toLocaleString()} licensed runs per copy. NEC will not present it as a valid copy configuration.</div>}
                <p className={styles.treeNote}>CCP calculates copy-job duration from the total licensed production runs across all copies. Final duration, facility modifiers, cost, input/output hangar and access remain authoritative in the EVE Industry window.</p>
              </section>
            )}

            <section className={styles.section}>
              <div className={styles.sectionHeader}><div><div className={styles.eyebrow}>Acquisition boundary</div><h2>How do I get the blueprint?</h2></div></div>
              {originals.length > 0 ? (
                <div className={styles.notice}><CheckCircle2 size={17} /> You already own a BPO, so no BPO acquisition is required for research/copying.</div>
              ) : copiesOwned.length > 0 ? (
                <div className={styles.notice}>You own BPCs but no BPO is visible. Those copies can be used for their supported activities, but they cannot be turned back into an original or researched/copied further.</div>
              ) : (
                <div className={styles.notice}>NEC does not currently have evidence for the exact acquisition source of this specific BPO. It remains unknown rather than becoming a generic “buy it on market” instruction.</div>
              )}
              {copying && <div className={styles.notice}><BookCopy size={17} /> The SDE confirms this blueprint has a Copying activity, so a BPC of this same blueprint can be produced from a BPO through an eligible science facility.</div>}
              <details className={styles.treeCard}>
                <summary className={styles.treeSummary}><span>General CCP blueprint source rules</span><span className={styles.mutedPill}>category-level guidance</span></summary>
                <div className={styles.alternative}>
                  <p>CCP documents that most Tech I BPOs are available through market sell orders; new Tech II BPOs are not made available and existing ones come from current owners; no Tech III BPOs are available.</p>
                  <p>CCP also documents BPC sources including copying a BPO, loot drops, invention for Tech II, and Ancient Relic invention for Tech III. These are general rules—not proof that any one rule applies to the selected blueprint unless NEC can establish that relationship.</p>
                  <div className={styles.productLinks}>
                    <a className={styles.secondaryLink} href="https://support.eveonline.com/hc/articles/203269951" target="_blank" rel="noreferrer">CCP Blueprints</a>
                    <a className={styles.secondaryLink} href="https://support.eveonline.com/hc/en-us/articles/203210602-Copying" target="_blank" rel="noreferrer">CCP Copying</a>
                    <a className={styles.secondaryLink} href="https://support.eveonline.com/hc/en-us/articles/203210542-Material-Efficiency-Research" target="_blank" rel="noreferrer">CCP ME Research</a>
                    <a className={styles.secondaryLink} href="https://support.eveonline.com/hc/en-us/articles/203210512-Time-Efficiency-Research" target="_blank" rel="noreferrer">CCP TE Research</a>
                  </div>
                </div>
              </details>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
