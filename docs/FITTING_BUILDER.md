# FIT-03 Interactive Fitting Builder

The FIT-03 builder exposes the deterministic FIT-02 calculator as a user-facing interactive workflow at `/fitting`.

## Current authoritative data boundary

Verified 2026-08-20 against CCP's current static-data service. Current SDE build: `3424810`.

Primary references:

- CCP Static Data: https://developers.eveonline.com/static-data
- CCP Static Data docs: https://developers.eveonline.com/docs/services/static-data/
- CCP Fitting Simulator support: https://support.eveonline.com/hc/en-us/articles/213811305-Fitting-Simulation

The first catalog intentionally exposes only resolved-Dogma fixture data already validated by FIT-02. The UI does not infer slot type, fitting cost, module effect semantics, charge compatibility, or arbitrary ship statistics from item names. An unresolved rig entry is explicitly a UI slot marker and claims no in-game item or bonus.

## Builder behavior

The builder supports:

- selecting a validated hull;
- adding/removing validated modules and rig-slot entries;
- selecting only explicitly validated charges for a weapon;
- adding/removing drones and editing bay/active quantities;
- immediate FIT-02 recalculation after every edit;
- tri-state fit validity and explicit legality issues;
- supported CPU, powergrid, tank, mobility, capacitor, weapon/range, missile/application-primitive and drone outputs;
- visible unknown metrics and unresolved-effect warnings;
- versioned NEC JSON import/export with fail-closed unknown catalog IDs.

## Deliberate limitations

This is not yet a general Pyfa replacement. Arbitrary SDE/Dogma materialization is not claimed. EFT/Pyfa text import is not claimed. Heat, implants, boosters, fleet effects, abyssal-mutated modules, target application, live client state, unsupported Dogma effect chains, and unresolved charge/module interactions remain unknown.

The initial Rifter sandbox is enough to validate the complete interactive state/edit/recalculate/import/export loop without fabricating broad fitting support. Expanding the catalog safely requires resolved current Dogma semantics and additional whole-fit comparison cases rather than name-based heuristics.
