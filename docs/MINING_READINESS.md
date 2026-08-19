# Mining readiness integration

`MIN-01` connects NEC's existing resource-specific mining fit catalog to the standard readiness engine instead of creating a second mining ruleset.

## Current authoritative baseline

Primary source reviewed 2026-08-19:

- CCP Support — Introduction to Mining: https://support.eveonline.com/hc/en-us/articles/23655785488668-Introduction-to-Mining

The integration relies only on broad current CCP-supported mining behavior at this layer: mining requires an appropriate ship/fit and skills, different resources and environments require different equipment/knowledge, miners need to account for supplies and access to the resource, and ESI does not provide NEC with live asteroid/site awareness.

Resource-specific fits remain in `src/lib/ships/mining-fits.ts`; their own source/validation metadata remains responsible for the exact hull/module/crystal claims encoded there.

## What MIN-01 adds

`assessMiningReadiness()` takes a selected `MINING_TASKS` resource target and overlays:

- the existing `recommendFits()` hull/fit/skill evaluation;
- owned-hull preference already present in the task planner;
- hard required-skill blockers and softer support-skill targets;
- processing-skill assessments exposed separately when the selected fit uses them;
- explicit supply evidence, with missing versus unknown kept distinct;
- explicit location/access evidence, with unknown location left unknown;
- caller-supplied goal reasons explaining why the resource matters.

The result is a normal `ReadinessSnapshot` plus one concrete `nextAction`.

## Unknown-state rules

NEC must not infer any of these merely because a mining task is selected:

- that a suitable asteroid belt, anomaly, gas site, ice field, moon extraction site, or other resource is currently available;
- that the player has the fit's listed supplies unless reliable inventory evidence is supplied;
- that a resource matters to an active goal unless a saved goal/dependency or user reason establishes that relationship;
- that readiness or a defensive fit makes mining safe.

When those facts are missing, the readiness result remains unknown or asks the player to verify the relevant prerequisite.

## Scope boundary

`MIN-01` is the progression/readiness bridge. It does not complete the later `HAB-01` good-habits mining experience, live-site discovery, fleet-mining orchestration, reprocessing economics, or hauling optimization.
