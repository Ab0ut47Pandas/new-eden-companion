# HAU-02 — Trade-run optimizer and risk-aware routing

Last reviewed: 2026-08-19

## Player goal

HAU-02 answers a narrower, actionable question than the earlier sell-here-versus-haul helper:

> I am willing to make a real trade run. Given this ship's actual cargo capacity and this amount of ISK, what should I carry between supported trade hubs, and is there a reasonable alternate route around currently elevated exposure?

The default player flow is `/activities/hauling/trade-run`. A manual candidate-basket flow remains at `/activities/hauling/trade-run/custom` for players who want to compare specific items.

## Market data pipeline

The planner deliberately separates **discovery** from **verification**:

1. Fuzzwork's aggregate market snapshot is streamed and used only to discover broad region-to-region spread candidates.
2. Fuzzwork's exact-station aggregate endpoint refines that shortlist for the selected NPC trade hubs.
3. At most 16 finalists are fetched again from CCP ESI regional market orders and filtered to the exact origin and destination stations.
4. Only the CCP ESI exact-station order depth is allowed to determine recommended quantities and final profit output.

This avoids attempting an abusive full-universe ESI order scan while also avoiding a recommendation whose final price comes only from a third-party aggregate.

Current sources:

- CCP ESI / market API and current rate-limit guidance: https://developers.eveonline.com/
- CCP broker fee and sales tax support article: https://support.eveonline.com/hc/en-us/articles/203218962-Broker-Fee-and-Sales-Tax
- Fuzzwork Market Data API / aggregate snapshot: https://market.fuzzwork.co.uk/api/

### Current transaction model

The first HAU-02 run model is deliberately conservative and simple:

- buy immediately from visible sell orders at the exact origin station;
- transport the purchased cargo;
- sell immediately into visible buy orders at the exact destination station;
- deduct the user-supplied sales-tax rate from destination revenue;
- do not add broker/relist fees because this path does not create a new market order;
- do not estimate future sell-order fill time, future competition, or speculative price movement.

The UI starts at 7.5% sales tax but tells the player to use the actual rate shown by EVE for their character. The optimizer walks marginal depth rather than multiplying the single best price by the entire cargo quantity.

Destination buy orders with a minimum-volume requirement above one unit are currently excluded from the exact-depth candidate service. This is conservative: NEC may miss a valid opportunity rather than pretending the optimizer satisfies an order minimum it does not yet model.

## Cargo optimization

The optimizer considers:

- actual fitted cargo capacity entered by the player;
- available investment capital;
- exact visible origin sell depth;
- exact visible destination buy depth;
- item volume;
- sales tax;
- selected objective: maximum ISK per trip, maximum ISK per m3, maximum ROI, or balanced.

It is a deterministic bounded marginal-fill optimizer. It compares several ordering strategies and respects cargo/capital/depth constraints, but it does not claim a formal mathematical proof that the selected basket is the globally optimal integer portfolio across every possible EVE item.

## Custom route model

CCP's route-calculation documentation explicitly recommends building a custom pathfinder from SDE `mapSolarSystems` and `mapStargates` when an application needs more control than the standard route preferences. HAU-02 therefore upgrades NEC's replaceable static database to schema 2 and stores the static stargate graph.

Current route source:

- CCP route calculation / SDE guidance: https://developers.eveonline.com/docs/services/esi/routes/
- CCP SDE: https://developers.eveonline.com/docs/services/sde/

The static-data updater treats schema 1 as outdated even when its CCP SDE build number is current. It rebuilds the database with schema 2 before custom route planning becomes available.

### Route choices

The player can choose:

- `fastest` — minimum static stargate count;
- `balanced` — moderate security/activity penalties;
- `lower-exposure` — stronger security/activity penalties;
- explicit avoid systems;
- an upper bound on extra jumps;
- high-sec-only intermediate systems.

The route rank combines static security status with current CCP ESI `system_kills` and `system_jumps` snapshots. Ship/pod losses are traffic-normalized into an **exposure ranking weight**.

That weight is intentionally **not** presented as a probability of being ganked. It is not a safety guarantee and does not see Local, d-scan, a live gate camp, the cargo value attracting attackers, the pilot's behavior, delayed/unpublished kills, dynamic connections, or every character-specific access restriction.

## Sending the custom route to EVE

Before writing a route, NEC validates that:

- every supplied system exists in the installed static route graph;
- every consecutive pair is a real SDE stargate edge;
- the sequence is bounded to 100 systems.

With `esi-ui.write_waypoint.v1`, NEC then writes the validated sequence through ESI's autopilot-waypoint UI endpoint. The default Trade Run action replaces the existing EVE route with the exact selected path.

## Player-facing safety / uncertainty rules

- Market orders can move between scan, purchase, travel, and arrival.
- Broad discovery is allowed to use Fuzzwork only as a shortlist; final quantities/profit require CCP ESI exact-station order depth.
- The route exposure index is never a gank probability.
- No route is described as safe or ungankable.
- If route-topology schema 2 is not installed, NEC tells the user to update Static Data instead of silently using a weaker substitute.
- If a selected avoid/security/detour policy produces no path, NEC reports that rather than relaxing the policy without permission.

## Manual checkpoint after merge

Before moving on to IND-01, test the installed/portable app beside EVE:

1. Confirm the bottom shortcut cluster exposes both **Hauling** and **Trade Run** without overlapping Asset Cleanup or Abyssal Guide.
2. Open Trade Run and enter the actual cargo capacity from a fitted hauler.
3. Choose two different supported hubs and a realistic amount of investment ISK.
4. Run **Find best cargo now** and confirm the result clearly shows quantity, cargo used, capital used, tax, and estimated net profit.
5. Compare at least `fastest` and `lower exposure` routes.
6. Search for and add an avoid system, then confirm it is not present in the returned route.
7. If connected with waypoint permission, use **Replace my EVE route with this exact path** and confirm EVE receives the same sequence.
8. Report any confusing wording, impossible market result, missing route, overlapping control, or discrepancy between NEC's route and the route visible in EVE.
