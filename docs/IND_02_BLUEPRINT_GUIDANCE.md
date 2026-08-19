# IND-02 — Blueprint Acquisition, Research and Copying Guidance

IND-02 adds a player-facing **Blueprint Lab** at `/activities/industry/blueprints`.

## Player questions

- Do I own the original or only copies?
- Can this blueprint actually be researched or copied?
- How far has my BPO already been researched?
- What materials/skills does the current SDE record for its science activities?
- How do copy-job runs and licensed runs per copy differ?
- How do I get the blueprint without NEC inventing a source?

## Evidence model

The selected blueprint's exact science capabilities come from the installed CCP SDE:

- `research_material`
- `research_time`
- `copying`
- activity base time
- activity materials
- activity skills
- blueprint `maxProductionLimit`

ESI-visible character blueprints provide:

- BPO versus BPC state (`runs === -1` for originals, non-negative licensed runs for copies)
- current Material Efficiency
- current Time Efficiency
- remaining BPC licensed runs
- location evidence where resolvable

ESI-visible skills/materials are overlays only. Global ownership of a science-job input is not treated as proof that it is present at the job's selected input location.

## Rules encoded from current CCP support

Reviewed 2026-08-19.

### BPO / BPC

CCP documents that:

- BPOs have unlimited licensed manufacturing runs.
- BPCs have limited licensed runs.
- ME research, TE research and Copying can be performed on BPOs, not BPCs.
- BPCs retain the ME/TE of the original at the time the copy is made; later research on the original does not update existing copies.
- a BPC is destroyed after its last licensed manufacturing run is consumed.

Source: CCP Support — Blueprints and Copying.

### Material Efficiency

- ME research is BPO-only.
- A BPO can receive 10 ME research levels.
- Each level grants 1 percentage point of ME, for a maximum ME of 10.
- Later research levels take progressively longer.
- Some blueprints have additional research material/skill requirements; NEC uses the SDE rows for the selected blueprint instead of assuming none.

Source: CCP Support — Material Efficiency Research.

### Time Efficiency

- TE research is BPO-only.
- A BPO can receive 10 TE research levels.
- Each level grants 2 percentage points of TE, for a maximum TE of 20.
- Later research levels take progressively longer.
- Some blueprints have additional research material/skill requirements; NEC uses the SDE rows for the selected blueprint.

Source: CCP Support — Time Efficiency Research.

### Copy jobs

CCP distinguishes:

- **Job Runs** — number of BPCs produced.
- **Runs per Copy** — licensed production runs placed on each produced BPC.

Copy-job duration is based on the total licensed production runs across all copies. The maximum licensed runs per produced copy is limited by the blueprint Copy activity's production-run limit. IND-02 uses the SDE `maxProductionLimit` as the visible per-copy ceiling when available, but leaves final duration/cost/facility modifiers to EVE's Industry window.

Source: CCP Support — Copying.

## Acquisition boundary

CCP's general blueprint documentation says:

- most Tech I BPOs are obtainable from market sell orders;
- no new Tech II BPOs are made available, so existing Tech II BPOs come from current owners;
- no Tech III BPOs are available;
- BPC sources can include copying, loot drops, invention for Tech II, and Ancient Relic invention for Tech III.

Those are **category-level rules**, not enough evidence to classify an arbitrary selected blueprint. IND-02 therefore does not say “buy this BPO on the market” unless NEC has evidence that the rule applies to that exact blueprint. A missing specific source remains unknown.

The one specific relationship IND-02 may assert from SDE evidence is: if the selected blueprint itself has a `copying` activity, a BPC of that blueprint can be produced by copying a BPO of the same blueprint.

IND-03 handles invention relationships separately.

## Deliberately not claimed

IND-02 does not claim:

- that a specific unowned BPO is NPC-seeded merely because most Tech I BPOs are;
- that a contract or market listing currently exists;
- that a visible facility offers the required science service;
- that the player has hangar roles/access at a private structure;
- an exact research or copy completion time from SDE base time alone;
- that globally owned science materials are at the selected input location;
- that BPC research/copying is possible;
- that an SDE-missing activity is available anyway.

The EVE Industry window remains authoritative for facility availability, final duration, cost, input/output hangars and job installation.

## Current authoritative sources

- CCP Support — Blueprints: https://support.eveonline.com/hc/articles/203269951
- CCP Support — Copying: https://support.eveonline.com/hc/en-us/articles/203210602-Copying
- CCP Support — Material Efficiency Research: https://support.eveonline.com/hc/en-us/articles/203210542-Material-Efficiency-Research
- CCP Support — Time Efficiency Research: https://support.eveonline.com/hc/en-us/articles/203210512-Time-Efficiency-Research
- CCP Support — Activities and Job Types: https://support.eveonline.com/hc/en-us/articles/203210272-Activities-and-Job-Types
- CCP Developers — current SDE: https://developers.eveonline.com/static-data

## Installed-app checkpoint (non-blocking for further implementation)

1. Open **Blueprint Lab** from the dashboard and confirm it does not collide with the Manufacturing shortcut.
2. Search for a BPO/BPC you actually own and compare NEC's BPO/BPC, ME, TE, runs and location with EVE.
3. Search a blueprint you do not own and confirm NEC does not invent a specific BPO source.
4. On an owned BPO below maximum ME/TE, confirm the next action describes research rather than treating the blueprint as finished.
5. On a BPC-only case, confirm NEC clearly says the copy cannot be researched/copied.
6. Try a blueprint with Copying and compare the displayed `maxProductionLimit` with EVE's Runs per Copy limit.
7. Enter multiple copies and runs per copy; confirm NEC distinguishes total copies from total licensed production runs.
8. Compare any SDE-listed research/copy materials and activity skills with EVE.
9. Confirm final facility/duration/cost remains a manual EVE Industry-window verification rather than a fabricated exact result.

This checkpoint is recorded for eventual QA but does not pause subsequent roadmap implementation at the user's direction.
