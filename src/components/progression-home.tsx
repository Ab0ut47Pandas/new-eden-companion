import Link from "next/link";
import { ArrowRight, ChevronRight, ShieldCheck, Sparkles, Target } from "lucide-react";

import type { DashboardData } from "@/lib/dashboard/model";
import { buildProgressionHomeModel } from "@/lib/dashboard/progression-home";

import { WhyDetails } from "./why-details";
import styles from "./progression-home.module.css";

const PROGRESSION_RULE = "Recommendations are ordered from NEC's supported dashboard advice by explicit priority; missing character data is not silently filled in.";

export function ProgressionHome({ data }: { data: DashboardData }) {
  const model = buildProgressionHomeModel(data);
  const primary = model.primary;

  return (
    <section className={styles.shell} aria-labelledby="progression-home-title">
      <div className={styles.heading}>
        <div>
          <div className={styles.eyebrow}><Target size={15} /> Progression home</div>
          <h1 id="progression-home-title">What should I do next?</h1>
          <p>
            {model.connected
              ? `Start with one supported next move for ${data.character.name}. The detailed dashboard is still available when you need the raw data.`
              : "This is a demo preview. Connect a character before treating these recommendations as personal progression advice."}
          </p>
        </div>
        <span className={styles.status}><ShieldCheck size={15} /> Evidence first</span>
      </div>

      {primary ? (
        <article className={styles.primary}>
          <div className={styles.primaryLabel}>{primary.priority === "now" ? "Do this first" : primary.priority === "next" ? "Best next move" : "Worth watching"}</div>
          <h2>{primary.title}</h2>
          <p>{primary.summary}</p>
          <div className={styles.action}><ArrowRight size={18} /><span><strong>Next action:</strong> {primary.action}</span></div>
          <WhyDetails
            label="Why this?"
            rule={PROGRESSION_RULE}
            reasons={[primary.evidence]}
            unknowns={model.dataGapCount ? [`${model.dataGapCount} requested dashboard data categor${model.dataGapCount === 1 ? "y is" : "ies are"} unavailable.`] : []}
          />
        </article>
      ) : (
        <article className={styles.empty}>
          <Sparkles size={20} />
          <div>
            <h2>No supported next action yet</h2>
            <p>NEC does not have enough evidence to choose a recommendation. Review the data gaps or start from an explicit goal instead of guessing.</p>
          </div>
        </article>
      )}

      <div className={styles.lowerGrid}>
        <div className={styles.supporting}>
          <div className={styles.sectionTitle}>After that</div>
          {model.supporting.length ? model.supporting.map((item) => (
            <article key={item.id}>
              <div><strong>{item.title}</strong><span>{item.summary}</span></div>
              <WhyDetails label="Why?" rule={PROGRESSION_RULE} reasons={[item.evidence]} />
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
        <span>{model.dataGapCount ? `${model.dataGapCount} requested data categor${model.dataGapCount === 1 ? "y is" : "ies are"} unavailable; recommendations must not silently fill those gaps.` : "No requested dashboard data categories are currently marked unavailable."}</span>
      </div>
    </section>
  );
}
