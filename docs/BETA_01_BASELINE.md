# BETA-01 — Focused beta baseline checkpoint

Baseline date: 2026-08-20
Baseline `main`: `8925450bb9c18a935d65571d4b38027ba7da65e8`
Integration branch: `codex/companion-integration`
Package version: `0.1.16`

## Scope

This checkpoint records current behavior before focused-beta integration work begins. It intentionally changes no product behavior.

The focused-beta product target remains: opening NEC should produce one trustworthy, understandable, achievable answer to **“What should I do right now?”**

## Branch reconciliation

`codex/companion-integration` was advanced to the current `main` merge commit before this checkpoint was started. There were no open pull requests when the baseline was reconciled.

## Baseline executable checks

The repository's normal PR `checks` workflow is the executable baseline for this runtime and runs:

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Windows package database-policy smoke
- Windows detached-updater startup smoke

Observed baseline run: GitHub Actions `checks` run `32348221648` on PR #107.

### Results

- Tests: **PASS** — 75 test files, 404 tests passed.
- Typecheck: **PASS** — `tsc --noEmit` completed successfully.
- Lint: **PASS WITH 2 WARNINGS** — zero errors.
- Production build: **PASS WITH BASELINE WARNINGS** — Next.js production build completed successfully.
- Windows package database-policy smoke: **PASS**.
- Windows updater-startup smoke: **PASS**.

## Existing warnings / known baseline noise

Warnings are recorded separately from failures so later cleanup does not silently redefine the baseline.

### Lint warnings

1. `scripts/update-bootstrap.mjs:3:8` — `path` is defined but never used (`@typescript-eslint/no-unused-vars`).
2. `src/lib/pvp/briefing.ts:1:57` — `MatchupEdge` is defined but never used (`@typescript-eslint/no-unused-vars`).

These are the two focused-beta baseline lint warnings targeted by BETA-18.

### Build/runtime warnings

- Node emits `ExperimentalWarning: SQLite is an experimental feature and might change at any time` during SQLite-backed tests/build page-data collection. This is runtime/toolchain noise, not a test failure.
- Next.js reports no build cache in the clean CI runner. This is expected CI-environment noise and not a product failure.
- Next.js prints its standard anonymous telemetry notice in CI.
- **Updater bundle-tracing warning:** `src/app/api/update/route.ts:102:12` uses dynamic `existsSync(required)` access. Turbopack reports that this causes tracing of the whole project into server output. This is the explicit updater warning targeted by BETA-18 and must not be normalized away.

## Baseline screenshots

Screenshot capture is **not available in the current automation runtime**.

Exact limitation: the local execution container cannot resolve `github.com`, so it cannot clone or install/run the application; the available GitHub connector can read/write repository content and inspect Actions, but it cannot launch/render the NEC UI or capture browser screenshots. No browser/playwright-style UI runtime is exposed here.

Therefore this run cannot truthfully capture the requested homepage, Goals, Fitting, Item Explorer, or representative activity-page screenshots. No screenshots are claimed. This is a runtime limitation, not evidence that the pages were exercised.

Pages that remain required for the later visual regression baseline when an installed/browser-capable runtime is available:

- `/` homepage
- Goals
- `/fitting`
- Item Explorer
- representative existing activity pages (at minimum Abyssal, Mining, Exploration, Missions, Hauling/Trade, Industry/PI where available)

## Baseline route inventory from the successful production build

The build confirms existing routes for the focused-beta integration surface, including `/`, `/goals`, `/fitting`, `/items`, `/items/[typeId]`, Abyssal, Exploration, Hauling/Trade, Industry, Missions, and Planetary Industry pages. Route generation success is not a substitute for visual/manual exercise.

## Baseline interpretation

BETA-01 is a measurement/checkpoint item. Existing lint/build/updater warnings belong to the baseline and should be addressed by their focused-beta cleanup item rather than hidden by changing product behavior during this checkpoint.
