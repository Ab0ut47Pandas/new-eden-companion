import { ArrowLeft, Boxes, CheckCircle2, CircleHelp, Factory, PackageSearch, TriangleAlert } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import styles from "@/app/items/item-explorer.module.css";
import { getSession } from "@/lib/auth/session-store";
import { validAccessToken } from "@/lib/auth/sso";
import {
  buildManufacturingPlan,
  type ManufacturingBlueprintEvidence,
  type ManufacturingEvidenceState,
} from "@/lib/activity/manufacturing-plan";
import { esi, esiPaginated, resolveNames } from "@/lib/esi/client";
import type { EsiAsset, EsiBlueprint, EsiIndustryJob, EsiSkills } from "@/lib/esi/types";
import {
  getManufacturingDependenciesForProduct,
  getStaticDatabaseMetadata,
  getStaticItemIdentity,
  searchStaticItems,
  staticDatabaseAvailable,
  type ManufacturingDependency,
  type StaticItemIdentity,
} from "@/lib/sde/database";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface IndustryViewerState {
  connected: boolean;
  assets: EsiAsset[] | null;
  blueprints: EsiBlueprint[] | null;
  skills: EsiSkills | null;
  jobs: EsiIndustryJob[] | null;
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

function facilityState(value: string): ManufacturingEvidenceState {
  return value === "yes" || value === "no" ? value : "unknown";
}

function durationLabel(seconds: number | null): string {
  if (seconds === null) return "Base time unknown";
  if (seconds < 60) return `${Math.round(seconds)} sec base`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min base`;
  const hours = seconds / 3600;
  if (hours < 48) return `${hours.toFixed(hours >= 10 ? 0 : 1)} hr base`;
  return `${(hours / 24).toFixed(1)} days base`;
}

function blueprintLabel(state: ReturnType<typeof buildManufacturingPlan>["blueprint"]["state"]): string {
  switch (state) {
    case "bpo": return "BPO ready at input";
    case "bpc": return "BPC ready at input";
    case "split-bpc": return "BPC runs split across copies";
    case "insufficient-bpc-runs": return "Not enough BPC runs here";
    case "blueprint-elsewhere": return "Blueprint is elsewhere";
    case "not-owned": return "Blueprint not owned";
    default: return "Blueprint state unknown";
  }
}

function statusClass(status: ReturnType<typeof buildManufacturingPlan>["status"]): string {
  if (status === "ready-to-verify") return styles.kindPill;
  if (status === "unknown") return styles.mutedPill;
  return styles.warnPill;
}

function rootLocationId(locationId: number, assetsById: ReadonlyMap<number, EsiAsset>): number | null {
  let currentId = locationId;
  const visited = new Set<number>();
  while (assetsById.has(currentId) && !visited.has(currentId)) {
    visited.add(currentId);
    const asset = assetsById.get(currentId)!;
    currentId = asset.location_id;
  }
  return Number.isSafeInteger(currentId) && currentId > 0 ? currentId : null;
}

async function viewerState(): Promise<IndustryViewerState> {
  const sessionId = (await cookies()).get("eve_session")?.value;
  if (!sessionId) return { connected: false, assets: null, blueprints: null, skills: null, jobs: null };

  try {
    const session = getSession(sessionId);
    if (!session) return { connected: false, assets: null, blueprints: null, skills: null, jobs: null };
    const token = await validAccessToken(session);
    async function read<T>(label: string, operation: () => Promise<T>): Promise<T | null> {
      try {
        return await operation();
      } catch (error) {
        console.warn(`IND-01 ESI category unavailable: ${label}`, error);
        return null;
      }
    }
    const [assets, blueprints, skills, jobs] = await Promise.all([
      read("assets", () => esiPaginated<EsiAsset>(`/characters/${session.characterId}/assets`, token)),
      read("blueprints", () => esiPaginated<EsiBlueprint>(`/characters/${session.characterId}/blueprints`, token, 20)),
      read("skills", () => esi<EsiSkills>(`/characters/${session.characterId}/skills`, { token })),
      read("industry jobs", () => esi<EsiIndustryJob[]>(`/characters/${session.characterId}/industry/jobs`, { token })),
    ]);
    return { connected: true, assets, blueprints, skills, jobs };
  } catch (error) {
    console.warn("Unable to prepare live IND-01 manufacturing state", error);
    return { connected: false, assets: null, blueprints: null, skills: null, jobs: null };
  }
}

function hrefFor(
  current: { q: string; typeId: number | null; blueprintTypeId: number | null; runs: number; locationId: number | null; facility: ManufacturingEvidenceState },
  changes: Partial<{ q: string; typeId: number | null; blueprintTypeId: number | null; runs: number; locationId: number | null; facility: ManufacturingEvidenceState }>,
): string {
  const next = { ...current, ...changes };
  const query = new URLSearchParams();
  if (next.q) query.set("q", next.q);
  if (next.typeId) query.set("typeId", String(next.typeId));
  if (next.blueprintTypeId) query.set("bp", String(next.blueprintTypeId));
  query.set("runs", String(next.runs));
  if (next.locationId) query.set("locationId", String(next.locationId));
  if (next.facility !== "unknown") query.set("facility", next.facility);
  return `/activities/industry/manufacturing?${query.toString()}`;
}

function searchableManufacturingItems(query: string): Array<{ identity: StaticItemIdentity; dependencies: ManufacturingDependency[] }> {
  if (!query.trim()) return [];
  return searchStaticItems(query, { limit: 30 })
    .filter((identity) => identity.published !== false && !identity.isPlaceholder && !identity.kinds.includes("blueprint"))
    .map((identity) => ({ identity, dependencies: getManufacturingDependenciesForProduct(identity.typeId) }))
    .filter((entry) => entry.dependencies.length > 0)
    .slice(0, 12);
}

export default async function ManufacturingPlannerPage({ searchParams }: PageProps) {
  const params = await searchParams;
  if (!staticDatabaseAvailable()) {
    return (
      <main className={styles.shell}>
        <div className={styles.container}>
          <Link className={styles.backLink} href="/"><ArrowLeft size={15} /> Back to companion</Link>
          <div className={styles.error}>The local static EVE database is not installed. Update static data before using Manufacturing Planner.</div>
        </div>
      </main>
    );
  }

  const q = param(params, "q").trim();
  const selectedTypeId = nullablePositiveInt(param(params, "typeId"));
  const requestedBlueprintTypeId = nullablePositiveInt(param(params, "bp"));
  const runs = positiveInt(param(params, "runs"), 1, 10_000);
  const requestedLocationId = nullablePositiveInt(param(params, "locationId"));
  const facility = facilityState(param(params, "facility"));
  const searchResults = searchableManufacturingItems(q);
  const selectedIdentity = selectedTypeId ? getStaticItemIdentity(selectedTypeId) : null;
  const dependencies = selectedTypeId ? getManufacturingDependenciesForProduct(selectedTypeId) : [];
  const selectedDependency = dependencies.find((dependency) => dependency.blueprint.typeId === requestedBlueprintTypeId) ?? dependencies[0] ?? null;
  const viewer = await viewerState();
  const assetsById = new Map((viewer.assets ?? []).map((asset) => [asset.item_id, asset]));

  const blueprintEvidence: ManufacturingBlueprintEvidence[] = selectedDependency && viewer.blueprints
    ? viewer.blueprints
        .filter((blueprint) => blueprint.type_id === selectedDependency.blueprint.typeId)
        .map((blueprint) => ({
          itemId: blueprint.item_id,
          kind: blueprint.runs === -1 ? "original" as const : blueprint.runs >= 0 ? "copy" as const : "unknown" as const,
          runs: blueprint.runs,
          materialEfficiency: blueprint.material_efficiency,
          timeEfficiency: blueprint.time_efficiency,
          locationId: viewer.assets ? rootLocationId(blueprint.location_id, assetsById) : null,
        }))
    : [];

  const materialQuantityByLocation = new Map<number, Map<number, number>>();
  const materialQuantityAnywhere = new Map<number, number>();
  if (selectedDependency && viewer.assets) {
    const materialIds = new Set(selectedDependency.activity.materials.map((material) => material.typeId));
    for (const asset of viewer.assets) {
      if (!materialIds.has(asset.type_id) || asset.quantity <= 0) continue;
      const root = rootLocationId(asset.item_id, assetsById);
      materialQuantityAnywhere.set(asset.type_id, (materialQuantityAnywhere.get(asset.type_id) ?? 0) + asset.quantity);
      if (!root) continue;
      const byLocation = materialQuantityByLocation.get(asset.type_id) ?? new Map<number, number>();
      byLocation.set(root, (byLocation.get(root) ?? 0) + asset.quantity);
      materialQuantityByLocation.set(asset.type_id, byLocation);
    }
  }

  const candidateScores = new Map<number, { blueprint: number; materials: number }>();
  for (const blueprint of blueprintEvidence) {
    if (!blueprint.locationId) continue;
    const current = candidateScores.get(blueprint.locationId) ?? { blueprint: 0, materials: 0 };
    current.blueprint += blueprint.kind === "original" ? 10_000 : Math.max(1, blueprint.runs);
    candidateScores.set(blueprint.locationId, current);
  }
  if (selectedDependency && viewer.assets) {
    for (const material of selectedDependency.activity.materials) {
      for (const [locationId, quantity] of materialQuantityByLocation.get(material.typeId) ?? []) {
        const current = candidateScores.get(locationId) ?? { blueprint: 0, materials: 0 };
        current.materials += Math.min(quantity, material.quantity * runs);
        candidateScores.set(locationId, current);
      }
    }
  }
  if (requestedLocationId && !candidateScores.has(requestedLocationId)) candidateScores.set(requestedLocationId, { blueprint: 0, materials: 0 });
  const candidateLocationIds = [...candidateScores.entries()]
    .sort((left, right) => right[1].blueprint - left[1].blueprint || right[1].materials - left[1].materials || left[0] - right[0])
    .slice(0, 8)
    .map(([locationId]) => locationId);
  const selectedLocationId = requestedLocationId ?? candidateLocationIds[0] ?? null;

  let locationNames = new Map<number, string>();
  if (candidateLocationIds.length > 0) {
    try {
      locationNames = await resolveNames(candidateLocationIds);
    } catch (error) {
      console.warn("Unable to resolve one or more IND-01 input location names", error);
    }
  }
  const locationLabel = (locationId: number | null): string | null => {
    if (!locationId) return null;
    return locationNames.get(locationId) ?? (locationId > 1_000_000_000_000 ? `Private structure ${locationId}` : `Location ${locationId}`);
  };

  const skillLevels = new Map((viewer.skills?.skills ?? []).map((skill) => [skill.skill_id, skill.trained_skill_level]));
  const plan = selectedDependency
    ? buildManufacturingPlan({
      productName: selectedDependency.product.name ?? selectedIdentity?.name ?? `Type ${selectedDependency.product.typeId}`,
      blueprintName: selectedDependency.blueprint.name ?? `Blueprint ${selectedDependency.blueprint.typeId}`,
      productQuantityPerRun: selectedDependency.product.quantity,
      runs,
      baseTimeSeconds: selectedDependency.activity.timeSeconds,
      inputLocationId: selectedLocationId,
      inputLocationLabel: locationLabel(selectedLocationId),
      facilityAvailable: facility,
      blueprintVisibility: viewer.blueprints ? "available" : "unavailable",
      blueprints: blueprintEvidence,
      materials: selectedDependency.activity.materials.map((material) => ({
        typeId: material.typeId,
        name: material.name ?? `Type ${material.typeId}`,
        baseQuantityPerRun: material.quantity,
        ownedAtInputLocation: viewer.assets && selectedLocationId
          ? materialQuantityByLocation.get(material.typeId)?.get(selectedLocationId) ?? 0
          : viewer.assets ? 0 : null,
        ownedAnywhere: viewer.assets ? materialQuantityAnywhere.get(material.typeId) ?? 0 : null,
      })),
      skills: selectedDependency.activity.skills.map((skill) => ({
        typeId: skill.typeId,
        name: skill.name ?? `Skill ${skill.typeId}`,
        requiredLevel: skill.level,
        trainedLevel: viewer.skills ? skillLevels.get(skill.typeId) ?? 0 : null,
        visibility: viewer.skills ? "available" : "unavailable",
      })),
    })
    : null;

  const current = {
    q,
    typeId: selectedTypeId,
    blueprintTypeId: selectedDependency?.blueprint.typeId ?? requestedBlueprintTypeId,
    runs,
    locationId: selectedLocationId,
    facility,
  };
  const metadata = getStaticDatabaseMetadata();
  const activeJobs = viewer.jobs?.filter((job) => job.status === "active" || job.status === "paused").length ?? null;

  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <div className={styles.topbar}>
          <Link className={styles.backLink} href="/"><ArrowLeft size={15} /> Back to companion</Link>
          <div className={styles.pills}>
            <Link className={styles.secondaryLink} href="/items"><PackageSearch size={15} /> Item Explorer</Link>
            <span className={styles.dataBadge}><Factory size={14} /> IND-01 · SDE {metadata.sdeBuild}</span>
          </div>
        </div>

        <section className={styles.hero}>
          <div className={styles.eyebrow}>Build it without losing track of the prerequisites</div>
          <h1>Manufacturing planner</h1>
          <p>Pick something to build. NEC checks the manufacturing blueprint, licensed runs, required skills, materials you own at the chosen input location versus elsewhere, and the facility fact that still needs to be confirmed in EVE.</p>
        </section>

        {!viewer.connected && (
          <div className={styles.notice}><CircleHelp size={17} /> Connect your EVE character to compare the plan with your real blueprints, skills, assets and industry jobs.</div>
        )}
        <div className={styles.notice}>
          <TriangleAlert size={17} /> EVE&apos;s Industry window remains authoritative for final material rounding, structure/rig modifiers, facility access, input/output hangars and installation cost. NEC plans the job; it does not install it.
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Step 1</div><h2>What do you want to build?</h2></div>
            <p>Ordinary manufacturing is the IND-01 slice. Blueprint research/copying and invention expand in IND-02/03.</p>
          </div>
          <form className={styles.searchForm} method="get">
            <label className={styles.searchBox}><PackageSearch size={17} /><input name="q" defaultValue={q} placeholder="Search a product, e.g. Venture, 10MN Afterburner, Antimatter Charge" aria-label="Manufacturing product search" /></label>
            <button className={styles.searchButton} type="submit">Find buildable items</button>
          </form>
          {q && searchResults.length === 0 && <div className={styles.emptyState}><PackageSearch size={22} /><strong>No ordinary manufacturing result found for “{q}”.</strong>Try the product name rather than the blueprint name.</div>}
          {searchResults.length > 0 && (
            <div className={styles.results}>
              {searchResults.map(({ identity, dependencies: itemDependencies }) => (
                <Link
                  className={styles.resultCard}
                  href={hrefFor(current, { typeId: identity.typeId, blueprintTypeId: itemDependencies[0].blueprint.typeId, locationId: null, facility: "unknown" })}
                  key={identity.typeId}
                >
                  <div className={styles.resultTop}><span className={styles.kindPill}>{identity.kinds.join(" · ")}</span><span className={styles.mutedPill}>{itemDependencies.length} blueprint path{itemDependencies.length === 1 ? "" : "s"}</span></div>
                  <h3>{identity.name ?? `Type ${identity.typeId}`}</h3>
                  <p>{identity.groupName ?? identity.categoryName ?? "Buildable item"}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {selectedDependency && selectedIdentity && (
          <>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div><div className={styles.eyebrow}>Step 2</div><h2>{selectedIdentity.name ?? `Type ${selectedIdentity.typeId}`}</h2></div>
                <Link className={styles.secondaryLink} href={`/items/${selectedIdentity.typeId}`}>Open full dependency tree</Link>
              </div>
              <div className={styles.results}>
                <article className={styles.infoCard}>
                  <h3>Output</h3>
                  <p className={styles.description}>{selectedDependency.product.quantity.toLocaleString()} per manufacturing run · {plan?.outputQuantity.toLocaleString()} planned output</p>
                  <span className={styles.mutedPill}>{durationLabel(plan?.baseJobTimeSeconds ?? null)}</span>
                </article>
                <article className={styles.infoCard}>
                  <h3>Current character context</h3>
                  <p className={styles.description}>{activeJobs === null ? "Industry-job visibility unavailable" : `${activeJobs} active/paused industry job${activeJobs === 1 ? "" : "s"} visible through ESI`}</p>
                  <span className={viewer.connected ? styles.kindPill : styles.mutedPill}>{viewer.connected ? "live character" : "static plan only"}</span>
                </article>
              </div>

              {dependencies.length > 1 && (
                <div className={styles.infoCard}>
                  <h3>Blueprint alternative</h3>
                  <div className={styles.productLinks}>
                    {dependencies.map((dependency) => (
                      <Link
                        key={dependency.blueprint.typeId}
                        className={dependency.blueprint.typeId === selectedDependency.blueprint.typeId ? styles.secondaryLink : styles.pill}
                        href={hrefFor(current, { blueprintTypeId: dependency.blueprint.typeId, locationId: null, facility: "unknown" })}
                      >
                        {dependency.blueprint.name ?? `Blueprint ${dependency.blueprint.typeId}`}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <form className={styles.searchForm} method="get">
                {q && <input type="hidden" name="q" value={q} />}
                <input type="hidden" name="typeId" value={selectedIdentity.typeId} />
                <input type="hidden" name="bp" value={selectedDependency.blueprint.typeId} />
                {selectedLocationId && <input type="hidden" name="locationId" value={selectedLocationId} />}
                {facility !== "unknown" && <input type="hidden" name="facility" value={facility} />}
                <label className={styles.searchBox}><Boxes size={17} /><input name="runs" defaultValue={runs} inputMode="numeric" aria-label="Manufacturing runs" /></label>
                <button className={styles.searchButton} type="submit">Recalculate runs</button>
              </form>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div><div className={styles.eyebrow}>Step 3</div><h2>Choose the input location</h2></div>
                <p>The blueprint and required inputs need to be together at the job&apos;s input location.</p>
              </div>
              {candidateLocationIds.length === 0 ? (
                <div className={styles.emptyState}><Boxes size={22} /><strong>No candidate input location can be established.</strong>{viewer.connected ? "NEC did not find this blueprint or matching material stock at a resolvable location." : "Connect your character to discover blueprint/material locations."}</div>
              ) : (
                <div className={styles.productLinks}>
                  {candidateLocationIds.map((locationId) => (
                    <Link
                      key={locationId}
                      className={locationId === selectedLocationId ? styles.secondaryLink : styles.pill}
                      href={hrefFor(current, { locationId, facility: "unknown" })}
                    >
                      {locationLabel(locationId)}
                    </Link>
                  ))}
                </div>
              )}

              {selectedLocationId && (
                <div className={styles.infoCard}>
                  <h3>Does this location offer Manufacturing?</h3>
                  <p className={styles.description}>ESI does not give NEC a complete, reliable “can I install this exact job here right now?” answer for every NPC station/private structure and your hangar access. Confirm it in the Industry window.</p>
                  <div className={styles.productLinks}>
                    {(["unknown", "yes", "no"] as ManufacturingEvidenceState[]).map((state) => (
                      <Link key={state} className={facility === state ? styles.secondaryLink : styles.pill} href={hrefFor(current, { facility: state })}>
                        Facility: {state}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {plan && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div><div className={styles.eyebrow}>Answer</div><h2>Can I build this?</h2></div>
                  <span className={statusClass(plan.status)}>{plan.status.replaceAll("-", " ")}</span>
                </div>

                <div className={styles.notice}>
                  {plan.status === "ready-to-verify" ? <CheckCircle2 size={19} /> : plan.status === "unknown" ? <CircleHelp size={19} /> : <TriangleAlert size={19} />}
                  <div><strong>Next: {plan.nextAction}</strong><span>{plan.outputQuantity.toLocaleString()} output from {runs.toLocaleString()} run{runs === 1 ? "" : "s"}.</span></div>
                </div>

                <div className={styles.results}>
                  <article className={styles.infoCard}>
                    <div className={styles.resultTop}><span className={plan.blueprint.state === "bpo" || plan.blueprint.state === "bpc" || plan.blueprint.state === "split-bpc" ? styles.kindPill : plan.blueprint.state === "unknown" ? styles.mutedPill : styles.warnPill}>{blueprintLabel(plan.blueprint.state)}</span></div>
                    <h3>{selectedDependency.blueprint.name ?? `Blueprint ${selectedDependency.blueprint.typeId}`}</h3>
                    {plan.blueprint.bestMaterialEfficiency !== null && <p className={styles.description}>Best allocated ME {plan.blueprint.bestMaterialEfficiency} · TE {plan.blueprint.bestTimeEfficiency ?? "unknown"}</p>}
                    {plan.blueprint.state === "insufficient-bpc-runs" && <p className={styles.description}>{plan.blueprint.availableCopyRunsAtLocation} licensed runs here · {plan.blueprint.missingCopyRuns} more needed.</p>}
                    <Link className={styles.secondaryLink} href={`/items/${selectedDependency.blueprint.typeId}`}>Inspect blueprint</Link>
                  </article>

                  <article className={styles.infoCard}>
                    <div className={styles.resultTop}><span className={facility === "yes" ? styles.kindPill : facility === "no" ? styles.warnPill : styles.mutedPill}>facility {facility}</span></div>
                    <h3>{locationLabel(selectedLocationId) ?? "Input location not chosen"}</h3>
                    <p className={styles.description}>Blueprint and materials are evaluated against this location. Final service/access/cost still comes from EVE.</p>
                  </article>
                </div>

                <div className={styles.sectionHeader}><div><div className={styles.eyebrow}>Skills</div><h2>Required by this manufacturing activity</h2></div></div>
                {plan.skills.length === 0 ? <div className={styles.notice}><CheckCircle2 size={17} /> CCP SDE records no explicit manufacturing skill rows for this blueprint activity.</div> : (
                  <div className={styles.results}>
                    {plan.skills.map((skill) => (
                      <article className={styles.infoCard} key={skill.typeId}>
                        <div className={styles.resultTop}><span className={skill.status === "met" ? styles.kindPill : skill.status === "missing" ? styles.warnPill : styles.mutedPill}>{skill.status}</span></div>
                        <h3>{skill.name} {skill.requiredLevel}</h3>
                        <p className={styles.description}>{skill.visibility === "available" ? `Trained level: ${skill.trainedLevel ?? 0}` : "Skill visibility unavailable"}</p>
                      </article>
                    ))}
                  </div>
                )}

                <div className={styles.sectionHeader}><div><div className={styles.eyebrow}>Materials</div><h2>What needs to be at the input location</h2></div><p>Quantities use owned blueprint ME when NEC can allocate the requested runs.</p></div>
                <div className={styles.results}>
                  {plan.materials.map((material) => (
                    <article className={styles.infoCard} key={material.typeId}>
                      <div className={styles.resultTop}>
                        <span className={material.status === "ready" ? styles.kindPill : material.status === "unknown" ? styles.mutedPill : styles.warnPill}>{material.status}</span>
                        <span className={styles.mutedPill}>{material.quantityBasis === "owned-blueprint-me" ? "blueprint ME applied" : "SDE base quantity"}</span>
                      </div>
                      <h3>{material.name} × {material.requiredQuantity.toLocaleString()}</h3>
                      <p className={styles.description}>At input: {material.ownedAtInputLocation === null ? "unknown" : material.ownedAtInputLocation.toLocaleString()} · Anywhere visible: {material.ownedAnywhere === null ? "unknown" : material.ownedAnywhere.toLocaleString()}</p>
                      {material.status === "move" && <p className={styles.description}>Move {material.moveFromElsewhereQuantity?.toLocaleString() ?? "needed stock"} here.</p>}
                      {material.status === "acquire" && <p className={styles.description}>Acquire {material.missingAnywhere?.toLocaleString() ?? "more"}; current ESI-visible holdings do not cover the job.</p>}
                      <Link className={styles.secondaryLink} href={`/items/${material.typeId}`}>How do I get this?</Link>
                    </article>
                  ))}
                </div>

                {(plan.blockers.length > 0 || plan.unknowns.length > 0) && (
                  <div className={styles.results}>
                    {plan.blockers.length > 0 && <article className={styles.infoCard}><h3>Blockers</h3><ul className={styles.skillList}>{plan.blockers.map((blocker) => <li key={blocker}><span>{blocker}</span></li>)}</ul></article>}
                    {plan.unknowns.length > 0 && <article className={styles.infoCard}><h3>Still needs confirmation</h3><ul className={styles.skillList}>{plan.unknowns.map((unknown) => <li key={unknown}><span>{unknown}</span></li>)}</ul></article>}
                  </div>
                )}
                <div className={styles.notice}><CircleHelp size={17} /><div><strong>Why NEC stops before “install job”</strong><span>{plan.notes.join(" ")}</span></div></div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
