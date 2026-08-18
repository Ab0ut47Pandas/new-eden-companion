import { ArrowLeft, Database, Search, Target } from "lucide-react";
import Link from "next/link";

import {
  getStaticDatabaseMetadata,
  searchStaticItems,
  staticDatabaseAvailable,
} from "@/lib/sde/database";

import styles from "./item-explorer.module.css";

export const dynamic = "force-dynamic";

interface ItemExplorerPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function ItemExplorerPage({ searchParams }: ItemExplorerPageProps) {
  const params = await searchParams;
  const query = single(params.q).trim();
  const available = staticDatabaseAvailable();

  let build: number | null = null;
  let results = [] as ReturnType<typeof searchStaticItems>;
  let error: string | null = null;

  if (available) {
    try {
      build = getStaticDatabaseMetadata().sdeBuild;
      if (query) results = searchStaticItems(query, { limit: 60 });
    } catch (cause) {
      console.error("Unable to search the static EVE database", cause);
      error = "The static EVE database could not be read. Check Static Data diagnostics before using the Item Explorer.";
    }
  }

  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <div className={styles.topbar}>
          <Link className={styles.backLink} href="/"><ArrowLeft size={15} /> Back to companion</Link>
          <div className={styles.pills}>
            <Link className={styles.secondaryLink} href="/goals"><Target size={15} /> Goals & plans</Link>
            <span className={styles.dataBadge}><Database size={14} /> {build ? `CCP SDE build ${build}` : "Static data unavailable"}</span>
          </div>
        </div>

        <section className={styles.hero}>
          <div className={styles.eyebrow}>EVE knowledge</div>
          <h1>Item Explorer</h1>
          <p>Search an item, ship, blueprint, skill, module, material, or category. Open a result to ask how it is obtained and what uses it.</p>
        </section>

        <form className={styles.searchForm} action="/items" method="get">
          <label className={styles.searchBox}>
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Try Rifter, Tritanium, Frigate, Module, Blueprint..."
              autoFocus
              aria-label="Search EVE items"
            />
          </label>
          <button className={styles.searchButton} type="submit">Search</button>
        </form>

        {!available && (
          <div className={styles.error}>
            The local static EVE database is not installed yet. NEC will not fall back to guessed or stale item data.
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {available && !error && !query && (
          <div className={styles.emptyState}>
            <strong>Start with anything you have seen in EVE.</strong>
            Search by exact item name, a group such as “Frigate”, or a category such as “Ship” or “Module”.
          </div>
        )}

        {available && !error && query && (
          <>
            <div className={styles.resultsHeader}>
              <h2>Results for “{query}”</h2>
              <span>{results.length} result{results.length === 1 ? "" : "s"}</span>
            </div>

            {results.length === 0 ? (
              <div className={styles.emptyState}>
                <strong>No matching static item.</strong>
                NEC searched item names, groups, and categories in the installed CCP SDE.
              </div>
            ) : (
              <div className={styles.results}>
                {results.map((item) => (
                  <Link className={styles.resultCard} href={`/items/${item.typeId}`} key={item.typeId}>
                    <div className={styles.resultTop}>
                      {item.kinds.map((kind) => <span className={styles.kindPill} key={kind}>{kind}</span>)}
                      {item.published === false && <span className={styles.warnPill}>unpublished</span>}
                      {item.isPlaceholder && <span className={styles.warnPill}>unresolved</span>}
                    </div>
                    <h3>{item.name ?? `Unknown type ${item.typeId}`}</h3>
                    <p>{item.categoryName ?? "Unknown category"} · {item.groupName ?? "Unknown group"} · Type {item.typeId}</p>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
