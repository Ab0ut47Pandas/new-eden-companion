"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronRight, RefreshCw, ShieldCheck, Shuffle, Sparkles, Target } from "lucide-react";
import { useMemo, useState } from "react";

import type { SuggestedSessionRecommendation, SuggestedSessionResult } from "@/lib/session/suggested-session";

import { WhyDetails } from "./why-details";
import styles from "./progression-home.module.css";

const SESSION_RULE = "NEC ranks verified readiness before saved-goal relevance, then uses session-length and risk preferences as tie-breakers. Required missing evidence stays unknown or unavailable instead of being promoted to ready.";

function stateLabel(state: SuggestedSessionRecommendation["state"]): string {
  if (state === "ready") return "Ready";
  if (state === "probably-ready") return "Probably ready";
  if (state === "missing-requirements") return "Missing requirements";
  if (state === "live-information-unavailable") return "Live information unavailable";
  return "Cannot verify";
}

function RecommendationMeta({ recommendation }: { recommendation: SuggestedSessionRecommendation }) {
  return (
    <div className={styles.meta}>
      <span>{stateLabel(recommendation.state)}</span>
      <span>{recommendation.activity}</span>
      <span>{recommendation.sessionLength} session</span>
      <span>{recommendation.riskPosture} posture</span>
      {recommendation.ship && <span>Ship: {recommendation.ship.name}</span>}
    </div>
  );
}

export function ProgressionHome({
  result,
  characterName,
  connected,
  dataGapCount,
}: {
  result: SuggestedSessionResult;
  characterName: string;
  connected: boolean;
  dataGapCount: number;
}) {
  const router = useRouter();
  const [selection, setSelection] = useState(0);
  const ranked = result.ranked;
  const primary = ranked[selection] ?? result.primary;
  const supporting = useMemo(() => {
    if (!primary) return [];
    return ranked.filter((item) => item.candidateId !== primary.candidateId).slice(0, 2);
  }, [primary, ranked]);

  function suggestDifferent() {
    if (ranked.length < 2) return;
    setSelection((current) => (current + 1) % ranked.length);
  }

  return (
    <section className={styles.shell} aria-labelledby="progression-home-title">
      <div className={styles.heading}>
        <div>
          <div className={styles.eyebrow}><Target size={15} /> Suggested Session</div>
          <h1 id="progression-home-title">What should I do right now?</h1>
          <p>
            {connected
              ? `One evidence-backed next move for ${characterName}, with two alternatives when NEC has enough supported options.`
              : "Demo data is active. These recommendations demonstrate the workflow and are not claims about your character."}
          </p>
        </div>
        <span className={styles.status}><ShieldCheck size={15} /> Evidence first</span>
      </div>

      <div className={styles.controls}>
        <button type="button" onClick={() => router.refresh()}><RefreshCw size={15} /> Refresh</button>
        <button type="button" onClick={suggestDifferent} disabled={ranked.length < 2}><Shuffle size={15} /> Suggest something different</button>
      </div>

      {primary ? (
        <article className={styles.primary}>
          <div className={styles.primaryLabel}>Do this first</div>
          <h2>{primary.title}</h2>
          <RecommendationMeta recommendation={primary} />
          {primary.preparation.length > 0 && <p>{primary.preparation[0]}</p>}
          {(primary.missingRequirements.length > 0 || primary.missingItems.length > 0) && (
            <div className={styles.missing}>
              {primary.missingRequirements.map((item) => <span key={`req-${item}`}>Requirement: {item}</span>)}
              {primary.missingItems.map((item) => <span key={`item-${item}`}>Item: {item}</span>)}
            </div>
          )}
          <div className={styles.action}><ArrowRight size={18} /><span><strong>Next action:</strong> {primary.nextAction}</span></div>
          {primary.href && <Link className={styles.openAction} href={primary.href}>Open this activity <ChevronRight size={15} /></Link>}
          <WhyDetails
            label="Why this?"
            rule={SESSION_RULE}
            reasons={primary.why}
            evidence={primary.evidence}
            provenance={primary.provenance}
            unknowns={primary.unknowns}
          />
          {primary.resolveUnknowns.length > 0 && (
            <div className={styles.resolve}>
              <strong>To resolve uncertainty:</strong>
              {primary.resolveUnknowns.map((item) => <span key={item}>{item}</span>)}
            </div>
          )}
        </article>
      ) : (
        <article className={styles.empty}>
          <Sparkles size={20} />
          <div>
            <h2>No supported Suggested Session yet</h2>
            <p>NEC does not have enough supported candidate evidence to choose a next action. Refresh the data or start from an explicit goal rather than guessing.</p>
          </div>
        </article>
      )}

      <div className={styles.lowerGrid}>
        <div className={styles.supporting}>
          <div className={styles.sectionTitle}>Alternatives</div>
          {supporting.length ? supporting.map((item) => (
            <article key={item.candidateId}>
              <div><strong>{item.title}</strong><span>{item.activity} · {stateLabel(item.state)} · {item.sessionLength}</span></div>
              <div className={styles.altAction}>{item.nextAction}</div>
              <WhyDetails
                label="Why this?"
                rule={SESSION_RULE}
                reasons={item.why}
                evidence={item.evidence}
                provenance={item.provenance}
                unknowns={item.unknowns}
              />
            </article>
          )) : <p className={styles.muted}>No additional supported recommendations are available yet.</p>}
        </div>

        <nav className={styles.paths} aria-label="Progression paths">
          <div className={styles.sectionTitle}>Choose how to continue</div>
          <Link href="/goals"><span><strong>Start from a goal</strong><small>Save what you actually want to accomplish.</small></span><ChevronRight size={16} /></Link>
          <Link href="/items"><span><strong>Source an item</strong><small>Open acquisition and dependency guidance.</small></span><ChevronRight size={16} /></Link>
          <a href="#detailed-dashboard"><span><strong>Open detailed dashboard</strong><small>Wallet, assets, skills, ships, activity, map, and data access.</small></span><ChevronRight size={16} /></a>
        </nav>
      </div>

      <div className={styles.footerNote}>
        <ShieldCheck size={15} />
        <span>{dataGapCount ? `${dataGapCount} requested data categor${dataGapCount === 1 ? "y is" : "ies are"} unavailable; Suggested Session will not silently fill those gaps.` : "No requested dashboard data categories are currently marked unavailable."}</span>
      </div>
    </section>
  );
}
