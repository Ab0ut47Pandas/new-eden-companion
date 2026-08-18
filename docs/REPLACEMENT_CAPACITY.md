# Replacement capacity

Replacement capacity answers a different question from purchase affordability.

- **Can purchase:** does the visible liquid wallet cover the immediate acquisition cost?
- **Can afford to lose:** after the immediate purchase and a configured financial reserve, is enough risk budget left to replace the ship/fit/supplies the requested number of times?

New Eden Companion must not infer the second answer from the first.

## Inputs

The deterministic model accepts:

- visible liquid ISK;
- immediate acquisition cost (zero is valid when the relevant exposure is already owned);
- replacement exposure cost for the ship/fit/supplies being risked;
- an optional policy containing an absolute ISK reserve and a minimum replacement count.

The model does not silently invent a reserve or minimum replacement count. If no policy is supplied, it can report immediate purchase ability but leaves loss affordability unjudged.

## Calculation

When all values and a policy are known:

1. `walletAfterPurchase = liquidIsk - acquisitionCostIsk`
2. `riskBudgetAfterPurchase = max(0, walletAfterPurchase - reserveIsk)`
3. `replacementCountAfterPurchase = riskBudgetAfterPurchase / replacementCostIsk`
4. `replacementHeadroomIsk = riskBudgetAfterPurchase - minimumReplacementCount * replacementCostIsk`

The configured replacement policy is satisfied when `replacementHeadroomIsk >= 0`.

The fractional replacement count is retained because it is useful evidence; a separate `fullReplacementsBeforeReserve` value is the floored count of complete replacements.

## Unknowns

Missing wallet data, missing acquisition/replacement cost, or a zero/invalid replacement exposure does not become `0 ISK` or `cannot afford`. The evaluation remains unavailable.

A missing policy is also distinct from failure: NEC knows it can calculate raw purchase information, but it cannot judge whether the user should risk the exposure without a stated policy.

## Readiness integration

The model produces separate findings for:

- `isk` — immediate purchase coverage;
- `replacement-capacity` — post-purchase loss/replacement headroom.

This keeps later readiness explanations able to say, for example, “you can buy this, but doing so would leave less replacement capacity than the selected policy requires,” instead of collapsing both questions into a single affordability badge.
