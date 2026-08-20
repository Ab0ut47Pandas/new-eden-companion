# BETA-02 — Unified Suggested Session service

BETA-02 introduces `src/lib/session/suggested-session.ts` as the single composition boundary for the focused beta's answer to **What should I do right now?**

## Evidence contract

The service does not fetch EVE data or invent game state. Callers provide normalized, provenance-bearing evidence from NEC's existing systems. The supported evidence categories are:

- trained skills;
- visible training queue;
- current ship;
- current fit;
- owned ships;
- owned modules/equipment;
- ESI-visible cargo/supplies;
- wallet;
- market data;
- current location;
- supported nearby-risk evidence;
- existing activity-readiness evaluators.

CCP's current SSO documentation was rechecked on 2026-08-20. Private character information such as location, skill queue, and wallet is available to a third-party application only when the player grants the relevant SSO permission. Therefore absence/unavailability is represented explicitly and is never interpreted as a positive readiness fact.

CCP's current ESI overview was also rechecked on 2026-08-20. ESI is the official third-party REST API, authenticated routes declare required scopes, and callers must treat API availability/caching as a data boundary rather than live client telemetry.

Current CCP developer documentation also records the five-minute cache/rate-limit behavior of regional market orders. The Suggested Session service consequently accepts market availability/provenance from the existing market layer instead of treating a missing response as a zero price, empty market, or proof that an activity is affordable/profitable.

## Ranking behavior

The service returns:

- one primary recommendation when candidates exist;
- at most two alternatives;
- the complete deterministic ranking for downstream UI controls.

Ranking is deliberately qualitative. It prioritizes verified readiness state, then explicit goal relevance, then user-selected session-length and risk preferences. There is no readiness percentage, success probability, profitability score, DPS estimate, or safety score.

A candidate declares which evidence categories it actually requires. Missing required evidence forces **Cannot verify**; explicitly unavailable required live evidence forces **Live information unavailable**. Neither state may be silently promoted to Ready merely because the activity seems plausible.

## Owned-ship behavior

Candidates may provide multiple ship choices only when an existing NEC evaluator supports their suitability. Within that supported set the service prefers an owned, accessible hull. Unknown ownership/accessibility remains unknown and does not become an ownership claim.

## BETA-03 handoff

BETA-03 should assemble real/demo candidates from the existing activity/readiness services, normalize their ESI/SDE/market coverage into this contract, and make the resulting primary plus two alternatives the homepage's main answer. It should not recreate recommendation sorting in the React layer.

## Explicit non-claims

This service does not establish or infer:

- live client state;
- route or activity safety;
- expected profit;
- combat outcome or success chance;
- arbitrary fitting validity;
- unobserved cargo, assets, facility access, or market state;
- AIR/Career completion;
- activity completion.

Those facts remain unknown unless another supported NEC subsystem supplies evidence for them.
