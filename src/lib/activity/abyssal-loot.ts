import {
  interpretActivityDebriefItem,
  type ActivityDebriefGoalEvidence,
  type ActivityDebriefItem,
  type ActivityDebriefItemDelta,
  type ActivityDebriefSaleEvidence,
} from "./debrief";

export const TRIGLAVIAN_SURVEY_DATABASE_TYPE_ID = 48121;
export const TRIGLAVIAN_SURVEY_DATABASE_NPC_BUY_ISK = 100_000;

export type AbyssalLootContainerId = "bioadaptive-cache" | "extraction-node" | "extraction-subnode";
export type AbyssalLootFamilyId =
  | "red-loot"
  | "filament"
  | "mutaplasmid"
  | "blueprint-copy"
  | "abyssal-material"
  | "module"
  | "other";

export interface AbyssalLootContainerKnowledge {
  id: AbyssalLootContainerId;
  typeId: number;
  name: string;
  role: "main" | "optional-side";
  availableFromTier: number;
  guidance: string;
  timerPriority: string;
}

export interface AbyssalLootFamilyKnowledge {
  id: AbyssalLootFamilyId;
  title: string;
  examples: readonly string[];
  useGuidance: string;
  keepGuidance: string;
  sellGuidance: string;
  automaticSellSafe: boolean;
}

export interface AbyssalLootSource {
  id: string;
  title: string;
  url: string;
  verifiedOn: string;
  supports: readonly string[];
}

export interface AbyssalLootTeachingItemInput {
  item: ActivityDebriefItemDelta;
  family: AbyssalLootFamilyId;
  goalEvidence?: readonly ActivityDebriefGoalEvidence[];
  saleEvidence?: ActivityDebriefSaleEvidence;
}

export interface AbyssalLootTeachingItem {
  family: AbyssalLootFamilyKnowledge;
  recommendation: ActivityDebriefItem;
  guidance: string;
}

export const ABYSSAL_LOOT_CONTAINERS: readonly AbyssalLootContainerKnowledge[] = [
  {
    id: "bioadaptive-cache",
    typeId: 47951,
    name: "Triglavian Bioadaptive Cache",
    role: "main",
    availableFromTier: 0,
    guidance: "The main loot container in each pocket. Destroy it, loot the wreck, and prioritize it over side loot when time is tight.",
    timerPriority: "Main target for loot. Do not sacrifice survival or the 20-minute timer for it.",
  },
  {
    id: "extraction-node",
    typeId: 49662,
    name: "Triglavian Extraction Node",
    role: "optional-side",
    availableFromTier: 1,
    guidance: "Optional side loot found from T1 upward. It can be away from your route, so take it only when time and positioning are comfortable.",
    timerPriority: "Bonus loot. Skip side nodes when the detour threatens your time margin.",
  },
  {
    id: "extraction-subnode",
    typeId: 49661,
    name: "Triglavian Extraction SubNode",
    role: "optional-side",
    availableFromTier: 1,
    guidance: "Optional side loot found from T1 upward. Unlike the main cache, a SubNode is not guaranteed to contain loot.",
    timerPriority: "Lowest priority of these three. Treat it as a bonus, not a reason to risk the run.",
  },
] as const;

export const ABYSSAL_LOOT_FAMILIES: readonly AbyssalLootFamilyKnowledge[] = [
  {
    id: "red-loot",
    title: "Triglavian Survey Database ('red loot')",
    examples: ["Triglavian Survey Database"],
    useGuidance: "A saved goal or later system may establish another use; goal evidence always outranks liquidation in NEC's debrief model.",
    keepGuidance: "Keep it when a goal explicitly needs it or when you deliberately want to defer cash-out.",
    sellGuidance: `Its standard cash-out path is NPC buy orders at ${TRIGLAVIAN_SURVEY_DATABASE_NPC_BUY_ISK.toLocaleString("en-US")} ISK per unit. Do not dump it into a lower player buy order without checking the order price.`,
    automaticSellSafe: true,
  },
  {
    id: "filament",
    title: "Abyssal filaments",
    examples: ["Tranquil Electrical Filament", "Calm Dark Filament"],
    useGuidance: "Use matching filaments as supply for future runs that the selected fit/readiness plan actually supports.",
    keepGuidance: "Keep the weather/tier combinations attached to planned runs or saved progression goals.",
    sellGuidance: "Extra filaments can be player-market candidates, but NEC should not auto-sell them without checking goals and current market value.",
    automaticSellSafe: false,
  },
  {
    id: "mutaplasmid",
    title: "Mutaplasmids",
    examples: ["module mutaplasmids"],
    useGuidance: "Mutaplasmids can modify supported modules; using one is a separate decision with irreversible/randomized outcomes.",
    keepGuidance: "Keep when you have a concrete mutation goal or want to evaluate the item before selling.",
    sellGuidance: "Treat as a player-market item unless a goal calls for using it. Do not auto-liquidate an unfamiliar mutaplasmid.",
    automaticSellSafe: false,
  },
  {
    id: "blueprint-copy",
    title: "Blueprint copies",
    examples: ["Triglavian ship/module/ammunition BPCs"],
    useGuidance: "A BPC may unlock an industry path when its materials and skills are within reach.",
    keepGuidance: "Keep when it supports an active item/industry goal or when NEC cannot yet establish whether it is useful.",
    sellGuidance: "Player-market value depends on the blueprint and current demand; defer the sell call until goal usefulness and market value are known.",
    automaticSellSafe: false,
  },
  {
    id: "abyssal-material",
    title: "Abyssal production materials",
    examples: ["Crystalline Isogen-10", "Zero-Point Condensate"],
    useGuidance: "These materials feed Triglavian-related production chains and can matter to manufacturing goals.",
    keepGuidance: "Keep quantities required by saved manufacturing/item goals before treating the remainder as surplus.",
    sellGuidance: "Surplus is a player-market candidate; ECO market valuation will later decide whether and where selling makes sense.",
    automaticSellSafe: false,
  },
  {
    id: "module",
    title: "Modules and other usable drops",
    examples: ["Abyssal/Triglavian modules"],
    useGuidance: "Check whether the module is part of a vetted fit, saved goal, or supported upgrade before deciding what to do with it.",
    keepGuidance: "Keep when a fit/goal establishes a near-term use or when usefulness is still unresolved.",
    sellGuidance: "Otherwise it may be a player-market candidate, but current value is required before NEC should recommend liquidation.",
    automaticSellSafe: false,
  },
  {
    id: "other",
    title: "Unclassified Abyssal drop",
    examples: ["anything NEC cannot confidently classify"],
    useGuidance: "Unknown is a real state. Inspect the item before acting.",
    keepGuidance: "Keep temporarily when NEC lacks enough evidence to establish a use or safe sale path.",
    sellGuidance: "Do not auto-sell an unclassified item simply because it came from the Abyss.",
    automaticSellSafe: false,
  },
] as const;

export const ABYSSAL_LOOT_SOURCES: readonly AbyssalLootSource[] = [
  {
    id: "eve-uni-abyssal-deadspace",
    title: "Abyssal Deadspace — EVE University Wiki",
    url: "https://wiki.eveuniversity.org/Abyssal_Deadspace",
    verifiedOn: "2026-08-18",
    supports: ["NPCs leave no ordinary wreck loot", "Bioadaptive Cache main loot", "Extraction Nodes/SubNodes side loot", "major reward families", "red-loot cash-out"],
  },
  {
    id: "eve-uni-abyssal-rooms",
    title: "Possible rooms in Abyssal Deadspace — EVE University Wiki",
    url: "https://wiki.eveuniversity.org/Possible_rooms_in_Abyssal_Deadspace",
    verifiedOn: "2026-08-18",
    supports: ["T0 has no Extraction Nodes/SubNodes", "main cache versus optional side-container behavior"],
  },
  {
    id: "everef-bioadaptive-cache",
    title: "Triglavian Bioadaptive Cache — EVE Ref / CCP reference data",
    url: "https://everef.net/types/47951",
    verifiedOn: "2026-08-18",
    supports: ["Bioadaptive Cache identity", "cache description and loot role"],
  },
  {
    id: "everef-extraction-node",
    title: "Triglavian Extraction Node — EVE Ref / CCP reference data",
    url: "https://everef.net/types/49662",
    verifiedOn: "2026-08-18",
    supports: ["Extraction Node identity and type ID"],
  },
  {
    id: "everef-extraction-subnode",
    title: "Triglavian Extraction SubNode — EVE Ref / CCP reference data",
    url: "https://everef.net/types/49661",
    verifiedOn: "2026-08-18",
    supports: ["Extraction SubNode identity and type ID"],
  },
  {
    id: "everef-survey-database",
    title: "Triglavian Survey Database — EVE Ref / CCP reference data",
    url: "https://everef.net/types/48121",
    verifiedOn: "2026-08-18",
    supports: ["type ID 48121", "100,000 ISK base/cash-out reference", "commodity identity"],
  },
] as const;

export function getAbyssalLootFamily(id: AbyssalLootFamilyId): AbyssalLootFamilyKnowledge {
  const family = ABYSSAL_LOOT_FAMILIES.find((candidate) => candidate.id === id);
  if (!family) throw new Error(`Unknown Abyssal loot family: ${id}`);
  return family;
}

export function abyssalLootContainersForTier(tier: number): AbyssalLootContainerKnowledge[] {
  if (!Number.isInteger(tier) || tier < 0 || tier > 6) throw new Error("Abyssal tier must be an integer from 0 through 6.");
  return ABYSSAL_LOOT_CONTAINERS.filter((container) => tier >= container.availableFromTier);
}

function defaultRedLootSaleEvidence(input: AbyssalLootTeachingItemInput): ActivityDebriefSaleEvidence | undefined {
  if (input.family !== "red-loot" || input.item.typeId !== TRIGLAVIAN_SURVEY_DATABASE_TYPE_ID) return undefined;
  return {
    why: `Triglavian Survey Databases have the standard NPC cash-out path at ${TRIGLAVIAN_SURVEY_DATABASE_NPC_BUY_ISK.toLocaleString("en-US")} ISK per unit; active-goal evidence still takes priority over selling.`,
    estimatedUnitValueIsk: TRIGLAVIAN_SURVEY_DATABASE_NPC_BUY_ISK,
    source: "NPC buy-order / CCP reference-data cash-out",
  };
}

export function teachAbyssalLootItem(input: AbyssalLootTeachingItemInput): AbyssalLootTeachingItem {
  const family = getAbyssalLootFamily(input.family);
  const recommendation = interpretActivityDebriefItem({
    item: input.item,
    goalEvidence: input.goalEvidence,
    saleEvidence: input.saleEvidence ?? defaultRedLootSaleEvidence(input),
  });

  const guidance = recommendation.disposition === "use-next"
    ? family.useGuidance
    : recommendation.disposition === "keep"
      ? family.keepGuidance
      : recommendation.disposition === "sell"
        ? family.sellGuidance
        : `${family.keepGuidance} ${family.sellGuidance}`;

  return { family, recommendation, guidance };
}

export function noOrdinaryNpcWreckLootGuidance(): string {
  return "Combat NPCs do not leave ordinary loot/salvage wrecks or bounties. Treat the Bioadaptive Cache as the main loot source, then consider Extraction Nodes/SubNodes only where they exist and only if time allows.";
}
