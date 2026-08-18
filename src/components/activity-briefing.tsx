import type { ReadinessRecommendationStatus } from "@/lib/readiness/explanation";
import type {
  ActivityBriefingEntryTone,
  ActivityBriefingSectionKey,
  ActivityBriefingView,
} from "@/lib/activity/briefing";

import styles from "./activity-briefing.module.css";

const READINESS_LABEL: Readonly<Record<ReadinessRecommendationStatus, string>> = {
  ready: "Ready",
  "nearly-ready": "Nearly ready",
  "not-recommended": "Not recommended yet",
  unknown: "Needs information",
};

const ORDERED_SECTIONS = new Set<ActivityBriefingSectionKey>(["how-to-start", "what-to-do"]);

function toneClass(tone: ActivityBriefingEntryTone | undefined): string {
  if (tone === "positive") return styles.positive;
  if (tone === "required") return styles.required;
  if (tone === "recommended") return styles.recommended;
  if (tone === "warning") return styles.warning;
  if (tone === "unknown") return styles.unknown;
  return styles.info;
}

function readinessClass(status: ReadinessRecommendationStatus | undefined): string {
  if (status === "ready") return styles.ready;
  if (status === "nearly-ready") return styles.nearlyReady;
  if (status === "not-recommended") return styles.notRecommended;
  return styles.readinessUnknown;
}

export function ActivityBriefing({ briefing }: { briefing: ActivityBriefingView }) {
  const readinessStatus = briefing.readiness?.status;

  return (
    <article className={styles.briefing} aria-labelledby={`activity-briefing-${briefing.id}`}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Activity briefing</p>
          <h1 id={`activity-briefing-${briefing.id}`}>{briefing.title}</h1>
          {briefing.subtitle ? <p className={styles.subtitle}>{briefing.subtitle}</p> : null}
        </div>
        <span className={`${styles.readinessBadge} ${readinessClass(readinessStatus)}`}>
          {readinessStatus ? READINESS_LABEL[readinessStatus] : "Not assessed"}
        </span>
      </header>

      <div className={styles.sectionGrid}>
        {briefing.sections.map((section) => {
          const ordered = ORDERED_SECTIONS.has(section.key);
          const List = ordered ? "ol" : "ul";

          return (
            <section className={styles.section} key={section.key} aria-labelledby={`activity-briefing-${briefing.id}-${section.key}`}>
              <div className={styles.sectionHeading}>
                <span className={styles.sectionKey}>{section.key.replaceAll("-", " ")}</span>
                <h2 id={`activity-briefing-${briefing.id}-${section.key}`}>{section.title}</h2>
              </div>

              {section.summary ? <p className={styles.summary}>{section.summary}</p> : null}

              {section.entries.length > 0 ? (
                <List className={`${styles.entries} ${ordered ? styles.ordered : ""}`}>
                  {section.entries.map((entry) => (
                    <li className={`${styles.entry} ${toneClass(entry.tone)}`} key={entry.id}>
                      <div className={styles.entryCopy}>
                        <strong>{entry.label}</strong>
                        {entry.detail ? <p>{entry.detail}</p> : null}
                        {entry.why ? <small>Why: {entry.why}</small> : null}
                      </div>
                    </li>
                  ))}
                </List>
              ) : null}
            </section>
          );
        })}
      </div>
    </article>
  );
}
