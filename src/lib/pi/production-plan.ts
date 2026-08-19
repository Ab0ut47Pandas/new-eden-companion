import type { DatabaseSync } from "node:sqlite";

import type { PlanetColonyDetail } from "./colony-health";
import { queryPlanetarySchematicsForOutput, type PlanetarySchematic } from "./schematic-query";

export interface PlanetaryColonyEvidence {
  planetId: number;
  planetName: string | null;
  planetType: string | null;
  solarSystemId: number;
  solarSystemName: string | null;
  detail: PlanetColonyDetail | null;
}

export type PlanetaryPlanCoverage =
  | "factory-configured"
  | "extractor-visible"
  | "stock-visible"
  | "missing"
  | "unknown";

export interface PlanetaryPlanEvidence {
  coverage: PlanetaryPlanCoverage;
  planetId: number | null;
  planetName: string | null;
  detail: string;
}

export interface PlanetaryProductionLeaf {
  kind: "leaf";
  typeId: number;
  name: string | null;
  isPlaceholder: boolean;
  requiredQuantity: number;
  reason: "no-schematic" | "depth-limit" | "cycle" | "unknown-type";
  evidence: PlanetaryPlanEvidence[];
}

export interface PlanetaryProductionStep {
  kind: "production";
  typeId: number;
  name: string | null;
  isPlaceholder: boolean;
  requiredQuantity: number;
  schematicId: number;
  schematicName: string | null;
  cycleTimeSeconds: number;
  cycles: number;
  outputPerCycle: number;
  alternativeSchematicIds: number[];
  facilityTypes: Array<{ typeId: number; name: string | null; isPlaceholder: boolean }>;
  evidence: PlanetaryPlanEvidence[];
  inputs: PlanetaryProductionNode[];
}

export type PlanetaryProductionNode = PlanetaryProductionLeaf | PlanetaryProductionStep;

export interface PlanetaryProductionPlan {
  targetTypeId: number;
  requestedQuantity: number;
  root: PlanetaryProductionNode;
  checklist: string[];
  warnings: string[];
}

export interface PlanetaryProductionPlanOptions {
  maxDepth?: number;
  colonies?: PlanetaryColonyEvidence[];
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`${label} must be a positive integer.`);
  return value;
}

function typeIdentity(db: DatabaseSync, typeId: number): { name: string | null; isPlaceholder: boolean } | null {
  const row = db.prepare("SELECT name, is_placeholder FROM types WHERE type_id = ?").get(typeId) as unknown as
    | { name: string | null; is_placeholder: number }
    | undefined;
  return row ? { name: row.name, isPlaceholder: row.is_placeholder === 1 } : null;
}

function stockEvidence(typeId: number, colonies: readonly PlanetaryColonyEvidence[]): PlanetaryPlanEvidence[] {
  const results: PlanetaryPlanEvidence[] = [];
  for (const colony of colonies) {
    if (!colony.detail) continue;
    const amount = colony.detail.pins.reduce((total, pin) => total + (pin.contents ?? [])
      .filter((content) => content.type_id === typeId)
      .reduce((subtotal, content) => subtotal + content.amount, 0), 0);
    if (amount <= 0) continue;
    results.push({
      coverage: "stock-visible",
      planetId: colony.planetId,
      planetName: colony.planetName,
      detail: `${amount.toLocaleString()} units are visible in the ESI colony snapshot on ${colony.planetName ?? `planet ${colony.planetId}`}.`,
    });
  }
  return results;
}

function extractorEvidence(typeId: number, colonies: readonly PlanetaryColonyEvidence[]): PlanetaryPlanEvidence[] {
  const results: PlanetaryPlanEvidence[] = [];
  for (const colony of colonies) {
    if (!colony.detail) continue;
    const count = colony.detail.pins.filter((pin) => pin.extractor_details?.product_type_id === typeId).length;
    if (count === 0) continue;
    results.push({
      coverage: "extractor-visible",
      planetId: colony.planetId,
      planetName: colony.planetName,
      detail: `${count} ESI-visible extractor${count === 1 ? "" : "s"} on ${colony.planetName ?? `planet ${colony.planetId}`} currently reference this product type. NEC does not infer future yield or resource density.`,
    });
  }
  return results;
}

function factoryEvidence(schematic: PlanetarySchematic, colonies: readonly PlanetaryColonyEvidence[]): PlanetaryPlanEvidence[] {
  const results: PlanetaryPlanEvidence[] = [];
  for (const colony of colonies) {
    if (!colony.detail) continue;
    const count = colony.detail.pins.filter((pin) => pin.factory_details?.schematic_id === schematic.schematicId).length;
    if (count === 0) continue;
    results.push({
      coverage: "factory-configured",
      planetId: colony.planetId,
      planetName: colony.planetName,
      detail: `${count} ESI-visible factor${count === 1 ? "y is" : "ies are"} configured for schematic ${schematic.schematicId} on ${colony.planetName ?? `planet ${colony.planetId}`}. Routing and continuous supply still need to be verified in EVE.`,
    });
  }
  return results;
}

function missingEvidence(kind: "factory" | "source", colonies: readonly PlanetaryColonyEvidence[]): PlanetaryPlanEvidence[] {
  const unreadable = colonies.filter((colony) => colony.detail === null).length;
  if (unreadable > 0) {
    return [{
      coverage: "unknown",
      planetId: null,
      planetName: null,
      detail: `${unreadable} colony snapshot${unreadable === 1 ? " is" : "s are"} unavailable, so NEC cannot prove whether this ${kind} capability exists there.`,
    }];
  }
  return [{
    coverage: "missing",
    planetId: null,
    planetName: null,
    detail: kind === "factory"
      ? "No ESI-visible colony factory is currently configured for this schematic."
      : "No ESI-visible extractor or stock proves this input is currently available. NEC will not invent a source planet or resource location.",
  }];
}

function buildChecklist(root: PlanetaryProductionNode): string[] {
  const lines: string[] = [];
  const visit = (node: PlanetaryProductionNode): void => {
    if (node.kind === "leaf") {
      const label = node.name ?? `Type ${node.typeId}`;
      if (node.reason === "no-schematic") {
        const extractor = node.evidence.find((entry) => entry.coverage === "extractor-visible");
        const stock = node.evidence.find((entry) => entry.coverage === "stock-visible");
        if (stock) lines.push(`Use or move ${node.requiredQuantity.toLocaleString()} ${label}; some stock is visible in the current colony snapshot.`);
        else if (extractor) lines.push(`Produce at least ${node.requiredQuantity.toLocaleString()} ${label} from the ESI-visible extractor, then verify routing in EVE.`);
        else lines.push(`Obtain ${node.requiredQuantity.toLocaleString()} ${label}. The installed PI schematic data has no production recipe for it, so confirm the extraction/source planet in EVE.`);
      } else if (node.reason === "depth-limit") {
        lines.push(`Expand ${label} manually: the planner reached its recursion depth limit.`);
      } else if (node.reason === "cycle") {
        lines.push(`Review ${label}: a PI schematic cycle was detected and NEC stopped expansion.`);
      } else {
        lines.push(`Resolve type ${node.typeId}: the installed static data cannot identify it.`);
      }
      return;
    }
    for (const input of node.inputs) visit(input);
    const label = node.name ?? `Type ${node.typeId}`;
    const factory = node.evidence.find((entry) => entry.coverage === "factory-configured");
    const facility = node.facilityTypes.map((item) => item.name ?? `Type ${item.typeId}`).join(" / ") || "compatible PI facility";
    lines.push(`${factory ? "Run" : "Configure and run"} ${node.schematicName ?? `schematic ${node.schematicId}`} in ${facility} for ${node.cycles.toLocaleString()} cycle${node.cycles === 1 ? "" : "s"} to produce at least ${node.requiredQuantity.toLocaleString()} ${label}.`);
  };
  visit(root);
  return lines;
}

export function buildPlanetaryProductionPlan(
  db: DatabaseSync,
  targetTypeId: number,
  requestedQuantity = 1,
  options: PlanetaryProductionPlanOptions = {},
): PlanetaryProductionPlan {
  positiveInteger(targetTypeId, "targetTypeId");
  positiveInteger(requestedQuantity, "requestedQuantity");
  const maxDepth = options.maxDepth ?? 12;
  if (!Number.isSafeInteger(maxDepth) || maxDepth < 1 || maxDepth > 64) throw new TypeError("maxDepth must be an integer from 1 to 64.");
  const colonies = options.colonies ?? [];
  const warnings = new Set<string>();

  const expand = (typeId: number, quantity: number, depth: number, active: ReadonlySet<number>): PlanetaryProductionNode => {
    const identity = typeIdentity(db, typeId);
    const common = {
      typeId,
      name: identity?.name ?? null,
      isPlaceholder: identity?.isPlaceholder ?? true,
      requiredQuantity: quantity,
    };
    if (!identity) {
      warnings.add(`Type ${typeId} is missing from the installed static database.`);
      return { kind: "leaf", ...common, reason: "unknown-type", evidence: missingEvidence("source", colonies) };
    }
    if (active.has(typeId)) {
      warnings.add(`A recursive PI schematic cycle involving ${identity.name ?? `type ${typeId}`} was stopped.`);
      return { kind: "leaf", ...common, reason: "cycle", evidence: missingEvidence("source", colonies) };
    }
    if (depth >= maxDepth) {
      warnings.add(`The PI plan reached the configured depth limit at ${identity.name ?? `type ${typeId}`}.`);
      return { kind: "leaf", ...common, reason: "depth-limit", evidence: missingEvidence("source", colonies) };
    }

    const schematics = queryPlanetarySchematicsForOutput(db, typeId);
    if (schematics.length === 0) {
      const evidence = [...stockEvidence(typeId, colonies), ...extractorEvidence(typeId, colonies)];
      if (evidence.length === 0) evidence.push(...missingEvidence("source", colonies));
      return { kind: "leaf", ...common, reason: "no-schematic", evidence };
    }

    const schematic = schematics[0];
    const output = schematic.outputs.find((candidate) => candidate.typeId === typeId);
    if (!output || output.quantity <= 0) {
      warnings.add(`Schematic ${schematic.schematicId} has no usable output quantity for ${identity.name ?? `type ${typeId}`}.`);
      return { kind: "leaf", ...common, reason: "unknown-type", evidence: missingEvidence("source", colonies) };
    }
    const cycles = Math.ceil(quantity / output.quantity);
    const nextActive = new Set(active);
    nextActive.add(typeId);
    const evidence = [...stockEvidence(typeId, colonies), ...factoryEvidence(schematic, colonies)];
    if (!evidence.some((entry) => entry.coverage === "factory-configured")) evidence.push(...missingEvidence("factory", colonies));
    return {
      kind: "production",
      ...common,
      schematicId: schematic.schematicId,
      schematicName: schematic.name,
      cycleTimeSeconds: schematic.cycleTimeSeconds,
      cycles,
      outputPerCycle: output.quantity,
      alternativeSchematicIds: schematics.slice(1).map((candidate) => candidate.schematicId),
      facilityTypes: schematic.pins,
      evidence,
      inputs: schematic.inputs.map((input) => expand(input.typeId, input.quantity * cycles, depth + 1, nextActive)),
    };
  };

  const root = expand(targetTypeId, requestedQuantity, 0, new Set());
  if (root.kind === "leaf" && root.reason === "no-schematic") {
    warnings.add("The selected target is not produced by a PI schematic in the installed SDE. It may be a raw input or not a Planetary Industry commodity; NEC does not guess which.");
  }
  return {
    targetTypeId,
    requestedQuantity,
    root,
    checklist: buildChecklist(root),
    warnings: [...warnings].sort((a, b) => a.localeCompare(b)),
  };
}
