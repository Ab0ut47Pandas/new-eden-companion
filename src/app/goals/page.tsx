import { ArrowLeft, CheckCircle2, Circle, ExternalLink, Target } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import { getSession } from "@/lib/auth/session-store";
import { getGoalStore, type SavedGoal } from "@/lib/goals/store";

import {
  addGoalStepAction,
  saveActivityGoalAction,
  setGoalCompletedAction,
  setGoalStepCompletedAction,
} from "./actions";
import styles from "../items/item-explorer.module.css";

export const dynamic = "force-dynamic";

async function viewer(): Promise<{ characterId: number; characterName: string } | null> {
  const sessionId = (await cookies()).get("eve_session")?.value;
  if (!sessionId) return null;
  const session = getSession(sessionId);
  return session ? { characterId: session.characterId, characterName: session.characterName } : null;
}

function progressLabel(goal: SavedGoal): string {
  if (goal.steps.length === 0) return "No checklist yet";
  const complete = goal.steps.filter((step) => step.completed).length;
  return `${complete}/${goal.steps.length} checklist steps complete`;
}

function GoalCard({ goal }: { goal: SavedGoal }) {
  return (
    <article className={styles.infoCard}>
      <div className={styles.resultTop}>
        <span className={goal.status === "completed" ? styles.kindPill : styles.pill}>{goal.status}</span>
        <span className={styles.mutedPill}>{goal.kind}</span>
      </div>
      <h3>
        {goal.kind === "item" && goal.targetTypeId ? (
          <Link className={styles.itemLink} href={`/items/${goal.targetTypeId}`}>{goal.title} <ExternalLink size={12} /></Link>
        ) : goal.title}
      </h3>
      <p className={styles.description}>{progressLabel(goal)}</p>

      <div className={styles.alternatives}>
        {goal.steps.length === 0 ? (
          <div className={styles.terminal}>Add your own checklist now. Later readiness/goal planning will be able to generate ordered steps from the character state.</div>
        ) : (
          <ul className={styles.skillList}>
            {goal.steps.map((step) => (
              <li key={step.id}>
                <form action={setGoalStepCompletedAction}>
                  <input type="hidden" name="goalId" value={goal.id} />
                  <input type="hidden" name="stepId" value={step.id} />
                  <input type="hidden" name="completed" value={step.completed ? "false" : "true"} />
                  <button className={styles.secondaryLink} type="submit">
                    {step.completed ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                    {step.label}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form className={styles.searchForm} action={addGoalStepAction}>
          <input type="hidden" name="goalId" value={goal.id} />
          <label className={styles.searchBox}>
            <input type="text" name="label" placeholder="Add a checklist step..." maxLength={240} aria-label={`Add checklist step for ${goal.title}`} />
          </label>
          <button className={styles.searchButton} type="submit">Add step</button>
        </form>

        <form action={setGoalCompletedAction}>
          <input type="hidden" name="goalId" value={goal.id} />
          <input type="hidden" name="completed" value={goal.status === "completed" ? "false" : "true"} />
          <button className={styles.secondaryLink} type="submit">
            {goal.status === "completed" ? <Circle size={15} /> : <CheckCircle2 size={15} />}
            {goal.status === "completed" ? "Reopen goal" : "Mark goal complete"}
          </button>
        </form>
      </div>
    </article>
  );
}

export default async function GoalsPage() {
  const current = await viewer();
  const goals = current ? getGoalStore().listGoals(current.characterId) : [];
  const activeGoals = goals.filter((goal) => goal.status === "active");
  const completedGoals = goals.filter((goal) => goal.status === "completed");

  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <div className={styles.topbar}>
          <Link className={styles.backLink} href="/"><ArrowLeft size={15} /> Back to companion</Link>
          <Link className={styles.secondaryLink} href="/items"><Target size={15} /> Item Explorer</Link>
        </div>

        <section className={styles.hero}>
          <div className={styles.eyebrow}>Local progression state</div>
          <h1>Goals & plans</h1>
          <p>Save things you want to obtain or activities you want to learn. Goals and checklist progress stay in your private local NEC database and are separate from the replaceable CCP static-data database.</p>
        </section>

        {!current ? (
          <div className={styles.notice}>Connect an EVE character first. Goals are stored per character so progress does not bleed between alts.</div>
        ) : (
          <>
            <div className={styles.notice}>Showing goals for {current.characterName}. Item goals can be saved directly from Item Explorer. For now, activity goals and checklist steps are user-entered; later readiness phases will generate explainable progression steps.</div>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div><div className={styles.eyebrow}>Add a direction</div><h2>Save an activity goal</h2></div>
                <p>Examples: Run Level 4 missions, learn exploration, start PI, try T1 Abyssals.</p>
              </div>
              <form className={styles.searchForm} action={saveActivityGoalAction}>
                <label className={styles.searchBox}>
                  <Target size={17} aria-hidden="true" />
                  <input type="text" name="title" placeholder="What do you want to learn or do?" maxLength={160} aria-label="Activity goal" />
                </label>
                <button className={styles.searchButton} type="submit">Save goal</button>
              </form>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div><div className={styles.eyebrow}>In progress</div><h2>Active goals</h2></div>
                <p>{activeGoals.length} active goal{activeGoals.length === 1 ? "" : "s"}</p>
              </div>
              {activeGoals.length === 0 ? (
                <div className={styles.emptyState}><strong>No active goals yet.</strong>Save an activity above or open an item in Item Explorer and save it as a goal.</div>
              ) : (
                <div className={styles.results}>{activeGoals.map((goal) => <GoalCard goal={goal} key={goal.id} />)}</div>
              )}
            </section>

            {completedGoals.length > 0 && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div><div className={styles.eyebrow}>History</div><h2>Completed goals</h2></div>
                  <p>{completedGoals.length} completed</p>
                </div>
                <div className={styles.results}>{completedGoals.map((goal) => <GoalCard goal={goal} key={goal.id} />)}</div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
