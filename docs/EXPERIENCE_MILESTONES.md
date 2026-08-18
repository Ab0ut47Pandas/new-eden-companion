# Experience milestones

Some readiness questions are about player experience rather than character data. ESI does not prove that a player understood a mechanic, practiced a lower tier, successfully completed a specific learning run, or feels prepared for the next step.

New Eden Companion therefore stores these facts as **explicit local player state**.

## Three states

A milestone requirement can resolve to:

- `met` — the player explicitly confirmed the milestone;
- `unmet` — the player explicitly marked the milestone as `not yet`;
- `unknown` — no local record exists.

The absence of a confirmation is not treated as failure. NEC may simply never have asked the player yet.

## Storage

Milestones are stored per EVE character in the mutable private `data/eve-companion.db` alongside other local progression state such as saved goals. They are not stored in the replaceable CCP static database.

Each record contains:

- character ID;
- stable milestone key;
- player-facing label;
- explicit `confirmed` or `not-yet` state;
- update timestamp;
- confirmation timestamp when confirmed.

The same milestone key may have different states for different characters on the same NEC installation.

## Provenance

Milestone readiness evidence is always marked as `user` evidence. The generic milestone evaluator does not query ESI or infer gameplay history from assets, wallet changes, skills, killmails, or other indirect signals.

This means a later activity can safely ask something like “Have you successfully practiced the lower tier?” without NEC pretending it already knows the answer.

## Clearing a milestone

A local milestone can be cleared. Clearing returns it to `unknown`; it does not create an implicit negative record.

## Activity integration

RDY-03 activity definitions reference milestones by stable `milestoneKey`. RDY-04 supplies the local state and converts it into the evaluated requirement result that RDY-03 then maps into the standard `experience` readiness dimension.

Actual milestone prompts and activity-specific keys belong to sourced activity vertical slices. RDY-04 defines only the private storage/evaluation mechanism and does not invent EVE-specific progression facts.
