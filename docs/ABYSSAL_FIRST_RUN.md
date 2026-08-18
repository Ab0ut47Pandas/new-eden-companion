# Abyssal T0/T1 first-run briefing

ABY-03 turns the generic activity briefing framework into a concrete low-tier Abyssal guide without creating a second fit library or a second readiness engine.

## Vetted starter choices

The first-run adapter consumes the existing `ABYSSAL_TASKS` fit library and exposes only the already-vetted T0/T1 frigate options:

- T0 Dark Kestrel
- T0 Electrical Punisher
- T0 Electrical Rifter
- T0 Electrical Tristan
- T1 Dark Caldari Navy Hookbill
- T1 Electrical Worm

Each option keeps its existing loadout, supplies, fit-source URL, and validation note. Higher-tier Gila fits are deliberately excluded from the first-run picker.

ABY-03 does not reinterpret the fit's tier or weather from its prose. The supported first-run fit IDs are explicitly mapped to T0/T1 and Dark/Electrical so a renamed description cannot silently change the activity rules.

## Current activation guidance

For a simple beginner workflow, the briefing tells both T0 and T1 pilots to use 0.8 security or lower. This is a conservative common location that works for both tiers without a suspect flag under CCP's published high-security Abyss rules.

CCP changed T0 activation again in 2026: T0 filaments are now permitted in 0.9 and 1.0 security systems. CCP subsequently fixed a defect that had incorrectly allowed filaments above T0 in 0.9. The briefing therefore tells T0 pilots that 0.9/1.0 are additionally available, while T1 remains restricted from 0.9.

The selected starter fits are frigates, so the guide uses the cooperative-trace workflow: be in a fleet and carry three matching filaments of the same type and tier. The current CCP help article states that cooperative traces support up to three frigates or two destroyers and require matching filaments.

## Three-pocket execution model

The briefing presents one site-wide flow rather than three unrelated encounters:

1. Treat the 20-minute expiration timer as absolute.
2. Clear pocket 1; the gate opens after opposition is eliminated.
3. Clear pocket 2 and continue.
4. Clear pocket 3 and leave through the Origin Gate.

CCP's current Abyssal help article documents that gates open once opposition is eliminated, the third gate returns to the point of entry, pocket boundaries damage and eventually destroy ships that stray too far, ship loss also destroys the capsule, and disconnecting does not remove the ship or stop the timer. CCP's current Known & Declared Exploits article explicitly identifies the intended Abyssal expiration timer as 20 minutes.

## Loot boundary

ABY-03 only teaches the first-run safety rule: take caches when doing so does not compromise survival or the timer. It does not yet teach Bioadaptive Cache versus side nodes, loot families, red loot, or keep/sell decisions. Those belong to ABY-04, so unfamiliar drops remain unclassified rather than being auto-sold.

## Readiness boundary

The `/activities/abyssal` page renders the full ACT-01 briefing and ACT-02 compact cheat sheet, but character-specific readiness intentionally remains `not assessed`. ABY-05 will combine the selected fit, character skills, supplies, replacement capacity, and explicit experience milestones before NEC recommends advancing tiers.

This means being able to select or afford a T1 fit is not itself a T1 readiness verdict.

## Sources verified 2026-08-18

- CCP Help Center — `https://support.eveonline.com/hc/en-us/articles/360000852629-Abyssal-Deadspace` — cooperative entry, matching filaments, room gates, boundary, Origin Gate, ship/capsule loss, disconnect behavior.
- CCP Known & Declared Exploits — `https://support.eveonline.com/hc/en-us/articles/204873262-Known-Declared-Exploits` — intended 20-minute Abyssal expiration timer.
- CCP patch notes 23.02 — `https://www.eveonline.com/news/view/patch-notes-version-23-02` — T0 filaments permitted in 0.9 and 1.0 security systems.
- CCP patch notes 24.01 — `https://www.eveonline.com/news/view/patch-notes-version-24-01` — defect fix confirming filaments above T0 are not intended to activate in 0.9 security systems.
- CCP security/Abyss changes — `https://www.eveonline.com/news/view/changes-to-security-status-and-abyssal-filaments` — 0.8 allows T0-T3 without suspect status.
- Existing fit-specific source URLs and validation notes remain in `src/lib/ships/abyssal-fits.ts`.
