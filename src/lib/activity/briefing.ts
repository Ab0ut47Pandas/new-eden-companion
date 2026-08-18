import type { ReadinessExplanation } from "../readiness/explanation";

export const ACTIVITY_BRIEFING_SECTION_ORDER = [
  "what-it-is",
  "why-care",
  "am-i-ready",
  "what-to-bring",
  "how-to-start",
  "what-to-do",
  "loot-keep-sell",
  "failure-conditions",
  "unlocks-next",
] as const;

export type ActivityBriefingSectionKey = (typeof ACTIVITY_BRIEFING_SECTION_ORDER)[number];

export type ActivityBriefingEntryTone =
  | "info"
  | "positive"
  | "required"
  | "recommended"
  | "warning"
  | "unknown";

export interface ActivityBriefingEntry {
  id: string;
  label: string;
  detail?: string;
  why?: string;
  tone?: ActivityBriefingEntryTone;
}

export interface ActivityBriefingDefinition {
  id: string;
  title: string;
  subtitle?: string;
  whatItIs: string;
  whyCare: string;
  whatToBring: readonly ActivityBriefingEntry[];
  howToStart: readonly ActivityBriefingEntry[];
  whatToDo: readonly ActivityBriefingEntry[];
  lootKeepSell: readonly ActivityBriefingEntry[];
  failureConditions: readonly ActivityBriefingEntry[];
  unlocksNext: readonly ActivityBriefingEntry[];
}

export interface ActivityBriefingSection {
  key: ActivityBriefingSectionKey;
  title: string;
  summary?: string;
  entries: readonly ActivityBriefingEntry[];
}

export interface ActivityBriefingView {
  id: string;
  title: string;
  subtitle?: string;
  readiness: ReadinessExplanation | null;
  sections: readonly ActivityBriefingSection[];
}

const SECTION_TITLES: Readonly<Record<ActivityBriefingSectionKey, string>> = {
  "what-it-is": "What it is",
  "why-care": "Why care",
  "am-i-ready": "Am I ready?",
  "what-to-bring": "What to bring",
  "how-to-start": "How to start",
  "what-to-do": "What to do",
  "loot-keep-sell": "What to loot, keep, or sell",
  "failure-conditions": "Failure conditions",
  "unlocks-next": "What this unlocks next",
};

function nonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must not be empty.`);
  return normalized;
}

function validateEntries(
  section: ActivityBriefingSectionKey,
  entries: readonly ActivityBriefingEntry[],
): void {
  if (entries.length === 0) {
    throw new Error(`Activity briefing section ${section} must contain at least one explicit entry.`);
  }

  const ids = new Set<string>();
  for (const entry of entries) {
    nonEmpty(entry.id, `Activity briefing ${section} entry id`);
    nonEmpty(entry.label, `Activity briefing ${section} entry ${entry.id} label`);
    if (entry.detail !== undefined) nonEmpty(entry.detail, `Activity briefing ${section} entry ${entry.id} detail`);
    if (entry.why !== undefined) nonEmpty(entry.why, `Activity briefing ${section} entry ${entry.id} why`);
    if (ids.has(entry.id)) throw new Error(`Duplicate activity briefing entry id ${entry.id} in section ${section}.`);
    ids.add(entry.id);
  }
}

export function validateActivityBriefingDefinition(definition: ActivityBriefingDefinition): void {
  nonEmpty(definition.id, "Activity briefing id");
  nonEmpty(definition.title, `Activity briefing ${definition.id} title`);
  if (definition.subtitle !== undefined) nonEmpty(definition.subtitle, `Activity briefing ${definition.id} subtitle`);
  nonEmpty(definition.whatItIs, `Activity briefing ${definition.id} what-it-is summary`);
  nonEmpty(definition.whyCare, `Activity briefing ${definition.id} why-care summary`);

  validateEntries("what-to-bring", definition.whatToBring);
  validateEntries("how-to-start", definition.howToStart);
  validateEntries("what-to-do", definition.whatToDo);
  validateEntries("loot-keep-sell", definition.lootKeepSell);
  validateEntries("failure-conditions", definition.failureConditions);
  validateEntries("unlocks-next", definition.unlocksNext);
}

function toneForPrimary(readiness: ReadinessExplanation): ActivityBriefingEntryTone {
  if (readiness.status === "not-recommended") return "required";
  if (readiness.status === "nearly-ready") return "recommended";
  if (readiness.status === "unknown") return "unknown";
  return "positive";
}

function readinessSection(readiness: ReadinessExplanation | null): ActivityBriefingSection {
  if (!readiness) {
    return {
      key: "am-i-ready",
      title: SECTION_TITLES["am-i-ready"],
      summary: "Readiness has not been assessed for this activity yet.",
      entries: [
        {
          id: "readiness-unassessed",
          label: "Readiness not assessed",
          detail: "NEC needs an evaluated readiness snapshot before it can make a recommendation.",
          tone: "unknown",
        },
      ],
    };
  }

  const entries: ActivityBriefingEntry[] = [];
  if (readiness.primaryIssue) {
    entries.push({
      id: `readiness-primary-${readiness.primaryIssue.id}`,
      label: readiness.primaryIssue.summary,
      detail: readiness.why,
      why: readiness.primaryIssue.why,
      tone: toneForPrimary(readiness),
    });
  } else {
    entries.push({
      id: `readiness-${readiness.status}`,
      label: readiness.headline,
      detail: readiness.why,
      tone: readiness.status === "ready" ? "positive" : readiness.status === "unknown" ? "unknown" : "recommended",
    });
  }

  if (readiness.nextAction) {
    entries.push({
      id: "readiness-next-action",
      label: "Next action",
      detail: readiness.nextAction,
      tone: readiness.status === "not-recommended" ? "required" : "recommended",
    });
  }

  return {
    key: "am-i-ready",
    title: SECTION_TITLES["am-i-ready"],
    summary: readiness.headline,
    entries,
  };
}

export function buildActivityBriefing(
  definition: ActivityBriefingDefinition,
  readiness: ReadinessExplanation | null = null,
): ActivityBriefingView {
  validateActivityBriefingDefinition(definition);

  const sections: ActivityBriefingSection[] = [
    {
      key: "what-it-is",
      title: SECTION_TITLES["what-it-is"],
      summary: definition.whatItIs.trim(),
      entries: [],
    },
    {
      key: "why-care",
      title: SECTION_TITLES["why-care"],
      summary: definition.whyCare.trim(),
      entries: [],
    },
    readinessSection(readiness),
    {
      key: "what-to-bring",
      title: SECTION_TITLES["what-to-bring"],
      entries: definition.whatToBring,
    },
    {
      key: "how-to-start",
      title: SECTION_TITLES["how-to-start"],
      entries: definition.howToStart,
    },
    {
      key: "what-to-do",
      title: SECTION_TITLES["what-to-do"],
      entries: definition.whatToDo,
    },
    {
      key: "loot-keep-sell",
      title: SECTION_TITLES["loot-keep-sell"],
      entries: definition.lootKeepSell,
    },
    {
      key: "failure-conditions",
      title: SECTION_TITLES["failure-conditions"],
      entries: definition.failureConditions,
    },
    {
      key: "unlocks-next",
      title: SECTION_TITLES["unlocks-next"],
      entries: definition.unlocksNext,
    },
  ];

  return {
    id: definition.id.trim(),
    title: definition.title.trim(),
    subtitle: definition.subtitle?.trim(),
    readiness,
    sections,
  };
}
