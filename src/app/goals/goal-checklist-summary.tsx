import type { GoalChecklist } from "@/lib/goals/goal-checklist";

import styles from "../items/item-explorer.module.css";

export function GoalChecklistSummary({ checklist }: { checklist: GoalChecklist }) {
  return (
    <div className={styles.terminal}>
      <div className={styles.eyebrow}>Next action</div>
      <strong>{checklist.nextAction}</strong>
      <p className={styles.description}>Because {checklist.nextActionReason}</p>
      <p className={styles.description}>{checklist.summary}</p>
      <ol className={styles.skillList}>
        {checklist.milestones.map((milestone) => (
          <li key={milestone.id}>
            <strong>{milestone.state === "cannot-verify" ? "Cannot verify" : milestone.state === "next" ? "Next" : milestone.state === "done" ? "Done" : "Later"}: {milestone.label}</strong>
            <div className={styles.description}>Because {milestone.reason}</div>
          </li>
        ))}
      </ol>
      {checklist.hiddenMilestoneCount > 0 && (
        <p className={styles.description}>{checklist.hiddenMilestoneCount} deeper milestone{checklist.hiddenMilestoneCount === 1 ? "" : "s"} hidden from the compact path. Expand dependency details when you need them.</p>
      )}
    </div>
  );
}
