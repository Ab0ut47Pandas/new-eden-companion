# Fitting Engine Scope and Validation Policy

FIT-01 freezes the first deterministic fitting-engine boundary before FIT-02 implements formulas or FIT-03 exposes a builder UI.

## Authoritative data boundary

NEC treats current CCP static data as the source of truth for primitive item/ship Dogma: `types`, `typeDogma`, `dogmaAttributes`, and `dogmaEffects`. The fitting engine must not infer slot type, fitting cost, range, skill requirements, or modifiers from names/descriptions. Unsupported or unresolved Dogma remains unknown.

Current source checked 2026-08-20:

- CCP Static Data: https://developers.eveonline.com/static-data
- CCP Static Data documentation: https://developers.eveonline.com/docs/services/static-data/
- CCP Dogma glossary: https://developers.eveonline.com/docs/guides/glossary/
- CCP Fitting Simulator: https://support.eveonline.com/hc/en-us/articles/213811305-Fitting-Simulation
- CCP Fitting Window Attributes: https://support.eveonline.com/hc/en-us/articles/203217152-Fitting-Window
- CCP Bonuses and Stacking Penalties: https://support.eveonline.com/hc/en-us/articles/203217282-Ship-Module-and-Skill-Effects

Current CCP SDE build at verification: `3424810`.

Community mirrors/tools may be used only as independent regression cross-checks. The initial primitive golden references are cross-checked against EVE Ref type pages for type IDs 486 and 2889; FIT-02 regression cases additionally pin current-SDE-derived Rifter, small-projectile, light-missile, and light-drone primitives. Whole-fit integration should continue to be compared against current Pyfa and the EVE client fitting simulator before FIT-03 is treated as release-grade.

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

## FIT-02 resolved-Dogma calculator contract

`src/lib/fitting/core.ts` is deliberately a **resolved-Dogma calculator**, not a second unofficial Dogma interpreter. A caller supplies primitive ship/module/charge/drone values and only modifier chains whose semantics have already been established from current Dogma. That separation matters: seeing an attribute value in the SDE does not prove how or where an effect applies.

The core now provides deterministic handling for:

- CPU and powergrid capacity/use plus known overfit checks;
- high/mid/low/rig capacity and turret/launcher hardpoint checks;
- explicit skill prerequisites with `unknown` when character skill state is unavailable;
- base/modified speed, mass, and signature values from resolved multiplicative effects;
- shield/armor/structure HP, four-damage-type resistances, and EHP only from complete evidence;
- capacitor capacity/recharge, average active drain, peak recharge, and equilibrium stability fraction only when active module cycle/cost state is complete;
- turret and missile paper DPS/volley, turret optimal/falloff/tracking, missile paper flight range and explosion primitives;
- drone paper DPS, bay use, bandwidth use, and active-count checks;
- explicit stacking-penalty handling only when Dogma resolution says effects share a stacking group;
- a tri-state overall fit result: `true` only when all modeled legality checks are known and pass, `false` when any known check fails, and `unknown` when unresolved evidence prevents a safe validity claim.

The core intentionally refuses several tempting shortcuts. Missing CPU/PG is not zero. An unresolved slot is not guessed from a module name. Different weapon groups are not collapsed into one fake range when they disagree. Missing active capacitor-cycle data does not become “cap stable.” Target application is not derived without target/range/motion inputs. A modifier flagged as stacking-penalized without a resolved stacking group is rejected as unknown.

### Current stacking behavior

CCP's current support documentation gives the effectiveness sequence for stacking-penalized effects as approximately 100%, 86.9%, 57.1%, 28.3%, and 10.6% for the first five effects, strongest first. FIT-02 uses the established continuous coefficient `exp(-(index / 2.67)^2)`, which reproduces that current sequence. The engine applies it **only** when the caller has resolved that the effects are in the same stacking-penalty group; it never infers stacking from names or similar-looking stats.

### Capacitor behavior

CCP's fitting-window documentation distinguishes average active consumption from peak capacitor recharge and exposes a rough stability percentage. FIT-02 follows that same model boundary: peak recharge is `2.5 * capacity / rechargeTime`, and the equilibrium fraction is solved from the standard capacitor recharge curve. If any active module's capacitor cost or cycle is unresolved, stability remains unknown rather than assuming the missing module is free.

## Validation contract

`src/lib/fitting/validation.ts` defines the metric vocabulary, bounded coverage areas, primitive current-SDE golden references, and a comparison function that distinguishes **wrong** from **unknown**. A calculator result with a missing expected field fails validation as unknown; it cannot quietly pass because the value was absent.

FIT-02 tests add current-SDE-derived cases for:

- an empty Rifter hull and its fitting/base/tank/capacitor values;
- three current 200mm AutoCannon I primitives loaded with EMP S primitives;
- current Light Missile Launcher I plus Scourge Light Missile paper range/application primitives;
- Hobgoblin I drone paper damage and bay/bandwidth checks;
- CPU/slot/hardpoint/drone over-limit failures;
- unresolved fitting cost and skill state;
- stacking-penalized multiplier and resistance chains;
- active capacitor equilibrium;
- heterogeneous weapon groups whose ranges must remain separate/unknown at the aggregate level.

These tests are not permission to treat every Dogma effect as implemented. They validate the deterministic math once the required primitive/effect semantics have been resolved.

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

FIT-02 covers those calculator categories at the resolved-input level. FIT-03 must not imply that arbitrary fitted items are supported until its SDE/Dogma materialization path can resolve the corresponding primitive/effect inputs and the resulting whole-fit snapshots have been checked against current Pyfa/client output.

Any unresolved subsystem remains visibly unsupported/unknown rather than being approximated.