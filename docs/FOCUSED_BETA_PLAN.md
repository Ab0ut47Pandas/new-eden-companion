# New Eden Companion — Focused Companion Integration Beta

This document is the authoritative implementation order for the current NEC beta. Until BETA-20 is complete, it takes priority over unfinished feature-growth work in `docs/ROADMAP.md`.

## Product target

> Open New Eden Companion and receive one trustworthy, understandable, achievable answer to **“What should I do right now?”**

Everything NEC already knows about skills, ships, fits, assets, acquisition, industry, markets, location, readiness, and combat should support that answer instead of competing for attention as disconnected tools.

## Scope and safety rules

- Do not add new activity categories, Campaigns, Story Guide, Epic Arc expansion, large visual redesigns, or unrelated feature-growth work before BETA-20.
- Prefer integration, explanation, degraded-state handling, security, validation, and release polish.
- Unknown required evidence must never be silently treated as ready.
- Never invent safety, profitability, DPS, success chance, readiness percentages, live client state, facility access, mission state, loot, rewards, probabilities, or market certainty.
- AIR/Career completion remains user-confirmed/local unless current ESI can establish it; skills/assets/wallet are never proof of completion.
- Selling requires positive evidence; uncertain rarity/source/replaceability remains Keep/Review.
- Final preflight language is **Preflight complete / No known blockers**, never `safe to undock` or another safety guarantee.
- `docs/END_STATE_EXPERIENCE.md` remains the focused-beta end-state acceptance reference.

## Current state

- Integration branch: `codex/companion-integration`.
- Repository baseline: package version `0.1.16`.
- Current focused-beta work item: `BETA-15`.
- Last completed focused-beta item: `BETA-14`.
- BETA-14 reconciliation: PR #132 / `17c389410fc0d021395235e9a69fd330639cb565` completes the EVE SSO/token-storage review, preserves Authorization Code + PKCE and server-only token handling, hardens callback logging to error-type-only output, removes the unused unverified token-preview helper, records the local `AUTH_SECRET`/host security boundary, and adds regression tests proving representative authorization codes, PKCE verifiers, access/refresh tokens, and session IDs cannot leak into callback logs or browser redirects.
- BETA-01 baseline warnings remain intentionally open for BETA-18: two recorded lint warnings and the updater whole-project bundle-tracing warning. See `docs/BETA_01_BASELINE.md`.
- BETA-01 screenshot limitation remains recorded: this automation runtime cannot render NEC; required screenshots must be captured later in a UI-capable environment rather than fabricated.

---

## Phase 1 — Establish the correct baseline

- [x] **BETA-01 — Baseline integration checkpoint.** Current-main tests/typecheck/lint/build and Windows smoke recorded; screenshot-runtime limitation recorded. PR #107 / `da3f3bf28213b9169f454349fc429a2d796a23d1`.

## Phase 2 — Make Suggested Session the core product

- [x] **BETA-02 — Unified Suggested Session service.** Compose supported character/readiness evidence and preferences into one primary recommendation plus two alternatives. PR #109 / `f12f8042bbc735404387df4cf7b46af5444b0275`.
- [x] **BETA-03 — Suggested Session home integration.** Center the homepage on that service with activity, supported ship, preparation, session/risk class, missing requirements, one next action, refresh, and suggest-something-different. PR #111 / `8499c731b4a88167cb5d30d4bb11835b73386187`.

## Phase 3 — Explanations and uncertainty

- [x] **BETA-04 — Recommendation explanations.** Expose `Why this?`, evidence, rules, and provenance. PR #113 / `6e4a746fe27ceb086e119e154f70dbd28107cb47`.
- [x] **BETA-05 — Standard uncertainty language.** Standardize Ready, Probably ready, Missing requirements, Cannot verify, and Live information unavailable with resolution guidance where possible. PR #115 / `18d8375359a8558ab7a3a25bf6ffd8657574934c`.

## Phase 4 — First-run experience

- [x] **BETA-06 — Short first-run onboarding.** Explain ESI limits, connect or demo, capture session/risk preferences, and land on Suggested Session. PR #117 / `08c35e5657be974e3fbbfe8b94c4aa37ba04c76b`.
- [x] **BETA-07 — Adventure-first intent selection.** Support plain-language intents such as combat, exploration, mining, hauling/trade, building, dangerous exploration, playing with a friend, show me something, and give me an adventure without requiring fleet-role jargon. PR #119 / `582aa19398ec074489d9433d7dbd242f1ecd15d2`.

## Phase 5 — Goal and acquisition planning

- [x] **BETA-08 — Goal entry and owned-first dependency plan.** Activity/ship/fit/skill goals; reuse owned/trained parts first; preserve unknown/inaccessible state and parent reasons. PR #121 / `6071b45f2abcf897ef8d32d225790fb4d069260e`.
- [x] **BETA-09 — Acquisition choices and training milestones.** Evidence-backed buy/build/haul/substitute/source choices with explicit terminal-source boundaries and shortest usable training milestone separate from optimization. PR #123 / `b8e2ddc91cf2eab949cfd7643fd2a06e6682695d`.
- [x] **BETA-10 — Goal checklist with parent reason.** One obvious next action plus compact milestones; every chore retains its parent reason and deep dependencies stay behind progressive disclosure. PR #124 / `b416c80700847aaefb828081f4f9728a9dd37977`.

## Phase 6 — Preflight integration

- [x] **BETA-11 — Activity preflight composition.** Use the active ship and ESI-visible accessible cargo/fit evidence to check activity-specific ammunition, drones, repair paste, probes, filaments, scripts, cap charges, and other established requirements. Existing composed behavior was reconciled and locked with focused regression coverage in PR #126 / `a475fffab1600c878994bc6dc91161bbc87398b1`.
- [x] **BETA-12 — Ship/fit suitability and blocker severity.** Provenance-backed fit requirements now distinguish required missing/offline blockers from non-fatal improvements and unresolved online state; damage mismatch requires sourced expectations; better-owned-ship suggestions require positive accessibility and suitability evidence. PR #128 / `4dc432eeba8570c969c028741f7b55202c4dfb51`.
- [x] **BETA-13 — Final preflight summary.** Shared fail-closed summary now finishes with **Preflight complete / No known blockers** only when supported blockers, unknowns, and required manual confirmations are resolved; known blockers and unverifiable evidence remain explicit, and completion is never a safety guarantee. PR #130 / `d049bdec8ae1894b601b6ee85309f0215893e7d7`.

## Phase 7 — Validation and security

- [x] **BETA-14 — SSO/token security review.** Current CCP SSO boundaries reviewed; PKCE/state/session/token handling hardened; sensitive-value regression tests prove representative codes, verifiers, tokens, and session IDs do not appear in callback logs or browser redirect responses. PR #132 / `17c389410fc0d021395235e9a69fd330639cb565`.
- [ ] **BETA-15 — Portable/degraded-state validation.** Exercise hauling and industry in the portable Windows release and test degraded ESI, market-source, and static-database behavior.
- [ ] **BETA-16 — End-to-end integration test.** Exercise `Connect/demo → Suggested Session → Goal → Acquire → Fit → Preflight`, including an unknown-data case, owned-part reuse, a non-market acquisition boundary, and relevant persistence.
- [ ] **BETA-17 — New-player usability checkpoint.** Test with a genuinely new EVE/NEC player and verify important recommendations against supported SDE/ESI/game evidence where applicable.

## Phase 8 — Cleanup and focused beta release

- [ ] **BETA-18 — Build/lint/updater cleanup.** Resolve the updater bundle-tracing warning and focused-beta baseline lint warnings without masking real problems.
- [ ] **BETA-19 — User-facing documentation.** Update README, current screenshots, `download → connect/demo → start` guide, privacy notes, external data sources, and ESI limitations.
- [ ] **BETA-20 — Focused beta release.** Build the Windows release candidate, perform clean-install/update/rollback tests, publish through the normal stable updater path, and collect player feedback before resuming feature growth.

---

## Focused-beta manual checkpoint

Before BETA-20 is complete, manually exercise the installed-app path required by `docs/END_STATE_EXPERIENCE.md`, including primary/different Suggested Session recommendations, Why-this evidence, goal planning, owned-part reuse, a non-market acquisition path, fit/assembly guidance, blocker-vs-improvement preflight, degraded/unknown state, persistence across restart, and a genuinely new-player usability pass.

## Completion rule

The focused beta is complete only when BETA-01 through BETA-20 are complete, CI and security/release validation pass, the installed-app end-to-end workflow is understandable and functional, required uncertainty remains honest, and the focused-beta manual checkpoint has passed.

## Post-beta backlog

Resume only after focused-beta player feedback: NEC Campaigns, Story Guide, Epic Arc expansion, additional activity categories, large visual redesigns, and other unrelated legacy-roadmap feature growth.
