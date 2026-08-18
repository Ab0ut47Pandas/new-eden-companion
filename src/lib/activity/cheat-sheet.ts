import type { ReadinessRecommendationStatus } from "../readiness/explanation";
import type { ActivityBriefingEntry, ActivityBriefingSectionKey, ActivityBriefingView } from "./briefing";

export const ACTIVITY_CHEAT_SHEET_SECTION_ORDER = [
  "before-you-start",
  "start",
  "execute",
  "loot",
  "watch-outs",
] as const;

export type ActivityCheatSheetSectionKey = (typeof ACTIVITY_CHEAT_SHEET_SECTION_ORDER)[number];

export interface ActivityCheatSheetSection {
  key: ActivityCheatSheetSectionKey;
  title: string;
  entries: readonly ActivityBriefingEntry[];
}

export interface ActivityCheatSheetView {
  activityId: string;
  title: string;
  readinessStatus: ReadinessRecommendationStatus | "not-assessed";
  readinessHeadline: string;
  nextAction: string | null;
  sections: readonly ActivityCheatSheetSection[];
}

const SOURCE_SECTION: Readonly<Record<ActivityCheatSheetSectionKey, ActivityBriefingSectionKey>> = {
  "before-you-start": "what-to-bring",
  start: "how-to-start",
  execute: "what-to-do",
  loot: "loot-keep-sell",
  "watch-outs": "failure-conditions",
};

const SECTION_TITLE: Readonly<Record<ActivityCheatSheetSectionKey, string>> = {
  "before-you-start": "Before you start",
  start: "Start",
  execute: "Do this",
  loot: "Loot / keep / sell",
  "watch-outs": "Watch for",
};

export function buildActivityCheatSheet(briefing: ActivityBriefingView): ActivityCheatSheetView {
  const sectionByKey = new Map(briefing.sections.map((section) => [section.key, section]));

  const sections = ACTIVITY_CHEAT_SHEET_SECTION_ORDER.map((key): ActivityCheatSheetSection => {
    const source = sectionByKey.get(SOURCE_SECTION[key]);
    if (!source) throw new Error(`Activity briefing ${briefing.id} is missing required section ${SOURCE_SECTION[key]}.`);
    return {
      key,
      title: SECTION_TITLE[key],
      entries: source.entries,
    };
  });

  return {
    activityId: briefing.id,
    title: briefing.title,
    readinessStatus: briefing.readiness?.status ?? "not-assessed",
    readinessHeadline: briefing.readiness?.headline ?? "Readiness has not been assessed for this activity yet.",
    nextAction: briefing.readiness?.nextAction ?? null,
    sections,
  };
}
