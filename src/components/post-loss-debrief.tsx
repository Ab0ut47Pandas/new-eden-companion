import type { LossFactor, PostLossDebriefInput } from "@/lib/pvp/post-loss";
import { buildPostLossDebrief } from "@/lib/pvp/post-loss";

function FactorCard({ factor }: { factor: LossFactor }) {
  return (
    <article style={{ border: "1px solid var(--border, #2b3445)", borderRadius: 10, padding: 14 }}>
      <strong>{factor.summary}</strong>
      <p><small>{factor.support === "recorded-context" ? "Recorded context" : "Plausible contributor"}</small></p>
      <details>
        <summary>Why?</summary>
        <p>{factor.why}</p>
        {factor.evidence.length ? <><p><strong>Evidence</strong></p><ul>{factor.evidence.map((entry) => <li key={entry}>{entry}</li>)}</ul></> : null}
        {factor.caveats.length ? <><p><strong>Caveats</strong></p><ul>{factor.caveats.map((entry) => <li key={entry}>{entry}</li>)}</ul></> : null}
      </details>
    </article>
  );
}

export function PostLossDebriefView({ input }: { input: PostLossDebriefInput }) {
  const debrief = buildPostLossDebrief(input);

  return (
    <section aria-label="Post-loss debrief">
      <header>
        <h2>{debrief.headline}</h2>
        <p>Evidence-first review. NEC ranks what is worth inspecting; it does not pretend a killmail is a replay or assign a guaranteed cause.</p>
      </header>

      <section>
        <h3>Primary review factor</h3>
        {debrief.primaryFactors.length
          ? debrief.primaryFactors.map((factor) => <FactorCard key={factor.id} factor={factor} />)
          : <p>No evidence-backed primary factor is established from the supplied loss context.</p>}
      </section>

      {debrief.secondaryFactors.length ? (
        <section>
          <h3>Secondary factors to inspect</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {debrief.secondaryFactors.map((factor) => <FactorCard key={factor.id} factor={factor} />)}
          </div>
        </section>
      ) : null}

      <section>
        <h3>What to practice next</h3>
        {debrief.learningPoints.length
          ? <ul>{debrief.learningPoints.map((point) => <li key={point.id}><strong>{point.summary}</strong><br /><small>{point.why}</small></li>)}</ul>
          : <p>Add a validated destroyed-fit analysis or confirmed opponent matchup before drawing a tactical lesson from this loss.</p>}
      </section>

      {debrief.unknowns.length ? (
        <details>
          <summary>Unknown / not established ({debrief.unknowns.length})</summary>
          <ul>{debrief.unknowns.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        </details>
      ) : null}

      <details>
        <summary>Limits and evidence</summary>
        <ul>{debrief.limitations.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        <p><strong>Provenance</strong></p>
        <ul>{debrief.provenance.map((entry) => <li key={entry}>{entry}</li>)}</ul>
      </details>
    </section>
  );
}
