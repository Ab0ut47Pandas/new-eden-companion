# Planetary Industry static model and ESI boundary

PI-01 establishes only evidence-backed Planetary Industry production relationships. Colony state/readiness remains PI-02 and the recursive player planner remains PI-03.

## Authoritative sources

- CCP Static Data documentation: https://developers.eveonline.com/docs/services/static-data/
- CCP current Static Data download/build metadata: https://developers.eveonline.com/static-data
- CCP ESI API Explorer: https://developers.eveonline.com/api-explorer

The installed static database imports the current CCP JSONL `planetSchematics` dataset. NEC stores schematic ID/name/cycle time, eligible processor pin type IDs, input type IDs and quantities, and output type IDs and quantities. Type references remain linked to the existing `types` table; unresolved official references remain placeholders rather than being guessed.

## Acquisition graph

A PI schematic output becomes a `planetary-industry` acquisition option. The graph records the schematic activity, its exact SDE cycle time, the produced quantity, and every SDE-listed input quantity. If the installed SDE contains no PI schematic that outputs the requested type, NEC leaves the PI relationship unknown instead of inferring one from category, market group, item name, or common player knowledge.

Raw planetary resources are therefore not fabricated as schematic products. Resource extraction/planet availability belongs to later PI planning work and must be established from supported static data and/or explicit user/ESI state before NEC claims a resource can be obtained on a particular planet.

## ESI visibility and scope

Current ESI exposes a character's colony list and per-planet colony detail (pins, routes and links) through the character Planetary Interaction routes in the CCP API Explorer. Those authenticated routes require `esi-planets.manage_planets.v1`.

That scope does **not** make NEC a live PI client. ESI colony data is a server-side snapshot and does not expose the in-game resource heatmap or prove what the player is currently looking at. PI-02 must preserve missing/expired/stale/unsupported state explicitly and must not invent extractor yield, resource density, facility access, or live routing state beyond the returned fields.

## Static database schema

Schema v3 adds:

- `planet_schematics`
- `planet_schematic_pins`
- `planet_schematic_types`

The current-SDE builder and static-data updater require the PI augmentation before a schema-v3 database is accepted. Build metadata records the imported PI dataset and row counts so health/update validation can detect incomplete static artifacts.
