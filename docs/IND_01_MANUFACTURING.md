# IND-01 — Manufacturing Planner

IND-01 turns NEC's existing SDE acquisition graph and player overlays into a first-class, player-facing manufacturing workflow.

## Player question

> I want to build this item or ship. What do I already have, what is missing, and what do I need to do next?

The planner is available at `/activities/industry/manufacturing` and from the dashboard **Manufacturing** shortcut.

## What IND-01 establishes

For an ordinary manufacturing product selected from the installed CCP SDE, NEC can:

- identify the manufacturing blueprint alternative(s), output quantity, base time, materials and activity skills;
- read ESI-visible BPO/BPC ownership and licensed BPC runs;
- allocate a requested job across a BPO, one BPC, or multiple BPCs at the selected input location;
- use the allocated owned blueprint's Material Efficiency for the planning material quantity when that allocation is established;
- compare required materials with quantities at the selected input location and with quantities owned elsewhere;
- distinguish `ready here`, `move from elsewhere`, `acquire`, and `unknown` material state;
- compare required manufacturing skills with the connected character's trained levels;
- show visible active/paused industry-job context;
- ask the player to explicitly confirm whether the selected location offers the Manufacturing service;
- return one concrete next action before showing lower-priority details.

## Location rule

Owning enough material globally is **not** treated as manufacturing readiness. CCP requires the blueprint and job materials to be available at the job's input location. NEC therefore keeps:

- quantity at the selected input location;
- quantity elsewhere in ESI-visible assets; and
- quantity genuinely missing

as separate states.

Blueprint location follows the containing asset hierarchy when ESI-visible containers are available. If NEC cannot establish a reliable root location, it preserves that uncertainty instead of guessing.

## Material math boundary

CCP documents that Material Efficiency is applied to the whole manufacturing job and the resulting material quantity is rounded up. One-unit-per-run components are not reduced below one per production run.

IND-01 applies the owned blueprint's ME only when NEC can allocate the requested runs to usable blueprint instances at the selected location. If it cannot, it falls back to the SDE base requirement and labels that basis explicitly.

The in-game Industry window remains authoritative for final job material requirements because structure/rig modifiers and the actual selected facility can change the result.

## Deliberately not claimed

IND-01 does **not** claim that:

- every station or private structure visible through ESI offers Manufacturing;
- a player has the required hangar roles/access at a structure;
- the displayed material plan includes every facility/rig modifier;
- NEC knows the final installation cost before the actual facility/job configuration is selected;
- an ESI-visible blueprint/material somewhere in New Eden is usable at the selected input location;
- a plan has been installed, completed, or delivered in EVE.

NEC does not install or deliver industry jobs through ESI.

## Current authoritative mechanics sources

Reviewed 2026-08-19:

- CCP Support — Manufacturing: https://support.eveonline.com/hc/en-us/articles/203210292-Manufacturing
- CCP Support — Activities and Job Types: https://support.eveonline.com/hc/en-us/articles/203210272-Activities-and-Job-Types
- CCP Support — Blueprints: https://support.eveonline.com/hc/articles/203269951
- CCP Support — Industry User Interface: https://support.eveonline.com/hc/en-us/articles/203270121-Industry-User-Interface
- CCP Support — Material Efficiency Research: https://support.eveonline.com/hc/en-us/articles/203210542-Material-Efficiency-Research

## Installed-app checkpoint

Before treating the slice as player-validated, exercise at least:

1. Search for a simple T1 product or ship and open its manufacturing plan.
2. Change the run count and confirm output/material quantities recalculate sensibly.
3. Test a product whose blueprint is owned and confirm BPO/BPC state matches EVE.
4. If a BPC is used, confirm licensed-run handling matches the copy visible in EVE.
5. Compare at least one material's `at input`, `anywhere visible`, and required quantities with EVE inventory.
6. Move/select a different candidate input location and confirm NEC does not count material elsewhere as ready at that location.
7. Compare required activity skills with the character sheet/Industry window.
8. Mark facility availability `yes`, `no`, and `unknown` and confirm the next action changes appropriately.
9. Confirm the final screen tells the player to verify final materials/job cost in EVE rather than claiming the job can be installed automatically.
10. Return to the dashboard and confirm the Manufacturing shortcut is obvious and does not collide with the other shortcuts at the screen size being tested.
