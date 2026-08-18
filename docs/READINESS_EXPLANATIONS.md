# Readiness explanations

RDY-05 turns a validated `ReadinessSnapshot` into a concise recommendation without hiding the underlying requirements.

## Recommendation states

- `ready` — hard technical eligibility was assessed and met, and every other relevant assessed requirement is known and met.
- `nearly-ready` — technical entry is allowed, but a soft preparation gap or caution remains.
- `not-recommended` — at least one hard requirement is unmet. This can mean a site/gate restriction, missing hard skill, inaccessible location, or another explicit hard rule; it does not automatically generalize beyond the activity definition that supplied the requirement.
- `unknown` — a hard requirement is unknown/not assessed, or another relevant requirement remains unknown. NEC does not manufacture confidence from missing data.

There is no percentage score.

## Hard blockers versus soft gaps

The explanation keeps separate collections for:

- `blockers` — unmet hard requirements;
- `gaps` — unmet soft requirements;
- `warnings` — caution findings;
- `unknowns` — unresolved findings;
- `satisfied` — met findings.

This lets the UI say “this exact site rejects your hull” without presenting a soft recommendation such as “practice a lower tier first” as though it were another game-enforced restriction.

## Primary issue

When multiple issues exist, NEC selects the first issue using deterministic priority:

1. unmet hard requirement;
2. unknown hard requirement;
3. unmet soft requirement;
4. other unknown requirement;
5. caution.

Within the same priority, the stable RDY-01 finding order is preserved.

The selected finding remains attached to the explanation, including its `why` text and evidence.

## Next action

Callers may supply an explicit action hint keyed by finding ID, for example `Switch to a hull allowed by this specific site.`

When no action hint exists, NEC generates only a mechanical fallback:

- unmet → `Resolve: ...`
- unknown → `Verify: ...`
- caution → `Review: ...`

Activity-specific corrective advice must come from sourced activity logic rather than this generic layer.

## Conservative readiness

A technically eligible activity is not declared ready while relevant data remains unknown. Likewise, if no hard entry requirements were assessed, NEC returns `unknown` rather than assuming that the absence of a blocker means the activity is allowed.

This keeps the explanation engine aligned with the core product rule: distinguish what the game forbids, what the player should prepare, what is financially risky, and what NEC simply does not know.
