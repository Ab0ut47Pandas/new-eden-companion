import { ArrowLeft, ShieldCheck } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import { AbyssalFitCatalog } from "@/components/abyssal-fit-catalog";
import { AbyssalLootGuide } from "@/components/abyssal-loot-guide";
import { ActivityBriefing } from "@/components/activity-briefing";
import { ActivityCheatSheet } from "@/components/activity-cheat-sheet";
import { CopyTextButton } from "@/components/copy-text-button";
import {
  buildAbyssalFirstRunPackage,
  getAbyssalFirstRunOption,
  listAbyssalFirstRunOptions,
  type AbyssalFirstRunOption,
} from "@/lib/activity/abyssal-first-run";
import { buildVettedAbyssalFitReadiness } from "@/lib/activity/abyssal-fit-catalog";
import { getSession } from "@/lib/auth/session-store";
import { validAccessToken } from "@/lib/auth/sso";
import {
  loadCharacterSkillReadiness,
  readinessForSkillRequirement,
  type SkillReadinessIndex,
} from "@/lib/player/skill-readiness";
import type { ReadinessFindingState } from "@/lib/readiness/model";
import { searchStaticItems, staticDatabaseAvailable } from "@/lib/sde/database";

import styles from "../../items/item-explorer.module.css";

interface AbyssalActivityPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface MissingFitSkill {
  name: string;
  trained: number;
  required: number;
}

interface FitSkillAssessment {
  state: ReadinessFindingState;
  total: number;
  met: number;
  missing: MissingFitSkill[];
  unresolved: string[];
}

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

async function viewerSkillReadiness(): Promise<SkillReadinessIndex | null> {
  const sessionId = (await cookies()).get("eve_session")?.value;
  if (!sessionId) return null;
  try {
    const session = getSession(sessionId);
    if (!session) return null;
    const token = await validAccessToken(session);
    return await loadCharacterSkillReadiness(session.characterId, token);
  } catch (error) {
    console.warn("Unable to load character skills for Abyssal fit guidance", error);
    return null;
  }
}

function exactSkillTypeId(skillName: string): number | null {
  if (!staticDatabaseAvailable()) return null;
  const match = searchStaticItems(skillName, { limit: 20 }).find((item) =>
    item.name?.toLocaleLowerCase() === skillName.toLocaleLowerCase()
    && item.kinds.includes("skill"));
  return match?.typeId ?? null;
}

function assessFitSkills(option: AbyssalFirstRunOption, index: SkillReadinessIndex | null): FitSkillAssessment {
  if (!index || index.visibility === "unavailable") {
    return { state: "unknown", total: option.skills.length, met: 0, missing: [], unresolved: [] };
  }

  const missing: MissingFitSkill[] = [];
  const unresolved: string[] = [];
  let met = 0;

  for (const skill of option.skills) {
    const typeId = exactSkillTypeId(skill.name);
    if (!typeId) {
      unresolved.push(skill.name);
      continue;
    }
    const result = readinessForSkillRequirement(index, typeId, skill.required);
    if (result.status === "met") {
      met += 1;
    } else if (result.status === "below-required" || result.status === "not-trained") {
      missing.push({ name: skill.name, trained: result.trainedLevel, required: skill.required });
    } else {
      unresolved.push(skill.name);
    }
  }

  const state: ReadinessFindingState = missing.length > 0
    ? "unmet"
    : unresolved.length > 0
      ? "unknown"
      : "met";
  return { state, total: option.skills.length, met, missing, unresolved };
}

function skillBadge(assessment: FitSkillAssessment): { className: string; label: string } {
  if (assessment.state === "met") return { className: styles.kindPill, label: "your skills: requirements met" };
  if (assessment.state === "unmet") return { className: styles.warnPill, label: `your skills: missing ${assessment.missing.length}` };
  return { className: styles.mutedPill, label: "your skills: not checked" };
}

export default async function AbyssalActivityPage({ searchParams }: AbyssalActivityPageProps) {
  const params = await searchParams;
  const options = listAbyssalFirstRunOptions();
  const requestedFitId = single(params.fit);
  const selected = getAbyssalFirstRunOption(requestedFitId) ?? options[0];
  const skillIndex = await viewerSkillReadiness();
  const assessments = new Map(options.map((option) => [option.id, assessFitSkills(option, skillIndex)]));
  const selectedSkills = assessments.get(selected.id) ?? assessFitSkills(selected, skillIndex);

  const readiness = buildVettedAbyssalFitReadiness({
    fitId: selected.id,
    targetTier: selected.tier,
    weather: selected.weather,
    skillReadiness: selectedSkills.state,
    suppliesReady: "unknown",
    replacementCapacity: "unknown",
    priorTierExperience: selected.tier === 0 ? "not-applicable" : "unknown",
    filamentAvailable: "unknown",
  });
  const firstRun = buildAbyssalFirstRunPackage(selected, readiness.explanation);

  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <div className={styles.topbar}>
          <Link className={styles.backLink} href="/"><ArrowLeft size={15} /> Back to companion</Link>
          <Link className={styles.secondaryLink} href="/goals"><ShieldCheck size={15} /> Goals & plans</Link>
        </div>

        <section className={styles.hero}>
          <div className={styles.eyebrow}>First complete activity slice</div>
          <h1>Abyssal first-run guide</h1>
          <p>Pick a starter run. NEC tells you what the ship is, whether your character meets the fit&apos;s required skills, what to copy into EVE, how to start, and what matters once you are inside.</p>
        </section>

        <div className={styles.notice}>
          NEC now checks the selected fit&apos;s required skills against the logged-in character when ESI skill data is available. Owned supplies, replacement capacity, filament inventory, and experience are still separate readiness checks and remain unknown until those live adapters are connected.
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Pick the exact run</div><h2>Starter ships and fittings</h2></div>
            <p>{options.length} vetted T0/T1 options</p>
          </div>

          <div className={styles.results}>
            {options.map((option) => {
              const active = option.id === selected.id;
              const assessment = assessments.get(option.id) ?? assessFitSkills(option, skillIndex);
              const badge = skillBadge(assessment);
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={styles.resultCard}
                  href={`/activities/abyssal?fit=${encodeURIComponent(option.id)}`}
                  key={option.id}
                >
                  <div className={styles.resultTop}>
                    <span className={styles.kindPill}>ship · frigate</span>
                    <span className={styles.kindPill}>T{option.tier}</span>
                    <span className={styles.pill}>{option.weather}</span>
                    <span className={badge.className}>{badge.label}</span>
                    {active ? <span className={styles.mutedPill}>selected</span> : null}
                  </div>
                  <h3>{option.shipName}</h3>
                  <p><strong>Fitting:</strong> {option.fitName}</p>
                  <p>{option.summary}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.panel}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.eyebrow}>Selected ship and fitting</div>
                <h2>{selected.shipName}</h2>
              </div>
              <span className={skillBadge(selectedSkills).className}>{skillBadge(selectedSkills).label}</span>
            </div>
            <p className={styles.description}><strong>Ship:</strong> {selected.shipName} · frigate</p>
            <p className={styles.description}><strong>Fitting:</strong> {selected.fitName}</p>
            <p className={styles.description}>{selected.summary}</p>
            <div className={styles.productLinks}>
              <Link className={styles.secondaryLink} href={`/items/${selected.shipTypeId}`}>What is the {selected.shipName}?</Link>
              <CopyTextButton text={selected.eft} label="Copy EVE fit" />
              {selected.sourceUrl ? <a className={styles.secondaryLink} href={selected.sourceUrl} target="_blank" rel="noreferrer">Why this fit?</a> : null}
            </div>

            {selectedSkills.state === "unmet" ? (
              <div className={styles.notice}>
                <strong>Your character is missing required skills for this fit.</strong>
                <ul className={styles.skillList}>
                  {selectedSkills.missing.map((skill) => (
                    <li key={skill.name}>{skill.name}: trained {skill.trained}, needs {skill.required}</li>
                  ))}
                </ul>
              </div>
            ) : selectedSkills.state === "met" ? (
              <div className={styles.emptyState}>
                <strong>Your character meets the fit&apos;s listed required skill floor.</strong>
                That does not prove the ship, supplies, or replacement budget are ready, but you should not need to train a listed required skill just to import and fit this setup.
              </div>
            ) : (
              <div className={styles.notice}>NEC could not fully verify this fit&apos;s required skills for the current character. The fit remains available to inspect and copy, but readiness stays uncertain.</div>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <ActivityBriefing briefing={firstRun.briefing} />
        </section>

        <section className={styles.section}>
          <AbyssalLootGuide tier={selected.tier} />
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.eyebrow}>Keep beside EVE</div><h2>Compact execution view</h2></div>
            <p>Only the run-critical steps</p>
          </div>
          <ActivityCheatSheet sheet={firstRun.cheatSheet} />
        </section>

        <section className={styles.section}>
          <AbyssalFitCatalog />
        </section>
      </div>
    </main>
  );
}
