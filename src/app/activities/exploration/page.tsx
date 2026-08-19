import { ArrowLeft, Compass, ExternalLink, PackageSearch, ScanSearch, ShieldAlert } from "lucide-react";
import Link from "next/link";

import {
  EXPLORATION_FIRST_RUN,
  EXPLORATION_LOOT_GUIDANCE,
  EXPLORATION_PREP,
  EXPLORATION_RISK_BANDS,
  EXPLORATION_SITE_GUIDES,
  EXPLORATION_SOURCES,
} from "@/lib/activity/exploration-guide";

import styles from "../../items/item-explorer.module.css";

export default function ExplorationActivityPage() {
  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <div className={styles.topbar}>
          <Link className={styles.backLink} href="/"><ArrowLeft size={15} /> Back to companion</Link>
          <Link className={styles.secondaryLink} href="/items"><PackageSearch size={15} /> Item explorer</Link>
        </div>

        <section className={styles.hero}>
          <div className={styles.eyebrow}>Beginner activity slice</div>
          <h1>Exploration first-run guide</h1>
          <p>Learn the actual scan-hack-loot loop without NEC pretending it can see live signatures, hidden ships, site danger, or your escape route.</p>
        </section>

        <div className={styles.notice}>
          <strong>What NEC can and cannot know:</strong> this guide teaches sourced mechanics and preparation. You still have to watch the game client, identify the live site, judge player activity, and decide whether to warp or stay. A successful scan is not a safety check.
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>One obvious next action</div><h2>Prepare a basic scanning ship</h2></div>
            <ScanSearch size={24} />
          </div>
          <div className={styles.panel}>
            <p className={styles.description}>For a first standard Data/Relic trip, fit probe capability first, then bring the analyzer that matches the sites you intend to run.</p>
            <ol className={styles.skillList}>
              {EXPLORATION_PREP.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <p className={styles.description}><strong>Progressive disclosure:</strong> you do not need to memorize every site family before undocking. Start with the basic scanner loop below, then inspect unfamiliar signatures before committing the ship.</p>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Know what the scanner is telling you</div><h2>Site types and interaction</h2></div>
            <Compass size={24} />
          </div>
          <div className={styles.results}>
            {EXPLORATION_SITE_GUIDES.map((site) => (
              <article className={styles.resultCard} key={site.kind}>
                <div className={styles.resultTop}><span className={styles.kindPill}>{site.kind}</span></div>
                <h3>{site.label}</h3>
                <p><strong>Find it:</strong> {site.scanRequirement}</p>
                <p><strong>Interact:</strong> {site.interaction}</p>
                <p>{site.beginnerNote}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>First run</div><h2>Scan, identify, hack, reassess</h2></div>
          </div>
          <div className={styles.panel}>
            <ol className={styles.skillList}>
              {EXPLORATION_FIRST_RUN.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Space-risk teaching</div><h2>Security band changes the problem</h2></div>
            <ShieldAlert size={24} />
          </div>
          <div className={styles.results}>
            {EXPLORATION_RISK_BANDS.map((risk) => (
              <article className={styles.resultCard} key={risk.id}>
                <div className={styles.resultTop}><span className={styles.warnPill}>{risk.id}</span></div>
                <h3>{risk.label}</h3>
                <p>{risk.guidance}</p>
              </article>
            ))}
          </div>
          <div className={styles.notice}>Special sites can break the ordinary expectations. Timers, NPCs, explosive containers, suspect effects, mines, or other mechanics may apply. If the site is unfamiliar, NEC&apos;s correct answer is "check first," not a confident guess.</div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Loot teaching</div><h2>Do not turn exploration into an auto-sell button</h2></div>
          </div>
          <div className={styles.results}>
            {EXPLORATION_LOOT_GUIDANCE.map((loot) => (
              <article className={styles.resultCard} key={loot.label}>
                <div className={styles.resultTop}><span className={styles.kindPill}>{loot.disposition}</span></div>
                <h3>{loot.label}</h3>
                <p>{loot.reason}</p>
              </article>
            ))}
          </div>
          <div className={styles.productLinks}>
            <Link className={styles.secondaryLink} href="/items">Inspect unfamiliar loot in Item Explorer</Link>
            <Link className={styles.secondaryLink} href="/assets">Review owned assets</Link>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Source provenance</div><h2>Why NEC says this</h2></div>
          </div>
          <div className={styles.panel}>
            <ul className={styles.skillList}>
              {EXPLORATION_SOURCES.map((source) => (
                <li key={source.url}>
                  <a className={styles.secondaryLink} href={source.url} target="_blank" rel="noreferrer">
                    {source.title} <ExternalLink size={13} />
                  </a>
                  <span> - verified {source.verifiedOn}; supports {source.supports.join(", ")}.</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
