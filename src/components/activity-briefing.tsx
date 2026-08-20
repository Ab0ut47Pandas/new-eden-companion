import type {
  ActivityBriefingEntryTone,
  ActivityBriefingSectionKey,
  ActivityBriefingView,
} from "@/lib/activity/briefing";
import { companionStateFromReadiness, uncertaintyPresentation } from "@/lib/uncertainty/state";

import styles from "./activity-briefing.module.css";
import { WhyDetails } from "./why-details";

const ORDERED_SECTIONS = new Set<ActivityBriefingSectionKey>(["how-to-start", "what-to-do"]);

function toneClass(tone: ActivityBriefingEntryTone | undefined): string {
  if (tone === "positive") return styles.positive;
  if (tone === "required") return styles.required;
  if (tone === "recommended") return styles.recommended;
  if (tone === "warning") return styles.warning;
  if (tone === "unknown") return styles.unknown;
  return styles.info;
}

function readinessClass(state: ReturnType<typeof companionStateFromReadiness> | undefined): string {
  if (state === "ready") return styles.ready;
  if (state === "probably-ready") return styles.nearlyReady;
  if (state === "missing-requirements") return styles.notRecommended;
  return styles.readinessUnknown;
}

export function ActivityBriefing({ briefing }: { briefing: ActivityBriefingView }) {
  const readinessStatus = briefing.readiness?.status;
  const state = readinessStatus ? companionStateFromReadiness(readinessStatus) : "cannot-verify";
  const stateCopy = uncertaintyPresentation(state);
  const primaryIssue = briefing.readiness?.primaryIssue;
  const readinessEvidence = primaryIssue?.evidence?.map((evidence) => `${evidence.source}: ${evidence.label}${evidence.detail ? ` - ${evidence.detail}` : ""}`) ?? [];
  const resolutionAction = stateCopy.needsResolution ? briefing.readiness?.nextAction : null;

  return (
    <article className={styles.briefing} aria-labelledby={`activity-briefing-${briefing.id}`}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Activity briefing</p>
          <h1 id={`activity-briefing-${briefing.id}`}>{briefing.title}</h1>
          {briefing.subtitle ? <p className={styles.subtitle}>{briefing.subtitle}</p> : null}
          <p className={styles.subtitle}>{stateCopy.summary}</p>
          {resolutionAction ? <p className={styles.subtitle}><strong>Resolve this:</strong> {resolutionAction}</p> : null}
          {briefing.readiness ? (
            <WhyDetails
              label="Why this readiness?"
              rule="Hard unmet requirements become Missing requirements; hard unknowns stay Cannot verify; remaining soft gaps or cautions become Probably ready rather than a fabricated score."
              reasons={[briefing.readiness.why, primaryIssue?.why ?? ""]}
              evidence={readinessEvidence}
              unknowns={briefing.readiness.unknowns.map((finding) => finding.summary)}
            />
          ) : (
            <WhyDetails label="Why no readiness?" unknowns={["No evaluated readiness snapshot was supplied for this activity."]} />
          )}
        </div>
        <span className={`${styles.readinessBadge} ${readinessClass(state)}`}>
          {stateCopy.label}
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
                        {entry.why ? <WhyDetails reasons={[entry.why]} /> : null}
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
