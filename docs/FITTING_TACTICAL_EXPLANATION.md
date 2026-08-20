# FIT-06 tactical explanation boundary

FIT-06 is a presentation and explanation layer over evidence that already exists in the validated fitting stack. It does not add a second combat simulator and it does not manufacture tactical facts from module names.

## Inputs

The tactical briefing consumes:

- FIT-02 deterministic fitting output for modeled legality and raw weapon range primitives;
- FIT-04 identity-classifier output for supported role and tank-style evidence;
- FIT-05 weakness findings for supported contradictions and target/application concerns;
- explicit provenance for every explanation run.

The UI exposes expandable `Why?` sections and evidence/provenance rather than presenting tactical advice as unexplained authority.

## Current CCP mechanics boundary

Rechecked against CCP Support on 2026-08-20:

- **Fitting Simulator**: CCP states that simulated fittings use the same fitting-window behavior as the normal fitting window. This supports using validated deterministic fitting output as fitting evidence, but it does not turn NEC into live client telemetry.
  - https://support.eveonline.com/hc/en-us/articles/212694909-Fitting-Simulator
- **Fitting Window**: CCP documents the fitting window as the place to view and plan fitted equipment and detailed ship attributes. FIT-06 treats modeled fitting attributes as fit facts only, not as target-specific outcome guarantees.
  - https://support.eveonline.com/hc/en-us/articles/213287845-Fitting-Window
- **Warp Scrambling and Warp Disruption**: CCP documents that scramblers and disruptors prevent warp, that scramblers additionally disable MWD/MJD, and that disruptors operate at a longer optimal range than scramblers. FIT-06 only repeats range/tackle conclusions already established by FIT-04/FIT-05 from validated evidence; it does not hard-code arbitrary module ranges.
  - https://support.eveonline.com/hc/en-us/articles/115004925705-Warp-Scrambling-and-Warp-Disruption

## Explicit non-claims

A tactical briefing is not a win probability, safety guarantee, target-state detector, or proof that a fit is optimal. Missing target speed/signature/angular motion, opponent capacitor state, live position, fleet support, heat, implants, boosters, environment effects, and unsupported Dogma mechanics remain unknown unless a later validated subsystem supplies them.

If no weakness rule fires, the UI says only that no **supported contradiction** was detected from the supplied evidence. It does not say that nothing can ruin the fit's plan.

The current FIT-03 builder catalog is intentionally narrow. Where that catalog cannot establish a preferred tactical range, tank style, tackle responsibility, application, or other plan facts, FIT-06 shows those gaps instead of reverse-engineering intent from the item name or raw fitting stats.
