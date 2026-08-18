# “I don’t know what to do” recommender

RDY-06 ranks already-evaluated activity candidates without inventing a hidden universal EVE progression score.

## Buckets

The recommendation board separates candidates into:

- `ready-now` — readiness is `ready`;
- `short-preparation` — not ready now, but sourced activity logic explicitly says the preparation scope is short;
- `longer-goal` — not ready now, and sourced activity logic explicitly says the preparation scope is longer-term;
- `needs-information` — readiness or preparation scope is not known well enough to place the activity honestly;
- `ignore-for-now` — an upstream sourced/goal-sensitive rule explicitly deferred the activity and supplied a reason.

`needs-information` is deliberately present even though the product’s main progression buckets focus on ready/short/long/ignore. Unknown information must not be disguised as a recommendation.

## No automatic demotion of side activities

An activity marked `side` remains eligible for `ready-now`, `short-preparation`, or `longer-goal`. Optional does not mean bad or premature.

`ignore-for-now` requires an explicit `defer` disposition plus a visible explanation. The generic recommender therefore cannot silently decide that PI, industry, PvP, exploration, or another activity is unimportant just because it is optional.

## Preparation scope is explicit

The generic engine does not infer short versus long preparation by counting blockers, skill levels, ISK, or checklist items. A later sourced activity evaluator must provide `short`, `long`, or `unknown` preparation scope.

This avoids fake claims such as treating one difficult skill gap as “short” merely because there is only one finding.

## Transparent ranking within a bucket

Within the same bucket the ordering is deterministic:

1. direct saved/selected goal match;
2. supporting goal relationship;
3. no supplied goal match;
4. primary activity before side activity as a tie-breaker;
5. stable title/ID order.

The output exposes these reasons rather than a numeric score.

## Relationship to readiness

RDY-05 remains the source of the candidate’s readiness explanation. RDY-06 does not reinterpret hard blockers or manufacture a new readiness verdict; it only places the existing explanation on a planning horizon supplied by transparent candidate metadata.

Actual EVE activities, preparation scopes, goal relationships, and defer rules arrive from sourced vertical slices and saved-goal integration. RDY-06 itself contains no EVE-specific progression facts.
