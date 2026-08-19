# New Eden Companion — End-State Experience

This document defines product outcomes that are mandatory before `REL-01` can be considered complete. They are not aspirational extras. The roadmap must retain explicit work items for them, and the final progression-coach release candidate must be manually exercised in the installed app.

## Suggested session

NEC must offer a user-facing **Suggested session** that composes a short, explainable plan for what the connected character can realistically do right now.

The plan should:

- use current character/readiness evidence rather than generic activity popularity;
- present a small ordered session instead of an undifferentiated activity list;
- explain why each step is being suggested;
- surface preparation/blockers when the best next action is not immediately runnable;
- preserve unknowns when ESI or NEC knowledge cannot establish a fact;
- never imply that NEC can see live gameplay or prove completion when it cannot.

## Try something new

NEC must offer a **Try something new** suggestion that deliberately diversifies away from the user's usual/current recommendations.

It must:

- use available local feedback such as `tried`, `not interested`, and explicit goals;
- avoid claiming that ESI exposes complete play history;
- explain why the alternative is plausible for the character;
- respect readiness and acquisition constraints instead of recommending novelty at any cost;
- allow the user to dismiss or mark suggestions as tried/not interested locally.

## NEC Campaigns

NEC must provide an optional quest-style progression layer made from real EVE activities.

Campaigns must include:

- chapters containing small, concrete objectives;
- readiness, acquisition, fitting, and briefing help linked to the existing NEC systems;
- explicit local/manual completion when ESI cannot prove an objective happened;
- meaningful NEC-local milestones and progression feedback;
- no fabricated in-game rewards, mission state, standings consequences, loot, or completion claims;
- honest distinction between what NEC observed from ESI, what the user confirmed, and what remains unknown.

At least one coherent campaign must ship far enough to validate the chapter/objective/progression experience end to end.

## Story Guide mode

NEC must provide **Story Guide** mode for real EVE narrative content.

Before `REL-01`, at least one current Epic Arc must be implemented as a fully guided vertical slice with:

- spoiler-light arc overview and entry requirements;
- character-specific preflight/readiness;
- mission/chapter navigation;
- an optional detailed walkthrough rather than forcing spoilers up front;
- sourced branches, choices, consequences, and rewards only where they can be established;
- validated fit guidance appropriate to the covered content;
- local manual guide state where ESI does not expose the player's current mission or completion state;
- no invented quest state, narrative consequences, or rewards.

## Manual end-state checkpoint

Before `REL-01` is complete, Nate must manually test the installed application for these end-state workflows. Automated tests and CI are necessary but not sufficient for judging whether the composed session, diversification, campaign progression, and Story Guide interactions are actually understandable and useful.

The checkpoint should exercise at minimum:

1. generating and following a Suggested session;
2. requesting a Try something new alternative and recording feedback;
3. progressing through multiple NEC Campaign objectives, including at least one manually confirmed objective;
4. navigating the guided Epic Arc slice from spoiler-light overview into detailed mission help;
5. confirming that unknown/unobservable state is presented honestly rather than inferred;
6. restarting the installed app and confirming local campaign/story progress persists correctly.
