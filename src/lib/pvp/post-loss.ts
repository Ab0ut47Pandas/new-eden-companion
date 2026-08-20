import type { FitWeaknessFinding, FitWeaknessResult } from "../fitting/weakness";
import type { MatchupBriefing, MatchupBriefingCard, MatchupCondition } from "./briefing";
import type { MatchupDimension } from "./matchup";

export type LossFactorSupport = "recorded-context" | "plausible";
export type LossFactorRank = "primary" | "secondary";
export type LossFactorCategory =
  | "numbers"
  | "damage-concentration"
  | "fit-weakness"
  | MatchupDimension;

export interface KillmailAttackerEvidence {
  characterId?: number | null;
  shipTypeId?: number | null;
  weaponTypeId?: number | null;
  recordedDamage?: number | null;
  finalBlow?: boolean | null;
  isNpc?: boolean | null;
}

/**
 * Normalized evidence from a killmail or another CCP-backed loss record.
 *
 * PVP-03 intentionally does not treat this as a combat timeline. A killmail can
 * establish who/what was recorded on the loss, the destroyed fit/cargo snapshot,
 * location/time, and damage totals supplied by the source. It cannot establish
 * live range, transversal, module activation, heat, capacitor state, commands,
 * pilot intent, or the order in which tactical conditions changed.
 */
export interface KillmailLossEvidence {
  killmailId?: number | null;
  occurredAt?: string | null;
  solarSystemId?: number | null;
  victimCharacterId?: number | null;
  victimShipTypeId?: number | null;
  totalDamageTaken?: number | null;
  attackers?: readonly KillmailAttackerEvidence[] | null;
  destroyedFitTypeIds?: readonly number[] | null;
  destroyedCargoTypeIds?: readonly number[] | null;
  provenance: readonly string[];
}

export interface MatchedOpponentEvidence {
  status: "confirmed" | "not-matched" | "unknown";
  reason?: string;
  provenance: readonly string[];
}

export interface PostLossDebriefInput {
  loss: KillmailLossEvidence;
  /** Pre-loss or reconstructed fit weakness analysis for the destroyed fit. */
  fitWeaknesses?: FitWeaknessResult | null;
  /** PVP-02 briefing for a specific opponent fit, used only when linkage is confirmed. */
  matchupBriefing?: MatchupBriefing | null;
  matchedOpponent?: MatchedOpponentEvidence | null;
}

export interface LossFactor {
  id: string;
  rank: LossFactorRank;
  category: LossFactorCategory;
  support: LossFactorSupport;
  summary: string;
  why: string;
  evidence: string[];
  caveats: string[];
}

export interface LossLearningPoint {
  id: string;
  summary: string;
  why: string;
}

export interface PostLossDebrief {
  headline: string;
  primaryFactors: LossFactor[];
  secondaryFactors: LossFactor[];
  learningPoints: LossLearningPoint[];
  unknowns: string[];
  limitations: string[];
  provenance: string[];
}

interface CandidateFactor extends Omit<LossFactor, "rank"> {
  priority: number;
}

const MATCHUP_PRIORITY: readonly MatchupDimension[] = [
  "engagement-envelope",
  "range-control",
  "tackle",
  "application",
  "capacitor",
  "damage-types",
  "tank",
  "mobility",
  "escape",
];

function finiteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function factorFromWeakness(finding: FitWeaknessFinding, index: number): CandidateFactor {
  return {
    id: `fit-${finding.code}`,
    category: "fit-weakness",
    support: "plausible",
    priority: finding.severity === "warning" ? 30 + index : 45 + index,
    summary: finding.summary,
    why: `This weakness was established from the destroyed fit context before interpreting the loss. It could have reduced margin, but the killmail does not prove that it caused the destruction. ${finding.why}`,
    evidence: [...finding.evidence],
    caveats: [
      "A pre-existing fit weakness is a plausible contributing factor, not proof of the causal failure in this specific fight.",
    ],
  };
}

function factorFromMatchup(card: MatchupBriefingCard, index: number): CandidateFactor {
  const dimensionPriority = MATCHUP_PRIORITY.indexOf(card.dimension);
  return {
    id: `matchup-${card.dimension}`,
    category: card.dimension,
    support: "plausible",
    priority: 15 + (dimensionPriority < 0 ? 20 : dimensionPriority) + index,
    summary: card.summary,
    why: "This opponent-favored condition comes from a validated two-fit matchup linked to a recorded attacker. It is a plausible contributor, not a reconstruction of what actually happened moment by moment.",
    evidence: [...card.evidence],
    caveats: [
      ...card.caveats,
      "The killmail does not establish live range, module state, capacitor state, pilot inputs, or the exact order of events.",
    ],
  };
}

function buildAttackerContext(loss: KillmailLossEvidence, candidates: CandidateFactor[], unknowns: string[]): void {
  if (loss.attackers == null) {
    unknowns.push("recorded attacker context is not available");
    return;
  }

  const playerAttackers = loss.attackers.filter((attacker) => attacker.isNpc !== true && attacker.characterId != null);
  const damagingPlayers = playerAttackers.filter((attacker) => finiteNonNegative(attacker.recordedDamage) && attacker.recordedDamage > 0);
  const distinctPlayerIds = new Set(damagingPlayers.map((attacker) => attacker.characterId as number));

  if (distinctPlayerIds.size >= 2) {
    candidates.push({
      id: "multiple-recorded-player-attackers",
      category: "numbers",
      support: "recorded-context",
      priority: 10,
      summary: `At least ${distinctPlayerIds.size} recorded player attackers contributed damage to the loss.`,
      why: "That is directly supported by the normalized killmail attacker list. It is relevant context because the destroyed ship was taking damage from more than one recorded player contributor.",
      evidence: [`Recorded damaging player attackers: ${distinctPlayerIds.size}`],
      caveats: [
        "This does not prove every attacker was applying damage simultaneously, that the victim was alone, or that numerical pressure was the decisive cause.",
      ],
    });
  }

  const knownDamage = damagingPlayers
    .map((attacker) => ({ attacker, damage: attacker.recordedDamage as number }))
    .filter((entry) => entry.damage > 0);
  const summedKnownDamage = knownDamage.reduce((sum, entry) => sum + entry.damage, 0);
  if (knownDamage.length && summedKnownDamage > 0) {
    const largest = [...knownDamage].sort((a, b) => b.damage - a.damage)[0];
    const share = largest.damage / summedKnownDamage;
    if (share >= 0.6) {
      candidates.push({
        id: "recorded-damage-concentration",
        category: "damage-concentration",
        support: "recorded-context",
        priority: 55,
        summary: "Most of the known player-attributed damage in the supplied record came from one attacker.",
        why: "The recorded damage amounts are concentrated on a single player attacker in the supplied evidence. That can help choose which opponent fit deserves closer comparison.",
        evidence: [`Largest known player damage share: ${(share * 100).toFixed(1)}% of the supplied player-attributed damage`],
        caveats: [
          "This is not a damage-over-time trace and does not prove that attacker created the decisive tactical failure.",
          "NPC damage or attackers with unavailable damage values can make the supplied share incomplete.",
        ],
      });
    }
  }
}

function addMatchupContext(input: PostLossDebriefInput, candidates: CandidateFactor[], unknowns: string[]): void {
  const briefing = input.matchupBriefing;
  if (!briefing) {
    unknowns.push("validated two-fit matchup context is not available for a recorded attacker");
    return;
  }

  const match = input.matchedOpponent;
  if (!match || match.status === "unknown") {
    unknowns.push("the supplied matchup is not confirmed to correspond to a recorded attacker on this loss");
    return;
  }
  if (match.status === "not-matched") {
    unknowns.push(match.reason ?? "the supplied matchup does not correspond to a recorded attacker on this loss");
    return;
  }
  if (match.provenance.length === 0) throw new Error("Confirmed opponent linkage requires provenance");

  briefing.opponentAdvantages.forEach((card, index) => candidates.push(factorFromMatchup(card, index)));
}

function learningPointFromFactor(factor: LossFactor): LossLearningPoint {
  switch (factor.category) {
    case "numbers":
      return {
        id: `learn-${factor.id}`,
        summary: "Before committing, identify whether the fight can become a multi-attacker problem and preserve an early reset plan when possible.",
        why: factor.summary,
      };
    case "damage-concentration":
      return {
        id: `learn-${factor.id}`,
        summary: "Use the highest recorded damage contributor as the first candidate for a validated opponent-fit comparison, not as an automatic blame assignment.",
        why: factor.summary,
      };
    case "fit-weakness":
      return {
        id: `learn-${factor.id}`,
        summary: "Revisit the supported fit weakness and decide whether the fit or the intended engagement plan should change before replacing the ship.",
        why: factor.summary,
      };
    default:
      return {
        id: `learn-${factor.id}`,
        summary: "Practice recognizing this opponent-favored condition early enough to change range, reset, or decline the engagement when an escape option still exists.",
        why: factor.summary,
      };
  }
}

function learningPointFromRunCue(condition: MatchupCondition): LossLearningPoint {
  return {
    id: `learn-run-${condition.id}`,
    summary: condition.summary,
    why: condition.why,
  };
}

export function buildPostLossDebrief(input: PostLossDebriefInput): PostLossDebrief {
  if (input.loss.provenance.length === 0) throw new Error("Post-loss debrief requires killmail/loss provenance");

  const candidates: CandidateFactor[] = [];
  const unknowns: string[] = [];
  const provenance = new Set<string>(input.loss.provenance);

  buildAttackerContext(input.loss, candidates, unknowns);

  if (input.loss.destroyedFitTypeIds == null) {
    unknowns.push("the destroyed ship fitting snapshot is not available");
  }

  if (input.fitWeaknesses) {
    input.fitWeaknesses.provenance.forEach((entry) => provenance.add(entry));
    input.fitWeaknesses.findings.forEach((finding, index) => candidates.push(factorFromWeakness(finding, index)));
    input.fitWeaknesses.unknowns.forEach((entry) => unknowns.push(`fit analysis: ${entry}`));
  } else {
    unknowns.push("validated destroyed-fit weakness analysis is not available");
  }

  addMatchupContext(input, candidates, unknowns);
  if (input.matchupBriefing) input.matchupBriefing.provenance.forEach((entry) => provenance.add(entry));
  if (input.matchedOpponent?.status === "confirmed") input.matchedOpponent.provenance.forEach((entry) => provenance.add(entry));

  candidates.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const ranked: LossFactor[] = candidates.slice(0, 5).map((candidate, index) => ({
    id: candidate.id,
    rank: index === 0 ? "primary" : "secondary",
    category: candidate.category,
    support: candidate.support,
    summary: candidate.summary,
    why: candidate.why,
    evidence: candidate.evidence,
    caveats: candidate.caveats,
  }));

  const primaryFactors = ranked.filter((factor) => factor.rank === "primary");
  const secondaryFactors = ranked.filter((factor) => factor.rank === "secondary");
  const learningPoints = ranked.slice(0, 3).map(learningPointFromFactor);

  if (input.matchupBriefing && input.matchedOpponent?.status === "confirmed") {
    input.matchupBriefing.runIfConditions
      .slice(0, 2)
      .map(learningPointFromRunCue)
      .forEach((point) => {
        if (!learningPoints.some((existing) => existing.id === point.id)) learningPoints.push(point);
      });
  }

  if (!ranked.length) {
    unknowns.push("no evidence-backed primary or secondary failure factor can be established from the supplied context");
  }

  return {
    headline: input.loss.killmailId
      ? `Post-loss review for killmail ${input.loss.killmailId}`
      : "Post-loss review",
    primaryFactors,
    secondaryFactors,
    learningPoints,
    unknowns: [...new Set(unknowns)].sort(),
    limitations: [
      "A killmail is a destruction record, not a combat replay. NEC does not infer live range, transversal, velocity vectors, module activation, heat, capacitor state, lock state, pilot commands, local/grid state, fleet boosts, or event order from it.",
      "Primary and secondary labels rank review priority from supplied evidence; they do not claim causal certainty or assign blame.",
      "Recorded attackers and damage identify contributors in the supplied loss record, not a guaranteed simultaneous on-grid state or complete tactical timeline.",
      "A destroyed fit snapshot shows what the loss record exposes at destruction; it does not prove which modules were active, loaded, overheated, disabled, or usable at each moment.",
      "Public third-party killboards can be incomplete because killmail sharing is player-controlled; PVP-03 should prefer authenticated CCP-backed loss evidence when available.",
    ],
    provenance: [...provenance],
  };
}
