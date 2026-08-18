# Acquisition source provenance

New Eden Companion distinguishes two different questions:

1. **Can this item be produced by an ordinary manufacturing blueprint?**
2. **If not, what sourced acquisition path is actually known?**

A missing manufacturing blueprint is not evidence that an item is loot, LP-store, NPC-seeded, exploration, PI, salvage, or market-only. NEC therefore preserves `unknown` until a source relationship has evidence.

## Source taxonomy

The acquisition layer can represent:

- NPC-seeded
- loot/drop
- loyalty-points / faction source
- exploration
- planetary industry
- reaction
- salvage
- market
- other explicitly described sources

These are categories, not automatic claims about every item.

## Evidence rules

Known sources come from one of two paths:

- **SDE evidence:** a relationship present in the installed CCP Static Data Export. Non-manufacturing products recorded in the SDE `blueprints` dataset retain the activity name and SDE build as evidence. A `reaction` activity is classified as a reaction; unknown activity names remain `other` instead of being guessed.
- **Curated evidence:** an item/source record supplied with a non-empty authority, title, and absolute HTTP(S) source URL. Curated records without evidence are rejected.

The current CCP SDE distribution and automation documentation is maintained at:

- https://developers.eveonline.com/static-data
- https://developers.eveonline.com/docs/services/static-data/

Future activity-specific work can add validated item/source records as those relationships are established. For example, PI production relationships are intentionally deferred to the PI static-data task rather than inferred from item names or categories.

## Recursive manufacturing behavior

When recursive manufacturing reaches an item with no ordinary manufacturing blueprint, the leaf remains `not-manufacturable` and includes a `sourceResolution`:

- `manufacturingBoundary: no-ordinary-blueprint`
- `sourceState: known` with evidence-backed alternatives, or
- `sourceState: unknown` with an empty source list

Cycle and depth-limit stops are traversal limits rather than acquisition claims, so they do not fabricate a source resolution.
