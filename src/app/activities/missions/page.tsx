import { ArrowLeft, ExternalLink, PackageSearch, ShieldCheck, Swords, WalletCards } from "lucide-react";
import Link from "next/link";

import {
  MISSION_BOUNDARIES,
  MISSION_COMBAT_HABITS,
  MISSION_LEVELS,
  MISSION_SOURCES,
} from "@/lib/activity/mission-pve-guide";

import styles from "../../items/item-explorer.module.css";

export default function MissionsActivityPage() {
  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <div className={styles.topbar}>
          <Link className={styles.backLink} href="/"><ArrowLeft size={15} /> Back to companion</Link>
          <Link className={styles.secondaryLink} href="/items"><PackageSearch size={15} /> Item explorer</Link>
        </div>

        <section className={styles.hero}>
          <div className={styles.eyebrow}>Mission / PvE progression slice</div>
          <h1>Security mission progression</h1>
          <p>Choose the next mission tier because your character, fit, supplies, and replacement budget support it - not because the next hull is shiny and technically purchasable.</p>
        </section>

        <div className={styles.notice}>
          <strong>One obvious next action:</strong> identify the Security agent level you can access, then check whether your current combat ship is actually prepared for that tier before buying anything larger.
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Tier progression</div><h2>Agent access is only the first gate</h2></div>
            <Swords size={24} />
          </div>
          <div className={styles.results}>
            {MISSION_LEVELS.map((entry) => (
              <article className={styles.resultCard} key={entry.level}>
                <div className={styles.resultTop}><span className={styles.kindPill}>Level {entry.level}</span></div>
                <h3>Standing gate: {entry.minimumStanding}</h3>
                <p><strong>Hull guidance:</strong> {entry.shipGuidance}</p>
                <p><strong>Readiness:</strong> {entry.readinessNote}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Combat preparation</div><h2>What to check before accepting the bigger fight</h2></div>
            <ShieldCheck size={24} />
          </div>
          <div className={styles.results}>
            {MISSION_COMBAT_HABITS.map((habit) => (
              <article className={styles.resultCard} key={habit.label}>
                <h3>{habit.label}</h3>
                <p>{habit.guidance}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Upgrade value</div><h2>Can buy is not can afford to lose</h2></div>
            <WalletCards size={24} />
          </div>
          <div className={styles.panel}>
            <p className={styles.description}>A hull upgrade only helps when the complete fit improves the mission problem you actually have. Compare fitted cost, ammunition/drones/consumables, application, tank, and a replacement reserve before moving up. If the new ship consumes nearly all liquid ISK, NEC should treat that as a risk warning, not a progression achievement.</p>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Honest unknowns</div><h2>What NEC must not pretend to know</h2></div>
          </div>
          <div className={styles.panel}>
            <ul className={styles.skillList}>
              {MISSION_BOUNDARIES.map((boundary) => <li key={boundary}>{boundary}</li>)}
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Source provenance</div><h2>Why NEC says this</h2></div>
          </div>
          <div className={styles.panel}>
            <ul className={styles.skillList}>
              {MISSION_SOURCES.map((source) => (
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
