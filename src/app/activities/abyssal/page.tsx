import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { AbyssalFitCatalog } from "@/components/abyssal-fit-catalog";
import { AbyssalLootGuide } from "@/components/abyssal-loot-guide";
import { ActivityBriefing } from "@/components/activity-briefing";
import { ActivityCheatSheet } from "@/components/activity-cheat-sheet";
import {
  buildAbyssalFirstRunPackage,
  getAbyssalFirstRunOption,
  listAbyssalFirstRunOptions,
} from "@/lib/activity/abyssal-first-run";
import { buildVettedAbyssalFitReadiness } from "@/lib/activity/abyssal-fit-catalog";

import styles from "../../items/item-explorer.module.css";

interface AbyssalActivityPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function AbyssalActivityPage({ searchParams }: AbyssalActivityPageProps) {
  const params = await searchParams;
  const options = listAbyssalFirstRunOptions();
  const requestedFitId = single(params.fit);
  const selected = getAbyssalFirstRunOption(requestedFitId) ?? options[0];

  const readiness = buildVettedAbyssalFitReadiness({
    fitId: selected.id,
    targetTier: selected.tier,
    weather: selected.weather,
    skillReadiness: "unknown",
    suppliesReady: "unknown",
    replacementCapacity: "unknown",
    priorTierExperience: selected.tier === 0 ? "not-applicable" : "unknown",
    filamentAvailable: "unknown",
  });
  const firstRun = buildAbyssalFirstRunPackage(selected, readiness.explanation);

  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <div className={styles.topbar}>
          <Link className={styles.backLink} href="/"><ArrowLeft size={15} /> Back to companion</Link>
          <Link className={styles.secondaryLink} href="/goals"><ShieldCheck size={15} /> Goals & plans</Link>
        </div>

        <section className={styles.hero}>
          <div className={styles.eyebrow}>First complete activity slice</div>
          <h1>Abyssal first-run guide</h1>
          <p>Choose a vetted T0/T1 starter fit. NEC keeps the exact fit, matching filament weather, supplies, activation steps, three-pocket flow, timer, failure conditions, loot teaching, and tier-validation rules in one guide.</p>
        </section>

        <div className={styles.notice}>
          The selected fit&apos;s tier/weather validation now feeds the readiness engine. Character-specific skill, owned-supply, replacement-capacity, and experience inputs remain explicitly unknown on this page until their live adapters are attached; NEC will not turn missing evidence into a ready verdict.
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Pick the exact run</div><h2>Vetted T0/T1 starter fits</h2></div>
            <p>{options.length} supported starter options</p>
          </div>

          <div className={styles.results}>
            {options.map((option) => {
              const active = option.id === selected.id;
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={styles.resultCard}
                  href={`/activities/abyssal?fit=${encodeURIComponent(option.id)}`}
                  key={option.id}
                >
                  <div className={styles.resultTop}>
                    <span className={styles.kindPill}>T{option.tier}</span>
                    <span className={styles.pill}>{option.weather}</span>
                    {active ? <span className={styles.mutedPill}>selected</span> : null}
                  </div>
                  <h3>{option.shipName}</h3>
                  <p>{option.fitName}</p>
                  <p>{option.summary}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className={styles.section}>
          <ActivityBriefing briefing={firstRun.briefing} />
        </section>

        <section className={styles.section}>
          <AbyssalLootGuide tier={selected.tier} />
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Keep beside EVE</div><h2>Compact execution view</h2></div>
            <p>Manual reference; no fake live telemetry</p>
          </div>
          <ActivityCheatSheet sheet={firstRun.cheatSheet} />
        </section>

        <section className={styles.section}>
          <AbyssalFitCatalog />
        </section>
      </div>
    </main>
  );
}
