# New Eden Companion — Goal Experience and Progressive Disclosure

NEC should do the complicated reasoning so the player does not have to read a complicated answer.

The primary goal experience should begin with a player intent such as **“I want to fly this ship”**, **“I want to run this activity”**, **“I want to build this item”**, or **“I want to become self-sufficient at this”**. NEC should evaluate the complete dependency chain in the background, then present only the most useful next action by default.

## One goal, one obvious next step

For a ship goal, NEC should evaluate everything it can establish about the character and the target, including:

- hull skill requirements and current trained levels;
- whether the hull is already owned and where it is located when known;
- a vetted target fit and whether the character can fit/use it;
- which required modules, rigs, charges, drones, consumables, and supplies are already owned;
- missing skills and useful training order;
- blueprint ownership/state when manufacturing is relevant;
- manufacturing skills and prerequisites;
- required materials and intermediate products;
- owned materials/components that can satisfy part of the chain;
- supported acquisition sources for missing blueprints, materials, modules, hulls, or other requirements;
- the selected planning preference such as Independent, Balanced, or Buy-first;
- meaningful blockers or unknowns that prevent NEC from proving readiness.

NEC may calculate a large dependency graph internally, but the default UI must not dump that graph on the player.

The first screen should answer, in roughly this order:

1. **Can I do it now?** A short status such as Ready, Almost ready, Needs preparation, or Needs information, with the reason.
2. **What should I do next?** One concrete action that advances the goal.
3. **What is already handled?** A compact summary of owned/trained/completed coverage.
4. **What remains overall?** A small milestone summary, not the full dependency tree.
5. **Why this step?** A short explanation available inline or on demand.

Example shape, not fixed copy:

> **Goal: Fly [ship] with the recommended solo fit**
>
> **Next:** Train [skill] to III.
>
> You already own the hull and 9/13 required fitting items. After this skill finishes, the next step is sourcing the remaining four items.
>
> `View full path` · `Make/source it myself` · `Why?`

## Progressive disclosure

Detailed information should be available without being forced on the player.

Use progressive disclosure such as compact cards, accordions, drill-down pages, or expandable dependency trees so the player can choose how much detail to see.

Suggested information levels:

- **Now:** the single next action and immediate blocker;
- **Milestones:** a short ordered path such as `train -> obtain hull -> obtain fit -> prepare supplies -> ready`;
- **Details:** exact missing skills/items/materials and ownership coverage;
- **Acquisition:** where each missing item can be obtained using evidence-backed sources;
- **Make it myself:** recursive manufacturing/resource/blueprint/source chain;
- **Full dependency view:** the complete graph for users who explicitly want it.

A beginner should be able to progress without ever opening the full dependency tree. An expert should be able to inspect everything NEC knows.

## Goal plans must be actionable

Each milestone should resolve into concrete actions rather than labels such as “get materials” or “improve skills.” Where the data supports it, NEC should answer things like:

- which skill and level to train next;
- which owned item already satisfies a requirement;
- which exact quantity is still missing;
- whether a missing item can be manufactured;
- which blueprint is required and whether the character owns it;
- where that blueprint or item can be sourced when NEC has a trustworthy acquisition source;
- which raw/intermediate materials remain after consuming owned stock;
- what activity can produce those materials;
- what can be deferred because it is not required for the immediate milestone.

NEC must preserve `unknown` instead of inventing a source or pretending a dependency is resolved.

## Recalculate instead of nagging

The plan should react to the character rather than behave like a static checklist. When refreshed ESI/local state establishes that the player trained a skill, acquired an item, moved a hull, obtained a blueprint, or completed another observable prerequisite, NEC should update the goal and advance the recommended next action automatically where reliable.

Where completion is not observable, NEC may ask for a small explicit confirmation instead of repeatedly presenting the same step.

## Avoid overload as a product rule

More intelligence must not result in more text by default.

- Prefer one recommendation plus a compact reason over a paragraph of alternatives.
- Prefer a 4–6 milestone summary over a 30-item checklist.
- Hide completed requirements unless the player expands them.
- Group repeated material/component requirements instead of displaying duplicates.
- Summarize ownership coverage before listing individual items.
- Put warnings next to the step they affect instead of collecting a giant warning section.
- Show alternatives only when they materially help with a blocker or user preference.
- Let the player explicitly request deeper explanation with `Why?`, `Show details`, `Full path`, or equivalent controls.

The target feeling is: **NEC understands the enormous EVE dependency tree, but gives the player only the piece they need right now.**

## Completion requirement

Before the progression-coach release candidate is considered complete, at least one major user-facing goal flow must demonstrate this progressive-disclosure model end to end: evaluate the character, produce an ordered goal plan, reuse owned resources, expose an independence path, show one obvious next action, and allow the player to drill into the complete reasoning without forcing that detail into the default view. It must pass a real-user usability checkpoint specifically checking whether the player can answer **“What do I do next?”** without reading a wall of text.
