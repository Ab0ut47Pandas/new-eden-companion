# PVP-01 — Two-fit matchup model

PVP-01 compares two validated fit evidence packages one dimension at a time. It deliberately does **not** compute a hidden overall score, deterministic winner, or win percentage.

## Compared dimensions

- preferred engagement envelope versus the opponent's established web/scram/disruptor ranges;
- raw range-control evidence from the fits' preferred ranges, modeled maximum velocity, and an established scram-versus-MWD interaction;
- warp tackle capability from supplied warp-disruption strength versus supplied warp-core strength;
- target-specific damage application only when a separately validated application evaluator supplied `good`, `poor`, or `unknown` evidence;
- opponent-specific modeled EHP only when the caller explicitly evaluated EHP against that opponent's supported damage profile;
- capacitor stability and neutralizer pressure only where the relevant ranges and capacitor-dependent systems are established;
- raw modeled maximum velocity as a mobility comparison;
- supported outgoing damage composition versus the opponent's explicitly established primary-layer resistances;
- one warp-escape condition from supported disruption/core-strength values.

Every dimension produces its own directional edge (`you`, `opponent`, `contested`, `none`, or `unknown`) plus evidence and caveats. PVP-02 may translate these dimensions into a readable briefing, but it must not sum them into a hidden win score.

## Fail-closed rules

- Missing preferred range, tackle range, propulsion state, warp strength, target application, opponent-specific EHP, damage composition, primary tank layer/resists, capacitor dependence, neutralizer range, or FIT-02 mobility/capacitor output stays unknown.
- Generic EHP is not substituted for opponent-specific EHP.
- Paper DPS, signature radius, tracking, missile explosion radius/velocity, and maximum velocity are not independently converted into a target-specific application conclusion.
- A maximum-velocity advantage is not a claim of actual range control.
- Warp tackle capability is not a claim that tackle is currently applied.
- A supported scram-versus-MWD interaction is only a capability at the supplied range; live lock/range/heat/piloting state remains unknown.
- Neutralizer capability never becomes a predicted time-to-cap-out without a separately validated model.
- Damage/resistance interaction is not a time-to-kill calculation.

## Current CCP mechanics baseline

Reviewed 2026-08-20:

- CCP Support — Warp Scrambling and Warp Disruption: https://support.eveonline.com/hc/en-us/articles/115004925705-Warp-Scrambling-and-Warp-Disruption
  - successful warp disruption depends on combined disruption strength surpassing warp-core strength;
  - warp scramblers disable Micro Warp Drives and Micro Jump Drives while applied;
  - warp disruptors have the warp-denial effect without the MWD/MJD shutdown effect.
- CCP Support — Damage Types and Resistances: https://support.eveonline.com/hc/en-us/articles/203280501-Damage-Types-and-Resistances
  - EM, Thermal, Kinetic, and Explosive damage are each reduced by the corresponding resistance.
- CCP Support — Fitting Simulator: https://support.eveonline.com/hc/en-us/articles/212694909-Fitting-Simulator
- CCP Support — Ship Attributes in the Fitting Window: https://support.eveonline.com/hc/en-us/articles/213287965-Ship-Attributes-in-the-Fitting-Window
  - fitting statistics include capacitor, weapon DPS/volley, hit points, and resistances, while simulator module activation state affects detailed statistics.

## Deferred to later PVP work

PVP-01 is the comparison domain model. PVP-02 is responsible for player-facing `your advantage`, `their advantage`, good/bad engagement conditions, run-if conditions, and failure transitions. PVP-03 handles post-loss/killmail interpretation. Combat School later consumes the validated fitting and matchup layers for interactive teaching.
