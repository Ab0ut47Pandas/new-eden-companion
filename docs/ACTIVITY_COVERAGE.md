# New Eden Companion — EVE Activity Coverage Audit

Last reviewed: 2026-08-19

This document compares major repeatable or officially recognized EVE Online activities with NEC's current roadmap. EVE is an open-ended sandbox, so no finite list can capture every emergent player behavior (diplomacy, espionage, scams, social events, custom fleet doctrines, roleplay, etc.). The goal here is to cover the major gameplay loops, professions, structured content, and organizational activities a player can deliberately choose to pursue.

Primary current sources:

- EVE Academy careers: https://www.eveonline.com/eve-academy/careers
- AIR Career Program / Opportunities: https://www.eveonline.com/eve-academy/air-career-program
- Cradle of War / Military Campaigns: https://www.eveonline.com/news/view/the-cradle-of-war-expansion-is-here
- Faction Warfare: https://support.eveonline.com/hc/en-us/articles/203209072-Factional-Warfare
- Pirate Insurgencies: https://support.eveonline.com/hc/en-us/articles/11159823457052-Pirate-Insurgencies-and-Aligning-with-Pirates
- Homefront Operations: https://support.eveonline.com/hc/en-us/articles/9188830559004-Homefront-Operations
- Courier Contracts: https://support.eveonline.com/hc/en-us/articles/203218982-Courier-Contracts
- Corporation Projects: https://support.eveonline.com/hc/en-us/articles/9583433729308-Corporation-Projects
- Freelance Jobs ESI: https://developers.eveonline.com/blog/introducing-freelance-jobs
- Project Discovery: https://www.eveonline.com/discovery

Status vocabulary:

- `DONE`: a meaningful NEC vertical slice or dedicated capability already exists.
- `ROADMAP`: explicitly represented by a roadmap checkbox.
- `SUPPORTING`: NEC has useful underlying logic, but the activity is not yet a first-class guided activity.
- `GAP`: no dedicated roadmap coverage yet.
- `LATER`: suitable for post-release expansion unless product scope changes.

## Resource gathering and industry

| Activity | NEC status | Notes |
| --- | --- | --- |
| Asteroid ore mining | ROADMAP | `MIN-01`; should include goal relevance, ship/fit readiness, supplies and processing. |
| Ice mining | SUPPORTING | Mining exists, but ice should be explicit within mining coverage. |
| Gas harvesting | SUPPORTING | Acquisition/manufacturing graph can represent gas; mining guidance should explicitly cover gas ships/modules/risk. |
| Moon mining | SUPPORTING | Resource source can be represented, but no dedicated player guidance yet. |
| Mercoxit / deep-core mining | SUPPORTING | Specialist mining variant; likely an expansion of `MIN-01`, not a separate top-level feature. |
| Mining fleets / boosts / compression | GAP | Important group-mining progression and logistics layer. |
| Reprocessing / compression | SUPPORTING | Processing skills are mentioned by `MIN-01`, but there is no dedicated decision/guidance layer. |
| Salvaging | GAP | EVE Academy treats Salvager as a certified Industrialist profession; NEC currently recognizes salvage as an acquisition source but does not guide the profession. |
| Planetary Industry | ROADMAP | `PI-01` through `PI-03`. |
| T1 manufacturing | ROADMAP | `IND-01`. |
| Blueprint acquisition, research and copying | ROADMAP | `IND-02`. |
| Invention / T2 production | ROADMAP | `IND-03` covers invention expansion. |
| Reactions | ROADMAP | `IND-03` covers reactions. |
| T3 production | GAP | EVE Academy recognizes it as an advanced Industrialist activity; later expansion is reasonable. |
| Capital construction | GAP | Advanced industrial specialization; later expansion is reasonable. |
| Booster manufacturing | GAP | Advanced industry loop combining gas, reactions and exploration-sourced formulas. |
| Structure / fuel production | GAP | Advanced industry specialization; naturally builds on PI, ice and manufacturing. |

## Trade, hauling and logistics

| Activity | NEC status | Notes |
| --- | --- | --- |
| Hauling your own cargo / logistics | ROADMAP | `HAU-01` should make hauling a first-class activity rather than only a dependency. |
| Sell-here versus haul-to-market decisions | DONE | `ECO-03`. |
| Market valuation / nearby hubs | DONE | `ECO-02`, `ECO-05`. |
| Market trading / investing / arbitrage | GAP | EVE Academy explicitly treats market trading as a career in its own right; NEC has market data but not a trading progression experience. |
| Courier contracts | GAP | Formal player-to-player hauling with reward, collateral, pickup and destination risk. |
| Distribution missions | SUPPORTING | Missions are planned, but distribution should be explicitly represented alongside security and mining missions. |
| Freight / industrial ship progression | SUPPORTING | Ship/skill systems can support it; `HAU-01` should make the progression understandable. |
| Freelance delivery jobs | GAP | Current player-created logistics work introduced through Freelance Jobs. |

## Exploration

| Activity | NEC status | Notes |
| --- | --- | --- |
| Probe scanning | ROADMAP | `EXP-01`. |
| Data sites / hacking | ROADMAP | `EXP-01`. |
| Relic sites / archaeology | ROADMAP | `EXP-01`. |
| Ghost Sites | GAP | Advanced timed exploration/hacking content. |
| Sleeper Caches | GAP | Advanced exploration content. |
| Wormhole scanning / travel / mapping | SUPPORTING | `EXP-01` can introduce wormholes, but there is no dedicated wormhole progression slice. |
| DED / scanned combat sites | SUPPORTING | Crosses exploration and PvE; missions alone do not fully cover this. |
| Escalations | GAP | EVE Academy explicitly teaches combat-site escalations. |

## PvE and narrative

| Activity | NEC status | Notes |
| --- | --- | --- |
| Security missions | ROADMAP | `MIS-01`. |
| Mining missions | SUPPORTING | `MIS-01` should distinguish mission types rather than assuming missions mean combat. |
| Distribution missions | SUPPORTING | Same concern as above. |
| Pirate faction missions | GAP | Distinct standings/location progression. |
| Anomic / Burner missions | GAP | Specialized small-ship/high-skill mission content. |
| Combat anomalies / ratting | GAP | Major PvE loop outside agent missions. |
| DED complexes / combat signatures | SUPPORTING | Partly adjacent to `EXP-01` and `MIS-01`, but needs explicit coverage. |
| Abyssal Deadspace | DONE | `ABY-01` through `ABY-06`, including manual usability checkpoint. |
| Incursions | GAP | Official group PvE profession/content with role and fleet-readiness needs. |
| Homefront Operations | GAP | Structured group PvE combining combat, hacking, hauling, mining and logistics roles. |
| Wormhole Sleeper PvE | GAP | Distinct environment, logistics and risk model. |
| Pochven / Observatory Flashpoints | LATER | Specialized regional group PvE; worth later expansion. |
| CRAB beacon capital PvE | LATER | Capital-scale PvE and hunter exposure; advanced content. |
| Epic Arcs / story content | ROADMAP | `STY-01`, `STY-02`; selectable Story Guide plus at least one guided current Epic Arc. |
| Military Campaigns | GAP | Current 2026 core system. Objectives span combat, mining, hacking, industry, hauling and Faction Warfare and should eventually integrate with Suggested Session and Story/goal guidance. |
| Seasonal / limited-time events | LATER | Should be discoverable where current data/source support is reliable; avoid hardcoding expired content. |

## PvP and warfare

| Activity | NEC status | Notes |
| --- | --- | --- |
| Basic solo PvP / matchup learning | ROADMAP | FIT/PVP phases plus `CBT-01`. |
| Piracy | SUPPORTING | Combat School can teach combat mechanics, but piracy as a progression/activity is not dedicated. |
| High-sec ganking | LATER | Legitimate sandbox activity but needs careful, current legality/mechanics guidance. |
| Faction Warfare | GAP | Major structured PvP/PvPvE system with enlistment, complexes, advantage objectives, standings and LP. |
| Pirate Insurgencies | GAP | Distinct pirate/empire warfare path layered onto the FW ecosystem. |
| Small-gang / nano PvP | LATER | Advanced Combat School direction. |
| Fleet combat | SUPPORTING | Combat models can underpin it; advanced tactical board is explicitly post-release. |
| Tackle / EWAR / logistics / scouting roles | SUPPORTING | Some roles appear in Combat School design, but no dedicated fleet-role progression. |
| Black Ops / Covert Ops | LATER | Advanced group PvP. |
| Capital / supercapital warfare | LATER | Advanced fleet content. |
| Structure warfare / wars | LATER | Important organizational PvP but not required for first progression-coach release. |
| Sovereignty warfare / skyhook raids | LATER | Advanced nullsec organizational gameplay. |

## Social, corporation and player-created work

| Activity | NEC status | Notes |
| --- | --- | --- |
| Joining / finding a corporation | GAP | EVE Academy treats corporations as a major bridge into the game; could fit onboarding or Suggested Session. |
| Public fleets / NPSI / Fleet Finder | GAP | Useful social progression path, especially for Incursions, Homefronts and PvP. |
| Corporation Projects | GAP | Player-created goals can include mining, hauling, combat and delivery work. |
| Freelance Jobs | GAP | Current EVE system for player-created public work; ESI now exposes public/character job data. |
| Corporation management | LATER | Wallet/assets/roles/projects/industry administration. |
| Upwell structure deployment / management | LATER | Explicitly post-release in current NEC direction. |
| Sovereignty / alliance logistics | LATER | Advanced organizational layer. |
| Mentoring / teaching / fleet command | LATER | Emergent social activity; can later connect to campaign and Combat School systems. |

## Other repeatable activities

| Activity | NEC status | Notes |
| --- | --- | --- |
| Project Discovery | GAP | Current citizen-science minigame; optional/niche for NEC. |
| AIR Career Program / AIR Opportunities | SUPPORTING | NEC is building its own progression coach, but current in-game Opportunities are useful context and should not be confused with NEC-authored campaigns. |
| Fitting / theorycrafting | ROADMAP | `FIT-01` through `FIT-06`, plus interactive builder. |
| Achievement / title chasing | LATER | Current Cradle of War progression layer; not a core NEC v1 requirement. |

## Coverage conclusions

The existing roadmap is strongest on the deep foundations: player state, acquisition, readiness, goals, economy, Abyssals, manufacturing/PI, fitting/combat reasoning, and the planned progression-coach UX. The largest activity-level omissions are not missing plumbing so much as missing **first-class guided experiences**.

Highest-value gaps to evaluate for explicit roadmap coverage after `HAU-01`:

1. **Military Campaigns** — current 2026 core content and unusually well aligned with NEC's cross-activity goal planner.
2. **Faction Warfare + Pirate Insurgencies** — major structured warfare path with clear readiness, standings, ship, location and reward questions.
3. **Market trading** — recognized Industrialist career; existing NEC market infrastructure makes this relatively natural.
4. **Salvaging** — recognized Industrialist profession and direct input to self-sufficiency/manufacturing.
5. **Combat anomalies / DED sites / escalations** — major PvE progression path that is not the same thing as missions.
6. **Incursions + Homefront Operations** — strong group-PvE/social bridge with explicit role readiness.
7. **Wormhole starter progression** — scanning, travel, survival, PvE, gas, hauling and unknown-state handling all intersect here.
8. **Freelance Jobs / Corporation Projects** — current player-created work layer and a natural source for `What can I do right now?` recommendations.

Recommended scope control: expand existing `MIN-01`, `EXP-01`, and `MIS-01` to explicitly name their important variants before creating separate checkboxes for every sub-activity. Keep advanced capital, sovereignty, structure-management, black-ops, T3/capital/structure industry, Pochven and other specialist systems as later expansion unless user testing shows they are necessary for the first progression-coach release.
