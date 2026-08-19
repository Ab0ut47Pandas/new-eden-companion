# New Eden Companion — Goal Experience Requirements

These are mandatory first-release requirements and must be represented by explicit roadmap work before `REL-01`.

## Owned-part-aware planning

Goal and fitting plans must prefer already-owned ships, modules, materials, blueprints, and trained skills before proposing new acquisition. Unknown or inaccessible ownership stays explicit rather than being treated as missing.

## Recursive self-sufficiency planning

A goal plan behaves as a dependency planner, not a static checklist. When a parent goal requires a capability the character lacks, NEC inserts that prerequisite as a child goal and expands only until it reaches an actionable next step. Examples include obtaining a suitable mining ship before mining required materials, obtaining a combat ship before pursuing an evidence-backed combat prerequisite, acquiring a missing blueprint, or obtaining enough hauling capability for a planned movement step.

Every inserted subgoal must retain its parent-child reason. Completed or unnecessary branches collapse. NEC must not invent blueprints, manufacturability, standings requirements, or acquisition paths.

## Goal-first progressive disclosure

NEC may evaluate a large graph internally, but the default experience shows:

- one obvious next action;
- a compact readiness and ownership summary;
- a short path of roughly 4–6 milestones.

Exact missing skills/items, blueprint/material acquisition, deeper self-sufficiency recursion, warnings, and the full dependency graph appear on demand. The user should not have to stare at the entire dependency tree merely because NEC can calculate it.

## Manual checkpoint

Before `REL-01`, the installed app must be manually tested with a goal that actually triggers ownership-aware and recursive prerequisite behavior, including persistence across restart where local plan state is involved.
