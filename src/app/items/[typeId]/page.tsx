import { ArrowLeft, Database, ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

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

function SourceBoundary({ node }: { node: RecursiveManufacturingNode }) {
  if (node.state === "unknown-type") {
    return <div className={styles.terminal}>CCP static data does not contain enough metadata for this referenced type. NEC will not invent an identity or source.</div>;
  }
  if (node.state === "cycle") {
    return <div className={styles.terminal}>This dependency points back into the active production path. Expansion stopped here to avoid a cycle.</div>;
  }
  if (node.state === "depth-limit") {
    return <div className={styles.terminal}>The inline tree stops at this depth. Open this item directly to continue exploring its dependencies.</div>;
  }
  if (node.state !== "not-manufacturable") return null;

  const resolution = node.sourceResolution;
  if (!resolution || resolution.sourceState === "unknown") {
    return (
      <div className={styles.terminal}>
        No ordinary manufacturing blueprint was found. The installed knowledge does not yet establish a reliable acquisition source, so NEC leaves this as unknown rather than guessing.
      </div>
    );
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
            ) : (
              <> · CCP SDE{source.evidence.sdeBuild ? ` ${source.evidence.sdeBuild}` : ""}</>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DependencyNode({ node, root = false }: { node: RecursiveManufacturingNode; root?: boolean }) {
  const label = itemLabel(node.typeId, node.item?.name ?? null);
  const stateLabel = node.state === "manufacturable" ? "manufacturable" : node.state.replaceAll("-", " ");

  return (
    <div className={root ? undefined : styles.requirement}>
      <details className={styles.treeCard} open={root || node.depth < 2}>
        <summary className={styles.treeSummary}>
          <span>
            {node.item ? <Link className={styles.itemLink} href={`/items/${node.typeId}`}>{label}</Link> : <strong>{label}</strong>}
            <small> · Type {node.typeId}</small>
          </span>
          <span className={node.state === "manufacturable" ? styles.kindPill : styles.mutedPill}>{stateLabel}</span>
        </summary>

        {node.state === "manufacturable" && (
          <div className={styles.alternatives}>
            {node.alternatives.map((alternative) => (
              <div className={styles.alternative} key={`${alternative.blueprint.typeId}-${alternative.activity.kind}`}>
                <div className={styles.alternativeHeader}>
                  <span>
                    Build with <Link className={styles.itemLink} href={`/items/${alternative.blueprint.typeId}`}>
                      {itemLabel(alternative.blueprint.typeId, alternative.blueprint.name)}
                    </Link>
                  </span>
                  <span className={styles.treeNote}>{timeLabel(alternative.activity.timeSeconds)} · makes {alternative.product.quantity}</span>
                </div>

                {alternative.activity.skills.length > 0 && (
                  <ul className={styles.skillList}>
                    {alternative.activity.skills.map((skill) => (
                      <li key={skill.typeId}>
                        <Link className={styles.itemLink} href={`/items/${skill.typeId}`}>{itemLabel(skill.typeId, skill.name)}</Link> {skill.level}
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
                          <span>
                            <Link className={styles.itemLink} href={`/items/${material.requirement.typeId}`}>
                              {itemLabel(material.requirement.typeId, material.requirement.name)}
                            </Link>
                          </span>
                          <span className={styles.treeNote}>× {material.requirement.quantity}</span>
                        </div>
                        <DependencyNode node={material.dependency} />
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
        <span>
          <Link className={styles.itemLink} href={`/items/${use.blueprint.typeId}`}>
            {itemLabel(use.blueprint.typeId, use.blueprint.name)}
          </Link>
          <span className={styles.treeNote}> · {use.activity.replaceAll("_", " ")}</span>
        </span>
        <span className={styles.mutedPill}>{use.role}</span>
      </div>
      {use.inputQuantity !== null && <p className={styles.treeNote}>Uses {use.inputQuantity} per recorded activity run.</p>}
      <div className={styles.productLinks}>
        {use.products.map((product) => (
          <Link className={styles.pill} href={`/items/${product.typeId}`} key={product.typeId}>
            {itemLabel(product.typeId, product.name)} × {product.quantity}
          </Link>
        ))}
      </div>
    </li>
  );
}

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { typeId: rawTypeId } = await params;
  const typeId = Number(rawTypeId);
  if (!Number.isInteger(typeId) || typeId <= 0) notFound();

  if (!staticDatabaseAvailable()) {
    return (
      <main className={styles.shell}>
        <div className={styles.container}>
          <Link className={styles.backLink} href="/items"><ArrowLeft size={15} /> Item Explorer</Link>
          <div className={styles.error}>The local static EVE database is not installed yet.</div>
        </div>
      </main>
    );
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

  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <div className={styles.topbar}>
          <Link className={styles.backLink} href="/items"><ArrowLeft size={15} /> Item Explorer</Link>
          <span className={styles.dataBadge}><Database size={14} /> CCP SDE build {metadata.sdeBuild}</span>
        </div>

        <section className={styles.detailHero}>
          <div className={styles.eyebrow}>Type {typeId}</div>
          <h1>{itemLabel(typeId, identity.name)}</h1>
          <div className={styles.detailMeta}>
            {identity.kinds.map((kind) => <span className={styles.kindPill} key={kind}>{kind}</span>)}
            <span className={styles.pill}>{identity.categoryName ?? "Unknown category"}</span>
            <span className={styles.pill}>{identity.groupName ?? "Unknown group"}</span>
            {identity.published === false && <span className={styles.warnPill}>unpublished</span>}
            {identity.isPlaceholder && <span className={styles.warnPill}>unresolved CCP reference</span>}
          </div>
          {description && <p>{description}</p>}
        </section>

        <form className={styles.searchForm} action="/items" method="get">
          <label className={styles.searchBox}>
            <Search size={17} aria-hidden="true" />
            <input type="search" name="q" placeholder="Search another EVE item..." aria-label="Search another EVE item" />
          </label>
          <button className={styles.searchButton} type="submit">Search</button>
        </form>

        <div className={styles.grid}>
          <article className={styles.infoCard}>
            <h3>What NEC knows</h3>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}><span>Category</span><strong>{identity.categoryName ?? "Unknown"}</strong></div>
              <div className={styles.infoRow}><span>Group</span><strong>{identity.groupName ?? "Unknown"}</strong></div>
              <div className={styles.infoRow}><span>Published</span><strong>{identity.published === null ? "Unknown" : identity.published ? "Yes" : "No"}</strong></div>
              <div className={styles.infoRow}><span>Market group ID</span><strong>{identity.marketGroupId ?? "None recorded"}</strong></div>
            </div>
          </article>

          <article className={styles.infoCard}>
            <h3>Required skills to use this type</h3>
            {skillRequirements.length === 0 ? (
              <p className={styles.description}>No Dogma required-skill entries are recorded for this item.</p>
            ) : (
              <ul className={styles.skillList}>
                {skillRequirements.map((skill) => (
                  <li key={`${skill.skillTypeId}-${skill.requirementSlot}`}>
                    <Link className={styles.itemLink} href={`/items/${skill.skillTypeId}`}>
                      {itemLabel(skill.skillTypeId, skill.skillName)}
                    </Link> {skill.level}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <section className={styles.section} id="how-to-get">
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Acquisition</div><h2>How do I get this?</h2></div>
            <p>Manufacturing dependencies expand four levels inline. Open any dependency to continue deeper.</p>
          </div>
          <DependencyNode node={dependencyTree} root />
        </section>

        <section className={styles.section} id="used-for">
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Reverse graph</div><h2>What is this used for?</h2></div>
            <p>{reverseUses.length} recorded use{reverseUses.length === 1 ? "" : "s"} in product-producing blueprint activities.</p>
          </div>

          {reverseUses.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>No product-producing reverse uses found.</strong>
              NEC will not invent purposes that are not represented by the installed SDE relationships.
            </div>
          ) : (
            <>
              {reverseUses.length > visibleUses.length && (
                <div className={styles.notice}>Showing the first {visibleUses.length} deterministic results. This item has {reverseUses.length} recorded uses; open specific products or blueprints to continue exploring.</div>
              )}
              <ul className={styles.useList}>
                {visibleUses.map((use, index) => <ReverseUseCard use={use} key={`${use.blueprint.typeId}-${use.activity}-${use.role}-${index}`} />)}
              </ul>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
