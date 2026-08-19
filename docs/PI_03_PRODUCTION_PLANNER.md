# PI-03 — Planetary Industry production planner

Reviewed against current CCP primary sources on 2026-08-19.

## Authoritative inputs

- CCP EVE Developer Documentation, **Static Data**: the installed JSONL SDE is the authority for static relationships that change with game builds. NEC uses the imported `planetSchematics` relationships already established by PI-01 for schematic cycle time, compatible pin types, inputs, output quantities, and schematic identity.
- CCP EVE Developer Documentation, **Planetary Industry**: the authenticated PI ESI data is a colony snapshot and includes extractor timing/product information used by the existing PI-02 model. Extractor output calculation depends on API values and Dogma data; PI-03 therefore does not turn an extractor pin into a guaranteed future quantity.
- CCP EVE Developer Documentation, **ESI Overview**: authenticated route visibility is governed by the route's declared SSO scope. PI-03 reuses the `esi-planets.manage_planets.v1` access established by PI-02.

## Planner behavior

Given a target commodity and quantity, NEC:

1. resolves the current SDE schematic that produces the target;
2. rounds the requested output up to complete schematic cycles;
3. multiplies every input by those cycles;
4. recursively expands inputs that are themselves outputs of PI schematics;
5. stops at inputs with no PI production schematic, unknown types, recursion depth, or a detected cycle;
6. compares each production step with ESI-visible factories configured for the matching schematic;
7. compares terminal inputs with ESI-visible extractor product types and stored pin contents;
8. emits a compact copyable setup order from terminal inputs toward the requested commodity.

The first deterministic SDE schematic is expanded when more than one schematic outputs a type. Other schematic IDs remain visible as alternatives; NEC does not silently claim they are equivalent.

## Explicit unknown boundaries

A missing PI schematic does **not** prove an input is extractable, purchasable, or available on any particular planet. PI-03 stops and asks the player to confirm the source in EVE rather than inventing a planet/resource mapping.

The planner does not claim to know:

- the in-game resource heatmap or future resource density;
- extractor head placement or guaranteed extractor yield;
- continuous factory supply or routing correctness;
- live production state between ESI snapshots;
- available CPU/powergrid for a proposed colony change;
- link capacity, tax outcome, launch/import cost, or final colony feasibility;
- whether a route, system, planet, or colony is safe.

Those facts remain manual verification steps in EVE.

## Automated coverage

`src/lib/pi/production-plan.test.ts` covers recursive quantity scaling, ESI-visible factory/extractor/stock evidence, explicit source boundaries, and depth protection.

## Installed-app checkpoint for final QA

Before REL-01, manually exercise the planner with a multi-level commodity such as a P2/P3/P4 chain:

- search and select a commodity;
- change goal quantity and confirm upstream quantities scale by complete schematic cycles;
- expand nested inputs and verify the chain is understandable without showing the entire tree at once;
- compare a configured factory/extractor/stock item with what EVE actually shows;
- confirm a missing raw-source relationship is presented as a verification gap rather than a fabricated planet/source;
- copy the setup checklist and confirm its order is actionable;
- re-authorize EVE if PI permissions are absent and confirm the planner does not treat unreadable colonies as missing.
