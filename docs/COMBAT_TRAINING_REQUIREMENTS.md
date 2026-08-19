# New Eden Companion — Combat Training Requirements

NEC should include an interactive **Combat School / Matchup Quiz** that teaches players how to read ships and fittings instead of only presenting finished recommendations.

## Core experience

A quiz round should present two concrete ships with validated fits and ask the player to reason about the engagement. Questions should be generated only from deterministic fitting/matchup data NEC can actually support.

The training flow should support questions such as:

- **Who has the advantage?** Evaluate at explicit engagement conditions such as 5 km, 15 km, or 30 km rather than asking for a context-free winner.
- **What is each ship trying to do?** Identify explainable fit identities such as brawler, scram-kiter, kiter, sniper, tackle, active tank, buffer tank, passive tank, neut pressure, EWAR, logistics, or other supported roles.
- **Which modules on this fit directly help against the opponent?** Let the player select modules from the displayed fitting and explain the relevant interaction.
- **What is the biggest threat on the opposing fit?** Identify the module/system or engagement condition that most directly undermines the player's plan when evidence supports it.
- **What range should you try to hold or avoid?** Use validated weapon/application/tackle/mobility envelopes rather than generic range advice.
- **Should you take the fight at all?** `Avoid this engagement` or `No meaningful counter on this fit` must be valid outcomes when supported by the matchup model.

## Teaching behavior

After each answer NEC should explain the reasoning in plain language, for example:

- a web matters because the opposing plan depends on maintaining speed;
- a neutralizer matters because the opposing active tank or propulsion is capacitor-dependent;
- a tracking/application module matters because raw DPS is not useful if weapons cannot apply effectively;
- a scrambler changes propulsion/range-control assumptions when the opponent relies on an MWD;
- a resist or tank module may blunt a known damage profile but does not automatically create range control;
- sometimes no module is a true counter and the correct lesson is to disengage or avoid taking the fight.

The explanation must expose the actual supporting fit facts rather than treating the answer key as magic.

## Difficulty progression

Training should progress from simple, visually obvious relationships to more complex tradeoffs:

1. module recognition and role basics;
2. range-control and tackle relationships;
3. tank and damage-profile interactions;
4. capacitor/neut dependence;
5. weapon application, tracking, explosion/application, drones, and mobility;
6. complete two-fit matchup reasoning with multiple interacting advantages and disadvantages.

The player should be able to practice by activity/role (for example frigate PvP, mission ships, Abyssal fits) and eventually use their own saved/current fit against representative opponents when the deterministic fitting engine supports it.

## Data and safety rules

- Do not generate a scored question unless exactly one answer is defensible under the displayed assumptions.
- State the engagement assumptions needed to make the question answerable: range, propulsion/tackle state, relevant damage type, or other material conditions.
- Never invent hidden pilot skill, implants, heat state, manual piloting quality, incoming fleet support, or other unavailable combat state.
- Do not present fake win percentages.
- Distinguish **advantage under these conditions** from **guaranteed winner**.
- Use the same deterministic fitting and matchup engines as FIT-01 through FIT-06 and PVP-01/PVP-02 so quiz answers cannot disagree with NEC's normal tactical explanations.

## Completion requirement

Before the progression-coach release candidate is considered complete, Combat School must include at least one usable interactive matchup quiz vertical slice based on validated fits, with explainable answer feedback and a real-user usability checkpoint. Advanced expansion can continue after release, but the teaching loop must exist rather than remain documentation-only.
