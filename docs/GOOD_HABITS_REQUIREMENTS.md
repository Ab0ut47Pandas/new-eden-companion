# New Eden Companion — Good Habits Coaching Requirements

NEC should teach **good operating habits**, not merely optimize raw yield, DPS, ISK/hour, cargo capacity, or other headline numbers. Recommendations should explain the tradeoff between maximum performance and a safer, more sustainable way to actually perform an activity, especially for solo players.

## Cross-activity coaching model

For each supported activity, NEC should be able to distinguish:

- **Performance:** what increases output, speed, yield, DPS, ISK/hour, or throughput;
- **Survivability:** what helps the ship/player absorb, avoid, or recover from foreseeable threats;
- **Awareness:** what the player should actively watch or check while performing the activity;
- **Escape/recovery:** what the player should have ready when conditions become bad;
- **Replacement risk:** whether the player can comfortably replace the ship/loadout if lost;
- **Solo vs fleet assumptions:** whether a high-output recommendation depends on other players providing hauling, boosts, scouting, tackle, logistics, or protection;
- **Attention requirement:** whether the plan is appropriate only for an attentive player rather than implying it is safe to ignore the client.

NEC should never label a fit or activity setup simply **best** when it is only best for one dimension such as yield. Prefer labels like `Max yield`, `Balanced solo`, `Defensive`, `Low-attention not recommended`, or similarly explicit tradeoff-oriented wording.

## Mining as the first habit-coaching vertical slice

Mining is a strong first implementation because raw yield optimization can conflict directly with solo survivability and awareness.

A solo-mining briefing should teach the player to think in layers rather than searching for one magic defensive module:

1. **Choose the right hull for the risk.** Explain the yield/hold/tank/agility/self-defense tradeoffs of available mining hulls instead of ranking only by m3/hour.
2. **Fit a real tank when appropriate.** Show which tank modules/rigs are present, what defenses they improve, and what is being sacrificed to fit them.
3. **Carry suitable defensive drones where the ship supports them.** Distinguish protection from ordinary belt NPCs from protection against capsuleers; combat drones are not a promise of PvP safety.
4. **Stay attentive.** Teach the player what information sources are relevant in that security environment and never imply NEC can watch the game client for them.
5. **Have an escape plan.** Teach practical warp-out preparation, bookmarks/safe destinations, propulsion/alignment considerations, and the fact that survivability often comes from leaving early rather than winning a fight.
6. **Know the environment.** High-security, low-security, null-security, and wormhole mining should not share one generic safety checklist; surface only mechanics NEC has current sourced support for and preserve unsupported specifics as unknown.
7. **Protect the wallet too.** A mining fit can be technically survivable but still be a bad recommendation if losing it would wipe out the player's replacement capacity.

## Player-facing comparison

When NEC can validate multiple fits for the same mining goal, it should compare them on multiple axes rather than giving one winner. Example shape:

| Fit | Yield | Tank | Hold | Agility/Escape | Solo suitability | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Max-yield setup | highest | lower | varies | varies | situational | assumes strong attention/support |
| Balanced solo | moderate/high | stronger | adequate | adequate | good | gives up some output for survivability |
| Defensive solo | lower/moderate | strongest supported | adequate | context-dependent | safer choice | useful when replacement risk is high |

The exact values and labels must come from validated fitting data, not hand-written impressions.

## Habit prompts

Activity briefings should include compact habits that are easy to act on, for example:

- **Before undocking:** replacement affordable? tank fitted? defensive drones loaded? escape destination/bookmarks prepared?
- **Before starting:** is this security environment appropriate for the current ship and attention level?
- **While active:** what should the player monitor manually, and what warning signs mean leave now?
- **Afterward:** what did the player risk, what did they earn/learn, and is there a safer or more efficient next iteration?

These should be explainable and dismissible; NEC should teach rather than nag.

## Scope and truthfulness

- NEC cannot observe Local, d-scan, grid state, incoming ships, combat probes, player attention, or other live client information unless a future supported integration explicitly provides it.
- A stronger tank reduces some risks; it does not make a mining ship ungankable or safe in hostile space.
- NPC-defense guidance and player-attack guidance must remain distinct.
- Do not claim a player is safe merely because a checklist is green.
- Do not imply maximum-yield fits are wrong; explain what support/attention/risk assumptions make them appropriate.
- Reuse the same habit-coaching model later for hauling, exploration, missions, Abyssals, PvP, industry logistics, PI travel, and other activities.

## Completion requirement

Before the progression-coach release candidate is considered complete, at least one activity should demonstrate this good-habits teaching loop in the real UI. Mining is the preferred first vertical slice: the app should compare at least a performance-oriented and a solo-survivability-oriented plan, explain the tradeoffs, present a concise preflight/while-active/escape checklist, and pass a real-user usability checkpoint.
