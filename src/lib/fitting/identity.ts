export type FitCombatRole =
  | "brawler"
  | "scram-kiter"
  | "kiter"
  | "sniper"
  | "tackle"
  | "ewar"
  | "neut"
  | "logi"
  | "other";

export type FitTankRole = "active" | "buffer" | "passive" | "hybrid" | "unknown";

export type EvidenceStatus = "known" | "unknown";

export interface FitIdentityEvidence {
  weaponPreferredRangeMeters?: number | null;
  webRangeMeters?: number | null;
  scramRangeMeters?: number | null;
  disruptorRangeMeters?: number | null;
  hasWeb?: boolean | null;
  hasScram?: boolean | null;
  hasDisruptor?: boolean | null;
  hasEwar?: boolean | null;
  hasNeutralizer?: boolean | null;
  hasRemoteRepair?: boolean | null;
  hasLocalRepair?: boolean | null;
  hasBufferTank?: boolean | null;
  hasPassiveRechargeTank?: boolean | null;
  provenance: readonly string[];
}

export interface FitIdentityReason {
  code: string;
  summary: string;
  weight: number;
}

export interface FitRoleScore {
  role: FitCombatRole;
  score: number;
  reasons: FitIdentityReason[];
}

export interface FitIdentityResult {
  primaryCombatRole: FitCombatRole | null;
  combatRoles: FitRoleScore[];
  tankRole: FitTankRole;
  tankReasons: string[];
  unknowns: string[];
  provenance: readonly string[];
}

function knownPositive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function addRoleReason(
  scores: Map<FitCombatRole, FitRoleScore>,
  role: FitCombatRole,
  code: string,
  summary: string,
  weight: number,
): void {
  const current = scores.get(role) ?? { role, score: 0, reasons: [] };
  current.score += weight;
  current.reasons.push({ code, summary, weight });
  scores.set(role, current);
}

function classifyRangePlan(evidence: FitIdentityEvidence, scores: Map<FitCombatRole, FitRoleScore>, unknowns: string[]): void {
  const preferred = evidence.weaponPreferredRangeMeters;
  if (!knownPositive(preferred)) {
    unknowns.push("weapon engagement range is not established");
    return;
  }

  const web = evidence.webRangeMeters;
  const scram = evidence.scramRangeMeters;
  const disruptor = evidence.disruptorRangeMeters;

  if (evidence.hasScram === true && knownPositive(scram) && preferred <= scram) {
    addRoleReason(scores, "brawler", "weapon-inside-scram", "Preferred weapon range is inside the fit's established scram envelope.", 2);
    if (evidence.hasWeb === true && knownPositive(web) && preferred <= web) {
      addRoleReason(scores, "brawler", "weapon-inside-web", "Preferred weapon range is also inside the fit's established web envelope.", 2);
    }
    if (evidence.hasWeb === true && knownPositive(web) && preferred > web) {
      addRoleReason(scores, "scram-kiter", "weapon-outside-web-inside-scram", "Preferred weapon range is outside the fit's established web envelope but inside its scram envelope.", 4);
    }
  }

  if (evidence.hasDisruptor === true && knownPositive(disruptor)) {
    if (knownPositive(scram) && preferred > scram && preferred <= disruptor) {
      addRoleReason(scores, "kiter", "weapon-outside-scram-inside-point", "Preferred weapon range is outside the established scram envelope but inside the fit's disruptor envelope.", 4);
    } else if (!knownPositive(scram) && preferred <= disruptor) {
      addRoleReason(scores, "kiter", "weapon-inside-point", "Preferred weapon range is inside the fit's established long-point envelope; no shorter scram boundary is established.", 2);
    }
    if (preferred > disruptor) {
      addRoleReason(scores, "sniper", "weapon-beyond-point", "Preferred weapon range extends beyond the fit's established disruptor envelope.", 3);
    }
  } else if (knownPositive(scram) && preferred > scram) {
    addRoleReason(scores, "sniper", "weapon-beyond-short-tackle", "Preferred weapon range extends beyond the fit's established short-tackle envelope and no long-point envelope is established.", 1);
  }
}

function classifyTank(evidence: FitIdentityEvidence, unknowns: string[]): { role: FitTankRole; reasons: string[] } {
  const reasons: string[] = [];
  const active = evidence.hasLocalRepair === true;
  const buffer = evidence.hasBufferTank === true;
  const passive = evidence.hasPassiveRechargeTank === true;
  const known = [evidence.hasLocalRepair, evidence.hasBufferTank, evidence.hasPassiveRechargeTank].some((value) => value !== null && value !== undefined);

  if (!known) {
    unknowns.push("tank style is not established");
    return { role: "unknown", reasons };
  }

  if (active) reasons.push("local repair/boost evidence is present");
  if (buffer) reasons.push("buffer-tank evidence is present");
  if (passive) reasons.push("passive-recharge evidence is present");

  const count = Number(active) + Number(buffer) + Number(passive);
  if (count > 1) return { role: "hybrid", reasons };
  if (active) return { role: "active", reasons };
  if (buffer) return { role: "buffer", reasons };
  if (passive) return { role: "passive", reasons };
  return { role: "unknown", reasons: ["No supported active, buffer, or passive tank evidence is present."] };
}

export function classifyFitIdentity(evidence: FitIdentityEvidence): FitIdentityResult {
  if (evidence.provenance.length === 0) {
    throw new Error("Fit identity evidence requires provenance");
  }

  const scores = new Map<FitCombatRole, FitRoleScore>();
  const unknowns: string[] = [];

  classifyRangePlan(evidence, scores, unknowns);

  if (evidence.hasScram === true || evidence.hasDisruptor === true) {
    addRoleReason(scores, "tackle", "tackle-module", "Supported warp-tackle evidence is present.", 3);
  } else if (evidence.hasScram == null && evidence.hasDisruptor == null) {
    unknowns.push("warp-tackle capability is not established");
  }

  if (evidence.hasEwar === true) addRoleReason(scores, "ewar", "ewar-module", "Supported electronic-warfare evidence is present.", 3);
  if (evidence.hasNeutralizer === true) addRoleReason(scores, "neut", "neutralizer-module", "Supported capacitor-warfare evidence is present.", 3);
  if (evidence.hasRemoteRepair === true) addRoleReason(scores, "logi", "remote-repair-module", "Supported remote-repair evidence is present.", 3);

  if (scores.size === 0) {
    addRoleReason(scores, "other", "insufficient-role-evidence", "No supported evidence establishes a more specific combat role.", 1);
  }

  const combatRoles = [...scores.values()].sort((a, b) => b.score - a.score || a.role.localeCompare(b.role));
  const highest = combatRoles[0]?.score ?? 0;
  const tied = combatRoles.filter((entry) => entry.score === highest);
  const primaryCombatRole = tied.length === 1 && tied[0].role !== "other" ? tied[0].role : tied.length === 1 ? "other" : null;

  const tank = classifyTank(evidence, unknowns);
  return {
    primaryCombatRole,
    combatRoles,
    tankRole: tank.role,
    tankReasons: tank.reasons,
    unknowns: [...new Set(unknowns)].sort(),
    provenance: evidence.provenance,
  };
}
