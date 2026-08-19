# IND-03 — Invention and Reactions

IND-03 adds `/activities/industry/advanced` and extends NEC's acquisition graph with explicit **invention** and **reaction** activity options.

## Evidence model

The installed CCP SDE is the source of truth for a selected activity's:

- activity kind (`invention` or `reaction`);
- source blueprint / Ancient Relic / Reaction Formula type recorded by the SDE;
- base activity time;
- required materials;
- required skills;
- output types and quantities;
- invention output probability where the SDE provides one.

ESI-visible character assets, blueprint instances and trained skills are overlays. They do not change the SDE recipe and they do not prove a facility is accessible.

The acquisition graph now supports separate `invention` and `reaction` options and activity nodes. Invention product edges may carry a probability; reaction output is deterministic and therefore carries no probability. Material leaves preserve source evidence or an explicit unknown terminal rather than inventing how a missing input is obtained.

## Invention rules encoded from current CCP support

Reviewed 2026-08-19.

CCP documents that:

- Invention produces limited-run Tech II BPCs from eligible Tech I BPCs and Tech III BPCs from Ancient Relics.
- Invention is not guaranteed and a completed job can fail with no output.
- Some invention sources can lead to multiple possible output blueprint copies and the desired output is selected in the Industry window.
- Required datacores are consumed regardless of success.
- Tech II invention consumes one licensed production run from the base Tech I BPC for each invention run, regardless of success.
- Tech III invention consumes the Ancient Relic used for the attempt.
- Decryptors are optional for Tech II invention; when used they are consumed and can change success chance and the resulting BPC's ME, TE and licensed runs.
- The EVE Industry window shows the final invention success chance and updates it for the selected optional items.

NEC therefore displays the SDE probability explicitly as **base probability**, never as an expected guaranteed yield. It does not multiply probability by job runs and claim that many copies will be produced.

Sources:

- CCP Support — Invention: https://support.eveonline.com/hc/en-us/articles/203210642-Invention
- CCP Support — Datacores: https://support.eveonline.com/hc/en-us/articles/203210652-Datacores
- CCP Support — Decryptors: https://support.eveonline.com/hc/en-us/articles/203270631-Decryptors
- CCP Support — Ancient Relics: https://support.eveonline.com/hc/en-us/articles/203210662-Ancient-Relics

## Reaction rules encoded from current CCP support

CCP documents that:

- Reactions create intermediate materials used in Tech II, Tech III and combat-booster production.
- A Reaction Formula is used instead of an ordinary blueprint.
- Reaction Formulas cannot be researched, copied or invented.
- Reactions require a Refinery with the appropriate reactor fitted and online.
- Reactors can only be installed in Refineries located in systems with security status 0.4 or lower.
- Biochemical, Composite and Hybrid reactors cover different reaction families.

NEC can use the connected character's current system security as context, but system security alone is **not** enough to establish reaction readiness. Structure type, online reactor, service availability, access roles, input/output hangars, taxes/costs and the actual job installation remain authoritative in EVE.

Source:

- CCP Support — Reactions: https://support.eveonline.com/hc/en-us/articles/115005405785-Reactions

## Current SDE activity representation

The current CCP `blueprints` dataset is imported generically into NEC's `blueprint_activities`, `blueprint_materials`, `blueprint_products`, and `blueprint_skills` tables. IND-03 consumes the current `invention` and `reaction` activity keys directly; recipes are not maintained as hand-written item lists.

CCP SDE source and automation documentation:

- https://developers.eveonline.com/static-data
- https://developers.eveonline.com/docs/services/static-data/

## Player-facing behavior

The **Invention & Reactions** page can search either side of the relationship:

- the source blueprint/relic/formula; or
- an invention/reaction output.

For each SDE-proven path NEC shows:

- source item;
- output quantity;
- base probability for invention only;
- required materials scaled to the requested number of job runs;
- global ESI-visible material quantity as an informational overlay;
- required activity skills versus trained levels;
- source-item visibility where ESI can establish it;
- a concrete next action;
- current-system reaction security context where connected.

Global asset ownership is not treated as proof that materials are staged at the selected industry input location.

## Deliberately not claimed

IND-03 does not claim:

- that an invention attempt will succeed;
- an expected output quantity as if chance-based attempts were deterministic;
- that the SDE base probability is the final character/decryptor-adjusted probability;
- that an owned BPO can be directly consumed in a Tech II invention job where CCP requires a BPC;
- that an Ancient Relic or other source visible somewhere is already staged at the chosen facility;
- that a reaction can run in any station or structure;
- that security status <= 0.4 proves an eligible refinery/reactor exists;
- private-structure access, hangar roles, online service state, taxes, cost, final duration or job installation.

## Installed-app checkpoint (non-blocking for further implementation)

1. Open **Invention & Reactions** from the dashboard and confirm the three Industry shortcuts remain discoverable and non-overlapping.
2. Search a Tech II invention output you recognize; compare the SDE source, datacores, skills, output quantity and base probability with EVE's Industry window.
3. Confirm NEC says invention can fail and does not convert probability × runs into a promised output count.
4. Test a source with multiple invention outputs and confirm alternatives remain separate.
5. Compare a source BPC/relic visibility statement with EVE inventory.
6. Search a known reaction material and compare the Reaction Formula, material quantities, skill and output quantity with EVE.
7. In a system above 0.4 security, confirm NEC warns that the current system is outside CCP's reactor-installation limit without claiming another route/facility is automatically available.
8. In an eligible-security system, confirm NEC still asks for a real refinery/reactor/access check rather than saying the job is ready.
9. Confirm missing acquisition sources appear as unknown terminal evidence instead of a made-up market/drop source.

This checkpoint remains recorded for QA but does not pause subsequent roadmap implementation at the user's direction.
