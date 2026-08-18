# Abyssal tier progression readiness

ABY-05 makes tier advancement a multi-factor readiness decision rather than treating possession of a higher-tier filament as permission to use it.

## Separate readiness dimensions

For a selected Abyssal tier, NEC evaluates distinct findings for:

- **Entry format** — a hard technical eligibility check that the selected hull/trace format is actually permitted.
- **Fit suitability** — whether the selected fit has been validated for the requested tier/weather.
- **Skills** — whether the selected fit's required skills and meaningful support-skill floor have been evaluated as ready.
- **Supplies** — whether the selected fit's required filaments, ammunition, drones, and consumables are available.
- **Replacement capacity** — whether the character can absorb the selected ship exposure under the configured reserve/replacement policy.
- **Experience** — for T1 and above, whether the player explicitly confirmed the immediately preceding tier's experience milestone.
- **Filament availability** — contextual evidence only. It never satisfies the other readiness dimensions.

Only entry-format validity is a hard technical eligibility requirement. Performance/preparation dimensions remain soft: NEC can say an activity is technically enterable while still saying it is not a sensible progression step yet.

## Explicit prior-tier experience

For target tier `Tn` where `n > 0`, the required local milestone key is:

`abyssal:t(n-1):comfortable-clear`

The user-facing milestone means:

> Comfortable completing the preceding tier with time margin and understood room flow.

This is deliberately user-confirmed local state. NEC does not infer it from ESI, filament ownership, loot, wallet activity, killmails, or the mere existence of a higher-tier fit.

Absence of the exact preceding-tier milestone remains `unknown`; an explicit `not-yet` state becomes a preparation gap. A milestone for a different tier cannot satisfy the requirement.

T0 has no lower-tier experience requirement.

## Filament ownership is not readiness

The filament finding is a `context` finding. A T2 filament in cargo can establish that the item exists and may contribute to the separate supplies assessment, but it cannot turn unknown fit, skills, replacement capacity, or T1 experience into passes.

The selected run only becomes `ready` when the hard entry check is met and all evaluated applicable preparation dimensions are met. Unknown information stays unknown, and unmet soft preparation becomes `nearly-ready` rather than a fabricated hard prohibition.

## Replacement capacity

Abyssal losses can be total, so ABY-05 preserves RDY-02's separation between `can buy` and `can afford to lose`. The tier-readiness model receives replacement-capacity state as its own evidence; it does not derive a loss budget from filament ownership or ship price alone.

## Integration boundary

ABY-05 is the pure readiness policy layer. ABY-06 connects the existing vetted Abyssal fit catalog to these inputs and preserves each fit's validated tier/weather limits. Character-specific adapters can then feed trained skills, owned supplies, local experience milestones, and replacement policy into the same model without duplicating the recommendation rules.
