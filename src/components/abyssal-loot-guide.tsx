import {
  ABYSSAL_LOOT_FAMILIES,
  abyssalLootContainersForTier,
  noOrdinaryNpcWreckLootGuidance,
} from "@/lib/activity/abyssal-loot";

import styles from "./abyssal-loot-guide.module.css";

export function AbyssalLootGuide({ tier }: { tier: number }) {
  const containers = abyssalLootContainersForTier(tier);

  return (
    <section className={styles.guide} aria-labelledby="abyssal-loot-guide-heading">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>After the fight</p>
          <h2 id="abyssal-loot-guide-heading">What should I loot, keep, or sell?</h2>
        </div>
        <span className={styles.tierBadge}>T{tier} loot view</span>
      </header>

      <p className={styles.noWrecks}>{noOrdinaryNpcWreckLootGuidance()}</p>

      <div className={styles.containerGrid}>
        {containers.map((container) => (
          <article className={styles.containerCard} key={container.id}>
            <div className={styles.cardTop}>
              <strong>{container.name}</strong>
              <span>{container.role === "main" ? "main loot" : "optional side loot"}</span>
            </div>
            <p>{container.guidance}</p>
            <small>{container.timerPriority}</small>
          </article>
        ))}
      </div>

      <div className={styles.familyList}>
        {ABYSSAL_LOOT_FAMILIES.map((family) => (
          <article className={styles.family} key={family.id}>
            <div className={styles.familyHeading}>
              <h3>{family.title}</h3>
              <span>{family.automaticSellSafe ? "known cash-out" : "check before selling"}</span>
            </div>
            <div className={styles.guidanceGrid}>
              <div><b>Use</b><p>{family.useGuidance}</p></div>
              <div><b>Keep</b><p>{family.keepGuidance}</p></div>
              <div><b>Sell</b><p>{family.sellGuidance}</p></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
