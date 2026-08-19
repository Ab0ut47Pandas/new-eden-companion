# New Eden Companion — Fitting Engine Scope and Validation

This document is the acceptance contract for `FIT-01` and the guardrail for `FIT-02` through `FIT-06`.

The fitting engine must be deterministic, explainable, and conservative. NEC must not present a fitting number as authoritative merely because a formula looks plausible. Every supported stat family needs a traceable Dogma/data source and regression coverage against a trusted reference before it can drive user-facing readiness or tactics.

## Source hierarchy

Use sources in this order:

1. **Current CCP SDE / Dogma data** for type attributes, effects, modifier metadata, slot restrictions, charges, and skill-linked static values.
2. **Current CCP documentation/support material** for mechanics explicitly documented outside Dogma, such as stacking-penalty behavior.
3. **The EVE client fitting simulator** as the primary behavioral reference for complete-fit output. CCP states that simulator mode works the same as the normal fitting window for fitting calculations.
4. **Current Pyfa/Eos** as an independent implementation/reference when a value can be reproduced against the same current SDE and the same fit state.

If CCP client output and Pyfa disagree, NEC must not silently choose whichever number is more convenient. Record the discrepancy, isolate the affected stat, and keep it unsupported/unknown until the reason is established.

Primary references:

- CCP static-data service and automation: https://developers.eveonline.com/docs/services/static-data/
- CCP static-data glossary/Dogma definitions: https://developers.eveonline.com/docs/guides/glossary/
- CCP fitting simulator behavior: https://support.eveonline.com/hc/en-us/articles/212694909-Fitting-Simulator
- CCP stacking-penalty behavior: https://support.eveonline.com/hc/en-us/articles/203280381-Bonuses-and-Stacking-Penalties
- CCP fitting-window DPS description: https://www.eveonline.com/news/view/improvements-to-the-fitting-window
- Pyfa: https://github.com/pyfa-org/Pyfa
- Eos reference implementation/examples: https://github.com/pyfa-org/eos

## FIT-02 required stat coverage

`src/lib/fitting/validation.ts` is the machine-readable coverage registry. FIT-02 is not complete until its calculator can produce supported values for the following families or explicitly return unsupported/unknown for a stat whose mechanics have not been validated.

### Fitting resources and validity

- CPU output and used CPU.
- Powergrid output and used powergrid.
- High, mid, low, and rig slot capacity/use validation.
- Turret and launcher hardpoint capacity/use validation.
- Rig calibration capacity/use validation.
- Required-skill checks for hull, modules, rigs, charges, and drones where Dogma exposes requirements.

### Mobility

- Maximum velocity.
- Effective mass.
- Inertia modifier.
- Align time.
- Signature radius.

### Tank

- Shield, armor, and structure HP.
- EM/thermal/kinetic/explosive resistances for shield, armor, and structure.
- Uniform-damage EHP using an explicit 25/25/25/25 profile.

EHP is always profile-dependent. Later matchup work may request other damage profiles, but NEC must never display one EHP number as though it applies equally to every incoming damage mix.

### Capacitor

- Effective capacitor capacity.
- Effective recharge time.
- Peak passive recharge.
- Stable capacitor fraction when the supported activation model reaches equilibrium.
- Time to depletion when not stable.

Capacitor simulation must account for module activation state and supported reload/injection behavior. Until the simulator is validated, NEC must not label a fit `cap stable` from simple average drain alone.

### Weapons and drones

- Turret paper DPS.
- Missile paper DPS.
- Drone paper DPS for active drones.
- Combined DPS with and without supported reload downtime.
- Turret optimal, falloff, and tracking.
- Nominal missile range plus explosion radius and explosion velocity for later application analysis.
- Drone bay, bandwidth, bandwidth use, and control range.

Paper DPS is not applied DPS. FIT-02 may expose the raw inputs needed by later application work, but FIT-06/PVP work must not convert paper DPS into a guaranteed combat outcome.

## State dimensions the engine must model explicitly

A golden reference is meaningless unless both systems are evaluating the same state. Reference fixtures must identify, when relevant:

- hull type and current SDE build;
- character skill profile (`all V`, real character snapshot, or explicit levels);
- fitted modules and slot positions;
- module state (offline, online, active, overheated);
- loaded charges/scripts;
- rigs;
- active drones and drone state;
- implants and boosters;
- subsystem/stance where applicable;
- environment/effect beacon when applicable;
- incoming damage profile for EHP;
- reload inclusion for DPS;
- capacitor activation assumptions.

If any dimension is not represented by NEC yet, the affected golden case must not be declared passing by dropping that dimension silently.

## Golden-reference policy

The validator compares named calculator metrics against a versioned reference with explicit tolerances and provenance. A reference must include an HTTPS source, capture time, and enough version metadata to reproduce it.

Tolerance is the larger of:

- an explicit absolute tolerance; or
- `abs(expected) * relativeTolerance`.

Missing or non-finite output is a failure, not zero. Unexpected extra calculator metrics do not fail a partial reference case; this lets focused references validate one subsystem at a time.

### Required FIT-02 current-TQ matrix

Before FIT-02 is merged, add current-SDE/client-or-Pyfa snapshots covering at least:

1. **Naked T1 frigate:** base CPU/PG, slots/hardpoints, mobility, HP/resists, capacitor, signature.
2. **Stacking case:** multiple modules affecting the same percentage attribute, exercising CCP's published ordering/effectiveness behavior.
3. **Buffer-tank case:** extender/plate/resistance interaction and uniform EHP.
4. **Active-cap case:** cycling capacitor consumers with an independently verified stable or finite-runtime result.
5. **Turret case:** charge, ship/skill/module modifiers, DPS, optimal/falloff/tracking.
6. **Missile case:** launcher/charge modifiers, paper DPS, nominal range, explosion radius/velocity.
7. **Drone case:** bay/bandwidth/count constraints and active-drone DPS.
8. **Invalid fit case:** a CPU/PG/slot/hardpoint/skill violation that both NEC and the reference identify as invalid.

At least one matrix case must be checked against the EVE client fitting simulator. Pyfa-only agreement is not sufficient for every subsystem.

The checked-in Pyfa/Eos README snapshot in `validation.test.ts` is intentionally a **harness canary**, not a claim that its historical fit numbers are current Tranquility values. FIT-02 must add current-TQ snapshots before the calculator itself is accepted.

## Current authoritative mechanics locked by FIT-01

- Dogma attributes describe type properties and Dogma effects describe interactions/modifiers; the current SDE is the static source of truth NEC should ingest rather than hardcoding current item values.
- CCP's current stacking-penalty support article documents strength ordering and the familiar effectiveness sequence (first full strength, then diminishing subsequent modifiers). NEC must derive applicability from Dogma/effect metadata and must not assume every percentage-looking bonus stacks or is penalized.
- CCP's fitting simulator is the behavioral target for a simulated fit.
- CCP's fitting-window description confirms paper turret DPS is based on weapon damage and cycle time and that missile/drone DPS requires weapon-system-specific handling; NEC must therefore keep raw/paper damage separate from later application/tactical conclusions.

## Explicitly deferred or unsupported in FIT-02 unless separately validated

These are not excuses to fake a value. They remain unknown until a later item establishes the mechanics/data:

- remote-repair/logistics throughput and chaining;
- command-burst/fleet-wide projected effects beyond an explicitly supplied supported effect state;
- EWAR success probability or target-specific sensor interactions;
- neut/nos target interaction beyond self capacitor cost and independently validated transfer/drain values;
- heat-damage lifetime and rack heat simulation;
- reactive armor adaptation over time;
- weapon application to a moving target until target state is explicitly supplied and formulas are validated;
- live range control, transversal, piloting, target velocity, target signature, target resist profile, or hidden combat state;
- environmental effects NEC has not explicitly loaded into the fit state;
- deterministic win percentages or guarantees.

## Acceptance gate for later fitting work

No FIT-03 user interface should become the authority for calculated fitting stats until FIT-02 passes the golden matrix. FIT-04 through PVP-03 may consume only metrics that FIT-02 marks supported and validated. A tactical rule must expose which validated facts caused it to fire; unsupported inputs remain unknown rather than being replaced with guesses.
