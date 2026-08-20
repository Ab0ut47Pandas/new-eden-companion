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

Results are recorded below after the PR workflow completes; this document is updated with the observed output rather than assuming success from prior commits.

### Results

- Tests: pending baseline PR workflow
- Typecheck: pending baseline PR workflow
- Lint: pending baseline PR workflow
- Production build: pending baseline PR workflow
- Windows package database-policy smoke: pending baseline PR workflow
- Windows updater-startup smoke: pending baseline PR workflow

## Existing warnings / known baseline noise

Warnings are recorded separately from failures so later cleanup does not silently redefine the baseline.

- Pending capture from the baseline PR workflow.

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

## Baseline interpretation

BETA-01 is a measurement/checkpoint item. Any existing lint/build/updater warnings discovered here belong to the baseline and should be addressed by their focused-beta cleanup item rather than hidden by changing product behavior during this checkpoint.
