# New Eden Companion — Progression Coach Roadmap

This file is the persistent implementation state for the new-player progression coach. It is intentionally kept in Git so scheduled development runs can inspect `main`, continue the next unfinished work item, and leave a durable handoff for the next run.

## Automation protocol

1. Always begin by reading this file from `main` and inspecting the current repository state.
2. Work on the first unchecked item whose prerequisites are complete. Do not skip ahead just because a later task looks easier.
3. If an unfinished PR already exists for the current item, continue/fix/review that PR before opening another one.
4. Do one bounded work item per run. Large systems are split into smaller checklist items below.
5. Use an `agent/...` branch and normal PR/CI workflow. Do not merge failing CI.
6. For EVE mechanics, SDE, ESI, scopes, or other facts that can change, verify the current authoritative source before encoding behavior. Prefer CCP primary sources for game/API facts.
7. Do not silently invent acquisition sources, readiness rules, fitting mechanics, or tactical claims. If a fact cannot be established, preserve the unknown explicitly.
8. Update this roadmap at the end of every completed work item. Mark an item `[x]` only after its implementation is merged to `main` and record the PR/commit when practical.
9. If blocked, leave the item unchecked and add a short `BLOCKED:` note describing exactly what prevents completion. Do not mark it done.
10. Do not bump/release the application merely because infrastructure changed. Version/release only when a roadmap item explicitly requires a user-facing release.
11. Preserve private user/session data. Static/rebuildable EVE data must remain separable from `data/eve-companion.db`.
12. When all checklist items are complete, stop making code changes and report that the roadmap is complete.

## Current state

- Current work item: `PLY-04`
- Last completed: `PLY-03`
- Last updated: 2026-08-18
- Product goal: A local-first EVE Online companion for new players that answers **what should I do next, am I actually ready, how do I start, what do I need, how do I get it, what should I keep/sell, and what did I do wrong?**

---

## Phase A — Static knowledge foundation

- [x] **FND-01 — Static SDE SQLite foundation.** Stream current CCP JSONL SDE into a replaceable SQLite knowledge database containing types, groups/categories, type materials, blueprints, activity materials/products/skills, and Dogma-derived skill prerequisites. Preserve unresolved official references explicitly. PR #14, merge `a014c0b87357efb4d8167686404e4d12cd5f1d3d`.
- [x] **FND-02 — Ship the static DB with zero user setup.** Windows packaging now requires and bundles `static/eve-static.db`, permits that one rebuildable SQLite file, and still rejects private `data/` DBs, unexpected database files, and `.env.local`. Users do not install SQLite, Node, or another database service. PR #16.
- [x] **FND-03 — Automated current-SDE build artifact.** Resolve CCP's current SDE build from official metadata, download the exact numbered JSONL archive, build and validate the DB, verify SHA-256, and upload the DB plus source/build metadata/checksum as a GitHub artifact. PR #17.
- [x] **FND-04 — Static DB freshness/update path.** NEC compares the installed static DB build with CCP's current official SDE build, builds newer data in isolation using the validated importer, verifies checksum/integrity/schema/build, closes the live DB, swaps only the replaceable static DB, and retains/restores the known-good copy until the replacement successfully reopens. PR #18.
- [x] **FND-05 — Static DB health diagnostics.** Expose local static-data health at `/api/static-data/health`: availability/status, schema version, SDE build, database age, creation timestamp, and unresolved placeholder count, without exposing private session data or filesystem paths. PR #19.

## Phase B — Acquisition / “How do I get this?” graph

- [x] **GRF-01 — Core acquisition graph domain model.** Define typed item, blueprint, manufacturing-activity, material, skill, and terminal source nodes plus typed dependency edges, explicit alternative acquisition options, unknown-source preservation, and graph integrity validation. PR #20.
- [x] **GRF-02 — Manufacturing dependency queries.** Resolve every manufacturing blueprint alternative for a target product from SQLite, including product quantity, manufacturing time, required materials, and required activity skills; preserve unresolved placeholder types and deterministic ordering while excluding non-manufacturing activities. PR #21.
- [x] **GRF-03 — Recursive dependency expansion.** Recursively expand manufacturable materials across every manufacturing blueprint alternative with deterministic ordering, active-path cycle detection, configurable depth protection, and explicit terminal states for non-manufacturable, cycle, depth-limit, and unknown-type boundaries. PR #22.
- [x] **GRF-04 — Non-manufacturing source boundaries.** Explicitly distinguish ordinary-blueprint availability from no-ordinary-blueprint and unknown-type boundaries; resolve evidence-backed SDE non-manufacturing activities plus cited curated NPC-seeded, loot/drop, LP/faction, exploration, PI, reaction, salvage, market, and other source categories while preserving unsupported sources as unknown. Recursive terminal leaves now carry the source resolution. PR #23.
- [x] **GRF-05 — Reverse-use queries.** Answer “What is this used for?” from the installed SDE by following material -> blueprint/activity -> product relationships in reverse, including product-producing uses of blueprint types themselves, deterministic ordering, and unresolved-placeholder preservation without inventing unsupported purposes. PR #24.
- [x] **GRF-06 — Item search and identity.** Search types by name/category/group and distinguish published, unpublished, blueprint, material, ship, module, skill, commodity, and unresolved placeholder records. PR #25.
- [x] **GRF-07 — Item explorer UI.** Add a user-facing item page with `How do I get this?` and `What is this used for?` entry points and recursively clickable dependencies. PR #26.

## Phase C — Overlay the actual player

- [x] **PLY-01 — Asset coverage overlay.** Compare dependency quantities against the character's ESI-visible assets and clearly mark owned, partially owned, missing, inaccessible/unknown-location, and unresolved quantities. PR #27.
- [x] **PLY-02 — Skill readiness overlay.** Compare required item/activity skills against the character's trained skills and expose blockers without inventing training ETA when the required data is unavailable. PR #28.
- [x] **PLY-03 — Blueprint ownership overlay.** Use ESI-visible blueprint data where available to distinguish owned BPO/BPC, runs, research state, and “must obtain blueprint.” PR #29.
- [ ] **PLY-04 — Wallet/market affordability overlay.** Distinguish purchase price from affordability and retain enough reserve/replacement context for later readiness rules.
- [ ] **PLY-05 — Saved goals/plans.** Let the user save an item/activity goal locally and persist checklist/progress state separately from the replaceable static DB.

## Phase D — Progression and readiness engine

- [ ] **RDY-01 — Standard readiness dimensions.** Define reusable dimensions such as skills, ship/fit, supplies, ISK, replacement capacity, location/access, experience, and knowledge/preparation. “Can technically enter” must not equal “ready.”
- [ ] **RDY-02 — Replacement-capacity model.** Calculate ship/fit/supply risk relative to liquid ISK and configurable reserve; distinguish `can purchase` from `can afford to lose`.
- [ ] **RDY-03 — Activity prerequisite graph.** Let activities declare hard requirements, soft recommendations, prerequisite learning milestones, supplies, ship constraints, and optional side-activity status.
- [ ] **RDY-04 — Local experience milestones.** Track explicit user-confirmed milestones (first successful run, practiced lower tier, first manufacture, etc.) without pretending ESI exposes gameplay it does not.
- [ ] **RDY-05 — Readiness explanation engine.** Produce deterministic “ready / nearly ready / not recommended” output with primary blockers, warnings, and next corrective action; every conclusion must expose why.
- [ ] **RDY-06 — “I don't know what to do” recommender.** Rank realistic activities/goals from current character state and separate `ready now`, `short preparation`, `longer goal`, and `ignore for now`.
- [ ] **RDY-07 — Goal-mode progression plan.** Given a chosen goal (ship, activity, item), generate the ordered path from current state to goal rather than merely listing missing requirements.

## Phase E — Activity briefing framework

- [ ] **ACT-01 — Reusable activity briefing UI/model.** Standardize `what it is`, `why care`, `am I ready`, `what to bring`, `how to start`, `what to do`, `what to loot/keep/sell`, `failure conditions`, and `what this unlocks next`.
- [ ] **ACT-02 — Compact in-activity cheat sheet.** Provide a concise, manually viewable checklist for execution without claiming live combat/client telemetry.
- [ ] **ACT-03 — Post-activity debrief model.** Interpret newly acquired relevant items against goals and offer keep/sell/use-next explanations where data supports them.

## Phase F — Abyssals as the first complete vertical slice

- [ ] **ABY-01 — Current filament/tier/weather knowledge model.** Verify and encode tier naming, filament families/weather effects, entry formats/consumption, and why each weather matters.
- [ ] **ABY-02 — Abyssal acquisition/supply graph.** Explain how required filaments and consumables are obtained, including explicit non-manufacturable boundaries where applicable.
- [ ] **ABY-03 — First-run briefing.** Build a T0/T1 beginner briefing with ship/fit/supplies, activation steps, timer, room flow, failure conditions, and safe practice guidance.
- [ ] **ABY-04 — Loot teaching.** Explain Bioadaptive Cache versus optional side nodes, no ordinary wreck-loot expectation, major loot families, red-loot cash-out behavior, and keep/sell/use guidance.
- [ ] **ABY-05 — Tier progression readiness.** Gate higher tiers on fit/skills/replacement capacity plus explicit experience milestones; finding a higher-tier filament must not automatically imply readiness.
- [ ] **ABY-06 — Integrate existing vetted Abyssal fits.** Connect the existing fit library to the briefing/readiness system and preserve each fit's validated tier limits.

## Phase G — Economy, assets, location, and “what should I keep?”

- [ ] **ECO-01 — Asset usefulness classifier.** Relate owned items to saved goals, active activities, fitting recommendations, and manufacturing dependencies before recommending keep/sell.
- [ ] **ECO-02 — Market valuation service.** Establish current market data source/caching and calculate local/nearby-hub value with timestamps and data-quality caveats.
- [ ] **ECO-03 — Sell-here-vs-haul decision support.** Compare price improvement against jumps, volume, risk, and user-configurable hauling tolerance; explain the recommendation.
- [ ] **ECO-04 — Stockpile recommendations.** Identify materials/supplies useful to active goals and distinguish deliberate stockpile from random clutter.
- [ ] **ECO-05 — Location-aware opportunities.** Use character/location plus universe data to surface nearby relevant activities/assets/services while respecting ESI visibility limitations.
- [ ] **ECO-06 — Asset cleanup view.** Present actionable `keep`, `use soon`, `sell`, `haul`, `unknown`, and `goal-critical` groups with reasons rather than destructive automatic actions.

## Phase H — Mining, industry, PI, exploration, missions

- [ ] **MIN-01 — Connect existing mining planner to progression/readiness.** Resource targets, fit readiness, supplies, processing skills, and why the resource matters to current goals.
- [ ] **IND-01 — Manufacturing planner vertical slice.** Build a selected T1 item/ship from blueprint through materials, facility/skills, owned coverage, and missing inputs.
- [ ] **IND-02 — Blueprint acquisition/research/copying guidance.** Teach BPO vs BPC, source boundaries, research/copy activities, and show only relationships that can be established from current data/sourced curation.
- [ ] **IND-03 — Invention/reaction expansion.** Add current invention and reaction dependencies/skills/materials as separate graph activities with alternatives and terminal sources.
- [ ] **PI-01 — Current PI static data/source model.** Verify current SDE/ESI PI schemas, commodities/schematics/resources, required scope, and update the graph with PI production relationships.
- [ ] **PI-02 — Colony state/readiness dashboard.** Read ESI-visible colonies/routes/pins/extractors and explain expiration/starvation/storage attention without pretending NEC sees the in-game resource heatmap.
- [ ] **PI-03 — PI production planner.** Given a commodity goal, recursively show planet/resource/input chains, colony gaps, and a copyable setup/checklist.
- [ ] **EXP-01 — Exploration beginner vertical slice.** Scanning/probe preparation, site types, space-risk explanation, first-run briefing, and loot interpretation using current sourced mechanics.
- [ ] **MIS-01 — Mission/PvE progression vertical slice.** Mission level/hull/fit/supply readiness, damage/tank guidance, upgrade value, and warnings against financially premature hull jumps.

## Phase I — Fitting and combat intelligence

- [ ] **FIT-01 — Fitting-engine scope and validation harness.** Define exact stat coverage and golden-reference tests against current authoritative Dogma/Pyfa-verifiable cases before building UI.
- [ ] **FIT-02 — Deterministic fitting core.** CPU, powergrid, slots/hardpoints, skills, speed/mass/signature, tank/resists/EHP, capacitor, weapons/drones/application/range as supported by validated formulas/data.
- [ ] **FIT-03 — Interactive ship builder.** Hull selection, module/rig/charge/drone manipulation, fit validity, import/export, and real-time deterministic stat updates.
- [ ] **FIT-04 — Fit identity classifier.** Score brawler, scram-kiter, kiter, sniper, tackle, active/buffer/passive tank, EWAR/neut/logi/other roles from explainable fit facts.
- [ ] **FIT-05 — Contradiction/weakness rules.** Detect mismatched range plans, mobility/tank conflicts, cap dependence, resist holes, poor tackle compatibility, application problems, and other explainable weaknesses.
- [ ] **FIT-06 — Tactical explanation UI.** Translate calculator/rule output into `what this fit wants`, `how to fly it`, `what ruins its plan`, and expandable `why` explanations.
- [ ] **PVP-01 — Two-fit matchup model.** Compare engagement envelopes, range control, tackle, application, tank, cap/neuts, mobility, damage types, escape conditions without deterministic fake win percentages.
- [ ] **PVP-02 — Matchup briefing.** Show your advantage/their advantage, good/bad engagement conditions, run-if conditions, and likely failure transition.
- [ ] **PVP-03 — Killmail/post-loss debrief.** Use available killmail/fit context to explain plausible primary/secondary failure factors and learning points with uncertainty clearly stated.

## Phase J — Product integration and release quality

- [ ] **UX-01 — New-player home experience.** Make progression/recommendations the primary entry point while retaining detailed dashboards for users who want them.
- [ ] **UX-02 — Global “Why?” affordance.** Readiness, keep/sell, fit classification, tactical warnings, and progression recommendations must expose their underlying evidence/rules.
- [ ] **UX-03 — Unknown/limited-data UX.** Standardize wording for unavailable ESI data, stale market data, unresolved SDE placeholders, unsupported mechanics, and user confirmation requirements.
- [ ] **UX-04 — First-run onboarding.** Explain what NEC can/cannot see, connect character, establish approximate goals/preferences, and offer `I don't know what to do` immediately.
- [ ] **QA-01 — Cross-system regression suite.** Golden tests for representative beginner progression chains, acquisition graphs, readiness states, asset decisions, Abyssal flow, PI/industry paths, and fits.
- [ ] **QA-02 — Security/privacy review.** Re-review SSO scopes, token/session storage, external requests, static DB updates, market sources, telemetry assumptions, and data retention after the new systems land.
- [ ] **REL-01 — Progression-coach release candidate.** Package the validated static DB, perform clean-install/update/rollback tests on Windows, document limitations, and publish the first release where the progression coach is a coherent user-facing product.

---

## Completion rule

The roadmap is complete when every checkbox above is `[x]`, CI is green on the merged implementation, the release candidate has passed clean-install/update tests, and no `BLOCKED:` notes remain unresolved.
