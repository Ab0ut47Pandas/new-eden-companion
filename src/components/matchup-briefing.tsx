import type { MatchupBriefingCard, MatchupCondition } from "@/lib/pvp/briefing";
import { buildMatchupBriefing } from "@/lib/pvp/briefing";
import type { TwoFitMatchupResult } from "@/lib/pvp/matchup";

function Card({ card }: { card: MatchupBriefingCard }) {
  return (
    <article style={{ border: "1px solid var(--border, #2b3445)", borderRadius: 10, padding: 14 }}>
      <strong>{card.title}</strong>
      <p>{card.summary}</p>
      <details>
        <summary>Why?</summary>
        {card.evidence.length ? <><p><strong>Evidence</strong></p><ul>{card.evidence.map((entry) => <li key={entry}>{entry}</li>)}</ul></> : null}
        {card.caveats.length ? <><p><strong>Caveats</strong></p><ul>{card.caveats.map((entry) => <li key={entry}>{entry}</li>)}</ul></> : null}
      </details>
    </article>
  );
}

function Conditions({ title, conditions }: { title: string; conditions: MatchupCondition[] }) {
  if (!conditions.length) return null;
  return (
    <section>
      <h3>{title}</h3>
      <ul>
        {conditions.map((condition) => (
          <li key={condition.id}>
            <strong>{condition.summary}</strong>
            <details>
              <summary>Why?</summary>
              <p>{condition.why}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MatchupBriefingView({ matchup }: { matchup: TwoFitMatchupResult }) {
  const briefing = buildMatchupBriefing(matchup);
  return (
    <section aria-label="Matchup briefing">
      <header>
        <h2>{briefing.headline}</h2>
        <p>Directional evidence only. NEC does not add these dimensions into a hidden winner or win percentage.</p>
      </header>

      <section>
        <h3>Your supported advantages</h3>
        {briefing.yourAdvantages.length
          ? <div style={{ display: "grid", gap: 10 }}>{briefing.yourAdvantages.map((card) => <Card key={card.id} card={card} />)}</div>
          : <p>No supported advantage is established from the supplied evidence.</p>}
      </section>

      <section>
        <h3>Their supported advantages</h3>
        {briefing.opponentAdvantages.length
          ? <div style={{ display: "grid", gap: 10 }}>{briefing.opponentAdvantages.map((card) => <Card key={card.id} card={card} />)}</div>
          : <p>No opponent advantage is established from the supplied evidence.</p>}
      </section>

      <Conditions title="Good engagement conditions" conditions={briefing.goodEngagementConditions} />
      <Conditions title="Bad engagement conditions" conditions={briefing.badEngagementConditions} />
      <Conditions title="Run / reset if" conditions={briefing.runIfConditions} />

      <section>
        <h3>Plausible failure transition</h3>
        <p>{briefing.failureTransition.summary}</p>
        {briefing.failureTransition.steps.length ? <ol>{briefing.failureTransition.steps.map((step) => <li key={step}>{step}</li>)}</ol> : null}
        <p><small>{briefing.failureTransition.caveat}</small></p>
      </section>

      {briefing.contested.length ? (
        <details>
          <summary>Contested / no directional edge ({briefing.contested.length})</summary>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>{briefing.contested.map((card) => <Card key={card.id} card={card} />)}</div>
        </details>
      ) : null}

      {briefing.unknowns.length ? (
        <details>
          <summary>Unknown / not established ({briefing.unknowns.length})</summary>
          <ul>{briefing.unknowns.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        </details>
      ) : null}

      <details>
        <summary>Limits and evidence</summary>
        <ul>{briefing.limitations.map((entry) => <li key={entry}>{entry}</li>)}</ul>
        <p><strong>Provenance</strong></p>
        <ul>{briefing.provenance.map((entry) => <li key={entry}>{entry}</li>)}</ul>
      </details>
    </section>
  );
}
