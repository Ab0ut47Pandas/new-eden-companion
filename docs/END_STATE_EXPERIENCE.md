# New Eden Companion — Focused Beta End-State Experience

This document defines the user-facing outcomes that are mandatory for the focused companion-integration beta described in `docs/FOCUSED_BETA_PLAN.md`.

The beta is intentionally narrower than the older progression-coach release plan. The priority is not to add more EVE categories; it is to make the systems NEC already has compose into one trustworthy answer to:

> **What should I do right now?**

## Suggested Session

NEC must offer a user-facing **Suggested Session** that composes a short, explainable plan for what the connected character can realistically do right now.

The plan must:

- use current character/readiness evidence rather than generic popularity;
- consider supported evidence from skills/training, current ship/fit, owned assets/supplies, wallet/market, location, and existing readiness engines;
- respect user-selected session length and risk posture when supplied;
- present one primary recommendation plus a small number of alternatives;
- show one concrete next action rather than an undifferentiated activity list;
- explain why the recommendation fits the character;
- surface preparation or blockers when the best option is not immediately runnable;
- preserve unknowns when ESI or NEC knowledge cannot establish a fact;
- never imply that NEC can see live gameplay or prove completion when it cannot;
- never invent safety, profitability, DPS, success chance, or readiness percentages.

Unknown required evidence must not be silently treated as ready. A potentially useful option may still be shown as **Cannot verify** when NEC can explain what information is missing and how the player can resolve it.

## Suggest Something Different

The focused beta must let the player ask for a different plausible recommendation without pretending NEC knows their complete play history.

It should:

- use explicit goals, local feedback, and current readiness where available;
- avoid simply returning the same activity under a different label;
- respect readiness/acquisition constraints;
- explain why the alternative is plausible;
- allow local feedback such as tried, not interested, or similar lightweight preference state.

## Adventure-first onboarding

A new or directionless player must not be required to understand EVE fleet roles or career taxonomies before NEC becomes useful.

First-run intent selection should support plain-language choices such as:

- fight someone;
- explore;
- explore somewhere dangerous;
- mine or gather resources;
- build something;
- haul or trade;
- make ISK;
- play with a friend;
- show me something;
- give me an adventure.

NEC may translate these into activities/ships internally, but the user-facing starting point should be an achievable experience rather than a specialist role.

For two inexperienced friends, NEC must not assume one of them is the fleet leader. Prefer shared objectives and simple/symmetrical responsibilities when possible.

If current ESI cannot establish AIR Career Program or Career Agent completion, that status remains user-confirmed/local. Skills, ships, assets, or wallet state can inform capability but are never proof that AIR/tutorial content was completed.

## Goal → Acquire → Fit → Preflight

The focused beta must compose existing NEC systems into a coherent goal workflow rather than requiring the player to manually glue together separate tools.

A selected activity, ship, fitting, or skill goal should:

- reuse already-owned ships, modules, rigs, charges, drones, materials, supplies, blueprints, and trained skills first;
- identify the uncovered remainder;
- expose supported buy/build/haul/substitute/source options for missing requirements;
- preserve explicit non-manufacturable, LP, loot, salvage, PI, reaction, exploration, NPC-seeded, and unknown boundaries when evidence establishes them;
- distinguish the shortest usable training milestone from optional optimization skills;
- retain the parent reason for every inserted chore or prerequisite;
- show one next action plus a compact milestone path by default;
- reveal deeper dependency detail on demand.

The end-to-end path must reach a preflight state that checks supported activity supplies and fit requirements.

The final wording should use language such as **Preflight complete** or **No known blockers**, never `safe to undock` and never a guarantee of safety.

## Honest uncertainty

Meaningful recommendation and preflight states must distinguish at least:

- **Ready**
- **Probably ready**
- **Missing requirements**
- **Cannot verify**
- **Live information unavailable**

Where possible, NEC should tell the player what action would resolve the uncertainty.

## Focused-beta manual checkpoint

Before the focused beta release is complete, the installed application must be manually exercised through at least:

1. `Connect or demo → Suggested Session`;
2. choosing the primary recommendation and viewing `Why this?`;
3. requesting a different recommendation;
4. selecting a goal;
5. reusing at least one already-owned requirement;
6. resolving at least one missing requirement through an evidence-backed acquisition path that is not simply `buy it`;
7. fitting/assembly guidance where applicable;
8. final preflight with fatal blockers separated from improvements;
9. a degraded/unknown-data case that remains honest and actionable;
10. persistence across restart for relevant local preferences/goal state;
11. a usability pass by someone genuinely new to EVE/NEC.

Automated tests and CI are necessary but not sufficient for judging whether this composed workflow is understandable.

## Explicitly deferred until after the focused beta

The following remain worthwhile product directions, but they do **not** block the focused companion-integration beta:

- NEC Campaigns;
- Story Guide;
- Epic Arc expansion;
- additional activity categories;
- large visual redesigns;
- other unrelated feature-growth work from the legacy roadmap.

These should resume only after focused-beta player feedback has been collected.
