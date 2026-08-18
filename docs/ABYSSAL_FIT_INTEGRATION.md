# Vetted Abyssal fit integration

ABY-06 makes the existing dedicated Abyssal fit library the single source of fit identity for the briefing and readiness layers.

## One catalog, not parallel mappings

`VETTED_ABYSSAL_FIT_RULES` maps every sourced fit in `src/lib/ships/abyssal-fits.ts` to explicit progression metadata:

| Fit | Weather | Validated tiers | Entry format |
| --- | --- | --- | --- |
| Kestrel T0 community | Dark | T0 | frigate / 3 filaments |
| Punisher T0 community | Electrical | T0 | frigate / 3 filaments |
| Rifter T0 community | Electrical | T0 | frigate / 3 filaments |
| Tristan T0 A2O | Electrical | T0 | frigate / 3 filaments |
| Hookbill T1 | Dark | T1 | frigate / 3 filaments |
| Worm T1 A2O | Electrical | T1 | frigate / 3 filaments |
| Passive Gamma Gila | Gamma | T2/T3, primary T3 | cruiser / 1 filament |
| Active Electrical Gila | Electrical | T4 | cruiser / 1 filament |

The passive Gamma Gila preserves the source-backed T2/T3 usage and explicit T3 cap. It is not silently promoted to T4. The active Electrical Gila is recorded as T4 only; ABY-06 does not infer T5 suitability.

## Briefing integration

The T0/T1 first-run picker no longer carries its own hardcoded fit-to-tier/weather table. It filters the central vetted catalog for frigate profiles whose primary tier is T0 or T1.

The existing fit loadout, supplies, source URL, EFT text, and validation note remain attached to the same profile. The activity briefing therefore cannot drift to a different weather or tier while still displaying the old fit source.

## Readiness integration

`buildVettedAbyssalFitReadiness` feeds the catalog into ABY-05:

- unknown fit ID -> fit suitability remains unknown;
- wrong weather -> fit suitability is unmet;
- target tier outside the profile's validated tiers -> fit suitability is unmet;
- supported tier/weather -> fit suitability is met;
- frigate/three-filament and cruiser/one-filament profiles satisfy the known entry-format eligibility check.

The remaining player-specific inputs — trained skills, owned supplies, replacement capacity, prior-tier experience, and actual filament availability — are still separate evidence. A valid catalog fit does not turn those unknowns into passes.

## User-facing page

`/activities/abyssal` now uses the catalog in three places:

1. the T0/T1 first-run fit selector;
2. the activity briefing/readiness explanation;
3. a complete progression-fit catalog showing weather, entry format, validated tiers, validation notes, and source links.

Until the live character adapters feed the remaining readiness dimensions on this page, those dimensions are shown as unknown. This is intentional: ABY-06 completes the fit/readiness policy integration without fabricating character state.

## Integrity checks

The catalog validator requires every rule to resolve to an actual fit and complete source metadata, requires the primary tier to be inside the validated tier set, rejects invalid tier bounds, and keeps unknown IDs unknown instead of substituting a similar hull.
