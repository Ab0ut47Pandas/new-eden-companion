export type ManufacturingEvidenceState = "yes" | "no" | "unknown";
export type ManufacturingBlueprintKind = "original" | "copy" | "unknown";
export type ManufacturingPlanStatus = "blocked" | "needs-inputs" | "unknown" | "ready-to-verify";

export interface ManufacturingBlueprintEvidence {
  itemId: number;
  kind: ManufacturingBlueprintKind;
  runs: number;
  materialEfficiency: number;
  timeEfficiency: number;
  locationId: number | null;
}

export interface ManufacturingMaterialEvidence {
  typeId: number;
  name: string;
  baseQuantityPerRun: number;
  ownedAtInputLocation: number | null;
  ownedAnywhere: number | null;
}

export interface ManufacturingSkillEvidence {
  typeId: number;
  name: string;
  requiredLevel: number;
  trainedLevel: number | null;
  visibility: "available" | "unavailable";
}

export interface ManufacturingPlanInput {
  productName: string;
  blueprintName: string;
  productQuantityPerRun: number;
  runs: number;
  baseTimeSeconds: number | null;
  inputLocationId: number | null;
  inputLocationLabel: string | null;
  facilityAvailable: ManufacturingEvidenceState;
  blueprintVisibility: "available" | "unavailable";
  blueprints: ManufacturingBlueprintEvidence[];
  materials: ManufacturingMaterialEvidence[];
  skills: ManufacturingSkillEvidence[];
}

export interface ManufacturingBlueprintAllocation {
  itemId: number;
  kind: "original" | "copy";
  runs: number;
  materialEfficiency: number;
  timeEfficiency: number;
  locationId: number;
}

export type ManufacturingBlueprintPlanState =
  | "bpo"
  | "bpc"
  | "split-bpc"
  | "insufficient-bpc-runs"
  | "blueprint-elsewhere"
  | "not-owned"
  | "unknown";

export interface ManufacturingBlueprintPlan {
  state: ManufacturingBlueprintPlanState;
  allocations: ManufacturingBlueprintAllocation[];
  availableCopyRunsAtLocation: number;
  missingCopyRuns: number;
  bestMaterialEfficiency: number | null;
  bestTimeEfficiency: number | null;
}

export interface ManufacturingMaterialPlan extends ManufacturingMaterialEvidence {
  requiredQuantity: number;
  quantityBasis: "owned-blueprint-me" | "sde-base";
  missingAtInputLocation: number | null;
  missingAnywhere: number | null;
  moveFromElsewhereQuantity: number | null;
  status: "ready" | "move" | "acquire" | "unknown";
}

export interface ManufacturingSkillPlan extends ManufacturingSkillEvidence {
  status: "met" | "missing" | "unknown";
}

export interface ManufacturingPlan {
  status: ManufacturingPlanStatus;
  outputQuantity: number;
  baseJobTimeSeconds: number | null;
  blueprint: ManufacturingBlueprintPlan;
  materials: ManufacturingMaterialPlan[];
  skills: ManufacturingSkillPlan[];
  facilityAvailable: ManufacturingEvidenceState;
  blockers: string[];
  unknowns: string[];
  nextAction: string;
  notes: string[];
}

function safeRuns(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new RangeError("runs must be a positive integer.");
  return value;
}

function safeQuantity(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${label} must be a non-negative integer.`);
  return value;
}

function efficiency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function sortedBlueprints(instances: readonly ManufacturingBlueprintEvidence[]): ManufacturingBlueprintEvidence[] {
  return [...instances].sort((left, right) => {
    const kindOrder = { original: 0, copy: 1, unknown: 2 } as const;
    if (kindOrder[left.kind] !== kindOrder[right.kind]) return kindOrder[left.kind] - kindOrder[right.kind];
    if (left.materialEfficiency !== right.materialEfficiency) return right.materialEfficiency - left.materialEfficiency;
    if (left.timeEfficiency !== right.timeEfficiency) return right.timeEfficiency - left.timeEfficiency;
    if (left.runs !== right.runs) return right.runs - left.runs;
    return left.itemId - right.itemId;
  });
}

export function planBlueprintUse(
  visibility: ManufacturingPlanInput["blueprintVisibility"],
  instances: readonly ManufacturingBlueprintEvidence[],
  inputLocationId: number | null,
  requestedRuns: number,
): ManufacturingBlueprintPlan {
  const runs = safeRuns(requestedRuns);
  if (visibility === "unavailable") {
    return {
      state: "unknown",
      allocations: [],
      availableCopyRunsAtLocation: 0,
      missingCopyRuns: 0,
      bestMaterialEfficiency: null,
      bestTimeEfficiency: null,
    };
  }

  if (inputLocationId === null) {
    return {
      state: instances.length > 0 ? "blueprint-elsewhere" : "not-owned",
      allocations: [],
      availableCopyRunsAtLocation: 0,
      missingCopyRuns: 0,
      bestMaterialEfficiency: null,
      bestTimeEfficiency: null,
    };
  }

  const atLocation = sortedBlueprints(instances.filter((instance) => instance.locationId === inputLocationId));
  const original = atLocation.find((instance) => instance.kind === "original");
  if (original) {
    return {
      state: "bpo",
      allocations: [{
        itemId: original.itemId,
        kind: "original",
        runs,
        materialEfficiency: efficiency(original.materialEfficiency),
        timeEfficiency: efficiency(original.timeEfficiency),
        locationId: inputLocationId,
      }],
      availableCopyRunsAtLocation: atLocation
        .filter((instance) => instance.kind === "copy")
        .reduce((sum, instance) => sum + Math.max(0, instance.runs), 0),
      missingCopyRuns: 0,
      bestMaterialEfficiency: efficiency(original.materialEfficiency),
      bestTimeEfficiency: efficiency(original.timeEfficiency),
    };
  }

  const copies = atLocation.filter((instance) => instance.kind === "copy" && instance.runs > 0);
  const availableCopyRunsAtLocation = copies.reduce((sum, instance) => sum + instance.runs, 0);
  if (availableCopyRunsAtLocation >= runs) {
    let remaining = runs;
    const allocations: ManufacturingBlueprintAllocation[] = [];
    for (const copy of copies) {
      if (remaining <= 0) break;
      const allocatedRuns = Math.min(copy.runs, remaining);
      allocations.push({
        itemId: copy.itemId,
        kind: "copy",
        runs: allocatedRuns,
        materialEfficiency: efficiency(copy.materialEfficiency),
        timeEfficiency: efficiency(copy.timeEfficiency),
        locationId: inputLocationId,
      });
      remaining -= allocatedRuns;
    }
    return {
      state: allocations.length === 1 ? "bpc" : "split-bpc",
      allocations,
      availableCopyRunsAtLocation,
      missingCopyRuns: 0,
      bestMaterialEfficiency: allocations[0]?.materialEfficiency ?? null,
      bestTimeEfficiency: allocations[0]?.timeEfficiency ?? null,
    };
  }

  if (copies.length > 0) {
    return {
      state: "insufficient-bpc-runs",
      allocations: copies.map((copy) => ({
        itemId: copy.itemId,
        kind: "copy" as const,
        runs: copy.runs,
        materialEfficiency: efficiency(copy.materialEfficiency),
        timeEfficiency: efficiency(copy.timeEfficiency),
        locationId: inputLocationId,
      })),
      availableCopyRunsAtLocation,
      missingCopyRuns: runs - availableCopyRunsAtLocation,
      bestMaterialEfficiency: efficiency(copies[0].materialEfficiency),
      bestTimeEfficiency: efficiency(copies[0].timeEfficiency),
    };
  }

  return {
    state: instances.length > 0 ? "blueprint-elsewhere" : "not-owned",
    allocations: [],
    availableCopyRunsAtLocation: 0,
    missingCopyRuns: 0,
    bestMaterialEfficiency: null,
    bestTimeEfficiency: null,
  };
}

export function manufacturingMaterialQuantity(
  baseQuantityPerRun: number,
  runs: number,
  materialEfficiencyPercent = 0,
): number {
  const base = safeQuantity(baseQuantityPerRun, "baseQuantityPerRun");
  const jobRuns = safeRuns(runs);
  if (base === 0) return 0;
  if (base === 1) return jobRuns;
  return Math.ceil(base * jobRuns * (1 - efficiency(materialEfficiencyPercent) / 100));
}

function requiredMaterialQuantity(
  baseQuantityPerRun: number,
  runs: number,
  blueprint: ManufacturingBlueprintPlan,
): { requiredQuantity: number; quantityBasis: ManufacturingMaterialPlan["quantityBasis"] } {
  if (["bpo", "bpc", "split-bpc"].includes(blueprint.state) && blueprint.allocations.length > 0) {
    const requiredQuantity = blueprint.allocations.reduce(
      (sum, allocation) => sum + manufacturingMaterialQuantity(baseQuantityPerRun, allocation.runs, allocation.materialEfficiency),
      0,
    );
    return { requiredQuantity, quantityBasis: "owned-blueprint-me" };
  }
  return {
    requiredQuantity: manufacturingMaterialQuantity(baseQuantityPerRun, runs, 0),
    quantityBasis: "sde-base",
  };
}

export function buildManufacturingPlan(input: ManufacturingPlanInput): ManufacturingPlan {
  const runs = safeRuns(input.runs);
  const blueprint = planBlueprintUse(input.blueprintVisibility, input.blueprints, input.inputLocationId, runs);
  const skills: ManufacturingSkillPlan[] = input.skills.map((skill) => {
    if (skill.visibility === "unavailable") return { ...skill, status: "unknown" };
    if (skill.trainedLevel !== null && skill.trainedLevel >= skill.requiredLevel) return { ...skill, status: "met" };
    return { ...skill, status: "missing" };
  });

  const materials: ManufacturingMaterialPlan[] = input.materials.map((material) => {
    const { requiredQuantity, quantityBasis } = requiredMaterialQuantity(material.baseQuantityPerRun, runs, blueprint);
    const missingAtInputLocation = material.ownedAtInputLocation === null
      ? null
      : Math.max(0, requiredQuantity - material.ownedAtInputLocation);
    const missingAnywhere = material.ownedAnywhere === null
      ? null
      : Math.max(0, requiredQuantity - material.ownedAnywhere);
    const moveFromElsewhereQuantity = material.ownedAtInputLocation === null || material.ownedAnywhere === null
      ? null
      : Math.max(0, Math.min(requiredQuantity, material.ownedAnywhere) - Math.min(requiredQuantity, material.ownedAtInputLocation));
    let status: ManufacturingMaterialPlan["status"] = "unknown";
    if (missingAtInputLocation !== null && missingAtInputLocation === 0) status = "ready";
    else if (missingAnywhere !== null && missingAnywhere > 0) status = "acquire";
    else if (missingAtInputLocation !== null && missingAtInputLocation > 0) status = "move";
    return {
      ...material,
      requiredQuantity,
      quantityBasis,
      missingAtInputLocation,
      missingAnywhere,
      moveFromElsewhereQuantity,
      status,
    };
  });

  const blockers: string[] = [];
  const unknowns: string[] = [];
  if (input.inputLocationId === null) unknowns.push("No input location has been selected yet.");
  if (blueprint.state === "not-owned") blockers.push(`No owned ${input.blueprintName} is visible.`);
  if (blueprint.state === "blueprint-elsewhere") blockers.push(`A usable ${input.blueprintName} is not at the selected input location.`);
  if (blueprint.state === "insufficient-bpc-runs") blockers.push(`The selected input location is short ${blueprint.missingCopyRuns} licensed blueprint run(s).`);
  if (blueprint.state === "unknown") unknowns.push("Blueprint visibility is unavailable.");
  for (const skill of skills.filter((entry) => entry.status === "missing")) blockers.push(`${skill.name} ${skill.requiredLevel} is required.`);
  if (skills.some((entry) => entry.status === "unknown")) unknowns.push("One or more required skills could not be checked.");
  if (input.facilityAvailable === "no") blockers.push("The selected location does not have a confirmed manufacturing service.");
  if (input.facilityAvailable === "unknown") unknowns.push("Manufacturing service availability and final facility modifiers are not confirmed.");
  if (materials.some((material) => material.status === "unknown")) unknowns.push("Some material ownership/location data could not be established.");

  const firstSkill = skills.find((skill) => skill.status === "missing");
  const firstAcquire = materials.find((material) => material.status === "acquire");
  const firstMove = materials.find((material) => material.status === "move");
  let nextAction: string;
  if (input.inputLocationId === null) {
    nextAction = "Choose an input location for this manufacturing job.";
  } else if (blueprint.state === "unknown") {
    nextAction = "Confirm your blueprint availability in EVE or reconnect blueprint visibility.";
  } else if (blueprint.state === "not-owned") {
    nextAction = `Obtain a usable ${input.blueprintName}.`;
  } else if (blueprint.state === "blueprint-elsewhere") {
    nextAction = `Move a usable ${input.blueprintName} to ${input.inputLocationLabel ?? "the selected input location"}.`;
  } else if (blueprint.state === "insufficient-bpc-runs") {
    nextAction = `Obtain ${blueprint.missingCopyRuns} more licensed ${input.blueprintName} run(s) at ${input.inputLocationLabel ?? "the selected input location"}.`;
  } else if (firstSkill) {
    nextAction = `Train ${firstSkill.name} to level ${firstSkill.requiredLevel}.`;
  } else if (firstAcquire) {
    nextAction = `Acquire ${firstAcquire.missingAnywhere?.toLocaleString() ?? "more"} ${firstAcquire.name}.`;
  } else if (firstMove) {
    nextAction = `Move ${firstMove.moveFromElsewhereQuantity?.toLocaleString() ?? "the needed"} ${firstMove.name} to ${input.inputLocationLabel ?? "the selected input location"}.`;
  } else if (input.facilityAvailable === "no") {
    nextAction = "Choose a location with a manufacturing service.";
  } else if (input.facilityAvailable === "unknown") {
    nextAction = `Confirm that ${input.inputLocationLabel ?? "the selected location"} offers Manufacturing in the EVE Industry window.`;
  } else {
    nextAction = "Open the EVE Industry window, verify the final materials/job cost, and install the job.";
  }

  const hardBlueprintBlock = ["not-owned", "blueprint-elsewhere", "insufficient-bpc-runs"].includes(blueprint.state);
  const hasSkillBlock = skills.some((skill) => skill.status === "missing");
  const hasMaterialWork = materials.some((material) => material.status === "acquire" || material.status === "move");
  let status: ManufacturingPlanStatus;
  if (hardBlueprintBlock || hasSkillBlock || input.facilityAvailable === "no") status = "blocked";
  else if (hasMaterialWork) status = "needs-inputs";
  else if (unknowns.length > 0) status = "unknown";
  else status = "ready-to-verify";

  return {
    status,
    outputQuantity: safeQuantity(input.productQuantityPerRun, "productQuantityPerRun") * runs,
    baseJobTimeSeconds: input.baseTimeSeconds === null ? null : Math.max(0, input.baseTimeSeconds) * runs,
    blueprint,
    materials,
    skills,
    facilityAvailable: input.facilityAvailable,
    blockers,
    unknowns,
    nextAction,
    notes: [
      "Material quantities use the selected owned blueprint's ME when NEC can allocate the requested runs; otherwise they fall back to CCP SDE base quantities.",
      "Facility/rig modifiers, job installation cost, input-hangar access, and the final in-game rounding/result remain authoritative in EVE's Industry window.",
      "NEC does not install or deliver industry jobs through ESI.",
    ],
  };
}
