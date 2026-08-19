# New Eden Companion — End-State Experience Requirements

These are product-level requirements that must exist before the progression-coach roadmap is considered complete. They are intentionally written separately from implementation details so later roadmap work can choose the correct underlying systems without losing the player-facing goal.

## Suggested session

NEC should be able to answer **“What should I do in EVE right now?”** with a short, coherent suggested session rather than a flat list of unrelated recommendations.

A suggested session should:

- use the character’s evaluated readiness, saved goals, current/known location, ESI-visible assets/ship state, useful supplies, and local experience milestones where available;
- optionally respect a user-provided time budget or session intent when that information is available, without inventing a duration when it is not;
- produce a small ordered plan, such as preparation -> primary activity -> useful follow-up, rather than dumping every eligible activity;
- explain **why each step was selected** and what it progresses or teaches;
- offer a fallback when a recommended step is blocked by missing data, skills, supplies, ISK, location, or another prerequisite;
- link each activity step into the normal activity briefing/readiness flow so the user can immediately answer “what do I need?” and “how do I start?”;
- remain useful when NEC lacks enough information by saying what it needs instead of fabricating confidence.

Example shape (not fixed UI copy):

1. Buy/collect the missing supplies for a T1 Abyssal run.
2. Run one or two Calm Electrical sites with the vetted fit your character can use.
3. Review the loot/debrief and decide what supports your current goal.

## Try something new

NEC should also be able to answer **“What is something different I could try?”**

This suggestion should:

- prefer activities the character appears technically capable of starting or can reach with modest preparation;
- deliberately diversify across activity families instead of repeatedly recommending the same thing the normal recommender already favors;
- explain what the activity is, why it may be interesting, what the character already has going for them, and the smallest next step required to try it;
- use explicit local experience milestones and user feedback such as `tried`, `not interested`, or equivalent when available;
- **never claim NEC knows that the player has never done an activity merely because ESI does not expose that history**;
- allow the user to dismiss/not-interest an activity so “try something new” does not repeatedly nag them with the same suggestion;
- link directly into that activity’s beginner briefing/readiness page.

## Goal-first progressive disclosure

NEC should follow the product rules in `docs/GOAL_EXPERIENCE_REQUIREMENTS.md`: evaluate deep dependency chains internally but show the player one obvious next action by default. Goal experiences such as **“I want to fly this ship”** should expose compact readiness/ownership/milestone summaries first, then let the player drill into exact skills, missing items, blueprint/material acquisition, self-sufficiency chains, and the full dependency graph only when requested.

The default experience must answer **“What do I do next?”** without requiring the player to read a wall of text.

## Build and fitting ownership awareness

Whenever NEC recommends a ship fit, industrial build, campaign loadout, consumable package, or other shopping/build list, it must first account for what the character already owns through the ESI-visible asset/fitting/cargo data that is actually available.

The build experience should:

- show an immediate coverage summary such as **Owned 11/16 · Missing 5** rather than presenting the full fit as a shopping list;
- mark each required hull/module/rig/charge/drone/material/supply as `owned`, `partially owned`, `missing`, `allocated/in use`, `inaccessible or unknown location`, or `unknown` where the available data supports that distinction;
- count exact quantities for stackable ammunition, charges, drones, materials, consumables, and other quantity-sensitive requirements;
- avoid telling the player to buy something NEC can establish they already own;
- produce a **Buy missing only** list from the uncovered remainder, not from the original recipe/fit;
- make owned items clickable so the user can see where NEC believes the item is and why it counted toward coverage when location data is available;
- avoid silently treating an item fitted to another active/planned ship as disposable inventory when NEC can establish that allocation;
- preserve uncertainty when ESI does not expose enough information to establish whether an item is practically accessible;
- reuse the same ownership overlay for fittings, manufacturing plans, campaigns, story-guide preflights, suggested sessions, and ordinary item acquisition so the behavior is consistent everywhere.

The desired feeling is: **“You already have most of this. Here is exactly what is still missing.”**

## Independence / make-it-yourself planning

NEC should actively teach players how to become more self-sufficient instead of treating the market as the default answer to every missing item.

For a required item or complete fit/build, NEC should be able to offer planning preferences such as **Independent**, **Balanced**, and **Buy-first**. The exact labels may change, but the underlying behavior should remain distinct:

- **Independent:** prefer using owned stock, manufacturing, mining/resource gathering, PI, reactions, salvage, exploration, LP/faction/NPC sources, or other evidence-backed acquisition paths before suggesting a player-market purchase;
- **Balanced:** compare practical owned/build/source options with buying and allow a mixed plan;
- **Buy-first:** optimize for getting ready quickly while still reusing anything already owned.

The independence path should:

- recursively use the acquisition graph to answer **“How could I make or obtain this myself?”** all the way down to meaningful source boundaries;
- consume owned materials/components first and calculate only the remaining quantities at each dependency level;
- show required blueprint/BPO/BPC state, manufacturing/activity skills, materials, intermediate products, facilities or activity types when current data can establish them;
- distinguish `can manufacture`, `can source another way`, `must obtain prerequisite`, `market is one option`, and `unknown` rather than flattening every missing item into `buy`;
- explicitly explain when an item **cannot normally be manufactured** and show the supported source instead of fabricating a blueprint path;
- let a player expand or collapse the dependency tree so someone who wants full self-sufficiency can go deep without forcing that complexity on everyone;
- show where the player is already independent, for example **“You can manufacture 14 of 17 required components with your current skills/blueprints/materials”** when the evidence supports that statement;
- use the same self-sufficiency preference inside NEC Campaigns so progression can deliberately teach mining, refining, industry, PI, exploration, salvage, hauling, and market use as connected systems rather than isolated dashboards;
- explain tradeoffs without moralizing: making something yourself may take longer or cost more than buying it, while buying may be the sensible choice when the user values time over independence.

NEC should never promise literal total self-sufficiency where EVE's item-source rules make that impossible. The goal is to teach the player **how much of the chain they can control themselves, what they still depend on others/the market for, and how to expand that independence over time.**

## NEC Campaigns — an alternate questing layer

NEC should provide an optional **campaign/quest-style progression experience** for players who want clearer structure than the normal EVE sandbox provides. These are NEC-authored guides built from real EVE activities; they must never pretend to be CCP missions or promise in-game rewards that EVE does not actually provide.

A campaign should:

- be organized into clear campaigns, chapters, quests, and small objectives with visible progress;
- turn real sandbox activities into coherent sequences, for example `obtain a scanning frigate -> fit it -> scan signatures -> complete a data site -> interpret the loot -> choose the next exploration step`;
- prefer short, immediately understandable objectives over large vague goals such as “get into exploration”;
- use ESI-observable completion where reliable and allow explicit manual confirmation where ESI cannot prove the action occurred;
- show **why the objective matters**, what skill or game concept it teaches, and what the next objective unlocks;
- use the readiness/acquisition/fitting systems to make each objective actionable: `Can I do this?`, `What do I need?`, `Where do I get it?`, and `Give me the fit/checklist` should be one click away;
- provide alternate branches or substitutions when a character cannot or does not want to complete the default objective;
- include meaningful NEC-side progress markers, milestones, chapter completion, and summaries without fabricating ISK/items/SP as rewards;
- call out genuine EVE rewards when the underlying activity really awards them and distinguish those from NEC progression milestones;
- allow campaigns to cover multiple styles of play rather than becoming another linear PvE mission grind;
- preserve user progress locally per character and let users pause, resume, abandon, or restart a campaign without corrupting EVE state.

The intended feeling is closer to a readable RPG quest log layered over EVE: **one concrete thing to do, a reason to do it, help completing it, visible progress, and a satisfying next step.**

## Story Guide mode — detailed guides for EVE narrative content

NEC should provide unusually detailed, player-readable guides for EVE's real narrative/story content, beginning with currently supported Epic Arcs and expanding only where the underlying content can be sourced and maintained reliably.

For each supported story arc, NEC should provide:

- a spoiler-light overview: what the story is about, who it is for, approximate scope when a trustworthy source exists, starting agent/location, access/standing requirements, replay/cooldown rules, and important consequences;
- a **character-specific preflight**: whether the character appears able to start it, suitable ships/fits within their skills, supplies, expected travel/security-space concerns, replacement-capacity warnings, and known blockers;
- a chapter/mission navigator showing current guide position and the next concrete action without requiring the player to read the entire walkthrough at once;
- an optional **full walkthrough** for players who want exact instructions, clearly separated from spoiler-light mode;
- mission-by-mission objectives, travel/setup notes, combat or non-combat preparation, notable triggers, important loot/items, completion conditions, and common failure/confusion points when those facts are sufficiently sourced;
- explicit branch/choice explanations for branching arcs, including what a choice changes and what cannot be inferred safely;
- standings, faction, cooldown, cancellation, or other meaningful consequences called out before the user commits when current sources establish them;
- ship/fitting recommendations that are validated for the specific content rather than generic hull suggestions, with copyable EVE fits when NEC has a vetted fit;
- direct links from unfamiliar ships, modules, items, NPC concepts, or mechanics into NEC explanations rather than assuming the player already knows EVE terminology;
- a post-chapter/post-arc summary of what happened, what the player earned/unlocked where known, and sensible follow-on activities.

The guide must not claim NEC knows the character's exact current mission step unless ESI or explicit user input provides enough evidence. Where EVE does not expose mission state, NEC should let the user mark the current chapter/mission/objective manually and keep that local guide state separate from actual EVE mission state.

## Completion requirement

Before the progression-coach release candidate is considered complete, **Suggested session**, **Try something new**, the initial **NEC Campaign** experience, **goal-first progressive disclosure**, **owned-part-aware build planning**, and the **independence/self-sufficiency planning mode** must be surfaced in the user-facing progression experience, have explainable recommendations, preserve unknown data honestly, and pass a real-user usability checkpoint. Story Guide mode must ship at least one fully guided current Epic Arc vertical slice with spoiler-light and detailed walkthrough paths so its design is validated against real EVE narrative content rather than remaining a documentation-only concept.
