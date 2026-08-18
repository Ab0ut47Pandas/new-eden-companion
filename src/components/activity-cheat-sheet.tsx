import type { ReadinessRecommendationStatus } from "@/lib/readiness/explanation";
import type { ActivityBriefingEntryTone } from "@/lib/activity/briefing";
import type { ActivityCheatSheetView } from "@/lib/activity/cheat-sheet";

import styles from "./activity-cheat-sheet.module.css";

function toneClass(tone: ActivityBriefingEntryTone | undefined): string {
  if (tone === "positive") return styles.positive;
  if (tone === "required") return styles.required;
  if (tone === "recommended") return styles.recommended;
  if (tone === "warning") return styles.warning;
  if (tone === "unknown") return styles.unknown;
  return styles.info;
}

function readinessClass(status: ActivityCheatSheetView["readinessStatus"]): string {
  if (status === "ready") return styles.ready;
  if (status === "nearly-ready") return styles.nearlyReady;
  if (status === "not-recommended") return styles.notRecommended;
  return styles.readinessUnknown;
}

function readinessLabel(status: ReadinessRecommendationStatus | "not-assessed"): string {
  if (status === "ready") return "Ready";
  if (status === "nearly-ready") return "Nearly ready";
  if (status === "not-recommended") return "Not recommended yet";
  if (status === "unknown") return "Needs information";
  return "Not assessed";
}

export function ActivityCheatSheet({ sheet }: { sheet: ActivityCheatSheetView }) {
  return (
    <aside className={styles.sheet} aria-labelledby={`activity-cheat-sheet-${sheet.activityId}`}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>In-activity cheat sheet</p>
          <h2 id={`activity-cheat-sheet-${sheet.activityId}`}>{sheet.title}</h2>
        </div>
        <span className={`${styles.readinessBadge} ${readinessClass(sheet.readinessStatus)}`}>
          {readinessLabel(sheet.readinessStatus)}
        </span>
      </header>

      <div className={styles.readinessLine}>
        <strong>{sheet.readinessHeadline}</strong>
        {sheet.nextAction ? <span>Next: {sheet.nextAction}</span> : null}
      </div>

      <div className={styles.sections}>
        {sheet.sections.map((section) => (
          <section className={styles.section} key={section.key} aria-labelledby={`activity-cheat-sheet-${sheet.activityId}-${section.key}`}>
            <h3 id={`activity-cheat-sheet-${sheet.activityId}-${section.key}`}>{section.title}</h3>
            <ul>
              {section.entries.map((entry) => (
                <li className={toneClass(entry.tone)} key={entry.id}>
                  <span className={styles.check} aria-hidden="true" />
                  <div>
                    <strong>{entry.label}</strong>
                    {entry.detail ? <p>{entry.detail}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className={styles.telemetryNote}>Manual reference only — NEC does not mark these steps complete from live client/combat telemetry.</p>
    </aside>
  );
}
