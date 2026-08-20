# Fit identity classifier

FIT-04 turns validated fitting facts into explainable **role evidence**. It is not a matchup predictor and it does not assign win percentages.

## Evidence boundary

The classifier accepts already-resolved facts from the fitting/Dogma layer. It does not identify modules from names, guess ranges, or assume an unsupported Dogma effect. Every classification input must carry provenance.

Current CCP mechanics were rechecked before defining the range relationships:

- CCP Support, **Warp Scrambling and Warp Disruption**: scramblers and disruptors both prevent warp; scramblers additionally disable microwarpdrives/micro jump drives, while disruptors operate at a longer optimal range. https://support.eveonline.com/hc/en-us/articles/115004925705-Warp-Scrambling-and-Warp-Disruption
- CCP Support, **Fitting Simulator**: simulated fittings feed module status into the same detailed fitting statistics as the normal fitting window. https://support.eveonline.com/hc/en-us/articles/212694909-Fitting-Simulator

No fixed scram, web, disruptor, or weapon range is encoded here. Those values can vary with type, skills, bonuses, effects, scripts, and future balance changes, so FIT-04 compares only ranges supplied by a validated resolver.

## Combat identities

The model scores evidence for:

- **brawler** — weapon preference is inside established short tackle; stronger evidence when it is also inside an established web envelope;
- **scram-kiter** — weapon preference is outside the fit's established web envelope but inside its established scram envelope;
- **kiter** — weapon preference is outside an established scram envelope but inside an established disruptor envelope, or weaker evidence when it is simply inside a supported long-point envelope and no short boundary is known;
- **sniper** — weapon preference extends beyond the fit's established tackle envelope;
- **tackle** — supported scram/disruptor evidence is present;
- **EWAR**, **neut**, and **logi** — only explicit supported capability evidence can add these roles;
- **other** — no supported evidence establishes a more specific role.

Scores are evidence weights used to order explanations, not probabilities. A tie deliberately produces no single primary role.

## Tank identity

Tank style is classified only from explicit evidence for local repair/boosting, buffer, or passive recharge. Multiple supported styles become **hybrid**. Missing evidence remains **unknown**.

## Deliberate non-claims

FIT-04 does not claim:

- that a classified role is good or bad;
- that the fit can control range against a specific opponent;
- that paper weapon range equals applied damage;
- that tackle guarantees a target cannot escape;
- that a role predicts a matchup result;
- that missing evidence means a capability is absent.

Those questions belong to FIT-05/FIT-06 and the later PVP model, using explicit uncertainty throughout.
