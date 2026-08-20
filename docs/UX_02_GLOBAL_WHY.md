# UX-02 — Global Why? affordance

UX-02 standardizes the player-facing explanation disclosure used by NEC decisions. The shared `WhyDetails` component separates four kinds of information instead of flattening them into one plausible-sounding paragraph:

- **Rule** — the deterministic policy or interpretation boundary that produced the decision.
- **Reasoning** — the concise explanation for this specific result.
- **Evidence** — supported facts actually supplied to the rule.
- **Source / provenance** and **Not established** — where the evidence came from and what NEC still cannot prove.

The first integration covers the roadmap-required decision families:

- progression recommendations on the connected-character home experience;
- activity readiness explanations and individual briefing reasons;
- asset Keep / Review / Haul / Sell decisions, including the conservative Sell threshold;
- fit identity classification and tactical warning/explanation cards.

This work does **not** add or revise EVE mechanics, SDE/ESI interpretation, fitting formulas, market logic, safety claims, or acquisition sources. Existing domain engines remain the source of truth; UX-02 exposes their already-supported evidence consistently. Unknowns remain explicit and an empty explanation never becomes fabricated evidence.
