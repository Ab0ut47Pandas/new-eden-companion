# FIT-05 — Fit weakness rules

FIT-05 turns validated fitting facts into explainable plan conflicts. It is deliberately not a generic "bad fit" scorer. Every warning requires explicit evidence and provenance; missing evidence stays unknown.

## Current CCP mechanics checked

Verified against current CCP support documentation on 2026-08-20:

- Warp Scramblers and Warp Disruptors both prevent warp when their disruption succeeds. Scramblers additionally disable Microwarpdrives and Micro Jump Drives; Disruptors operate at a longer optimal range. NEC therefore treats tackle range and tackle responsibility as explicit evidence rather than inferring either from a role name.
- CCP documents four damage types (EM, Thermal, Kinetic, Explosive) and applies each component against its matching resistance. NEC may therefore warn when a supported expected incoming-damage profile is dominated by the same damage type that is the weakest supported resistance on the stated primary tank layer.
- The Fitting Window exposes current fitted CPU/PG, slots/hardpoints, tank and other fit statistics. FIT-05 consumes deterministic FIT-02 facts but does not infer unresolved module effects.

Primary references:

- CCP Support — Warp Scrambling and Warp Disruption: https://support.eveonline.com/hc/en-us/articles/115004925705-Warp-Scrambling-and-Warp-Disruption
- CCP Support — Damage Types and Resistances: https://support.eveonline.com/hc/en-us/articles/203280501-Damage-Types-and-Resistances
- CCP Support — Fitting Window: https://support.eveonline.com/hc/en-us/articles/213287845-Fitting-Window

## Rules

### Range/tackle plan

When a fit explicitly assumes it must hold its own target, NEC can compare the preferred weapon range against the longest validated fitted tackle range. If the damage plan sits outside that range, NEC calls it a plan conflict, not a universal fitting error. If the fit explicitly assumes fleet/support tackle, no warning is emitted.

If solo tackle is required but no supported tackle envelope exists, NEC warns that self-tackle is not established. It does not infer tackle from module names.

### Mobility conflict

NEC only emits a mobility conflict when both facts are explicit:

1. the fit plan depends on range control; and
2. resolved fitted effects are supplied as mobility penalties.

FIT-05 does not maintain a hidden list of "slow" modules or invent mass/agility effects.

### Capacitor dependence

An unstable-cap warning requires both deterministic evidence that the fit is not capacitor-stable and an explicit list of plan-critical capacitor-using systems. NEC does not predict time-to-cap-out, enemy neutralizer pressure, heat, pilot cycling behavior, boosters, or unsupported capacitor effects.

### Resist exposure

A resist warning requires a stated primary tank layer, a complete supported resistance vector for that layer, and a complete supported expected incoming-damage composition. The rule only fires when the dominant expected damage type is also the weakest resistance. A generic low resistance without a supported opponent/environment damage profile is left as context, not a fabricated weakness.

### Damage application

FIT-02 intentionally does not claim target-specific application. FIT-05 therefore accepts an application warning only from a separately validated application evaluator carrying its own provenance. Missing application evidence remains unknown.

## Output policy

Findings are deterministic and evidence-backed. Severity is an attention level, not a loss probability or matchup prediction. FIT-05 never emits win percentages, safety guarantees, hidden opponent state, or unsupported tactical claims. Ties and unknowns stay explicit for FIT-06/PVP consumers.
