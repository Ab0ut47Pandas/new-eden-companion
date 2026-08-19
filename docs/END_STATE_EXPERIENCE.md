# New Eden Companion — End-State Experience Requirements

These are product-level requirements that must exist before the progression-coach roadmap is considered complete. They are intentionally written separately from implementation details so later roadmap work can choose the correct underlying systems without losing the player-facing goal.

## Suggested session

NEC should be able to answer **“What should I do in EVE right now?”** with a short, coherent suggested session rather than a flat list of unrelated recommendations.

A suggested session should:

- use the character’s evaluated readiness, saved goals, current/known location, ESI-visible assets/ship state, useful supplies, and local experience milestones where available;
- optionally respect a user-provided time budget or session intent when that information is available, without inventing a duration when it is not;
- produce a small ordered plan, such as preparation -> primary activity -> useful follow-up, rather than dumping every eligible activity;
- explain **why each step was selected** and what it progresses or teaches;
- offer a fallback when a recommended step is blocked by missing data, skills, supplies, ISK, location, or another prerequisite;
- link each activity step into the normal activity briefing/readiness flow so the user can immediately answer “what do I need?” and “how do I start?”;
- remain useful when NEC lacks enough information by saying what it needs instead of fabricating confidence.

Example shape (not fixed UI copy):

1. Buy/collect the missing supplies for a T1 Abyssal run.
2. Run one or two Calm Electrical sites with the vetted fit your character can use.
3. Review the loot/debrief and decide what supports your current goal.

## Try something new

NEC should also be able to answer **“What is something different I could try?”**

This suggestion should:

- prefer activities the character appears technically capable of starting or can reach with modest preparation;
- deliberately diversify across activity families instead of repeatedly recommending the same thing the normal recommender already favors;
- explain what the activity is, why it may be interesting, what the character already has going for them, and the smallest next step required to try it;
- use explicit local experience milestones and user feedback such as `tried`, `not interested`, or equivalent when available;
- **never claim NEC knows that the player has never done an activity merely because ESI does not expose that history**;
- allow the user to dismiss/not-interest an activity so “try something new” does not repeatedly nag them with the same suggestion;
- link directly into that activity’s beginner briefing/readiness page.

## Completion requirement

Before the progression-coach release candidate is considered complete, both **Suggested session** and **Try something new** must be surfaced in the user-facing home/progression experience, have explainable recommendations, preserve unknown data honestly, and pass a real-user usability checkpoint.