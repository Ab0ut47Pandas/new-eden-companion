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

## Advanced fleet tactics board

After the two-ship teaching loop works, Combat School should support advanced multi-ship scenarios rather than treating every engagement as a collection of isolated 1v1s.

The advanced mode should support at least:

- **2v2** and **4v4** team scenarios;
- asymmetric small-gang scenarios when the matchup model can evaluate them safely;
- multi-team scenarios such as **2v2v2** where third-party pressure and target selection materially change the tactical answer;
- up to roughly **8 displayed ships** in a single teaching board when the UI remains readable.

The UI should behave like a tactical graph. Each ship is a node with its fit/role visible, and the player should be able to draw or assign directed relationships from a module or ship to another ship. Examples include:

- offensive damage / primary target;
- warp disruption or scrambling;
- stasis webification;
- energy neutralization or nosferatu pressure where supported;
- target painting;
- sensor dampening;
- tracking disruption or guidance disruption;
- ECM or other supported EWAR;
- remote repairs or capacitor support;
- drones or other separately assignable offensive pressure when NEC can model the relationship reliably.

The point is not merely to ask **“who wins?”**. It should ask the player to construct a tactical plan such as:

- Which enemy should be primary?
- Which ship should tackle which target?
- Which hostile ship should receive the web/neut/damp/paint?
- Which friendly ship needs logistics support first?
- Is the team's EWAR duplicated inefficiently on one target while another dangerous ship is untouched?
- Which hostile support ship should be disabled before focusing raw DPS?
- Which ship should disengage, kite, screen, or hold tackle rather than join the primary damage target?
- In a three-team fight, is it better to pressure one side, disengage, or allow the other two teams to trade resources first under the displayed assumptions?

After submission, NEC should compare the player's relationship graph against the deterministic tactical model and explain **why each assignment helps, wastes an effect, conflicts with another assignment, or leaves an important threat unanswered**.

The board should visually distinguish different relationship types so a player can understand the engagement at a glance, but the implementation must not rely on color alone. Hover/click details should explain the exact module, target, supported effect, range/activation assumptions, and why the connection is tactically relevant.

A multi-ship answer does not need to have one globally optimal plan when several plans are defensible. Scored scenarios should only be used when the displayed conditions produce a clearly defensible answer or clearly invalid assignments. Otherwise NEC should grade individual relationships and tradeoffs rather than inventing a single perfect fleet solution.

Advanced Combat School should reuse the same fit identity, fitting, PVP matchup, and tactical explanation engines as normal NEC guidance. It should never maintain a separate set of canned fleet rules that can drift away from the real calculator/model.

## Data and safety rules

- Do not generate a scored question unless exactly one answer is defensible under the displayed assumptions.
- For multi-ship scenarios, individual tactical assignments may be scored separately when multiple overall plans are defensible; do not force a fake single optimum.
- State the engagement assumptions needed to make the question answerable: range, propulsion/tackle state, relevant damage type, fleet positions, initial locks/targets, or other material conditions.
- Never invent hidden pilot skill, implants, heat state, manual piloting quality, incoming fleet support, broadcasts, target locks, positioning, or other unavailable combat state.
- Do not present fake win percentages.
- Distinguish **advantage under these conditions** from **guaranteed winner**.
- Use the same deterministic fitting and matchup engines as FIT-01 through FIT-06 and PVP-01/PVP-02 so quiz answers cannot disagree with NEC's normal tactical explanations.

## Completion requirement

Before the progression-coach release candidate is considered complete, Combat School must include at least one usable interactive two-ship matchup quiz vertical slice based on validated fits, with explainable answer feedback and a real-user usability checkpoint. The advanced fleet tactics board is a planned expansion after that first teaching loop unless development capacity allows it to land before release; its data model and UI should be designed so 2v2 and larger scenarios do not require replacing the core combat-training architecture.
