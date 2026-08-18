# Readiness model

New Eden Companion treats **technical eligibility** and **readiness** as different questions.

A player can be allowed to enter an activity and still be poorly prepared for it. The reverse also matters: a ship can be otherwise strong and well fit for a broad activity family while a specific site, gate, or activity variant rejects that hull through a hard access rule. NEC must not translate either case into a vague statement such as “this ship cannot do Level 4 missions.”

## Technical eligibility

Technical eligibility answers only whether assessed **hard** requirements permit entry/use.

- `eligible` — every assessed hard requirement is met.
- `blocked` — at least one assessed hard requirement is unmet.
- `unknown` — no hard blocker is known, but at least one assessed hard requirement cannot currently be established.
- `not-assessed` — NEC has not evaluated any hard entry requirements. Absence of a known blocker is not permission.

Soft recommendations never change technical eligibility.

## Standard readiness dimensions

Every readiness snapshot exposes the same ordered dimensions:

1. `skills` — trained hard requirements and meaningful performance recommendations.
2. `ship-fit` — hull/fit entry compatibility and suitability for the intended job.
3. `supplies` — charges, drones, consumables, cargo, tools, and other required run supplies.
4. `isk` — ability to pay the immediate acquisition or entry cost.
5. `replacement-capacity` — ability to absorb a plausible loss while retaining the configured financial reserve.
6. `location-access` — ability to reach and access the relevant site, facility, gate, system, or other location.
7. `experience` — explicit player-confirmed practice or milestones when experience matters.
8. `knowledge-preparation` — briefing, mechanics, failure conditions, and preparation the player should understand before starting.

`isk` and `replacement-capacity` are intentionally separate. Being able to purchase a ship does not establish that losing it is financially sensible.

## Findings

A readiness finding has:

- a stable ID;
- one readiness dimension;
- a requirement kind: `hard`, `soft`, or `context`;
- a state: `met`, `caution`, `unmet`, `unknown`, or `not-applicable`;
- a concise summary;
- a required `why` explanation;
- optional evidence identifying whether the fact came from ESI, the SDE, curated knowledge, explicit user input, or deterministic derived data.

Unknown data stays unknown. NEC must not convert missing ESI visibility, unsupported mechanics, or unverified player experience into a failure or a pass.

## Dimension status

Each dimension aggregates its findings without producing a global readiness percentage:

- `blocked` — a hard requirement in that dimension is unmet.
- `needs-work` — a non-context soft requirement is unmet.
- `unknown` — relevant data remains unknown and no stronger failure is established.
- `caution` — assessed facts warrant a warning but are not unmet requirements.
- `ready` — the assessed relevant findings are met.
- `not-applicable` — the dimension was explicitly assessed as irrelevant.
- `not-assessed` — NEC has not evaluated that dimension yet.

## No overall score yet

RDY-01 deliberately does **not** turn these dimensions into `72% ready`, `ready`, or `not ready`. Weighting blockers, choosing the primary corrective action, and producing an overall explainable recommendation belong to the later readiness explanation engine.

This prevents a single convenient number from hiding the actual distinction the user needs to understand: *what is forbidden, what is missing, what is risky, what is merely recommended, and what NEC simply does not know yet?*
