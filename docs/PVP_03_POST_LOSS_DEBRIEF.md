# PVP-03 — Killmail / post-loss debrief

PVP-03 turns a CCP-backed loss record plus any validated destroyed-fit and opponent-matchup context into a conservative learning review. It does not reconstruct combat that the evidence cannot establish.

## Current authoritative boundaries

Reviewed 2026-08-20 against CCP primary sources:

- CCP Support, **Killmails**: a killmail records the destroyed pilot/ship, fitted modules and weapons, cargo, time/location, participating pilots, damage received, and estimated loss value. CCP also notes that third-party killboards are incomplete because sharing/export is player controlled.
- CCP EVE Developer Documentation, **ESI Overview / API Explorer**: ESI is the official API and authenticated routes expose only the data and scopes documented by CCP. NEC's recommended scope set already includes `esi-killmails.read_killmails.v1`.
- Existing PVP-01/PVP-02 mechanics remain governed by their current CCP fitting, tackle, and resistance references. PVP-03 adds no new combat formula.

## Model

`src/lib/pvp/post-loss.ts` accepts normalized loss evidence with explicit provenance plus optional:

- destroyed-fit weakness output from FIT-05;
- a PVP-02 matchup briefing;
- explicit evidence that the supplied matchup corresponds to a recorded attacker.

The output contains:

- one highest-priority **primary review factor** when supported;
- bounded secondary factors;
- concrete learning points;
- unknown/unavailable context;
- source provenance and hard limitations.

Factor ordering is review priority, not causal certainty. `recorded-context` means the supplied loss record directly establishes the descriptive fact (for example, multiple player attackers recorded damage). `plausible` means validated fit or matchup evidence could have contributed, but the loss record cannot prove that it did.

## Deliberate non-inferences

A killmail is not a combat replay. PVP-03 does not infer:

- live range or transversal;
- velocity vectors or who actually controlled range;
- module activation, heat, reload state, or ammunition state at each moment;
- capacitor level or neutralizer timing;
- lock state, jams, damps, tracking disruption, remote assistance, boosts, implants, boosters, or command timing unless separately established;
- whether recorded attackers were all applying simultaneously;
- pilot intent, mistakes, reaction time, or an exact event sequence;
- a deterministic cause of death, blame assignment, winner probability, or time-to-loss.

The final-blow flag is never treated as proof of the primary cause. Damage concentration is only descriptive context and may be incomplete when some contributor evidence is unavailable.

## Opponent-fit linkage

A PVP-02 briefing is used only when the caller explicitly marks the opponent linkage `confirmed` and supplies provenance. An arbitrary fit that merely resembles a recorded attacker's hull is not enough. If linkage is unknown or not matched, PVP-03 leaves the tactical matchup unknown instead of borrowing conclusions from the wrong ship.

## UI

`PostLossDebriefView` is a reusable presentation component for later loss-history and Combat School integration. It exposes Why/evidence/caveats, unknown state, and limitations rather than hiding uncertainty behind a confidence percentage.

## Follow-on integration

PVP-03 intentionally provides the evidence/debrief layer without claiming that every loss has enough data for a tactical diagnosis. Later product integration can feed authenticated recent killmails, reconstruct the destroyed fit only from supported item data, invite the player to attach a validated opponent fit where appropriate, and then reuse this model in Combat School or post-loss coaching.
