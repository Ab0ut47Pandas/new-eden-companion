# Fitting Engine Scope and Validation Policy

FIT-01 freezes the first deterministic fitting-engine boundary before FIT-02 implements formulas or FIT-03 exposes a builder UI.

## Authoritative data boundary

NEC treats current CCP static data as the source of truth for primitive item/ship Dogma: `types`, `typeDogma`, `dogmaAttributes`, and `dogmaEffects`. The fitting engine must not infer slot type, fitting cost, range, skill requirements, or modifiers from names/descriptions. Unsupported or unresolved Dogma remains unknown.

Current source checked 2026-08-20:

- CCP Static Data: https://developers.eveonline.com/static-data
- CCP Static Data documentation: https://developers.eveonline.com/docs/services/static-data/
- CCP Dogma glossary: https://developers.eveonline.com/docs/guides/glossary/

Current CCP SDE build at verification: `3424810`.

Community mirrors/tools may be used only as independent regression cross-checks. The initial primitive golden references are cross-checked against EVE Ref type pages for type IDs 486 and 2889; later whole-fit golden cases should additionally be compared against current Pyfa output before formulas are promoted as trusted.

## First-release deterministic coverage

FIT-02 may implement only the following supported areas behind this validation boundary:

1. **Resources:** CPU and powergrid use/capacity.
2. **Slots and hardpoints:** high/mid/low/rig legality, turret and launcher hardpoints.
3. **Skills:** item/ship prerequisites and only skill-derived modifiers whose Dogma chain is resolved.
4. **Mobility:** base/modified speed, mass, signature radius where supported.
5. **Tank:** shield/armor/structure HP, layer resistances, and EHP only when all required inputs are known.
6. **Capacitor:** capacity/recharge and stability only when every contributing cycle/effect is supported.
7. **Weapons:** turret/drone paper DPS, volley, optimal/falloff/tracking; missile paper range/explosion radius/explosion velocity; application must remain separate from paper damage.
8. **Drones:** bay/bandwidth and supported drone damage state.

Not in scope merely because a UI could display it: overheated state, implants/boosters not explicitly supplied, command bursts/fleet effects not explicitly modeled, abyssal/randomized module mutations without resolved attributes, environmental effects not explicitly supplied, hidden/live client state, target pilot skills, transversal/range not supplied by the user/model, or any unsupported Dogma effect.

## Validation contract

`src/lib/fitting/validation.ts` defines the metric vocabulary, bounded coverage areas, primitive current-SDE golden references, and a comparison function that distinguishes **wrong** from **unknown**. A calculator result with a missing expected field fails validation as unknown; it cannot quietly pass because the value was absent.

FIT-02 should add whole-fit golden fixtures incrementally as each subsystem lands. Each fixture must record source/provenance, verified date, relevant SDE build, expected outputs, and tolerances where floating-point behavior requires them. A formula is not considered trustworthy merely because it looks plausible or matches one hand-entered fit.

## Promotion rule

Before FIT-03 exposes an interactive builder, representative golden fixtures must cover at least:

- an empty hull/base-stat case;
- a fit near CPU/powergrid limits;
- turret range/DPS with charge;
- missile range/application primitives with charge;
- drones/bandwidth;
- buffer/resist/EHP behavior;
- active capacitor use/stability;
- at least one stacking-penalized modifier chain;
- at least one skill-modified case.

Any unresolved subsystem remains visibly unsupported/unknown rather than being approximated.
