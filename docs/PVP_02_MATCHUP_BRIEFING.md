# PVP-02 — Matchup briefing

PVP-02 translates the directional evidence from `PVP-01` into a readable teaching briefing. It does not add a second combat simulator and it does not combine dimensions into a hidden score, winner, or win percentage.

## Player-facing output

Given a validated `TwoFitMatchupResult`, NEC can present:

- **Your supported advantages** — only dimensions where PVP-01 produced a `you` edge.
- **Their supported advantages** — only dimensions where PVP-01 produced an `opponent` edge.
- **Good engagement conditions** — conditions that preserve a supported edge rather than generic advice.
- **Bad engagement conditions** — opponent-favored conditions the player should avoid when possible.
- **Run / reset if** — early disengagement cues derived only from opponent-favored evidence. These are decision cues, not guarantees that escape remains possible after the condition is established.
- **Plausible failure transition** — a teaching sequence assembled from opponent-favored dimensions in tactical dependency order. It is explicitly not a forecast of live event order, time-to-loss, or probability.
- **Contested / unknown state** — ties, no-edge dimensions, and unsupported evidence remain visible instead of being forced into a conclusion.
- **Why? / evidence / caveats** — every briefing card preserves PVP-01 evidence and caveats.

`src/components/matchup-briefing.tsx` is the reusable rendering layer for later Combat School and goal/PvP workflows. PVP-02 does not pretend the current narrow FIT-03 catalog can already compare arbitrary player fits end to end.

## Failure-transition rule

The teaching order is deliberately dependency-oriented rather than probabilistic:

1. engagement envelope;
2. range control;
3. tackle;
4. application;
5. capacitor warfare;
6. damage-type/resistance interaction;
7. opponent-specific tank;
8. mobility/reset pressure;
9. warp escape/denial.

Only opponent-favored dimensions that actually exist are included. If there is one supported danger, NEC says there is not enough evidence for a multi-step chain. If there are none, NEC refuses to invent a failure transition.

## Mechanics/source boundary

PVP-02 adds presentation rules, not new EVE combat formulas. Its mechanic-bearing inputs come from PVP-01, which was rechecked against current CCP primary documentation on 2026-08-20:

- CCP Support — Warp Scrambling and Warp Disruption: https://support.eveonline.com/hc/en-us/articles/115004925705-Warp-Scrambling-and-Warp-Disruption
- CCP Support — Damage Types and Resistances: https://support.eveonline.com/hc/en-us/articles/203280501-Damage-Types-and-Resistances
- CCP Support — Fitting Simulator: https://support.eveonline.com/hc/en-us/articles/212694909-Fitting-Simulator
- CCP Support — Ship Attributes in the Fitting Window: https://support.eveonline.com/hc/en-us/articles/213287965-Ship-Attributes-in-the-Fitting-Window

PVP-02 does not add hard-coded module ranges, target telemetry, pilot-skill inference, heat state, implants, boosters, fleet links, hidden client state, deterministic winner logic, or a gank/survival/win probability.

## Next consumer

PVP-03 can use the same evidence vocabulary when explaining a loss. Combat School later consumes PVP-01 + PVP-02 to teach why a matchup wants a certain range, what transition makes the fight dangerous, and when a valid answer is simply to avoid or disengage.
