import { ArrowLeft, Database, ExternalLink, Search } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getSession } from "@/lib/auth/session-store";
import { validAccessToken } from "@/lib/auth/sso";
import {
  evaluateAffordability,
  loadCharacterAffordability,
  type AffordabilityIndex,
} from "@/lib/player/affordability";
import {
  coverageForRequirement,
  loadCharacterAssetCoverage,
  type AssetCoverageIndex,
} from "@/lib/player/asset-coverage";
import {
  blueprintOwnershipForType,
  loadCharacterBlueprintOwnership,
  type BlueprintOwnershipIndex,
} from "@/lib/player/blueprint-ownership";
import {
  loadCharacterSkillReadiness,
  readinessForSkillRequirement,
  type SkillReadinessIndex,
} from "@/lib/player/skill-readiness";
import {
  getRecursiveManufacturingDependencies,
  getReverseUsesForType,
  getStaticDatabaseMetadata,
  getStaticItemIdentity,
  getStaticType,
  getTypeSkillRequirements,
  staticDatabaseAvailable,
  type RecursiveManufacturingNode,
  type ReverseUse,
} from "@/lib/sde/database";

import styles from "../item-explorer.module.css";

export const dynamic = "force-dynamic";

interface ItemDetailPageProps {
  params: Promise<{ typeId: string }>;
}

interface ViewerPlayerState {
  affordability: AffordabilityIndex;
  assetCoverage: AssetCoverageIndex;
  skillReadiness: SkillReadinessIndex;
  blueprintOwnership: BlueprintOwnershipIndex;
}

function cleanDescription(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || null;
}

function itemLabel(typeId: number, name: string | null): string {
  return name ?? `Unknown type ${typeId}`;
}

function timeLabel(seconds: number | null): string {
  if (seconds === null) return "Unknown base time";
  if (seconds < 60) return `${seconds}s base time`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m base time`;
  const hours = seconds / 3600;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h base time`;
}

function iskLabel(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Unknown";
  return `${Math.round(value).toLocaleString()} ISK`;
}

async function viewerPlayerState(): Promise<ViewerPlayerState | null> {
  const sessionId = (await cookies()).get("eve_session")?.value;
  if (!sessionId) return null;

  try {
    const session = getSession(sessionId);
    if (!session) return null;
    const token = await validAccessToken(session);
    const [affordability, assetCoverage, skillReadiness, blueprintOwnership] = await Promise.all([
      loadCharacterAffordability(session.characterId, token),
      loadCharacterAssetCoverage(session.characterId, token),
      loadCharacterSkillReadiness(session.characterId, token),
      loadCharacterBlueprintOwnership(session.characterId, token),
    ]);
    return { affordability, assetCoverage, skillReadiness, blueprintOwnership };
  } catch (error) {
    console.warn("Unable to prepare player overlays for Item Explorer", error);
    return {
      affordability: {
        wallet: { visibility: "unavailable", liquidIsk: null },
        market: { visibility: "unavailable", prices: new Map() },
      },
      assetCoverage: { visibility: "unavailable", reason: "esi-unavailable", byType: new Map() },
      skillReadiness: { visibility: "unavailable", reason: "esi-unavailable", bySkill: new Map() },
      blueprintOwnership: { visibility: "unavailable", reason: "esi-unavailable", byType: new Map() },
    };
  }
}

function AssetCoverageBadge({ coverage, typeId, requiredQuantity }: { coverage: AssetCoverageIndex | null; typeId: number; requiredQuantity: number }) {
  if (!coverage) return null;
  const result = coverageForRequirement(coverage, typeId, requiredQuantity);
  if (result.status === "unavailable") return <span className={styles.mutedPill}>asset visibility unavailable</span>;
  if (result.status === "owned") return <span className={styles.kindPill}>owned {result.totalQuantity.toLocaleString()}</span>;
  if (result.status === "partial") return <span className={styles.warnPill}>owned {result.totalQuantity.toLocaleString()} · missing {result.missingQuantity.toLocaleString()}</span>;
  if (result.status === "location-unknown") return <span className={styles.warnPill}>own {result.totalQuantity.toLocaleString()} · location/access unknown</span>;
  return <span className={styles.warnPill}>missing {requiredQuantity.toLocaleString()}</span>;
}

function AffordabilityBadge({ affordability, coverage, typeId, requiredQuantity }: { affordability: AffordabilityIndex | null; coverage: AssetCoverageIndex | null; typeId: number; requiredQuantity: number }) {
  if (!affordability || !coverage) return null;
  const assetResult = coverageForRequirement(coverage, typeId, requiredQuantity);
  if (assetResult.status === "unavailable" || assetResult.status === "location-unknown" || assetResult.status === "owned") return null;

  const result = evaluateAffordability(affordability, typeId, assetResult.missingQuantity);
  if (result.status === "wallet-unavailable") return <span className={styles.mutedPill}>wallet unavailable</span>;
  if (result.status === "price-unavailable") return <span className={styles.mutedPill}>market reference unavailable</span>;
  if (result.status === "not-affordable") return <span className={styles.warnPill}>est. {iskLabel(result.estimatedCost)} · exceeds liquid ISK</span>;
  if (result.status === "reserve-breach") return <span className={styles.warnPill}>est. {iskLabel(result.estimatedCost)} · crosses reserve</span>;
  if (result.status === "available") return <span className={styles.mutedPill}>est. {iskLabel(result.estimatedCost)} · liquid ISK covers</span>;
  return null;
}

function SkillReadinessBadge({ readiness, skillTypeId, requiredLevel }: { readiness: SkillReadinessIndex | null; skillTypeId: number; requiredLevel: number }) {
  if (!readiness) return null;
  const result = readinessForSkillRequirement(readiness, skillTypeId, requiredLevel);
  if (result.status === "unavailable") return <span className={styles.mutedPill}>skill visibility unavailable</span>;
  if (result.status === "met") return <span className={styles.kindPill}>trained {result.trainedLevel} · met</span>;
  if (result.status === "below-required") return <span className={styles.warnPill}>trained {result.trainedLevel} · needs {requiredLevel}</span>;
  return <span className={styles.warnPill}>not trained · needs {requiredLevel}</span>;
}

function BlueprintOwnershipBadge({ ownership, blueprintTypeId }: { ownership: BlueprintOwnershipIndex | null; blueprintTypeId: number }) {
  if (!ownership) return null;
  const summary = blueprintOwnershipForType(ownership, blueprintTypeId);
  if (summary.state === "unavailable") return <span className={styles.mutedPill}>blueprint visibility unavailable</span>;
  if (summary.state === "not-owned") return <span className={styles.warnPill}>must obtain blueprint</span>;
  const bestOriginal = summary.originals[0];
  if (bestOriginal) {
    const extra = summary.originals.length > 1 ? ` · ${summary.originals.length} BPOs` : "";
    return <span className={styles.kindPill}>BPO owned · ME {bestOriginal.materialEfficiency} · TE {bestOriginal.timeEfficiency}{extra}</span>;
  }
  if (summary.copies.length > 0) {
    const bestCopy = summary.copies[0];
    return <span className={styles.kindPill}>BPC owned · {summary.totalCopyRuns} runs total · best ME {bestCopy.materialEfficiency} / TE {bestCopy.timeEfficiency}</span>;
  }
  return <span className={styles.mutedPill}>blueprint owned · ESI state unrecognized</span>;
}

function SourceBoundary({ node }: { node: RecursiveManufacturingNode }) {
  if (node.state === "unknown-type") return <div className={styles.terminal}>CCP static data does not contain enough metadata for this referenced type. NEC will not invent an identity or source.</div>;
  if (node.state === "cycle") return <div className={styles.terminal}>This dependency points back into the active production path. Expansion stopped here to avoid a cycle.</div>;
  if (node.state === "depth-limit") return <div className={styles.terminal}>The inline tree stops at this depth. Open this item directly to continue exploring its dependencies.</div>;
  if (node.state !== "not-manufacturable") return null;
  const resolution = node.sourceResolution;
  if (!resolution || resolution.sourceState === "unknown") {
    return <div className={styles.terminal}>No ordinary manufacturing blueprint was found. The installed knowledge does not yet establish a reliable acquisition source, so NEC leaves this as unknown rather than guessing.</div>;
  }
  return (
    <div className={styles.terminal}>
      <strong>Known non-manufacturing source{resolution.sources.length === 1 ? "" : "s"}:</strong>
      <ul className={styles.sourceList}>
        {resolution.sources.map((source, index) => (
          <li key={`${source.sourceKind}-${source.label}-${index}`}>
            {source.label}
            {source.evidence.kind === "curated" ? (
              <> · <a className={styles.itemLink} href={source.evidence.url} target="_blank" rel="noreferrer">evidence <ExternalLink size={11} /></a></>
            ) : <> · CCP SDE{source.evidence.sdeBuild ? ` ${source.evidence.sdeBuild}` : ""}</>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DependencyNode({ node, affordability, assetCoverage, skillReadiness, blueprintOwnership, root = false }: { node: RecursiveManufacturingNode; affordability: AffordabilityIndex | null; assetCoverage: AssetCoverageIndex | null; skillReadiness: SkillReadinessIndex | null; blueprintOwnership: BlueprintOwnershipIndex | null; root?: boolean }) {
  const label = itemLabel(node.typeId, node.item?.name ?? null);
  const stateLabel = node.state === "manufacturable" ? "manufacturable" : node.state.replaceAll("-", " ");
  return (
    <div className={root ? undefined : styles.requirement}>
      <details className={styles.treeCard} open={root || node.depth < 2}>
        <summary className={styles.treeSummary}>
          <span>{node.item ? <Link className={styles.itemLink} href={`/items/${node.typeId}`}>{label}</Link> : <strong>{label}</strong>}<small> · Type {node.typeId}</small></span>
          <span className={node.state === "manufacturable" ? styles.kindPill : styles.mutedPill}>{stateLabel}</span>
        </summary>
        {node.state === "manufacturable" && (
          <div className={styles.alternatives}>
            {node.alternatives.map((alternative) => (
              <div className={styles.alternative} key={`${alternative.blueprint.typeId}-${alternative.activity.kind}`}>
                <div className={styles.alternativeHeader}>
                  <span>Build with <Link className={styles.itemLink} href={`/items/${alternative.blueprint.typeId}`}>{itemLabel(alternative.blueprint.typeId, alternative.blueprint.name)}</Link></span>
                  <span className={styles.treeNote}>{timeLabel(alternative.activity.timeSeconds)} · makes {alternative.product.quantity}</span>
                </div>
                {!alternative.blueprint.isPlaceholder && <BlueprintOwnershipBadge ownership={blueprintOwnership} blueprintTypeId={alternative.blueprint.typeId} />}
                {alternative.activity.skills.length > 0 && (
                  <ul className={styles.skillList}>
                    {alternative.activity.skills.map((skill) => (
                      <li key={skill.typeId}>
                        <span><Link className={styles.itemLink} href={`/items/${skill.typeId}`}>{itemLabel(skill.typeId, skill.name)}</Link> {skill.level}</span>
                        {!skill.isPlaceholder && <SkillReadinessBadge readiness={skillReadiness} skillTypeId={skill.typeId} requiredLevel={skill.level} />}
                      </li>
                    ))}
                  </ul>
                )}
                {alternative.activity.materials.length === 0 ? (
                  <div className={styles.treeNote}>No material rows are recorded for this activity.</div>
                ) : (
                  <ul className={styles.treeChildren}>
                    {alternative.activity.materials.map((material) => (
                      <li key={`${material.requirement.typeId}-${material.requirement.quantity}`}>
                        <div className={styles.requirementTop}>
                          <span><Link className={styles.itemLink} href={`/items/${material.requirement.typeId}`}>{itemLabel(material.requirement.typeId, material.requirement.name)}</Link></span>
                          <span className={styles.treeNote}>× {material.requirement.quantity}</span>
                          {!material.requirement.isPlaceholder && <AssetCoverageBadge coverage={assetCoverage} typeId={material.requirement.typeId} requiredQuantity={material.requirement.quantity} />}
                          {!material.requirement.isPlaceholder && <AffordabilityBadge affordability={affordability} coverage={assetCoverage} typeId={material.requirement.typeId} requiredQuantity={material.requirement.quantity} />}
                        </div>
                        <DependencyNode node={material.dependency} affordability={affordability} assetCoverage={assetCoverage} skillReadiness={skillReadiness} blueprintOwnership={blueprintOwnership} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
        <SourceBoundary node={node} />
      </details>
    </div>
  );
}

function ReverseUseCard({ use }: { use: ReverseUse }) {
  return (
    <li className={styles.useCard}>
      <div className={styles.useCardHeader}>
        <span><Link className={styles.itemLink} href={`/items/${use.blueprint.typeId}`}>{itemLabel(use.blueprint.typeId, use.blueprint.name)}</Link><span className={styles.treeNote}> · {use.activity.replaceAll("_", " ")}</span></span>
        <span className={styles.mutedPill}>{use.role}</span>
      </div>
      {use.inputQuantity !== null && <p className={styles.treeNote}>Uses {use.inputQuantity} per recorded activity run.</p>}
      <div className={styles.productLinks}>{use.products.map((product) => <Link className={styles.pill} href={`/items/${product.typeId}`} key={product.typeId}>{itemLabel(product.typeId, product.name)} × {product.quantity}</Link>)}</div>
    </li>
  );
}

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { typeId: rawTypeId } = await params;
  const typeId = Number(rawTypeId);
  if (!Number.isInteger(typeId) || typeId <= 0) notFound();
  if (!staticDatabaseAvailable()) {
    return <main className={styles.shell}><div className={styles.container}><Link className={styles.backLink} href="/items"><ArrowLeft size={15} /> Item Explorer</Link><div className={styles.error}>The local static EVE database is not installed yet.</div></div></main>;
  }
  const identity = getStaticItemIdentity(typeId);
  const staticType = getStaticType(typeId);
  if (!identity || !staticType) notFound();
  const metadata = getStaticDatabaseMetadata();
  const skillRequirements = getTypeSkillRequirements(typeId);
  const dependencyTree = getRecursiveManufacturingDependencies(typeId, { maxDepth: 4 });
  const reverseUses = getReverseUsesForType(typeId);
  const visibleUses = reverseUses.slice(0, 100);
  const description = cleanDescription(staticType.description);
  const playerState = await viewerPlayerState();
  const affordability = playerState?.affordability ?? null;
  const assetCoverage = playerState?.assetCoverage ?? null;
  const skillReadiness = playerState?.skillReadiness ?? null;
  const blueprintOwnership = playerState?.blueprintOwnership ?? null;
  const itemAffordability = affordability ? evaluateAffordability(affordability, typeId, 1) : null;
  const ownBlueprint = identity.kinds.includes("blueprint") && blueprintOwnership ? blueprintOwnershipForType(blueprintOwnership, typeId) : null;

  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <div className={styles.topbar}><Link className={styles.backLink} href="/items"><ArrowLeft size={15} /> Item Explorer</Link><span className={styles.dataBadge}><Database size={14} /> CCP SDE build {metadata.sdeBuild}</span></div>
        <section className={styles.detailHero}>
          <div className={styles.eyebrow}>Type {typeId}</div><h1>{itemLabel(typeId, identity.name)}</h1>
          <div className={styles.detailMeta}>
            {identity.kinds.map((kind) => <span className={styles.kindPill} key={kind}>{kind}</span>)}
            <span className={styles.pill}>{identity.categoryName ?? "Unknown category"}</span><span className={styles.pill}>{identity.groupName ?? "Unknown group"}</span>
            {identity.published === false && <span className={styles.warnPill}>unpublished</span>}{identity.isPlaceholder && <span className={styles.warnPill}>unresolved CCP reference</span>}{ownBlueprint && <BlueprintOwnershipBadge ownership={blueprintOwnership} blueprintTypeId={typeId} />}
          </div>
          {description && <p>{description}</p>}
          {ownBlueprint?.state === "owned" && ownBlueprint.copies.length > 0 && <p>BPCs: {ownBlueprint.copies.length} copies, {ownBlueprint.totalCopyRuns} runs remaining total. Research values shown below come directly from the owned ESI records.</p>}
        </section>
        <form className={styles.searchForm} action="/items" method="get"><label className={styles.searchBox}><Search size={17} aria-hidden="true" /><input type="search" name="q" placeholder="Search another EVE item..." aria-label="Search another EVE item" /></label><button className={styles.searchButton} type="submit">Search</button></form>
        <div className={styles.grid}>
          <article className={styles.infoCard}><h3>What NEC knows</h3><div className={styles.infoRows}><div className={styles.infoRow}><span>Category</span><strong>{identity.categoryName ?? "Unknown"}</strong></div><div className={styles.infoRow}><span>Group</span><strong>{identity.groupName ?? "Unknown"}</strong></div><div className={styles.infoRow}><span>Published</span><strong>{identity.published === null ? "Unknown" : identity.published ? "Yes" : "No"}</strong></div><div className={styles.infoRow}><span>Market group ID</span><strong>{identity.marketGroupId ?? "None recorded"}</strong></div></div></article>
          <article className={styles.infoCard}>
            <h3>Required skills to use this type</h3>
            {skillRequirements.length === 0 ? <p className={styles.description}>No Dogma required-skill entries are recorded for this item.</p> : <ul className={styles.skillList}>{skillRequirements.map((skill) => <li key={`${skill.skillTypeId}-${skill.requirementSlot}`}><span><Link className={styles.itemLink} href={`/items/${skill.skillTypeId}`}>{itemLabel(skill.skillTypeId, skill.skillName)}</Link> {skill.level}</span><SkillReadinessBadge readiness={skillReadiness} skillTypeId={skill.skillTypeId} requiredLevel={skill.level} /></li>)}</ul>}
            {playerState === null && <p className={styles.description}>Connect a character to compare these requirements with your trained skills.</p>}{skillReadiness?.visibility === "unavailable" && <p className={styles.description}>Skill visibility is unavailable right now; NEC will not treat that as untrained.</p>}
          </article>
          <article className={styles.infoCard}>
            <h3>Wallet & market reference</h3>
            {playerState === null ? <p className={styles.description}>Connect a character to compare a market reference with your liquid ISK.</p> : <>
              <div className={styles.infoRows}><div className={styles.infoRow}><span>Liquid ISK</span><strong>{iskLabel(affordability?.wallet.liquidIsk ?? null)}</strong></div><div className={styles.infoRow}><span>ESI average reference</span><strong>{iskLabel(itemAffordability?.unitPrice ?? null)}</strong></div><div className={styles.infoRow}><span>1-unit estimate</span><strong>{iskLabel(itemAffordability?.estimatedCost ?? null)}</strong></div><div className={styles.infoRow}><span>After 1 unit</span><strong>{iskLabel(itemAffordability?.remainingAfterPurchase ?? null)}</strong></div><div className={styles.infoRow}><span>Replacement reserve</span><strong>Not applied yet</strong></div></div>
              {itemAffordability?.status === "available" && <p className={styles.description}>Liquid ISK covers this reference estimate. That does not yet mean NEC recommends the purchase or considers the loss affordable.</p>}{itemAffordability?.status === "not-affordable" && <p className={styles.description}>This reference estimate exceeds the visible liquid wallet balance.</p>}{itemAffordability?.status === "wallet-unavailable" && <p className={styles.description}>Wallet visibility is unavailable; NEC will not treat that as zero ISK.</p>}{itemAffordability?.status === "price-unavailable" && <p className={styles.description}>CCP&apos;s public market feed has no usable average-price reference for this type.</p>}
              <p className={styles.description}>The ESI average is a reference estimate, not a live sell-order quote. Local/hub order-book pricing belongs to the later market valuation phase.</p>
            </>}
          </article>
        </div>
        <section className={styles.section} id="how-to-get">
          <div className={styles.sectionHeader}><div><div className={styles.eyebrow}>Acquisition</div><h2>How do I get this?</h2></div><p>Manufacturing dependencies expand four levels inline. Open any dependency to continue deeper.</p></div>
          {playerState === null ? <div className={styles.notice}>Connect an EVE character to compare material, skill, blueprint, wallet, and market-reference requirements against your character.</div> : assetCoverage?.visibility === "unavailable" || skillReadiness?.visibility === "unavailable" || blueprintOwnership?.visibility === "unavailable" || affordability?.wallet.visibility === "unavailable" || affordability?.market.visibility === "unavailable" ? <div className={styles.notice}>Character connected, but part of the player overlay is unavailable right now. NEC preserves that as unknown rather than assuming zero assets, skills, blueprints, ISK, or market value.</div> : <div className={styles.notice}>Player overlay active. Material quantities, trained skills, blueprints, and liquid wallet come from ESI. Market amounts are average-price references only; uncertain asset roots are not assumed immediately usable.</div>}
          <DependencyNode node={dependencyTree} affordability={affordability} assetCoverage={assetCoverage} skillReadiness={skillReadiness} blueprintOwnership={blueprintOwnership} root />
        </section>
        <section className={styles.section} id="used-for">
          <div className={styles.sectionHeader}><div><div className={styles.eyebrow}>Reverse graph</div><h2>What is this used for?</h2></div><p>{reverseUses.length} recorded use{reverseUses.length === 1 ? "" : "s"} in product-producing blueprint activities.</p></div>
          {reverseUses.length === 0 ? <div className={styles.emptyState}><strong>No product-producing reverse uses found.</strong> NEC will not invent purposes that are not represented by the installed SDE relationships.</div> : <>{reverseUses.length > visibleUses.length && <div className={styles.notice}>Showing the first {visibleUses.length} deterministic results. This item has {reverseUses.length} recorded uses; open specific products or blueprints to continue exploring.</div>}<ul className={styles.useList}>{visibleUses.map((use, index) => <ReverseUseCard use={use} key={`${use.blueprint.typeId}-${use.activity}-${use.role}-${index}`} />)}</ul></>}
        </section>
      </div>
    </main>
  );
}
