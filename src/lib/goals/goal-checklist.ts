import type { RequirementAcquisitionPlan } from "./acquisition-choices";
import type { OwnedFirstGoalPlan } from "./owned-first-plan";

export type GoalChecklistMilestoneState = "done" | "next" | "later" | "cannot-verify";

export interface GoalChecklistMilestone {
  id: string;
  state: GoalChecklistMilestoneState;
  label: string;
  reason: string;
}

export interface GoalChecklist {
  nextAction: string;
  nextActionReason: string;
  milestones: readonly GoalChecklistMilestone[];
  hiddenMilestoneCount: number;
  summary: string;
}

function actionFor(acquisition: RequirementAcquisitionPlan): string {
  const requirement = acquisition.coverage.requirement;
  if (acquisition.trainingMilestone) {
    return `Train ${requirement.title} to level ${acquisition.trainingMilestone.shortestUsableLevel}`;
  }
  const choice = acquisition.choices.find((entry) => entry.kind !== "unknown") ?? acquisition.choices[0];
  if (!choice || choice.kind === "unknown") return `Resolve how to obtain ${requirement.title}`;
  return `${choice.label}: ${requirement.title}`;
}

function milestoneFor(acquisition: RequirementAcquisitionPlan, index: number): GoalChecklistMilestone {
  const requirement = acquisition.coverage.requirement;
  const unknown = acquisition.coverage.status === "unknown" || acquisition.choices.every((choice) => choice.kind === "unknown");
  return {
    id: requirement.id,
    state: index === 0 ? (unknown ? "cannot-verify" : "next") : (unknown ? "cannot-verify" : "later"),
    label: actionFor(acquisition),
    reason: requirement.reason,
  };
}

export function buildGoalChecklist(
  plan: OwnedFirstGoalPlan,
  acquisitionPlans: readonly RequirementAcquisitionPlan[],
  maxMilestones = 6,
): GoalChecklist {
  if (!Number.isInteger(maxMilestones) || maxMilestones < 1) throw new Error("Goal checklist milestone limit must be a positive integer.");

  const acquisitionByRequirement = new Map(acquisitionPlans.map((entry) => [entry.coverage.requirement.id, entry]));
  const pending = [...plan.unknown, ...plan.uncovered]
    .map((coverage) => acquisitionByRequirement.get(coverage.requirement.id))
    .filter((entry): entry is RequirementAcquisitionPlan => Boolean(entry));

  if (pending.length === 0) {
    return {
      nextAction: `Complete ${plan.goal.title}`,
      nextActionReason: "Every currently established requirement is covered. NEC has no uncovered prerequisite to put ahead of the selected goal.",
      milestones: [{ id: `goal:${plan.goal.key}`, state: "next", label: `Complete ${plan.goal.title}`, reason: "This is the selected goal." }],
      hiddenMilestoneCount: 0,
      summary: "All currently established requirements are covered.",
    };
  }

  const allMilestones = pending.map(milestoneFor);
  const visible = allMilestones.slice(0, maxMilestones);
  const first = visible[0];
  return {
    nextAction: first.label,
    nextActionReason: first.reason,
    milestones: visible,
    hiddenMilestoneCount: Math.max(0, allMilestones.length - visible.length),
    summary: `${pending.length} prerequisite${pending.length === 1 ? "" : "s"} remain after reusing established owned/trained coverage.`,
  };
}
