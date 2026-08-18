# Abyssal loot teaching

ABY-04 teaches a beginner where Abyssal loot actually comes from and how to reason about it without turning every drop into an automatic sell recommendation.

## Where the loot is

Abyssal combat NPCs do not leave ordinary loot/salvage wrecks or bounties. The loot workflow is container-driven:

- **Triglavian Bioadaptive Cache** — the main loot container in each pocket and the source to prioritize when time is limited.
- **Triglavian Extraction Node** — optional side loot from T1 upward.
- **Triglavian Extraction SubNode** — optional side loot from T1 upward and not guaranteed to contain loot.

Current EVE University documentation says T0 does not contain Extraction Nodes/SubNodes. The guide therefore shows only the Bioadaptive Cache for T0 and adds side containers from T1 upward.

The side containers are explicitly framed as optional because the 20-minute site timer remains the primary constraint. NEC does not encourage crossing a room for bonus loot when doing so creates a timer failure risk.

## Major loot families

The teaching model uses broad families rather than pretending to know the future value of every possible drop:

- **Triglavian Survey Database (red loot)** — known NPC cash-out path.
- **Abyssal filaments** — future-run supply or player-market item depending on goals.
- **Mutaplasmids** — mutation input; potentially useful or valuable and never auto-liquidated merely because it is unfamiliar.
- **Blueprint copies** — industry path or player-market candidate depending on the blueprint and the player's goals.
- **Abyssal production materials** — includes items such as Crystalline Isogen-10 and Zero-Point Condensate; keep required quantities for industry goals before treating any remainder as surplus.
- **Modules / usable drops** — check against vetted fits and saved goals first.
- **Other / unclassified** — remains unknown until NEC has evidence.

## Red-loot cash-out

`Triglavian Survey Database` is type ID `48121`. Current CCP reference data mirrored by EVE Ref lists a 100,000 ISK base price, and current long-duration NPC buy orders are still posted at 100,000 ISK per unit.

NEC therefore has explicit sale evidence for this one known cash-out item and can classify it as `sell` when no stronger goal evidence exists. The ACT-03 precedence rules still apply: an active goal with an immediate use produces `use-next`, and goal relevance without an immediate action produces `keep` before the generic cash-out path is considered.

The guide warns against selling Survey Databases into a lower player buy order without checking the order price. The point of red loot is the known cash-out path, not merely "sell wherever the market window happens to open."

## Why other loot is not auto-sold

Filaments, mutaplasmids, BPCs, materials, and modules can be useful to fits, saved goals, manufacturing paths, or future runs. Their player-market value is also dynamic. ABY-04 therefore teaches the decision without fabricating a live value:

1. use it now when an active goal has an established next action;
2. keep it when a goal establishes relevance but not an immediate action;
3. sell only when an explicit sale/value adapter supplies enough evidence;
4. otherwise preserve `unknown`.

ECO-01/ECO-02 later add broader asset usefulness and current market valuation. Until then, unknown is preferable to confidently trashing something useful.

## Sources verified 2026-08-18

- EVE University — `https://wiki.eveuniversity.org/Abyssal_Deadspace` — no normal NPC wreck loot, main Bioadaptive Cache, Extraction Nodes/SubNodes, reward families, Survey Database cash-out.
- EVE University — `https://wiki.eveuniversity.org/Possible_rooms_in_Abyssal_Deadspace` — T0 side-node absence and current container behavior.
- EVE Ref / CCP reference data — `https://everef.net/types/47951` — Bioadaptive Cache identity and description.
- EVE Ref / CCP reference data — `https://everef.net/types/48121` — Survey Database type ID and 100,000 ISK base price.
- Current market order mirror checked 2026-08-18 — 365-day CONCORD/DED NPC buy orders at 100,000 ISK per Survey Database, with 999,999-unit order sizes after CCP's 2026 NPC-order increase.
- CCP patch notes 23.02 — CCP increased the number of NPC buy orders for Triglavian Survey Database commodities in March 2026.
