import type { DashboardData, TrainedSkillView } from "@/lib/dashboard/model";

export type TrainingStepStatus = "trained" | "queued" | "needed";
export type TrainingStageId = "missile-return" | "exploration-sampler" | "abyssal-sampler" | "already-unlocked" | "advanced-missiles";

export interface TrainingPlanStep {
  skill: string;
  level: number;
  purpose: string;
  currentLevel: number;
  status: TrainingStepStatus;
}

export interface TrainingStage {
  id: TrainingStageId;
  eyebrow: string;
  title: string;
  purpose: string;
  milestone: string;
  steps: TrainingPlanStep[];
}

export interface CombatTrainingPlan {
  foundation: {
    magic14AtFive: number;
    advancedWeaponUpgrades: number;
    message: string;
  };
  stages: TrainingStage[];
  queueWarning: string;
}

const MAGIC_14 = [
  "CPU Management",
  "Power Grid Management",
  "Capacitor Management",
  "Capacitor Systems Operation",
  "Mechanics",
  "Hull Upgrades",
  "Shield Management",
  "Shield Operation",
  "Long Range Targeting",
  "Signature Analysis",
  "Navigation",
  "Evasive Maneuvering",
  "Warp Drive Operation",
  "Spaceship Command",
];

type StepDefinition = Omit<TrainingPlanStep, "currentLevel" | "status">;

const STAGES: Array<Omit<TrainingStage, "steps"> & { steps: StepDefinition[] }> = [
  {
    id: "missile-return",
    eyebrow: "Combat path · heavy missiles",
    title: "Heavy-missile battlecruisers",
    purpose: "A practical route into Drake-class mission running and ordinary combat sites.",
    milestone: "A well-supported Drake or Drake Navy Issue for level-3 missions and combat sites",
    steps: [
      { skill: "Caldari Battlecruiser", level: 3, purpose: "Immediate hull bonus and a sensible minimum for the Drake family." },
      { skill: "Missile Projection", level: 3, purpose: "More missile velocity and practical range." },
      { skill: "Rapid Launch", level: 4, purpose: "Faster launcher cycle and better sustained damage." },
      { skill: "Warhead Upgrades", level: 4, purpose: "More missile damage." },
      { skill: "Target Navigation Prediction", level: 4, purpose: "Better damage application to moving targets." },
      { skill: "Missile Bombardment", level: 4, purpose: "More flight time and range." },
      { skill: "Missile Projection", level: 4, purpose: "Finishes the short-range support block." },
      { skill: "Guided Missile Precision", level: 3, purpose: "Helps heavy missiles hurt smaller targets instead of tickling them." },
      { skill: "Guided Missile Precision", level: 4, purpose: "Strong application before another long hull train." },
      { skill: "Caldari Battlecruiser", level: 4, purpose: "Large improvement to Navy Drake damage and application." },
      { skill: "Thermodynamics", level: 3, purpose: "Lets you overheat deliberately when a room or mission goes wrong." },
      { skill: "Missile Launcher Operation", level: 5, purpose: "Unlocks advanced Fury and Precision heavy-missile ammunition." },
      { skill: "Heavy Missile Specialization", level: 3, purpose: "A quick improvement to T2 heavy launchers." },
    ],
  },
  {
    id: "exploration-sampler",
    eyebrow: "Exploration path · scanning",
    title: "Scanning and hacking",
    purpose: "A compact foundation for probing, relic sites, data sites and wormhole navigation.",
    milestone: "A cheap exploration frigate with probes and both analyzers",
    steps: [
      { skill: "Astrometric Acquisition", level: 3, purpose: "Faster scan probe cycle." },
      { skill: "Astrometric Pinpointing", level: 3, purpose: "Reduces scan deviation." },
      { skill: "Astrometric Rangefinding", level: 3, purpose: "Improves probe scan strength." },
      { skill: "Archaeology", level: 4, purpose: "Better relic-site hacking." },
      { skill: "Hacking", level: 4, purpose: "Already enough for a real data-site trial." },
    ],
  },
  {
    id: "abyssal-sampler",
    eyebrow: "Combat path · drones",
    title: "Drone combat fundamentals",
    purpose: "Improve drone control, survivability and heat management for drone-focused PvE hulls.",
    milestone: "Reliable drone control and damage before moving into harder PvE",
    steps: [
      { skill: "Drone Avionics", level: 4, purpose: "More drone control range." },
      { skill: "Drone Durability", level: 4, purpose: "Fewer dead drones and fewer timer disasters." },
      { skill: "Drone Navigation", level: 4, purpose: "Drones reach targets sooner." },
      { skill: "Drone Sharpshooting", level: 4, purpose: "Improves drone engagement range." },
      { skill: "Drone Interfacing", level: 4, purpose: "The substantial drone damage step." },
      { skill: "Thermodynamics", level: 3, purpose: "Controlled overheating for dangerous rooms." },
    ],
  },
  {
    id: "already-unlocked",
    eyebrow: "Career path · industry and utility",
    title: "Industry and utility sampler",
    purpose: "Compare the basic requirements for mining, salvage, manufacturing and Planetary Industry.",
    milestone: "Try one mining trip, one salvage cleanup and one small industry or PI job",
    steps: [
      { skill: "Mining Frigate", level: 3, purpose: "Enough for a real Venture mining or gas-harvesting trial." },
      { skill: "Mining Barge", level: 3, purpose: "You can already operate a mining barge; Exhumers can wait." },
      { skill: "Salvaging", level: 3, purpose: "Enough to clean up wrecks behind your combat ship." },
      { skill: "Industry", level: 5, purpose: "Strong manufacturing foundation already completed." },
      { skill: "Mass Production", level: 3, purpose: "Multiple industry jobs are already available." },
      { skill: "Command Center Upgrades", level: 4, purpose: "A meaningful Planetary Industry foundation." },
      { skill: "Interplanetary Consolidation", level: 3, purpose: "Enough colonies to test whether PI appeals to you." },
    ],
  },
  {
    id: "advanced-missiles",
    eyebrow: "Advanced path · missiles",
    title: "Advanced missile combat",
    purpose: "Add short-range missile options and higher battlecruiser performance after the fundamentals are comfortable.",
    milestone: "T2 HAMs and stronger Navy Drake performance",
    steps: [
      { skill: "Heavy Missile Specialization", level: 4, purpose: "Final practical heavy-missile specialization target." },
      { skill: "Heavy Assault Missiles", level: 4, purpose: "Try short-range, higher-damage missile combat." },
      { skill: "Caldari Battlecruiser", level: 5, purpose: "A long train for pilots committed to Caldari battlecruiser hulls." },
      { skill: "Heavy Assault Missiles", level: 5, purpose: "Long train for T2 HAM launchers; keep out of the immediate sampler queue." },
      { skill: "Heavy Assault Missile Specialization", level: 3, purpose: "T2 HAM launcher damage after the level-V unlock." },
    ],
  },
];

function levels(skills: TrainedSkillView[]): Map<string, number> {
  return new Map(skills.map((skill) => [skill.name, skill.trainedLevel]));
}

export function buildCombatTrainingPlan(data: DashboardData): CombatTrainingPlan {
  const trained = levels(data.skills.trained);
  const queueTargets = new Map<string, number>();
  for (const skill of data.skills.queue) queueTargets.set(skill.name, Math.max(queueTargets.get(skill.name) ?? 0, skill.targetLevel));
  const stages = STAGES.map((stage) => ({
    ...stage,
    steps: stage.steps.map((step) => {
      const currentLevel = trained.get(step.skill) ?? 0;
      const queuedLevel = queueTargets.get(step.skill) ?? 0;
      return {
        ...step,
        currentLevel,
        status: currentLevel >= step.level ? "trained" as const : queuedLevel >= step.level ? "queued" as const : "needed" as const,
      };
    }),
  }));
  const magic14AtFive = MAGIC_14.filter((skill) => (trained.get(skill) ?? 0) >= 5).length;
  const advancedWeaponUpgrades = trained.get("Advanced Weapon Upgrades") ?? 0;
  const firstMissing = stages[0].steps.filter((step) => step.status !== "trained");
  return {
    foundation: {
      magic14AtFive,
      advancedWeaponUpgrades,
      message: magic14AtFive === 14
        ? "All Magic 14 are already V. Your bottleneck is specialization, not foundation training."
        : `${magic14AtFive}/14 Magic 14 skills are V. Finish only the foundation levels that block a fit; keep the activity path moving.`,
    },
    stages,
    queueWarning: firstMissing.length
      ? `Move the ${firstMissing.length} unfinished main-path levels ahead of unrelated long level-V trains.`
      : "The heavy-missile battlecruiser block is already trained; choose another path to compare next.",
  };
}

export function stageClipboardText(stage: TrainingStage): string {
  return [
    `${stage.title} — ${stage.milestone}`,
    "",
    ...stage.steps.filter((step) => step.status !== "trained").map((step) => `${step.skill} ${roman(step.level)}`),
  ].join("\n");
}

function roman(level: number): string {
  return ["", "I", "II", "III", "IV", "V"][level] ?? String(level);
}
