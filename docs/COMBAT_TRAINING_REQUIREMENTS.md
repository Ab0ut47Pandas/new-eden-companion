# New Eden Companion — Combat Training Requirements

These requirements define the mandatory first-release Combat School vertical slice. Advanced multi-ship tactical boards remain later expansion unless the roadmap explicitly promotes them.

## Interactive Combat School / Matchup Quiz

NEC must teach combat reasoning interactively rather than only displaying fit statistics. The first vertical slice must present a player ship/fit and an opposing ship/fit, ask the player to reason about the engagement, then explain the evidence behind the answer.

The lesson model should cover, where supported by validated fitting data:

- engagement envelope and range control;
- tackle and escape conditions;
- damage application versus raw paper damage;
- tank and survivability tradeoffs;
- capacitor/neut dependence;
- mobility and signature considerations;
- performance versus survivability choices;
- solo assumptions versus support/fleet assumptions.

NEC must not present guaranteed matchup outcomes, hidden combat state, or fake win percentages. Unknown facts remain unknown.

## Extensibility

The quiz data/model should be structured so later work can add multiple ships, tactical-board positioning, and richer scenario state without rewriting the basic evidence/explanation model.

## Manual checkpoint

Before `REL-01`, the installed app must be manually tested for whether the quiz teaches the intended reasoning clearly and whether its explanations match the presented fits rather than merely sounding plausible.
