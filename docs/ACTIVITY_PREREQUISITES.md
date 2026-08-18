# Activity prerequisite graph

Activities declare requirements as data and translate evaluated results into the standard readiness model. This prevents each activity page from inventing its own meanings for `required`, `recommended`, `unknown`, and `ready`.

## Activity role

An activity is either:

- `primary` — suitable to participate in normal progression/recommendation ranking;
- `side` — deliberately optional. Being available does not mean NEC should prioritize it over stronger current goals.

The role is metadata, not a readiness verdict.

## Requirement strength

Each requirement is either:

- `hard` — failure affects technical eligibility;
- `soft` — failure affects preparation/readiness but does not claim the game forbids entry.

This distinction is especially important for ship restrictions. A hard site/gate hull rule is not the same claim as “this hull is generally bad for this family of activities.”

## Requirement kinds

The graph supports typed requirements for:

- skills;
- ship constraints;
- supplies;
- immediate ISK;
- replacement-capacity policy;
- location/access;
- explicit player milestones;
- knowledge/preparation;
- prerequisite activities.

Each kind maps to one RDY-01 dimension. Activity-specific code later evaluates whether the requirement is `met`, `unmet`, `caution`, `unknown`, or `not-applicable` and may attach evidence.

If an evaluator omits a requirement result, NEC produces an `unknown` finding. Missing evaluation is never an implicit pass.

## Ship constraints

Ship constraints are serializable data. They can declare allowed type IDs, allowed group IDs, denied type IDs, or a named deterministic constraint that a later evaluator understands. An empty “trust me” ship restriction is rejected by validation.

This makes it possible for a future sourced activity definition to represent a site-specific hull gate independently from the broader question of whether the same ship is a good general mission hull.

## Prerequisite activities and cycles

Activities may reference earlier activities as hard or soft prerequisites. The graph validates every reference, rejects cycles, and returns transitive prerequisites in dependency order.

A prerequisite activity reference is not proof that the user completed it. Completion/practice is local player state handled by experience milestones in RDY-04.

## No game facts in the generic graph

RDY-03 defines the structure and validation rules only. It does not hardcode mission, Abyssal, mining, PI, or other EVE-specific requirements. Those arrive in sourced vertical slices and must preserve evidence/unknowns according to the roadmap.
