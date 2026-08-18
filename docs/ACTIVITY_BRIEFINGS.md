# Activity briefing framework

ACT-01 defines the reusable activity-facing contract that later vertical slices use to explain an EVE activity without mixing static guidance, player state, and unsupported live telemetry.

## Standard sections

Every complete briefing is rendered in the same order:

1. What it is
2. Why care
3. Am I ready?
4. What to bring
5. How to start
6. What to do
7. What to loot, keep, or sell
8. Failure conditions
9. What this unlocks next

The static definition must explicitly populate every actionable section. Empty sections are rejected so a missing fact cannot silently look like an intentionally empty answer. When the correct answer is genuinely “none,” the activity adapter should say that explicitly and cite or document the basis when the claim depends on game mechanics.

## Static guidance versus player readiness

`ActivityBriefingDefinition` contains the sourced or otherwise established activity guidance. It does not decide whether the connected character is ready.

`buildActivityBriefing` accepts an optional RDY-05 `ReadinessExplanation`. That keeps the readiness verdict, primary blocker, `why`, and corrective action owned by the readiness engine instead of recreating a second recommendation system in the UI layer.

If no readiness assessment is supplied, the briefing says that readiness is not assessed. It does not interpret missing data as ready or not ready.

## Ordering and explanation rules

Authored `how to start` and `what to do` entries remain in authored order. The briefing framework does not invent a progression sequence from prose or reorder steps by severity.

Entries can be marked as informational, positive, required, recommended, warning, or unknown. These tones are presentation metadata only; they do not change eligibility or readiness calculations.

Optional `why` text is shown directly with an entry so later activity adapters can preserve the evidence/explanation pattern used elsewhere in NEC.

## UI boundary

`ActivityBriefing` is a reusable React component. ACT-01 deliberately does not create an EVE-specific activity page or encode Abyssal, mission, exploration, mining, or other activity facts. Those are added by sourced vertical slices later in the roadmap.

The component is manually viewable guidance. It does not imply that NEC can see the live combat grid, overview, local chat, d-scan, active room state, NPC aggro, player inputs, or other client-only telemetry.

ACT-02 can derive a smaller execution-focused cheat sheet from the same activity content rather than creating a competing activity schema.
