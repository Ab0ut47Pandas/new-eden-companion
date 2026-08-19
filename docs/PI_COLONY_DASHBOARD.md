# Planetary Industry colony dashboard

PI-02 adds a character-specific colony attention view on top of the PI-01 static production model.

## Authoritative source boundary

Current ESI exposes a character colony list plus per-planet colony detail through the authenticated Planetary Industry routes. Those routes require `esi-planets.manage_planets.v1`; NEC includes that scope in the recommended personal profile for new or re-authorized sessions.

CCP's Planetary Industry developer guide documents extractor calculation inputs returned by the PI endpoint, including install/expiry timing, cycle time and quantity per cycle. NEC uses returned expiry timing only to surface expired or soon-expiring extractor programs. The six-hour "expires soon" threshold is an NEC attention choice, not an EVE mechanic or failure boundary.

## What the dashboard assesses

For each ESI-visible colony NEC reports:

- the colony snapshot update time;
- pin, link and route counts;
- extractor programs with returned expiry state;
- factories that have no visible inbound route;
- factories whose routes are visible but whose future supply cannot be proven;
- pins with visible stored contents and no visible outgoing route.

These are evidence-backed attention signals, not claims about live production.

## Unknown-state policy

NEC does **not** infer any of the following from the colony snapshot:

- the in-game planetary resource heatmap or current resource density;
- live client state or what the player is looking at;
- future extractor output beyond returned API evidence;
- guaranteed factory starvation or continuous production;
- storage capacity/fullness when it has not been established;
- route safety, facility access, or live threats.

If the colony list cannot be read, the UI asks the user to reconnect the recommended EVE permissions. If an individual colony detail request fails, that colony remains `Partly unknown` rather than being treated as healthy or broken.

## Follow-up

PI-03 remains responsible for turning the static schematic graph plus character colony state into a production planner. PI-02 deliberately does not invent planet suitability or missing extraction chains merely because a schematic requires an input.
