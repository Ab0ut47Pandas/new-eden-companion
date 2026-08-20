import type { DamageType, FittingCoreResult, ResistanceVector, TankLayer } from "../fitting/core";
import type { FitIdentityResult } from "../fitting/identity";
import type { FitApplicationEvidence } from "../fitting/weakness";

export type MatchupSide = "you" | "opponent";
export type MatchupEdge = MatchupSide | "contested" | "none" | "unknown";
export type MatchupDimension =
  | "engagement-envelope"
  | "range-control"
  | "tackle"
  | "application"
  | "tank"
  | "capacitor"
  | "mobility"
  | "damage-types"
  | "escape";

export type MatchupPropulsion = "mwd" | "afterburner" | "none" | "unknown";

export interface MatchupTackleEvidence {
  webRangeMeters?: number | null;
  scramRangeMeters?: number | null;
  disruptorRangeMeters?: number | null;
  /** Combined supported warp-disruption strength available to this fit. */
  warpDisruptionStrength?: number | null;
}

export interface MatchupCapWarfareEvidence {
  hasNeutralizer?: boolean | null;
  rangeMeters?: number | null;
  /** Optional resolved drain rate. PVP-01 reports it as evidence but does not predict time-to-cap-out. */
  pressureGjPerSecond?: number | null;
}

export interface MatchupFitEvidence {
  label: string;
  fitting?: FittingCoreResult | null;
  identity?: FitIdentityResult | null;
  preferredRangeMeters?: number | null;
  propulsion?: MatchupPropulsion | null;
  tackle?: MatchupTackleEvidence | null;
  applicationAgainstOpponent?: FitApplicationEvidence | null;
  /** Supported outgoing raw damage composition. Values may be DPS or any other common positive scale. */
  damageProfile?: Partial<Record<DamageType, number | null>> | null;
  /** Primary layer used only for the damage-type interaction comparison. */
  primaryTankLayer?: TankLayer | null;
  /** Explicit resistances when the caller has them. FIT-02 metrics are used as a fallback for shield/armor. */
  tankResistances?: Partial<Record<TankLayer, Partial<ResistanceVector>>> | null;
  /** EHP already evaluated against this specific opponent's supported damage profile. */
  ehpAgainstOpponent?: number | null;
  capacitorDependentSystems?: readonly string[] | null;
  capWarfare?: MatchupCapWarfareEvidence | null;
  /** Current supported warp-core strength; absence remains unknown. */
  warpCoreStrength?: number | null;
  provenance: readonly string[];
}

export interface MatchupDimensionResult {
  dimension: MatchupDimension;
  edge: MatchupEdge;
  summary: string;
  evidence: string[];
  caveats: string[];
}

export interface TwoFitMatchupResult {
  youLabel: string;
  opponentLabel: string;
  dimensions: MatchupDimensionResult[];
  unknowns: string[];
  limitations: string[];
  provenance: string[];
}

const DAMAGE_TYPES: readonly DamageType[] = ["em", "thermal", "kinetic", "explosive"];

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function finitePositive(value: unknown): value is number {
  return finite(value) && value > 0;
}

function finiteNonNegative(value: unknown): value is number {
  return finite(value) && value >= 0;
}

function roundedMeters(value: number): string {
  return `${Math.round(value).toLocaleString()} m`;
}

function knownMaxVelocity(fit: MatchupFitEvidence): number | null {
  const value = fit.fitting?.metrics.maxVelocity;
  return finitePositive(value) ? value : null;
}

function knownCapStable(fit: MatchupFitEvidence): boolean | null {
  const value = fit.fitting?.metrics.capacitorStable;
  if (!finite(value)) return null;
  return value >= 0.999999;
}

function longestTackleRange(tackle: MatchupTackleEvidence | null | undefined): number | null {
  if (!tackle) return null;
  const values = [tackle.scramRangeMeters, tackle.disruptorRangeMeters].filter(finitePositive);
  return values.length ? Math.max(...values) : null;
}

function engagementBand(
  preferredRangeMeters: number | null | undefined,
  opposingTackle: MatchupTackleEvidence | null | undefined,
): { band: "web" | "scram" | "disruptor" | "outside-known-tackle" | "unknown"; evidence: string[] } {
  if (!finitePositive(preferredRangeMeters)) return { band: "unknown", evidence: [] };
  const evidence = [`Preferred range: ${roundedMeters(preferredRangeMeters)}`];
  const web = opposingTackle?.webRangeMeters;
  const scram = opposingTackle?.scramRangeMeters;
  const disruptor = opposingTackle?.disruptorRangeMeters;
  if (finitePositive(web)) evidence.push(`Opposing web range: ${roundedMeters(web)}`);
  if (finitePositive(scram)) evidence.push(`Opposing scram range: ${roundedMeters(scram)}`);
  if (finitePositive(disruptor)) evidence.push(`Opposing disruptor range: ${roundedMeters(disruptor)}`);

  if (finitePositive(web) && preferredRangeMeters <= web) return { band: "web", evidence };
  if (finitePositive(scram) && preferredRangeMeters <= scram) return { band: "scram", evidence };
  if (finitePositive(disruptor) && preferredRangeMeters <= disruptor) return { band: "disruptor", evidence };
  const longest = longestTackleRange(opposingTackle);
  if (longest && preferredRangeMeters > longest) return { band: "outside-known-tackle", evidence };
  return { band: "unknown", evidence };
}

function bandRisk(band: ReturnType<typeof engagementBand>["band"]): number | null {
  if (band === "web") return 3;
  if (band === "scram") return 2;
  if (band === "disruptor") return 1;
  if (band === "outside-known-tackle") return 0;
  return null;
}

function evaluateEngagementEnvelope(you: MatchupFitEvidence, opponent: MatchupFitEvidence): MatchupDimensionResult {
  const youBand = engagementBand(you.preferredRangeMeters, opponent.tackle);
  const opponentBand = engagementBand(opponent.preferredRangeMeters, you.tackle);
  const youRisk = bandRisk(youBand.band);
  const opponentRisk = bandRisk(opponentBand.band);
  if (youRisk === null || opponentRisk === null) {
    return {
      dimension: "engagement-envelope",
      edge: "unknown",
      summary: "One or both preferred engagement ranges cannot be placed reliably inside the opposing fit's established tackle envelope.",
      evidence: [...youBand.evidence.map((entry) => `${you.label}: ${entry}`), ...opponentBand.evidence.map((entry) => `${opponent.label}: ${entry}`)],
      caveats: ["A preferred range is a fit-plan input, not proof that the pilot can hold that distance in live combat."],
    };
  }
  const edge: MatchupEdge = youRisk < opponentRisk ? "you" : opponentRisk < youRisk ? "opponent" : "contested";
  return {
    dimension: "engagement-envelope",
    edge,
    summary: edge === "contested"
      ? "Both preferred engagement ranges sit in similarly restrictive established opposing tackle bands."
      : `${edge === "you" ? you.label : opponent.label} has the less restrictive supported preferred-range relationship to opposing tackle.`,
    evidence: [
      `${you.label}: preferred range is ${youBand.band.replaceAll("-", " ")} versus ${opponent.label}'s established tackle.`,
      `${opponent.label}: preferred range is ${opponentBand.band.replaceAll("-", " ")} versus ${you.label}'s established tackle.`,
      ...youBand.evidence,
      ...opponentBand.evidence,
    ],
    caveats: ["This compares established envelopes only; it does not predict who actually controls distance."],
  };
}

function scramThreatensMwd(attacker: MatchupFitEvidence, defender: MatchupFitEvidence): boolean | null {
  if (defender.propulsion == null || defender.propulsion === "unknown") return null;
  if (defender.propulsion !== "mwd") return false;
  const scram = attacker.tackle?.scramRangeMeters;
  const preferred = defender.preferredRangeMeters;
  if (!finitePositive(scram) || !finitePositive(preferred)) return null;
  return preferred <= scram;
}

function evaluateRangeControl(you: MatchupFitEvidence, opponent: MatchupFitEvidence): MatchupDimensionResult {
  const youVelocity = knownMaxVelocity(you);
  const opponentVelocity = knownMaxVelocity(opponent);
  const yourMwdThreat = scramThreatensMwd(opponent, you);
  const opponentMwdThreat = scramThreatensMwd(you, opponent);
  const evidence: string[] = [];
  if (youVelocity) evidence.push(`${you.label} modeled max velocity: ${Math.round(youVelocity).toLocaleString()} m/s`);
  if (opponentVelocity) evidence.push(`${opponent.label} modeled max velocity: ${Math.round(opponentVelocity).toLocaleString()} m/s`);
  if (yourMwdThreat === true) evidence.push(`${you.label}'s MWD-dependent preferred envelope is inside ${opponent.label}'s established scram range.`);
  if (opponentMwdThreat === true) evidence.push(`${opponent.label}'s MWD-dependent preferred envelope is inside ${you.label}'s established scram range.`);

  if (yourMwdThreat === true && opponentMwdThreat !== true) {
    return {
      dimension: "range-control",
      edge: "opponent",
      summary: `${opponent.label} has a supported range-control lever because its established scram can disable ${you.label}'s MWD at the stated preferred range.`,
      evidence,
      caveats: ["A scram must actually be applied in range; NEC does not infer live position, lock state, heat, webs, manual piloting, or transversal."],
    };
  }
  if (opponentMwdThreat === true && yourMwdThreat !== true) {
    return {
      dimension: "range-control",
      edge: "you",
      summary: `${you.label} has a supported range-control lever because its established scram can disable ${opponent.label}'s MWD at the stated preferred range.`,
      evidence,
      caveats: ["A scram must actually be applied in range; NEC does not infer live position, lock state, heat, webs, manual piloting, or transversal."],
    };
  }
  if (youVelocity === null || opponentVelocity === null || !finitePositive(you.preferredRangeMeters) || !finitePositive(opponent.preferredRangeMeters)) {
    return {
      dimension: "range-control",
      edge: "unknown",
      summary: "The supported data is insufficient to compare raw mobility with the two fits' preferred range plans.",
      evidence,
      caveats: ["Maximum velocity alone never guarantees range control."],
    };
  }

  const youWantsLonger = you.preferredRangeMeters > opponent.preferredRangeMeters;
  const opponentWantsLonger = opponent.preferredRangeMeters > you.preferredRangeMeters;
  if (!youWantsLonger && !opponentWantsLonger) {
    return {
      dimension: "range-control",
      edge: youVelocity === opponentVelocity ? "contested" : youVelocity > opponentVelocity ? "you" : "opponent",
      summary: "Both fits state the same preferred range; modeled maximum velocity is the only supported range-control separator in this comparison.",
      evidence,
      caveats: ["Maximum velocity does not capture acceleration, webs, scrams, heat, bumps, manual piloting, or current vectors."],
    };
  }

  const longerSide: MatchupSide = youWantsLonger ? "you" : "opponent";
  const longerIsFaster = longerSide === "you" ? youVelocity > opponentVelocity : opponentVelocity > youVelocity;
  const shorterIsFaster = longerSide === "you" ? opponentVelocity > youVelocity : youVelocity > opponentVelocity;
  const edge: MatchupEdge = longerIsFaster ? longerSide : shorterIsFaster ? (longerSide === "you" ? "opponent" : "you") : "contested";
  return {
    dimension: "range-control",
    edge,
    summary: edge === "contested"
      ? "The fits want different ranges, but modeled maximum velocity does not separate their raw range-control capability."
      : `${edge === "you" ? you.label : opponent.label}'s modeled maximum velocity better supports ${edge === longerSide ? "maintaining the longer-range plan" : "closing toward the shorter-range plan"}.`,
    evidence,
    caveats: ["This is a raw mobility-versus-plan comparison, not a prediction of actual range control."],
  };
}

function canStopWarp(attacker: MatchupFitEvidence, defender: MatchupFitEvidence): boolean | null {
  const strength = attacker.tackle?.warpDisruptionStrength;
  const core = defender.warpCoreStrength;
  if (!finiteNonNegative(strength) || !finiteNonNegative(core)) return null;
  return strength > core;
}

function evaluateTackle(you: MatchupFitEvidence, opponent: MatchupFitEvidence): MatchupDimensionResult {
  const youCanHold = canStopWarp(you, opponent);
  const opponentCanHold = canStopWarp(opponent, you);
  const evidence: string[] = [];
  if (finiteNonNegative(you.tackle?.warpDisruptionStrength)) evidence.push(`${you.label} disruption strength: ${you.tackle!.warpDisruptionStrength}`);
  if (finiteNonNegative(opponent.warpCoreStrength)) evidence.push(`${opponent.label} warp-core strength: ${opponent.warpCoreStrength}`);
  if (finiteNonNegative(opponent.tackle?.warpDisruptionStrength)) evidence.push(`${opponent.label} disruption strength: ${opponent.tackle!.warpDisruptionStrength}`);
  if (finiteNonNegative(you.warpCoreStrength)) evidence.push(`${you.label} warp-core strength: ${you.warpCoreStrength}`);

  if (youCanHold === null || opponentCanHold === null) {
    return {
      dimension: "tackle",
      edge: "unknown",
      summary: "Warp-disruption strength versus warp-core strength is not fully established for both fits.",
      evidence,
      caveats: ["NEC does not assume base or modified warp-core strength when the caller did not establish it."],
    };
  }
  const edge: MatchupEdge = youCanHold && !opponentCanHold ? "you" : opponentCanHold && !youCanHold ? "opponent" : youCanHold && opponentCanHold ? "contested" : "none";
  return {
    dimension: "tackle",
    edge,
    summary: edge === "you"
      ? `${you.label}'s supported disruption strength can overcome ${opponent.label}'s supported warp-core strength, while the reverse is not established by the supplied values.`
      : edge === "opponent"
        ? `${opponent.label}'s supported disruption strength can overcome ${you.label}'s supported warp-core strength, while the reverse is not established by the supplied values.`
        : edge === "contested"
          ? "Both fits have supported disruption strength sufficient to overcome the other's supplied warp-core strength."
          : "Neither fit's supplied disruption strength exceeds the other's supplied warp-core strength.",
    evidence,
    caveats: ["This is capability only. It does not claim tackle is currently applied or that a target cannot reach a gate, break lock, or otherwise escape."],
  };
}

function evaluateApplication(you: MatchupFitEvidence, opponent: MatchupFitEvidence): MatchupDimensionResult {
  const yours = you.applicationAgainstOpponent;
  const theirs = opponent.applicationAgainstOpponent;
  const evidence = [
    ...(yours?.reason ? [`${you.label}: ${yours.reason}`] : []),
    ...(theirs?.reason ? [`${opponent.label}: ${theirs.reason}`] : []),
  ];
  if (!yours || !theirs || yours.status === "unknown" || theirs.status === "unknown") {
    return {
      dimension: "application",
      edge: "unknown",
      summary: "Target-specific damage application has not been validated for both directions of this matchup.",
      evidence,
      caveats: ["PVP-01 does not infer turret or missile application from paper DPS, signature radius, or maximum velocity alone."],
    };
  }
  if (yours.provenance.length === 0 || theirs.provenance.length === 0) throw new Error("Matchup application evidence requires provenance");
  const edge: MatchupEdge = yours.status === "good" && theirs.status === "poor" ? "you" : theirs.status === "good" && yours.status === "poor" ? "opponent" : "contested";
  return {
    dimension: "application",
    edge,
    summary: edge === "you"
      ? `${you.label} has supported good application while ${opponent.label}'s supported application is poor against this target.`
      : edge === "opponent"
        ? `${opponent.label} has supported good application while ${you.label}'s supported application is poor against this target.`
        : `Both directions have the same supported application class (${yours.status}).`,
    evidence: [...evidence, ...yours.provenance, ...theirs.provenance],
    caveats: ["Application evidence describes the supplied target interaction; live angular velocity, speed, signature changes, range, heat, and piloting can change it."],
  };
}

function evaluateTank(you: MatchupFitEvidence, opponent: MatchupFitEvidence): MatchupDimensionResult {
  const yours = you.ehpAgainstOpponent;
  const theirs = opponent.ehpAgainstOpponent;
  const evidence: string[] = [];
  if (finitePositive(yours)) evidence.push(`${you.label} opponent-specific modeled EHP: ${Math.round(yours).toLocaleString()}`);
  if (finitePositive(theirs)) evidence.push(`${opponent.label} opponent-specific modeled EHP: ${Math.round(theirs).toLocaleString()}`);
  if (!finitePositive(yours) || !finitePositive(theirs)) {
    return {
      dimension: "tank",
      edge: "unknown",
      summary: "Opponent-specific effective tank is not established for both fits.",
      evidence,
      caveats: ["PVP-01 deliberately does not substitute generic EHP for EHP evaluated against the opponent's supported damage profile."],
    };
  }
  const edge: MatchupEdge = yours > theirs ? "you" : theirs > yours ? "opponent" : "none";
  return {
    dimension: "tank",
    edge,
    summary: edge === "none"
      ? "Both fits have the same supplied opponent-specific modeled EHP."
      : `${edge === "you" ? you.label : opponent.label} has more supplied opponent-specific modeled EHP.`,
    evidence,
    caveats: ["EHP does not model active-repair timing, incoming application changes, capacitor warfare, heat, logistics, piloting, or target switching."],
  };
}

function neutralizerThreat(attacker: MatchupFitEvidence, defender: MatchupFitEvidence): boolean | null {
  if (attacker.capWarfare?.hasNeutralizer == null) return null;
  if (!attacker.capWarfare.hasNeutralizer) return false;
  if (defender.capacitorDependentSystems == null) return null;
  if (defender.capacitorDependentSystems.length === 0) return false;
  const range = attacker.capWarfare.rangeMeters;
  const defenderRange = defender.preferredRangeMeters;
  if (!finitePositive(range) || !finitePositive(defenderRange)) return null;
  return defenderRange <= range;
}

function evaluateCapacitor(you: MatchupFitEvidence, opponent: MatchupFitEvidence): MatchupDimensionResult {
  const youThreat = neutralizerThreat(you, opponent);
  const opponentThreat = neutralizerThreat(opponent, you);
  const youStable = knownCapStable(you);
  const opponentStable = knownCapStable(opponent);
  const evidence: string[] = [];
  if (youStable !== null) evidence.push(`${you.label} modeled capacitor stability: ${youStable ? "stable" : "not stable"}`);
  if (opponentStable !== null) evidence.push(`${opponent.label} modeled capacitor stability: ${opponentStable ? "stable" : "not stable"}`);
  if (youThreat === true) evidence.push(`${you.label}'s established neutralizer envelope overlaps ${opponent.label}'s preferred range and the opponent has stated capacitor-dependent systems.`);
  if (opponentThreat === true) evidence.push(`${opponent.label}'s established neutralizer envelope overlaps ${you.label}'s preferred range and you have stated capacitor-dependent systems.`);
  if (finitePositive(you.capWarfare?.pressureGjPerSecond)) evidence.push(`${you.label} supplied neutralizer pressure: ${you.capWarfare!.pressureGjPerSecond!.toFixed(2)} GJ/s`);
  if (finitePositive(opponent.capWarfare?.pressureGjPerSecond)) evidence.push(`${opponent.label} supplied neutralizer pressure: ${opponent.capWarfare!.pressureGjPerSecond!.toFixed(2)} GJ/s`);

  if (youThreat === true || opponentThreat === true) {
    const edge: MatchupEdge = youThreat === true && opponentThreat !== true ? "you" : opponentThreat === true && youThreat !== true ? "opponent" : "contested";
    return {
      dimension: "capacitor",
      edge,
      summary: edge === "you"
        ? `${you.label} has the one supported neutralizer threat against stated capacitor-dependent systems at the supplied preferred ranges.`
        : edge === "opponent"
          ? `${opponent.label} has the one supported neutralizer threat against stated capacitor-dependent systems at the supplied preferred ranges.`
          : "Both fits have supported neutralizer threats against stated capacitor-dependent systems at the supplied preferred ranges.",
      evidence,
      caveats: ["PVP-01 does not calculate time-to-cap-out or guarantee module shutdown; activation timing, charges, nosferatu, injectors, range changes, and pilot choices matter."],
    };
  }

  if (youStable === null || opponentStable === null) {
    return {
      dimension: "capacitor",
      edge: "unknown",
      summary: "Neither direction has a fully established neutralizer interaction, and capacitor stability is incomplete for comparison.",
      evidence,
      caveats: ["Unknown capacitor state remains unknown rather than being converted into a matchup edge."],
    };
  }
  const edge: MatchupEdge = youStable && !opponentStable ? "you" : opponentStable && !youStable ? "opponent" : "contested";
  return {
    dimension: "capacitor",
    edge,
    summary: edge === "you"
      ? `${you.label} is modeled capacitor-stable while ${opponent.label} is not under each fit's supplied activation state.`
      : edge === "opponent"
        ? `${opponent.label} is modeled capacitor-stable while ${you.label} is not under each fit's supplied activation state.`
        : `Both fits share the same modeled capacitor-stability state (${youStable ? "stable" : "not stable"}).`,
    evidence,
    caveats: ["This compares fitted activation-state stability, not live capacitor reserves or combat endurance."],
  };
}

function evaluateMobility(you: MatchupFitEvidence, opponent: MatchupFitEvidence): MatchupDimensionResult {
  const yours = knownMaxVelocity(you);
  const theirs = knownMaxVelocity(opponent);
  const evidence: string[] = [];
  if (yours) evidence.push(`${you.label} modeled max velocity: ${Math.round(yours).toLocaleString()} m/s`);
  if (theirs) evidence.push(`${opponent.label} modeled max velocity: ${Math.round(theirs).toLocaleString()} m/s`);
  if (yours === null || theirs === null) {
    return {
      dimension: "mobility",
      edge: "unknown",
      summary: "Modeled maximum velocity is not established for both fits.",
      evidence,
      caveats: ["Mass, inertia, current vectors, propulsion state, webs, scrams, heat, and manual piloting can matter beyond maximum velocity."],
    };
  }
  const edge: MatchupEdge = yours > theirs ? "you" : theirs > yours ? "opponent" : "none";
  return {
    dimension: "mobility",
    edge,
    summary: edge === "none" ? "Both fits have the same modeled maximum velocity." : `${edge === "you" ? you.label : opponent.label} has the higher modeled maximum velocity.`,
    evidence,
    caveats: ["A maximum-velocity edge is not a guarantee of range control or escape."],
  };
}

function normalizedDamage(profile: MatchupFitEvidence["damageProfile"]): Record<DamageType, number> | null {
  if (!profile) return null;
  const values = DAMAGE_TYPES.map((type) => profile[type]);
  if (values.some((value) => !finiteNonNegative(value))) return null;
  const numbers = values as number[];
  const total = numbers.reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) return null;
  return Object.fromEntries(DAMAGE_TYPES.map((type, index) => [type, numbers[index] / total])) as Record<DamageType, number>;
}

function layerResists(fit: MatchupFitEvidence): ResistanceVector | null {
  const layer = fit.primaryTankLayer;
  if (!layer) return null;
  const explicit = fit.tankResistances?.[layer];
  if (explicit) {
    const values = DAMAGE_TYPES.map((type) => explicit[type]);
    if (values.every((value) => finite(value) && value >= 0 && value < 1)) {
      return Object.fromEntries(DAMAGE_TYPES.map((type, index) => [type, values[index]])) as ResistanceVector;
    }
  }
  if (layer === "structure" || !fit.fitting) return null;
  const prefix = layer === "shield" ? "shield" : "armor";
  const metrics = fit.fitting.metrics;
  const values = [
    metrics[`${prefix}EmResist`],
    metrics[`${prefix}ThermalResist`],
    metrics[`${prefix}KineticResist`],
    metrics[`${prefix}ExplosiveResist`],
  ];
  if (!values.every((value) => finite(value) && value >= 0 && value < 1)) return null;
  return {
    em: values[0] as number,
    thermal: values[1] as number,
    kinetic: values[2] as number,
    explosive: values[3] as number,
  };
}

function incomingDamageMultiplier(defender: MatchupFitEvidence, attacker: MatchupFitEvidence): number | null {
  const damage = normalizedDamage(attacker.damageProfile);
  const resists = layerResists(defender);
  if (!damage || !resists) return null;
  return DAMAGE_TYPES.reduce((sum, type) => sum + damage[type] * (1 - resists[type]), 0);
}

function evaluateDamageTypes(you: MatchupFitEvidence, opponent: MatchupFitEvidence): MatchupDimensionResult {
  const yourIncoming = incomingDamageMultiplier(you, opponent);
  const opponentIncoming = incomingDamageMultiplier(opponent, you);
  const evidence: string[] = [];
  if (yourIncoming !== null) evidence.push(`${you.label} primary-layer post-resist multiplier versus ${opponent.label}'s supported damage mix: ${yourIncoming.toFixed(3)}x`);
  if (opponentIncoming !== null) evidence.push(`${opponent.label} primary-layer post-resist multiplier versus ${you.label}'s supported damage mix: ${opponentIncoming.toFixed(3)}x`);
  if (yourIncoming === null || opponentIncoming === null) {
    return {
      dimension: "damage-types",
      edge: "unknown",
      summary: "A complete supported outgoing damage mix and primary-layer resistance profile is not available in both directions.",
      evidence,
      caveats: ["NEC does not guess ammunition, damage selection, or the target's primary tank layer."],
    };
  }
  const edge: MatchupEdge = yourIncoming < opponentIncoming ? "you" : opponentIncoming < yourIncoming ? "opponent" : "none";
  return {
    dimension: "damage-types",
    edge,
    summary: edge === "none"
      ? "The supplied damage mixes face the same weighted primary-layer resistance multiplier."
      : `${edge === "you" ? you.label : opponent.label} has the more favorable supported damage-type versus primary-resistance interaction.`,
    evidence,
    caveats: ["This is a resistance interaction only, not a time-to-kill or overall tank comparison."],
  };
}

function evaluateEscape(you: MatchupFitEvidence, opponent: MatchupFitEvidence): MatchupDimensionResult {
  const youCanHold = canStopWarp(you, opponent);
  const opponentCanHold = canStopWarp(opponent, you);
  const evidence: string[] = [];
  if (youCanHold !== null) evidence.push(`${you.label} can overcome ${opponent.label}'s supplied warp-core strength: ${youCanHold ? "yes" : "no"}`);
  if (opponentCanHold !== null) evidence.push(`${opponent.label} can overcome ${you.label}'s supplied warp-core strength: ${opponentCanHold ? "yes" : "no"}`);
  if (youCanHold === null || opponentCanHold === null) {
    return {
      dimension: "escape",
      edge: "unknown",
      summary: "Known warp-disruption and warp-core values are insufficient to compare warp escape capability in both directions.",
      evidence,
      caveats: ["Escape also depends on actually breaking/avoiding tackle, alignment, gates, bubbles where legal, positioning, lock state, and other live conditions NEC does not observe."],
    };
  }
  const edge: MatchupEdge = opponentCanHold && !youCanHold ? "opponent" : youCanHold && !opponentCanHold ? "you" : opponentCanHold && youCanHold ? "contested" : "none";
  return {
    dimension: "escape",
    edge,
    summary: edge === "opponent"
      ? `${opponent.label} has supported warp-denial capability against ${you.label}, while the reverse supplied values do not overcome warp-core strength.`
      : edge === "you"
        ? `${you.label} has supported warp-denial capability against ${opponent.label}, while the reverse supplied values do not overcome warp-core strength.`
        : edge === "contested"
          ? "Both fits can deny warp under the supplied disruption/core-strength values while tackle is successfully applied."
          : "Neither fit's supplied disruption strength overcomes the other's supplied warp-core strength.",
    evidence,
    caveats: ["This describes one escape condition only; it does not claim a ship is trapped or safe."],
  };
}

export function compareTwoFits(you: MatchupFitEvidence, opponent: MatchupFitEvidence): TwoFitMatchupResult {
  if (you.provenance.length === 0 || opponent.provenance.length === 0) {
    throw new Error("Two-fit matchup evidence requires provenance for both fits");
  }
  const dimensions: MatchupDimensionResult[] = [
    evaluateEngagementEnvelope(you, opponent),
    evaluateRangeControl(you, opponent),
    evaluateTackle(you, opponent),
    evaluateApplication(you, opponent),
    evaluateTank(you, opponent),
    evaluateCapacitor(you, opponent),
    evaluateMobility(you, opponent),
    evaluateDamageTypes(you, opponent),
    evaluateEscape(you, opponent),
  ];
  const unknowns = dimensions.filter((entry) => entry.edge === "unknown").map((entry) => `${entry.dimension}: ${entry.summary}`);
  const provenance = [...new Set([
    ...you.provenance,
    ...opponent.provenance,
    ...(you.identity?.provenance ?? []),
    ...(opponent.identity?.provenance ?? []),
    ...(you.applicationAgainstOpponent?.provenance ?? []),
    ...(opponent.applicationAgainstOpponent?.provenance ?? []),
  ])].sort();

  return {
    youLabel: you.label,
    opponentLabel: opponent.label,
    dimensions,
    unknowns,
    limitations: [
      "PVP-01 never emits a win percentage, deterministic winner, or safety guarantee.",
      "The model compares supplied fit evidence, not pilot skill, live position, heat, implants, boosters, fleet links, target state, manual piloting, server ticks, or hidden client state unless a later validated subsystem supplies that evidence explicitly.",
      "Directional edges describe one supported matchup dimension at a time and must not be added together into a hidden score.",
    ],
    provenance,
  };
}
