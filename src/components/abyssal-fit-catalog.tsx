import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { listVettedAbyssalFits } from "@/lib/activity/abyssal-fit-catalog";
import { CopyTextButton } from "./copy-text-button";

import styles from "./abyssal-fit-catalog.module.css";

export function AbyssalFitCatalog() {
  const profiles = listVettedAbyssalFits();

  return (
    <section className={styles.catalog} aria-labelledby="vetted-abyssal-fit-catalog-heading">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Progression fit catalog</p>
          <h2 id="vetted-abyssal-fit-catalog-heading">Vetted Abyssal ships and fittings</h2>
        </div>
        <span>{profiles.length} sourced fits</span>
      </header>

      <p className={styles.intro}>
        These are ships with specific fittings NEC has evidence for at specific Abyssal tiers and weather. The ship name opens NEC&apos;s item page; Copy EVE fit gives you the fitting text to import.
      </p>

      <div className={styles.grid}>
        {profiles.map((profile) => (
          <article className={styles.card} key={profile.fitId}>
            <div className={styles.cardTop}>
              <div>
                <span className={styles.objectType}>Ship · {profile.hullClass}</span>
                <Link className={styles.shipLink} href={`/items/${profile.shipTypeId}`}>{profile.fit.shipName}</Link>
                <p><strong>Fitting:</strong> {profile.fit.name}</p>
              </div>
              <span className={styles.tier}>T{profile.primaryTier}</span>
            </div>

            <div className={styles.pills}>
              <span>{profile.weather}</span>
              <span>{profile.hullClass}</span>
              <span>{profile.filamentCount} filament{profile.filamentCount === 1 ? "" : "s"}</span>
              <span>validated {profile.validatedTiers.map((tier) => `T${tier}`).join(" / ")}</span>
            </div>

            <p className={styles.validation}>{profile.validationNote}</p>
            <small>{profile.metadata.validation}</small>

            <div className={styles.actions}>
              <Link href={`/items/${profile.shipTypeId}`}>Ship details</Link>
              <CopyTextButton text={profile.metadata.eft} label="Copy EVE fit" />
              <a href={profile.metadata.sourceUrl} target="_blank" rel="noreferrer">
                Validation source <ExternalLink size={12} />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
