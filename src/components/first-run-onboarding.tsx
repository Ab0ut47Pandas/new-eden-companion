"use client";

import { Clock3, Database, ShieldCheck, Sparkles, UserRoundCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ONBOARDING_COMPLETE_COOKIE,
  SESSION_LENGTH_COOKIE,
  SESSION_RISK_COOKIE,
} from "@/lib/onboarding/preferences";
import type {
  SessionLengthPreference,
  SessionRiskPreference,
} from "@/lib/session/suggested-session";

import styles from "./first-run-onboarding.module.css";

const COOKIE_AGE_SECONDS = 60 * 60 * 24 * 365;

const LENGTH_OPTIONS: Array<{ value: SessionLengthPreference; label: string; detail: string }> = [
  { value: "short", label: "Short", detail: "About one focused task" },
  { value: "medium", label: "Medium", detail: "Enough time for setup plus activity" },
  { value: "long", label: "Long", detail: "A longer play session" },
  { value: "any", label: "Any", detail: "Do not use time as a tie-breaker" },
];

const RISK_OPTIONS: Array<{ value: SessionRiskPreference; label: string; detail: string }> = [
  { value: "cautious", label: "Cautious", detail: "Prefer lower-exposure options when readiness is otherwise similar" },
  { value: "balanced", label: "Balanced", detail: "Do not lean strongly toward either extreme" },
  { value: "adventurous", label: "Adventurous", detail: "Prefer higher-exposure options only after readiness is established" },
  { value: "any", label: "Any", detail: "Do not use risk posture as a tie-breaker" },
];

function saveCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_AGE_SECONDS}; SameSite=Lax`;
}

export function FirstRunOnboarding({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [sessionLength, setSessionLength] = useState<SessionLengthPreference>("short");
  const [risk, setRisk] = useState<SessionRiskPreference>("balanced");

  function persistPreferences(markComplete: boolean) {
    saveCookie(SESSION_LENGTH_COOKIE, sessionLength);
    saveCookie(SESSION_RISK_COOKIE, risk);
    if (markComplete) saveCookie(ONBOARDING_COMPLETE_COOKIE, "1");
  }

  function useDemo() {
    persistPreferences(true);
    router.refresh();
  }

  function connectCharacter() {
    persistPreferences(configured);
    if (configured) {
      router.push("/api/auth/login?profile=recommended");
      return;
    }
    window.location.hash = "detailed-dashboard";
  }

  return (
    <section className={styles.shell} aria-labelledby="first-run-title">
      <div className={styles.heading}>
        <div>
          <div className={styles.eyebrow}><Sparkles size={15} /> First run</div>
          <h1 id="first-run-title">Get one useful answer first.</h1>
          <p>Choose how much time you have and how much exposure you want. NEC uses those only after supported readiness, then takes you straight to a Suggested Session.</p>
        </div>
        <span className={styles.badge}><ShieldCheck size={15} /> Evidence first</span>
      </div>

      <div className={styles.boundaries}>
        <article>
          <Database size={18} />
          <div><strong>What NEC can use</strong><span>Only data available through the EVE SSO/ESI permissions you grant, plus NEC&apos;s local static data and your explicit local choices.</span></div>
        </article>
        <article>
          <ShieldCheck size={18} />
          <div><strong>What NEC cannot see</strong><span>NEC does not see your screen or live combat state, and it does not treat skills, ships, assets, or wallet state as proof that you completed AIR or tutorial content.</span></div>
        </article>
      </div>

      <div className={styles.preferenceGrid}>
        <fieldset>
          <legend><Clock3 size={16} /> How long do you want to play?</legend>
          <div className={styles.optionGrid}>
            {LENGTH_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                className={sessionLength === option.value ? styles.selected : undefined}
                aria-pressed={sessionLength === option.value}
                onClick={() => setSessionLength(option.value)}
              >
                <strong>{option.label}</strong><span>{option.detail}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend><ShieldCheck size={16} /> What risk posture sounds right?</legend>
          <div className={styles.optionGrid}>
            {RISK_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                className={risk === option.value ? styles.selected : undefined}
                aria-pressed={risk === option.value}
                onClick={() => setRisk(option.value)}
              >
                <strong>{option.label}</strong><span>{option.detail}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={connectCharacter}>
          <UserRoundCheck size={17} /> {configured ? "Connect EVE character" : "Configure EVE access"}
        </button>
        <button type="button" className={styles.secondary} onClick={useDemo}>
          <Sparkles size={17} /> Use demo data
        </button>
      </div>
      <p className={styles.note}>{configured ? "Connecting opens EVE SSO. NEC receives only the character permissions you approve." : "EVE application settings are not configured yet. Demo mode works now; the detailed setup panel below can configure character access."}</p>
    </section>
  );
}
