import { ExternalLink } from "lucide-react";

import { listVettedAbyssalFits } from "@/lib/activity/abyssal-fit-catalog";

import styles from "./abyssal-fit-catalog.module.css";

export function AbyssalFitCatalog() {
  const profiles = listVettedAbyssalFits();

  return (
    <section className={styles.catalog} aria-labelledby="vetted-abyssal-fit-catalog-heading">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Progression fit catalog</p>
          <h2 id="vetted-abyssal-fit-catalog-heading">Vetted Abyssal tier limits</h2>
        </div>
        <span>{profiles.length} sourced fits</span>
      </header>

      <p className={styles.intro}>
        A fit only counts as suitable when the requested weather and tier are inside its explicit validation profile. A lower-tier success does not silently promote the fit.
      </p>

      <div className={styles.grid}>
        {profiles.map((profile) => (
          <article className={styles.card} key={profile.fitId}>
            <div className={styles.cardTop}>
              <div>
                <strong>{profile.fit.shipName}</strong>
                <p>{profile.fit.name}</p>
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

            <a href={profile.metadata.sourceUrl} target="_blank" rel="noreferrer">
              Validation source <ExternalLink size={12} />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
