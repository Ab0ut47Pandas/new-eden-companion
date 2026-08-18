# Abyssal knowledge model

ABY-01 establishes the sourced, current mechanics vocabulary that later Abyssal briefings and readiness rules consume. It deliberately contains only mechanics supported by CCP material verified on 2026-08-18.

## Difficulty tiers

The model uses the current seven-tier sequence:

| Tier | Filament prefix |
| --- | --- |
| T0 | Tranquil |
| T1 | Calm |
| T2 | Agitated |
| T3 | Fierce |
| T4 | Raging |
| T5 | Chaotic |
| T6 | Cataclysmic |

CCP's current Abyssal Deadspace help article identifies T0 as the easiest and T6 as the most difficult. The 18.09 patch notes document the addition of Tranquil T0 and Cataclysmic T6.

## Weather families

Every filament combines a tier with one of five weather families. The environment effects apply to ships inside the Abyss, so the briefing must explain both the penalty and the bonus rather than treating the resistance hole as the only relevant fact.

| Weather | Environment | Penalty | Bonus | Why it matters |
| --- | --- | --- | --- | --- |
| Dark | Dark Matter Field | Reduced weapon ranges | Increased ship velocity | Range control and application assumptions change while ships move faster. |
| Electrical | Electrical Storm | Reduced EM resistance | Increased capacitor recharge | EM damage benefits from the resistance penalty while capacitor-dependent ships gain recharge. |
| Exotic | Exotic Particle Storm | Reduced kinetic resistance | Increased scan resolution | Kinetic damage benefits from the resistance penalty and affected ships lock targets faster. |
| Firestorm | Plasma Firestorm | Reduced thermal resistance | Increased armor strength | Thermal damage benefits from the resistance penalty while armor-heavy ships gain durability. |
| Gamma | Gamma-Ray Afterglow | Reduced explosive resistance | Increased shield strength | Explosive damage benefits from the resistance penalty while shield-heavy ships gain durability. |

ABY-01 intentionally does not encode a universal best/worst weather or exact numeric weather strength. Those claims are fit-, tier-, and mechanics-sensitive and should only be added when they can be validated from an authoritative current source or deterministic game data.

## Entry formats and filament consumption

The supported entry shapes are modeled explicitly:

- one cruiser using one filament;
- a cooperative trace for up to two destroyers using two matching filaments;
- a cooperative trace for up to three frigates using three matching filaments.

For cooperative entry, the filaments must match in type/weather and tier. The model records the maximum ships and filament cost separately so later supply/readiness checks can calculate what the selected entry format actually requires.

## Filament acquisition

ABY-02 routes Abyssal filament sourcing through the same evidence-backed acquisition boundary used by the Item Explorer.

- All tiers may be obtained from other capsuleers through the player market.
- Tranquil (T0) filaments have CCP-documented exploration-site and T0/T1 Abyssal sources.
- Calm (T1) filaments are documented in Data Sites across New Eden and within the Abyss.
- Agitated through Chaotic (T2-T5) are treated as Abyssal Deadspace drops; no exploration source is invented for them.
- Cataclysmic (T6) filaments are specifically documented as obtainable from T5 Abyssal Deadspace.

The source adapter does not claim that an Abyssal filament has an ordinary manufacturing blueprint. Instead, the current SDE-backed acquisition layer determines the manufacturing boundary for the resolved filament type. This keeps `no ordinary blueprint` separate from `unknown type` and will surface a future data change rather than hiding it behind a hardcoded assumption.

## Other consumables

Abyssal fits may also require ammunition, drones, repair paste, boosters, cap charges, or other supplies. ABY-02 does not invent a universal consumable list before a fit/activity definition supplies one. Each required item is resolved through the existing acquisition graph using its actual type ID and optional sourced curation.

That means a normal item with a manufacturing blueprint remains visibly manufacturable, a documented non-manufacturing source remains visible with provenance, and a source NEC cannot establish remains `unknown` rather than being silently rewritten as `buy it on the market`.

## Sources verified 2026-08-18

- CCP Help Center — `https://support.eveonline.com/hc/en-us/articles/360000852629-Abyssal-Deadspace` — current tier names, five weather families/effects, current cruiser/frigate/destroyer entry formats, Calm/Data Site/Abyss sourcing, and market availability.
- CCP patch notes 18.09 — `https://www.eveonline.com/news/view/patch-notes-for-version-18-09` — Tranquil T0, Cataclysmic T6, T0 exploration/T0-T1 Abyss sources, T6-from-T5 source, and two-destroyer/two-filament entry.
- CCP Onslaught patch notes — `https://www.eveonline.com/news/view/patch-notes-for-eve-online-onslaught` — three-frigate cooperative entry using three matching filaments.

## Boundary for later roadmap items

ABY-03 will consume this knowledge to build a first-run T0/T1 briefing with a concrete selected fit and supplies. ABY-04 handles Abyssal loot interpretation. ABY-05 feeds sourced Abyssal requirements into the existing readiness engine. ABY-06 connects the vetted fit library and its validated tier limits.
