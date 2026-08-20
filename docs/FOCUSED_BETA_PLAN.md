# New Eden Companion — Focused Companion Integration Beta

This document is the authoritative implementation order for the next NEC beta. Until this plan is complete, it takes priority over unfinished feature-growth work in `docs/ROADMAP.md`.

## Product target

The immediate deliverable is simple:

> Open New Eden Companion and receive one trustworthy, understandable, achievable answer to **“What should I do right now?”**

Everything NEC already knows about skills, ships, fits, assets, acquisition, industry, markets, location, readiness, and combat should support that answer instead of competing for attention as disconnected tools.

## Scope rule

Do not add new activity categories or large unrelated feature systems until this focused beta is complete. Prefer integration, explanation, degraded-state handling, end-to-end workflow quality, security, and release polish.

Existing deeper systems may be reused where they directly support the beta workflow. NEC Campaigns, Story Guide, Epic Arc expansion, additional activity categories, and large visual redesigns are explicitly post-beta work and do not block this focused beta release.

## Current state

- Integration branch: `codex/companion-integration`
- Repository baseline: package version `0.1.16`; BETA-01 baseline implementation merged in PR #107 / `da3f3bf28213b9169f454349fc429a2d796a23d1`.
- Current focused-beta work item: `BETA-07`.
- Last completed focused-beta item: `BETA-06`.
- BETA-06 implementation: short first-run onboarding merged in PR #117 / `08c35e5657be974e3fbbfe8b94c4aa37ba04c76b`; disconnected/new users now see ESI capability/limit guidance, choose connect or explicitly labeled demo data, set local session-length/risk preferences that feed the unified Suggested Session service, and land on the primary recommendation after onboarding. AIR/tutorial completion is not inferred from skills, ships, assets, or wallet state.
- BETA-05 implementation: standard uncertainty language merged in PR #115 / `18d8375359a8558ab7a3a25bf6ffd8657574934c`; Suggested Session and Activity Briefing now share the exact user-facing states **Ready**, **Probably ready**, **Missing requirements**, **Cannot verify**, and **Live information unavailable**, with fail-closed unknown/live-data wording and existing resolution actions surfaced where available.
- BETA-04 implementation: recommendation explanations merged in PR #113 / `6e4a746fe27ceb086e119e154f70dbd28107cb47`; Suggested Session now separates reasoning, supported character/evaluator evidence, and provenance in `Why this?`, exposes the actual readiness → goal relevance → preference tie-break ranking rule, includes session/risk preference rationale, and rejects meaningful candidates without supported evidence.
- BETA-03 implementation: Suggested Session homepage integration merged in PR #111 / `8499c731b4a88167cb5d30d4bb11835b73386187`; the homepage now consumes the BETA-02 service result, renders one primary recommendation plus up to two alternatives, exposes activity/session/risk/next-action details, supports refresh and `Suggest something different`, renders demo data explicitly as demo, and fails closed when required evidence is unavailable.
- BETA-02 implementation: unified Suggested Session evidence-composition service merged in PR #109 / `f12f8042bbc735404387df4cf7b46af5444b0275`; it returns one primary recommendation, up to two alternatives, explicit evidence/provenance/unknowns, qualitative preference-aware ranking, supported owned/accessibile ship preference, and fail-closed required-evidence handling for the BETA-03 homepage integration.
- BETA-01 executable baseline: 75 test files / 404 tests pass; typecheck passes; lint passes with 2 recorded warnings; production build passes with the recorded updater bundle-tracing warning; Windows package-policy and updater-startup smoke pass. Full warning inventory is in `docs/BETA_01_BASELINE.md`.
- BETA-01 screenshot limitation: this automation runtime cannot render NEC because its local container cannot resolve GitHub and the GitHub connector exposes repository/Actions operations but no browser/UI renderer. The limitation and required later screenshot set are recorded in `docs/BETA_01_BASELINE.md`; no screenshots are fabricated.
- The legacy `docs/ROADMAP.md` remains the historical feature record, but unfinished items there do not supersede this plan while the focused beta is active.

---

## Phase 1 — Establish the correct baseline

- [x] **BETA-01 — Baseline integration checkpoint.** Bring the working copy fully to current GitHub `main`; work from `codex/companion-integration`; run tests, typecheck, lint, and production build; record baseline screenshots of homepage, goals, fitting, item explorer, and representative activity pages. Record existing warnings separately rather than silently normalizing them. PR #107 / `da3f3bf28213b9169f454349fc429a2d796a23d1`. Screenshot capture was genuinely unavailable in this automation runtime; the exact limitation and later-required page set are recorded in `docs/BETA_01_BASELINE.md` per the focused-beta runtime rule.

Acceptance:
- branch starts from current `main`;
- tests/typecheck/lint/build result is recorded;
- baseline screenshots exist for later regression comparison when a UI-capable runtime is available; this automation runtime limitation is explicitly recorded rather than treated as successful capture;
- no product behavior is changed merely to make the baseline appear cleaner.

## Phase 2 — Make Suggested Session the core product

- [x] **BETA-02 — Unified Suggested Session service.** Create one recommendation service that composes supported evidence from character skills/training, current ship/fit, owned ships/modules/ammo/drones/cargo, wallet/market, location and supported nearby-risk evidence, existing activity-readiness engines, and player-selected session length/risk preferences. PR #109 / `f12f8042bbc735404387df4cf7b46af5444b0275` adds the fail-closed evidence contract, qualitative deterministic ranking, one primary plus up to two alternatives, supported owned/accessibile ship preference, one next action, missing requirements/items, provenance, and uncertainty-resolution actions without inventing unavailable state.
- [x] **BETA-03 — Suggested Session home integration.** Return one primary recommendation plus two alternatives and make that the homepage’s main answer instead of legacy dashboard-advice sorting. Each recommendation should expose activity, suitable ship where supported, preparation, approximate session-length class, risk posture, missing requirements/items, and one concrete next action. Add refresh and `suggest something different` controls. PR #111 / `8499c731b4a88167cb5d30d4bb11835b73386187` routes existing dashboard evidence through the unified service, centers the result on the homepage, adds the requested controls, preserves unavailable required evidence as unavailable/cannot-verify state, and keeps demo recommendations explicitly labeled as demo.

Recommendation safety rules:
- unknown required evidence must never be silently treated as ready;
- an otherwise plausible activity may be shown as **cannot verify yet** with a concrete way to resolve the uncertainty;
- never invent safety, profitability, DPS, success chance, or readiness percentages;
- do not promote a specialist fleet role as a solo destination unless the user explicitly asks for that role.

## Phase 3 — Explanations and uncertainty

- [x] **BETA-04 — Recommendation explanations.** Every meaningful recommendation exposes `Why this?`, the character facts/rules that produced it, and relevant provenance. PR #113 / `6e4a746fe27ceb086e119e154f70dbd28107cb47` separates reasoning from evidence/provenance in the existing `Why this?` disclosure, exposes ranking/preference rationale, applies the same explanation structure to primary and alternative recommendations, and requires supported evidence plus provenance for every meaningful Suggested Session candidate.
- [x] **BETA-05 — Standard uncertainty language.** Standardize at least: **Ready**, **Probably ready**, **Missing requirements**, **Cannot verify**, and **Live information unavailable**. Explain what the user can do to resolve missing information where possible. PR #115 / `18d8375359a8558ab7a3a25bf6ffd8657574934c` adds a shared focused-beta uncertainty presentation model, maps existing readiness states without changing readiness mechanics, updates Suggested Session primary/alternatives and Activity Briefing to the shared language, and surfaces supported resolution actions while preserving missing/live evidence as unknown or unavailable.

Never replace uncertainty with fabricated precision.

## Phase 4 — First-run experience

- [x] **BETA-06 — Short first-run onboarding.** Explain what NEC can/cannot see, connect a character or choose demo data, ask risk/session-length preferences, and end with an achievable first recommendation. PR #117 / `08c35e5657be974e3fbbfe8b94c4aa37ba04c76b` adds the bounded first-run screen, local preferences, connect/demo flow, explicit ESI/live-state limits, and direct handoff to Suggested Session without introducing new activity categories.
- [ ] **BETA-07 — Adventure-first intent selection.** Let a new or directionless player choose what sounds fun before asking them to understand EVE careers or fleet roles. Support intents such as combat, exploration, mining, hauling/trade, industry/building, `explore somewhere dangerous`, `play with a friend`, `show me something`, and `give me an adventure`.

AIR/Career status rule:
- if current ESI cannot prove AIR Career Program or Career Agent completion, keep it user-confirmed/local;
- skills, ships, assets, or wallet may inform capability but are never proof of tutorial/AIR completion.

## Phase 5 — Goal and acquisition planning

- [ ] **BETA-08 — Goal entry and owned-first dependency plan.** Let the player choose an activity, ship, fitting, or skill goal. Reuse already-owned/trained parts first and build the uncovered dependency list for skills, hulls, modules, rigs, charges, drones, consumables, materials, and blueprints.
- [ ] **BETA-09 — Acquisition choices and training milestones.** For uncovered requirements, show evidence-backed buy/build/haul/substitute/source choices, with explicit non-manufacturable/LP/loot/salvage/PI/reaction/etc. terminal sources where established. Show the shortest usable training milestone separately from optional optimization skills.
- [ ] **BETA-10 — Goal checklist with parent reason.** Convert the plan into a followable checklist with one obvious next action and compact milestones. Every chore must retain its parent reason: e.g. `mine Tritanium because it is required for the PvP hull you chose`, not simply `mine Tritanium`.

## Phase 6 — Preflight integration

- [ ] **BETA-11 — Activity preflight composition.** Use the active ship and ESI-visible accessible cargo/fit evidence to check activity-specific supplies including ammunition, drones, repair paste, probes, filaments, scripts, cap charges, and other established requirements.
- [ ] **BETA-12 — Ship/fit suitability and blocker severity.** Validate supported fitted/online requirements, identify inappropriate ships/damage choices where evidence establishes that, suggest a more suitable owned ship when supported, and separate fatal blockers from useful improvements.
- [ ] **BETA-13 — Final preflight summary.** Finish with **Preflight complete / No known blockers** or a blocker list. Never label the player or route `safe to undock` and never imply a safety guarantee.

## Phase 7 — Validation and security

- [ ] **BETA-14 — SSO/token security review.** Complete the open EVE SSO/token-storage review and verify secrets/tokens cannot leak into logs or browser responses.
- [ ] **BETA-15 — Portable/degraded-state validation.** Exercise hauling and industry in the portable Windows release and test degraded behavior when ESI, market sources, or the static database are unavailable.
- [ ] **BETA-16 — End-to-end integration test.** Add and exercise the core path: `Connect/demo → Suggested Session → Goal → Acquire → Fit → Preflight`.
- [ ] **BETA-17 — New-player usability checkpoint.** Test with a genuinely new EVE player, not only someone familiar with NEC, and verify important recommendations against SDE/ESI evidence and actual gameplay where applicable.

The end-to-end test must include at least one case where required data is unknown, one owned-part reuse case, and one acquisition-source boundary that is not simply `buy it`.

## Phase 8 — Cleanup and focused beta release

- [ ] **BETA-18 — Build/lint/updater cleanup.** Resolve the updater whole-project bundle-tracing warning and remaining lint warnings that exist at the focused-beta baseline, without masking real problems.
- [ ] **BETA-19 — User-facing documentation.** Update README to reflect the current app, add current screenshots, a simple `download → connect/demo → start` guide, privacy notes, external data sources, and ESI limitations.
- [ ] **BETA-20 — Focused beta release.** Build the Windows release candidate, perform clean-install/update/rollback tests, publish through the normal stable updater path, and collect player feedback before beginning another large feature phase.

---

## Focused beta completion rule

The focused beta is complete only when BETA-01 through BETA-20 are complete, the installed-app end-to-end path is understandable and functional, required uncertainty remains honest, security/release validation passes, and a new player can reach a useful first recommendation without needing prior knowledge of NEC’s internal tools.

## Post-beta backlog

Resume only after feedback from the focused beta:

- NEC Campaigns
- Story Guide
- Epic Arc expansion
- Additional activity categories
- Large visual redesigns
- Other roadmap features that do not directly support the focused beta integration path
