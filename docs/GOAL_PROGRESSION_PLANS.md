# Goal-mode progression plans

RDY-07 turns a selected item or activity goal into an ordered dependency plan. The plan is a directed acyclic graph rather than a forced linear checklist, because some preparation can happen in parallel.

## Goal and nodes

A plan has one selected goal whose `targetNodeId` points at the final node. Nodes can represent:

- activities;
- items/ships;
- skills;
- supplies;
- experience milestones;
- knowledge/preparation;
- financial preparation;
- location/access work;
- generic corrective actions.

Every node has a stable ID, title, `why`, explicit state, and dependency IDs. Item/activity nodes may retain their type/activity identifiers so later UI can link back into NEC.

## Explicit current state

Node state is one of:

- `complete` — upstream logic or explicit player state established completion;
- `incomplete` — the work remains to be done;
- `unknown` — NEC cannot establish current completion.

**Readiness is not completion.** An activity can be fully ready and still be an incomplete goal step until the player actually does it. Conversely, a player may explicitly confirm completion even if NEC cannot currently reconstruct every historical prerequisite.

## Step status

For the selected goal's reachable dependency graph, NEC produces:

- `done` — the node is explicitly complete;
- `next` — the node is incomplete and every immediate dependency is explicitly complete;
- `later` — the node is incomplete but at least one immediate dependency remains incomplete;
- `unknown` — the node itself or an immediate dependency has unknown completion state.

Multiple independent steps may all be `next` at once. NEC does not create fake serial ordering between work that can happen in parallel.

## Plan status

- `complete` — the selected target node is explicitly complete;
- `in-progress` — the goal is incomplete and at least one actionable `next` step exists;
- `unknown` — the target is incomplete, but unresolved state prevents NEC from identifying a safe next step.

## Validation and scope

The graph rejects duplicate node IDs/dependencies, missing dependency references, missing goal targets, self-dependencies, and cycles. Only nodes reachable from the selected goal are returned; unrelated planning nodes do not leak into the route.

Topological output is deterministic so the same dependency graph produces the same presentation order.

## Adapters own domain facts

The generic plan engine contains no EVE recipes, activity rules, or assumptions about what completion means. Later adapters supply nodes from:

- the acquisition graph for item/ship goals;
- the activity prerequisite/readiness system for activity goals;
- explicit local milestone/goal state for player-confirmed completion.

That separation lets NEC generate `current state → missing preparation → ordered dependencies → goal` without turning a readiness recommendation into a fabricated gameplay history.