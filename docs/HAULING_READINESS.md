# Hauling readiness

`HAU-01` makes hauling a first-class readiness activity instead of treating it only as a hidden dependency of mining, industry, or market work.

## What NEC evaluates

`assessHaulingReadiness` accepts evidence for:

- why the cargo is being moved;
- own-cargo versus courier/freelance hauling;
- candidate ships, including ownership, boarding state, fit readiness, usable cargo capacity, cargo-efficiency/survivability profile, and replacement exposure;
- cargo volume and derived trip count;
- route distance and a caller-supplied exposure label;
- user jump/risk tolerance;
- courier collateral, reward context, and wallet coverage where applicable.

The ship selector deliberately prefers an already-owned, confirmed-usable ship before an unowned alternative, even when the unowned ship could finish the move in fewer trips. This keeps hauling compatible with the first-release owned-part-aware planning requirement instead of quietly turning every move into a shopping list.

## Player-facing HAU-01 workflow

The dedicated `/activities/hauling` page turns the readiness model into an actual beside-EVE workflow. The player chooses own cargo or courier/freelance work, explains why the cargo is moving, selects a ranked starter hauling template, and confirms facts that ESI cannot safely infer such as the fitted ship's usable cargo capacity, actual fit readiness, replacement tolerance, route exposure, and live contract terms. The page then returns the calculated trip count, readiness dimensions, blockers/unknowns, and one next action.

NEC intentionally asks for those missing facts rather than substituting a base hull capacity, security-color assumption, or invented gank probability. HAU-02 remains responsible for automatic trade-run optimization and custom risk-aware routing.

## Unknowns and safety boundaries

Cargo volume, cargo capacity, route distance, route exposure, ship usability, ownership, collateral, wallet coverage, and replacement exposure remain unknown when the caller cannot establish them. NEC does not infer a safe route, a gank probability, hidden live-client threat state, or guaranteed survivability from a hull or fit.

Cargo efficiency and survivability are intentionally separate. A larger hold can reduce trip count without proving that the ship is safer. Likewise, a survivability-oriented profile is not an "ungankable" guarantee.

Route exposure labels are evidence supplied by a caller or later routing system. `HAU-01` evaluates those labels against the user's tolerance; `HAU-02` remains responsible for richer trade-run optimization and risk-aware route construction.

## Courier contracts

CCP documents courier contracts as the formal player-to-player mechanism for moving items between locations. Contract cargo is wrapped for delivery, the accepting courier pays the configured collateral, successful delivery returns that collateral, and a failed contract can transfer the collateral to the issuer. NEC therefore treats known collateral as both an acceptance requirement and real financial exposure rather than as ordinary cargo value.

Authoritative source:

- CCP Help Center, **Courier Contracts**: https://support.eveonline.com/hc/en-us/articles/203218982-Courier-Contracts

NEC does not infer that a courier contract can be completed safely merely because its collateral is affordable. Route/access state, ship replacement exposure, and user tolerance remain separate evidence.

## Freelance delivery jobs

CCP added a `Deliver` contribution method to Freelance Jobs so corporations can request item deliveries directly to a job and freelancers can contribute from their cargo hold. Current Freelance Jobs are discoverable through AIR Opportunities, and ESI exposes public jobs plus authorized character participation data. HAU-01 treats a freelance delivery as a hauling purpose/readiness path; automatic job discovery, ranking, payout optimization, and route construction belong to later opportunity/trade-run work.

Authoritative sources:

- EVE Online, **Freelance Delivery Jobs are Here**: https://www.eveonline.com/news/view/freelance-delivery-jobs-are-here
- CCP Help Center, **Freelance Jobs**: https://support.eveonline.com/hc/en-us/articles/20210930509340-Freelance-Jobs
- EVE Developers, **Introducing: Freelance Jobs**: https://developers.eveonline.com/blog/introducing-freelance-jobs
