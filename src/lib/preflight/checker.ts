import type { ActiveShipItemView, StoredSupplyView } from "@/lib/dashboard/model";

export type ActivityId = "combat" | "exploration" | "harvesting" | "hauling" | "salvage" | "support" | "travel" | "industry";
export type FleetScale = "solo" | "small" | "organized";
export type TripProfile = "one" | "session" | "expedition";
export type CheckStatus = "pass" | "warning" | "danger" | "unknown" | "manual" | "info";
export type CheckSection = "ship" | "fit" | "supplies" | "before-undock";
export type AbyssalTier = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type AbyssalWeather = "electrical" | "exotic" | "firestorm" | "gamma" | "dark";

// Mechanics reviewed 2026-08-13 against CCP's Abyssal Deadspace support article.
// DPS/EHP/s figures are deliberately labeled simulator rules of thumb and come from
// EVE University's current Abyssal FAQ, not from ESI or a promise of survival.
export const ABYSSAL_TIERS: Array<{ id: AbyssalTier; name: string; label: string; dps: number; tank: number }> = [
  { id: 0, name: "Tranquil", label: "T0 Tranquil", dps: 100, tank: 50 },
  { id: 1, name: "Calm", label: "T1 Calm", dps: 150, tank: 150 },
  { id: 2, name: "Agitated", label: "T2 Agitated", dps: 300, tank: 300 },
  { id: 3, name: "Fierce", label: "T3 Fierce", dps: 450, tank: 450 },
  { id: 4, name: "Raging", label: "T4 Raging", dps: 600, tank: 600 },
  { id: 5, name: "Chaotic", label: "T5 Chaotic", dps: 750, tank: 750 },
  { id: 6, name: "Cataclysmic", label: "T6 Cataclysmic", dps: 850, tank: 950 },
];

export const ABYSSAL_WEATHERS: Array<{ id: AbyssalWeather; label: string; hole: string; bonus: string }> = [
  { id: "electrical", label: "Electrical", hole: "EM", bonus: "faster capacitor recharge" },
  { id: "exotic", label: "Exotic", hole: "kinetic", bonus: "better scan resolution" },
  { id: "firestorm", label: "Firestorm", hole: "thermal", bonus: "more armor HP" },
  { id: "gamma", label: "Gamma", hole: "explosive", bonus: "more shield HP" },
  { id: "dark", label: "Dark", hole: "none", bonus: "more maximum velocity" },
];

export interface ActivityChoice {
  id: ActivityId;
  label: string;
  shortLabel: string;
  description: string;
  options: Array<{ id: string; label: string }>;
}

export interface PreflightCheck {
  id: string;
  status: CheckStatus;
  section: CheckSection;
  title: string;
  detail: string;
}

export interface PreflightInput {
  activity: ActivityId;
  option: string;
  fleetScale: FleetScale;
  tripProfile: TripProfile;
  shipName: string;
  shipType: string;
  shipGroupId: number;
  docked: boolean;
  systemName: string;
  systemSecurity: number;
  inventoryReadable: boolean;
  activeImplants: number;
  fleetMemberCount?: number;
  abyssalTier: AbyssalTier;
  abyssalWeather: AbyssalWeather;
  contents: ActiveShipItemView[];
  storedSupplies: StoredSupplyView[];
}

export const ACTIVITIES: ActivityChoice[] = [
  {
    id: "combat",
    label: "Fight",
    shortLabel: "Combat",
    description: "Sites, missions, Abyssals, PvP or Faction Warfare.",
    options: [
      { id: "pve", label: "PvE site or mission" },
      { id: "abyssal", label: "Abyssal Deadspace" },
      { id: "pvp", label: "PvP or Faction Warfare" },
    ],
  },
  {
    id: "exploration",
    label: "Explore or hack",
    shortLabel: "Exploration",
    description: "Scan, hack data or relic sites, and travel wormholes.",
    options: [
      { id: "data", label: "Data-site hacking" },
      { id: "relic", label: "Relic-site hacking" },
      { id: "wormhole", label: "Scan or enter wormholes" },
    ],
  },
  {
    id: "harvesting",
    label: "Mine or harvest",
    shortLabel: "Harvesting",
    description: "Ore, moon material, ice or gas gathering.",
    options: [
      { id: "ore", label: "Ore or moon mining" },
      { id: "ice", label: "Ice harvesting" },
      { id: "gas", label: "Gas harvesting" },
    ],
  },
  {
    id: "hauling",
    label: "Haul or trade",
    shortLabel: "Cargo",
    description: "Move assets, complete contracts, trade or collect PI.",
    options: [
      { id: "assets", label: "Move my own assets" },
      { id: "courier", label: "Courier contract" },
      { id: "trade", label: "Market trade run" },
      { id: "pi", label: "Planetary Industry pickup" },
    ],
  },
  {
    id: "salvage",
    label: "Salvage or loot",
    shortLabel: "Recovery",
    description: "Clean up wrecks, tractor loot and recover drones.",
    options: [
      { id: "wrecks", label: "Salvage wrecks" },
      { id: "loot", label: "Loot and battlefield cleanup" },
    ],
  },
  {
    id: "support",
    label: "Support a fleet",
    shortLabel: "Fleet support",
    description: "Repair, boost, tackle, disrupt or scout for others.",
    options: [
      { id: "repair", label: "Remote repair or capacitor" },
      { id: "boost", label: "Command or mining boosts" },
      { id: "ewar", label: "Tackle or electronic warfare" },
      { id: "scout", label: "Scout or probe" },
    ],
  },
  {
    id: "travel",
    label: "Travel or relocate",
    shortLabel: "Travel",
    description: "Move yourself or a ship through known or unknown space.",
    options: [
      { id: "route", label: "Normal gate route" },
      { id: "dangerous", label: "Low/null-sec route" },
      { id: "filament", label: "Filament or wormhole travel" },
    ],
  },
  {
    id: "industry",
    label: "Industry or PI",
    shortLabel: "Industry",
    description: "Prepare a job, materials, planets or field deployment.",
    options: [
      { id: "job", label: "Manufacture, research or react" },
      { id: "materials", label: "Collect or deliver materials" },
      { id: "deployment", label: "Deploy equipment in space" },
    ],
  },
];

const SLOT = /^(HiSlot|MedSlot|LoSlot|RigSlot|SubSystemSlot)/;
const BAY = /^(Cargo|DroneBay|FighterBay|FleetHangar|ShipHangar|Specialized)/;
const HOLD = /^(Cargo|FleetHangar|Specialized)/;
const PROPULSION = /(afterburner|microwarpdrive)/i;
const TANK = /(repairer|shield booster|shield extender|armor plate|hardener|resistance|adaptive|damage control)/i;
const SCRIPTED_MODULE = /(tracking computer|tracking disruptor|weapon disruptor|missile guidance computer|sensor booster|remote sensor booster|sensor dampener|warp disruption field generator)/i;

const WEAPON_FAMILIES = [
  { id: "missile", module: /(?<!probe )(?<!festival )launcher/i, charge: /(missile|rocket|torpedo|auto-targeting|bomb)/i },
  { id: "laser", module: /(beam laser|pulse laser|energy beam|energy pulse|maser)/i, charge: /(radio|microwave|infrared|standard|ultraviolet|xray|gamma|multifrequency|aurora|gleam|conflagration|scorch) (s|m|l|xl)$/i },
  { id: "hybrid", module: /(blaster|railgun)/i, charge: /(iron|tungsten|iridium|lead|thorium|uranium|plutonium|antimatter|javelin|null|spike|void) charge/i },
  { id: "projectile", module: /(autocannon|artillery)/i, charge: /(carbonized lead|depleted uranium|emp|fusion|nuclear|phased plasma|proton|titanium sabot|barrage|hail|quake|tremor) (s|m|l|xl)$/i },
  { id: "disintegrator", module: /(entropic disintegrator|vorton projector)/i, charge: /(exotic plasma|vorton projector condenser pack)/i },
] as const;

const ABYSSAL_FRIGATE_GROUPS = new Set([25, 324, 830, 831, 834, 893, 1022, 1283, 1527]);
const ABYSSAL_DESTROYER_GROUPS = new Set([420, 541, 1305, 1534]);
const ABYSSAL_CRUISER_GROUPS = new Set([26, 358, 832, 833, 894, 906]);
const STRATEGIC_CRUISER_GROUP = 963;
const TIER_BY_NAME = new Map(ABYSSAL_TIERS.map((tier) => [tier.name.toLowerCase(), tier]));

const WEATHER_RULES: Record<AbyssalWeather, {
  damage: RegExp;
  resistance: RegExp;
  effect: string;
  advice: string;
}> = {
  electrical: {
    damage: /(mjolnir|acolyte|infiltrator|praetor|curator|multifrequency|gamma|xray|ultraviolet|standard|infrared|microwave|radio)/i,
    resistance: /(em .*hardener|em .*resistance|multispectrum|adaptive|reactive armor hardener|damage control)/i,
    effect: "Electrical opens the EM resistance hole and doubles effective capacitor recharge by halving recharge time.",
    advice: "EM damage takes advantage of the weather. Armor repairers and lasers often benefit from the extra capacitor.",
  },
  exotic: {
    damage: /(scourge|hornet|vespa|wasp|warden|kinetic)/i,
    resistance: /(kinetic .*hardener|kinetic .*resistance|multispectrum|adaptive|reactive armor hardener|damage control)/i,
    effect: "Exotic opens the kinetic resistance hole and improves scan resolution.",
    advice: "Bring reliable kinetic damage; the scan-resolution bonus does not improve your tank or capacitor.",
  },
  firestorm: {
    damage: /(inferno|hobgoblin|hammerhead|ogre|garde|thermal|phased plasma)/i,
    resistance: /(thermal .*hardener|thermal .*resistance|multispectrum|adaptive|reactive armor hardener|damage control)/i,
    effect: "Firestorm opens the thermal resistance hole and increases armor HP for you and the NPCs.",
    advice: "Thermal damage is preferred, but the extra enemy armor makes the 20-minute timer less forgiving.",
  },
  gamma: {
    damage: /(nova|warrior|valkyrie|berserker|bouncer|explosive|fusion)/i,
    resistance: /(explosive .*hardener|explosive .*resistance|multispectrum|adaptive|reactive armor hardener|damage control)/i,
    effect: "Gamma opens the explosive resistance hole and increases shield HP for you and the NPCs.",
    advice: "Explosive damage is preferred. Armor fits do not receive the player-side shield bonus, while shielded enemies still get more HP.",
  },
  dark: {
    damage: /$a/,
    resistance: /$a/,
    effect: "Dark has no resistance hole; it cuts turret and drone weapon range while increasing maximum velocity.",
    advice: "Missile ships are the beginner-friendly match. Turret and drone fits can lose too much effective range and damage time.",
  },
};

type AbyssalHullClass = "frigate" | "destroyer" | "cruiser" | "strategic-cruiser" | "unsupported";

function abyssalHullClass(input: PreflightInput): AbyssalHullClass {
  if (input.shipGroupId === STRATEGIC_CRUISER_GROUP) return "strategic-cruiser";
  if (ABYSSAL_FRIGATE_GROUPS.has(input.shipGroupId)) return "frigate";
  if (ABYSSAL_DESTROYER_GROUPS.has(input.shipGroupId)) return "destroyer";
  if (ABYSSAL_CRUISER_GROUPS.has(input.shipGroupId)) return "cruiser";
  if (/\b(Dragoon|Coercer|Corax|Cormorant|Catalyst|Algos|Talwar|Thrasher|Sunesis)\b/i.test(input.shipType)) return "destroyer";
  if (/\b(Cerberus|Caracal|Omen|Moa|Gila|Vexor|Arbitrator|Sacrilege|Ishtar)\b/i.test(input.shipType)) return "cruiser";
  if (/\b(Punisher|Kestrel|Rifter|Tristan|Retribution|Worm|Hookbill)\b/i.test(input.shipType)) return "frigate";
  return "unsupported";
}

export function detectAbyssalScenario(contents: ActiveShipItemView[]): { tier: AbyssalTier; weather: AbyssalWeather } | null {
  for (const item of contents) {
    if (!/filament/i.test(item.name)) continue;
    const normalized = item.name.toLowerCase();
    const tier = [...TIER_BY_NAME.entries()].find(([name]) => normalized.includes(name))?.[1];
    const weather = ABYSSAL_WEATHERS.find((candidate) => normalized.includes(candidate.label.toLowerCase()));
    if (tier && weather) return { tier: tier.id, weather: weather.id };
  }
  return null;
}

const sectionLabels: Record<CheckSection, string> = {
  ship: "Ship & context",
  fit: "Fit & function",
  supplies: "Supplies aboard",
  "before-undock": "Confirm in EVE",
};

export const CHECK_SECTION_LABELS = sectionLabels;

function has(items: ActiveShipItemView[], expression: RegExp, flags?: RegExp): boolean {
  return items.some((item) => (!flags || flags.test(item.locationFlag)) && expression.test(item.name));
}

function fitted(input: PreflightInput, expression: RegExp): boolean {
  return has(input.contents, expression, SLOT);
}

function carried(input: PreflightInput, expression: RegExp): boolean {
  return has(input.contents, expression, BAY);
}

function quantity(input: PreflightInput, expression: RegExp, flags = BAY): number {
  return input.contents
    .filter((item) => flags.test(item.locationFlag) && expression.test(item.name))
    .reduce((sum, item) => sum + Math.max(0, item.quantity), 0);
}

function itemNames(input: PreflightInput, expression: RegExp, flags = BAY): string[] {
  return [...new Set(input.contents.filter((item) => flags.test(item.locationFlag) && expression.test(item.name)).map((item) => item.name))];
}

function manual(id: string, title: string, detail: string, section: CheckSection = "before-undock"): PreflightCheck {
  return { id, status: "manual", section, title, detail };
}

function info(id: string, title: string, detail: string, section: CheckSection = "before-undock"): PreflightCheck {
  return { id, status: "info", section, title, detail };
}

function danger(id: string, title: string, detail: string, section: CheckSection = "ship"): PreflightCheck {
  return { id, status: "danger", section, title, detail };
}

function equipmentCheck(input: PreflightInput, id: string, title: string, detail: string, found: boolean, missingDetail?: string, section: CheckSection = "fit"): PreflightCheck {
  if (!input.inventoryReadable) return { id, status: "unknown", section, title, detail: "ESI could not read the active ship inventory. Check this manually in the fitting window." };
  return found
    ? { id, status: "pass", section, title, detail }
    : { id, status: "warning", section, title, detail: missingDetail ?? "Not found in the active ship records. Add it, choose another ship, or confirm manually if ESI has not refreshed yet." };
}

function universalChecks(input: PreflightInput): PreflightCheck[] {
  const fittedCount = new Set(input.contents.filter((item) => SLOT.test(item.locationFlag)).map((item) => item.locationFlag)).size;
  const cargoCount = input.contents.filter((item) => BAY.test(item.locationFlag)).length;
  const checks: PreflightCheck[] = [
    {
      id: "ship",
      status: input.shipType && input.shipType !== "Unknown hull" ? "pass" : "unknown",
      section: "ship",
      title: input.shipType && input.shipType !== "Unknown hull" ? `${input.shipType} detected` : "Current ship is unknown",
      detail: `${input.shipName || "Unnamed ship"} in ${input.systemName} (${input.systemSecurity.toFixed(1)} security).`,
    },
    input.inventoryReadable
      ? {
          id: "inventory",
          status: input.contents.length ? "pass" : "unknown",
          section: "ship",
          title: input.contents.length ? `${fittedCount} occupied slots and ${cargoCount} carried stacks read` : "No fitted or carried items returned",
          detail: input.contents.length ? "Loaded charges can share a slot with their module; they are no longer counted as extra fitted modules." : "Open the fitting window and confirm modules, charges, drones and cargo manually.",
        }
      : { id: "inventory", status: "unknown", section: "ship", title: "Ship inventory unavailable", detail: "Reconnect with asset access or confirm the fit manually." },
  ];

  if (input.fleetScale === "organized") {
    checks.push(info("fleet", "Fleet doctrine overrides this checklist", "Use the exact doctrine fit, ammunition, voice comms and instructions supplied by your fleet commander.", "ship"));
  } else if (input.fleetScale === "small") {
    checks.push(manual("fleet", "Confirm your job with the group", "Agree who tackles, repairs, scouts and deals damage before anyone takes the first gate.", "ship"));
  } else {
    checks.push(info("fleet", "Solo safety applies", "Bring your own escape plan, repairs and replacement budget; nobody else is covering a missing role.", "ship"));
  }
  return checks;
}

function supplyChecks(input: PreflightInput, includeWeapons = true): PreflightCheck[] {
  const checks: PreflightCheck[] = [];
  const fittedItems = input.contents.filter((item) => SLOT.test(item.locationFlag));
  const weaponFamilies = WEAPON_FAMILIES.filter((family) => fittedItems.some((item) => family.module.test(item.name)));
  if (includeWeapons && weaponFamilies.length) {
    const supplied = weaponFamilies.filter((family) => {
      const moduleSlots = fittedItems.filter((item) => family.module.test(item.name)).map((item) => item.locationFlag);
      const loaded = moduleSlots.some((slot) => input.contents.filter((item) => item.locationFlag === slot).length > 1);
      return loaded || carried(input, family.charge);
    });
    const looseCharges = weaponFamilies.reduce((sum, family) => sum + quantity(input, family.charge, HOLD), 0);
    checks.push(equipmentCheck(
      input,
      "matched-ammo",
      `${supplied.length}/${weaponFamilies.length} weapon ${weaponFamilies.length === 1 ? "system" : "systems"} supplied`,
      `${looseCharges.toLocaleString()} matching loose charges plus any loaded charges were detected. Bring range and damage alternatives when the activity calls for them.`,
      supplied.length === weaponFamilies.length,
      `At least one fitted weapon family has no recognizable loaded or carried charge. Check every launcher or turret manually.`,
      "supplies",
    ));
  }

  const capChargeUsers = fitted(input, /(capacitor booster|ancillary shield booster)/i);
  if (capChargeUsers) {
    const capCharges = quantity(input, /cap booster/i, HOLD);
    checks.push(equipmentCheck(input, "cap-charges", `${capCharges} capacitor booster charges aboard`, "A cap booster or ancillary shield booster was found with charges available. Confirm the charge size fits the module.", capCharges > 0, "A fitted capacitor booster or ancillary shield booster needs matching Cap Booster charges.", "supplies"));
  }

  const scriptUsers = fitted(input, SCRIPTED_MODULE);
  if (scriptUsers) {
    const scripts = itemNames(input, /script/i, BAY);
    checks.push(equipmentCheck(input, "scripts", scripts.length ? `${scripts.length} script type${scripts.length === 1 ? "" : "s"} aboard` : "Scripts for fitted modules", scripts.length ? scripts.join(", ") : "", scripts.length > 0, "A scriptable module is fitted, but no scripts were recognized in the active ship. Bring the intended range, precision, speed or disruption scripts.", "supplies"));
  }

  return checks;
}

function pasteCheck(input: PreflightInput, stronglyRecommended: boolean): PreflightCheck {
  const paste = quantity(input, /nanite repair paste/i, HOLD);
  const storedPaste = input.storedSupplies.filter((item) => /nanite repair paste/i.test(item.name));
  const storedQuantity = storedPaste.reduce((sum, item) => sum + item.quantity, 0);
  const storedLocations = [...new Set(storedPaste.map((item) => item.location))];
  const ancillaryArmor = fitted(input, /ancillary armor repairer/i);
  if (!input.inventoryReadable) return { id: "paste", status: "unknown", section: "supplies", title: "Nanite Repair Paste", detail: "ESI could not confirm the cargo. Check it manually." };
  if (paste > 0) return { id: "paste", status: "pass", section: "supplies", title: `${paste.toLocaleString()} Nanite Repair Paste aboard`, detail: ancillaryArmor ? "The fitted ancillary armor repairer consumes paste, and the same paste can repair partially heat-damaged inactive modules in space." : "Paste repairs partially heat-damaged inactive modules in space; it does not repair shield, armor or hull by itself." };
  if (storedQuantity > 0) return manual("paste", "Confirm Nanite Repair Paste in the in-game cargo", `The current ESI asset snapshot says 0 aboard and ${storedQuantity.toLocaleString()} stored at ${storedLocations.join(", ")}. Asset locations can remain cached after moving a stack; if EVE shows 500 in cargo, trust EVE and tick this as confirmed.`, "supplies");
  if (ancillaryArmor) return { id: "paste", status: "warning", section: "supplies", title: "Nanite Repair Paste is required", detail: "An ancillary armor repairer is fitted but no paste was found. It can run without paste at reduced effectiveness, but that is not the intended loaded state." };
  if (stronglyRecommended) return { id: "paste", status: "warning", section: "supplies", title: "No Nanite Repair Paste found", detail: "Bring paste if you expect to overheat. It repairs partially heat-damaged inactive modules between fights; a completely burnt-out module still requires docking." };
  return info("paste", "Nanite Repair Paste recommended", "Optional for this short routine trip, but useful after overheating. It does not repair your ship's armor unless consumed by an ancillary armor repairer.", "supplies");
}

function abyssalChecks(input: PreflightInput): PreflightCheck[] {
  const tier = ABYSSAL_TIERS.find((candidate) => candidate.id === input.abyssalTier) ?? ABYSSAL_TIERS[0];
  const weather = ABYSSAL_WEATHERS.find((candidate) => candidate.id === input.abyssalWeather) ?? ABYSSAL_WEATHERS[0];
  const weatherRule = WEATHER_RULES[weather.id];
  const hullClass = abyssalHullClass(input);
  const requiredFilaments = hullClass === "frigate" ? 3 : hullClass === "destroyer" ? 2 : 1;
  const selectedFilament = new RegExp(`${tier.name} ${weather.label} Filament`, "i");
  const selectedFilamentCount = quantity(input, selectedFilament, HOLD);
  const allFilaments = itemNames(input, /filament/i, HOLD);
  const activeTank = fitted(input, /(armor repairer|shield booster)/i);
  const resistance = fitted(input, weatherRule.resistance);
  const hasAfterburner = fitted(input, /afterburner/i);
  const hasMicrowarpdrive = fitted(input, /microwarpdrive/i);
  const hasMissiles = fitted(input, /(?<!probe )launcher/i);
  const hasTurrets = fitted(input, /(autocannon|artillery|blaster|railgun|laser|beam|pulse|disintegrator|entropic)/i);
  const droneCount = quantity(input, /(drone|acolyte|hobgoblin|warrior|hornet|infiltrator|hammerhead|valkyrie|vespa|praetor|ogre|berserker|warden|curator|garde|bouncer)/i, /^(DroneBay|FighterBay)/);
  const hasDrones = droneCount > 0;
  const damageSystems = [hasMissiles, hasTurrets, hasDrones].filter(Boolean).length;
  const damageMatch = weather.id === "dark" || has(input.contents, weatherRule.damage, BAY) || fitted(input, weatherRule.damage);
  const basicSmallHull = /\b(Dragoon|Coercer|Corax|Cormorant|Catalyst|Algos|Talwar|Thrasher|Punisher|Kestrel|Rifter|Tristan)\b/i.test(input.shipType);
  const alreadyInside = /^AD\d{3}$/i.test(input.systemName.trim());
  const checks: PreflightCheck[] = [];

  if (hullClass === "strategic-cruiser") {
    checks.push(danger("abyssal-hull", `${input.shipType} cannot enter standard Abyssal Deadspace`, "Strategic cruisers are excluded. Use an eligible T1, T2, Navy or pirate cruiser, or use the frigate/destroyer fleet format."));
  } else if (hullClass === "unsupported") {
    checks.push(danger("abyssal-hull", `${input.shipType} is not an eligible Abyssal hull`, "Standard Abyssals accept one eligible cruiser, up to two destroyers, or up to three frigates. Do not buy or activate the filament for this hull."));
  } else {
    checks.push({
      id: "abyssal-hull",
      status: "pass",
      section: "ship",
      title: `${input.shipType} uses the ${hullClass} Abyss format`,
      detail: hullClass === "cruiser"
        ? "One eligible cruiser enters with one filament. This confirms entry eligibility only, not survivability."
        : `The trace consumes ${requiredFilaments} matching filaments. You may enter with fewer pilots, but EVE still requires a fleet to activate the ${hullClass} trace.`,
    });
  }

  if ((hullClass === "frigate" || hullClass === "destroyer") && !input.fleetMemberCount) {
    checks.push(danger("abyssal-fleet", "Activation blocked: form a fleet first", `A ${hullClass} trace requires a fleet even if you plan to enter alone. Create a fleet in EVE, then activate ${requiredFilaments} matching filaments.`));
  } else if (hullClass === "frigate" || hullClass === "destroyer") {
    checks.push({ id: "abyssal-fleet", status: "pass", section: "ship", title: `Fleet detected for ${hullClass} activation`, detail: `${input.fleetMemberCount} fleet member${input.fleetMemberCount === 1 ? "" : "s"} detected; up to ${requiredFilaments} ${hullClass}s may enter.` });
  }

  if (input.inventoryReadable) {
    const exactFilaments = selectedFilamentCount >= requiredFilaments;
    checks.push(alreadyInside
      ? info("filament", "Filaments already consumed for this run", `${input.systemName} is an Abyssal system. Restock ${requiredFilaments} matching filament${requiredFilaments === 1 ? "" : "s"} only before the next activation.`, "supplies")
      : exactFilaments
        ? { id: "filament", status: "pass", section: "supplies", title: `${selectedFilamentCount} ${tier.name} ${weather.label} filament${selectedFilamentCount === 1 ? "" : "s"} aboard`, detail: `${requiredFilaments} will be consumed for this ${hullClass} trace.` }
        : danger("filament", `Need ${requiredFilaments} matching ${tier.name} ${weather.label} filament${requiredFilaments === 1 ? "" : "s"}`, allFilaments.length ? `Aboard instead: ${allFilaments.join(", ")}. The tier and weather must match the scenario you selected.` : "No matching filament was found in cargo.", "supplies"));
    const reserveRuns = input.tripProfile === "one" ? 1 : input.tripProfile === "session" ? 3 : 6;
    const reserveFilaments = requiredFilaments * reserveRuns;
    if (!alreadyInside && exactFilaments && selectedFilamentCount < reserveFilaments) {
      checks.push({ id: "abyssal-filament-reserve", status: "warning", section: "supplies", title: `${selectedFilamentCount}/${reserveFilaments} filaments for the selected outing`, detail: `${input.tripProfile === "session" ? "A session" : "An expedition"} is budgeted as ${reserveRuns} activations. You can still run once, but restock before expecting to complete the full outing.` });
    }
  }

  if (input.systemSecurity >= 0.9 && tier.id > 0) {
    checks.push(danger("abyssal-security", `${tier.label} cannot be activated in ${input.systemSecurity.toFixed(1)} security`, "Only T0 Tranquil filaments can be activated in 0.9 or 1.0 systems. Move to 0.8 or lower before trying this tier.", "before-undock"));
  } else {
    const suspect = (input.systemSecurity >= 0.8 && tier.id >= 4) || (input.systemSecurity >= 0.7 && tier.id >= 5) || (input.systemSecurity >= 0.6 && tier.id >= 6);
    if (suspect) checks.push(danger("abyssal-security", "This activation will give you a suspect timer", `A ${tier.label} trace in ${input.systemSecurity.toFixed(1)} security lets other capsuleers legally attack you when you return. Use a lower tier or lower-security launch system.`, "before-undock"));
  }

  if (tier.id === 0 && /Dragoon/i.test(input.shipType)) {
    checks.push({ id: "abyssal-verdict", status: "warning", section: "ship", title: `Caution: ${tier.label} ${weather.label} is possible in this Dragoon, but the fit is not beginner-proof`, detail: "Treat it as an experimental T0 fit. Do not move up a tier until the fitting simulator clears the damage/tank gate and your T0 rooms feel routine with several minutes left." });
  } else if (tier.id > 0 && /Dragoon/i.test(input.shipType)) {
    checks.push(danger("abyssal-verdict", `Do not take this Dragoon into ${tier.label} ${weather.label} yet`, "Its mixed weapon layout, single visible repairer and missing weather-resistance module leave too little evidence of damage, tank and timer margin. Drop to T0 or switch to a proven fit."));
  } else if (tier.id >= 1 && basicSmallHull && weather.id !== "dark" && !resistance) {
    checks.push(danger("abyssal-verdict", `This basic ${input.shipType} fit is not ready for ${tier.label}`, `No module covering the ${weather.hole} weather hole was recognized. At this tier, that is a ship-loss risk rather than a minor checklist item.`));
  } else {
    checks.push({ id: "abyssal-verdict", status: "warning", section: "ship", title: `${tier.label} ${weather.label}: eligible hull, unproven clear`, detail: "ESI can reject obvious mismatches, but it cannot certify this fit. Pass the simulator benchmark below and know the dangerous room priorities before treating it as ready." });
  }

  checks.push({
    id: "abyssal-weather",
    status: weather.id === "dark" && (hasTurrets || hasDrones) ? "danger" : damageMatch ? "pass" : "warning",
    section: "fit",
    title: weather.id === "dark" && (hasTurrets || hasDrones)
      ? "Dark weather is a bad match for this turret/drone layout"
      : damageMatch ? `${weather.hole.toUpperCase()} damage found for ${weather.label}` : `No clear ${weather.hole} damage found for ${weather.label}`,
    detail: `${weatherRule.effect} ${weatherRule.advice}`,
  });

  if (weather.id !== "dark") {
    checks.push({
      id: "abyssal-resistance",
      status: resistance ? "pass" : tier.id === 0 ? "warning" : "danger",
      section: "fit",
      title: resistance ? `${weather.hole.toUpperCase()} weather-hole coverage recognized` : `No ${weather.hole} resistance module recognized`,
      detail: resistance ? "A matching hardener, multispectrum/adaptive module, reactive hardener or Damage Control was found. Confirm the final resistance in simulation." : `The filament can reduce ${weather.hole} resistance by 30% or 50% at this tier. Base hull resistance alone may not leave enough repair margin.`,
    });
  }

  if (!activeTank) checks.push(danger("abyssal-active-tank", "No active repair module recognized", "Abyssal rooms apply sustained damage. This checker found neither an armor repairer nor a shield booster." , "fit"));
  if (damageSystems >= 3) checks.push({ id: "abyssal-focus", status: "warning", section: "fit", title: "Three damage systems split this fit", detail: "Missiles, turrets and drones were all detected. Mixed damage can work in T0, but split bonuses, range and controls make the timer harder than a focused beginner fit." });
  if (hasMicrowarpdrive && !hasAfterburner) checks.push({ id: "abyssal-prop", status: "warning", section: "fit", title: "Microwarpdrive-only propulsion needs deliberate piloting", detail: "The extra speed is useful, but the capacitor use and signature-radius bloom can make incoming damage worse. Beginner Abyss fits commonly use an afterburner unless the fit is explicitly designed around an MWD." });
  if (hasDrones) {
    const droneTarget = input.tripProfile === "one" ? 5 : input.tripProfile === "session" ? 10 : 15;
    checks.push({
      id: "abyssal-drone-reserve",
      status: droneCount >= droneTarget ? "pass" : "warning",
      section: "supplies",
      title: `${droneCount}/${droneTarget} combat drones for this outing`,
      detail: droneCount >= droneTarget ? "A complete five-drone flight plus the selected outing's reserve was recognized." : `You can field one five-drone flight, but the selected outing expects ${droneTarget - 5} spare${droneTarget - 5 === 1 ? "" : "s"}. Losing the damage flight can turn the timer into a ship loss.`,
    });
  }

  checks.push(manual("abyssal-benchmark", `Simulator gate: roughly ${tier.dps} DPS and ${tier.tank} EHP/s`, `These are conservative community rule-of-thumb totals for this tier, not guarantees. In the fitting simulator, apply the weather, use the modules you will actually run, and verify damage, repair rate, capacitor and range. Frigate speed tanks can need less raw EHP/s.`));

  const starter = weather.id === "dark"
    ? "The documented T0 Dark starter is a Kestrel."
    : weather.id === "electrical"
      ? "Documented T0 Electrical starters include the Punisher, Rifter and Tristan."
      : "For a first run, switching to a documented T0 Electrical or T0 Dark starter fit is safer than improvising this weather.";
  checks.push(info("abyssal-alternative", "Safer beginner alternative", starter, "ship"));
  checks.push(info("abyssal-timer", "Hard limit: three rooms in twenty minutes", "There is no warp-out. Missing the timer, crossing the boundary or losing the ship also destroys the capsule; average room time must stay below about 6 minutes 40 seconds."));
  return checks;
}

function combatChecks(input: PreflightInput): PreflightCheck[] {
  const offense = fitted(input, /(launcher|autocannon|artillery|blaster|railgun|laser|beam|pulse|disintegrator|entropic|drone link)/i) || has(input.contents, /(drone|fighter)/i, /^(DroneBay|FighterBay)/);
  const tank = fitted(input, TANK);
  const drones = quantity(input, /(drone|fighter|acolyte|hobgoblin|warrior|hornet|infiltrator|hammerhead|valkyrie|vespa|praetor|ogre|berserker|warden|curator|garde|bouncer)/i, /^(DroneBay|FighterBay)/);
  const droneFit = fitted(input, /(drone damage amplifier|omnidirectional|drone navigation computer|drone link augmentor)/i) || drones > 0;
  const strongPaste = input.option !== "pve" || input.tripProfile !== "one";
  const result: PreflightCheck[] = [
    equipmentCheck(input, "offense", "Weapons or combat drones", "A usable damage system was found. Confirm its range matches the site or fleet plan.", offense),
    equipmentCheck(input, "tank", "Defensive tank", "A repair, buffer or resistance module was found. Confirm the correct damage resistances in the fitting window.", tank),
    equipmentCheck(input, "propulsion", "Propulsion module", "An afterburner or microwarpdrive was found. Confirm the activity permits it and the speed/range plan makes sense.", fitted(input, PROPULSION)),
    ...supplyChecks(input),
    pasteCheck(input, strongPaste),
  ];
  if (droneFit) result.push(equipmentCheck(input, "drones", `${drones} combat drone${drones === 1 ? "" : "s"} aboard`, "Drone-bonused equipment or a drone bay was detected. Confirm the flight sizes, damage types and spare count.", drones >= 5, `This appears to be a drone-using fit, but only ${drones} drone${drones === 1 ? "" : "s"} were recognized. Confirm a complete usable flight and spares.`, "supplies"));
  result.push(manual("capacitor", "Test capacitor with the modules you will actually run", "Use the fitting window or simulator. ESI cannot see live capacitor stability, active module states or your intended cycle pattern."));
  result.push(manual("resists", "Check tank, resistances and repair amount", "Match the expected incoming damage and verify the fitting-window defense numbers. A tank module merely existing is not enough."));
  result.push(manual("damage", "Repair hull, armor and heat damage", "While docked, repair damaged modules and the ship. Paste only repairs partial module heat damage in space; it cannot revive a burnt-out module."));
  result.push(manual("boosters", "Choose boosters deliberately—or use none", "Do not consume a random AIR booster. Only use a combat booster whose exact bonus and side effects help this activity."));
  if (input.activeImplants > 0 && (input.option === "pvp" || input.option === "abyssal")) result.push(info("implants", `${input.activeImplants} active clone implant${input.activeImplants === 1 ? "" : "s"}`, "The current clone has implants. Include the pod in what you are willing to risk.", "ship"));
  if (input.option === "abyssal") {
    result.push(...abyssalChecks(input));
  }
  if (input.option === "pvp") {
    result.push(equipmentCheck(input, "tackle", "Tackle or assigned fleet role", "A warp disruptor, scrambler, web or interdiction module was found.", fitted(input, /(warp disruptor|warp scrambler|stasis webifier|interdiction sphere)/i) || input.fleetScale === "organized", "No tackle was recognized. That can be correct for a doctrine damage or logistics ship, but confirm your assigned role."));
    result.push(manual("pvp-plan", "Choose the engagement and escape condition", "Know whether your job is damage, tackle, bait or escape. Avoid carrying anything you cannot afford to lose."));
  }
  return result;
}

function explorationChecks(input: PreflightInput): PreflightCheck[] {
  const probes = quantity(input, /(core|sisters core|combat) scanner probe/i, BAY);
  const result: PreflightCheck[] = [
    equipmentCheck(input, "probe-launcher", "Core probe launcher fitted", "A probe launcher was found in a high slot.", fitted(input, /probe launcher/i)),
    equipmentCheck(input, "probes", `${probes} scanner probe${probes === 1 ? "" : "s"} aboard`, "At least a full eight-probe formation was recognized. An extended or wormhole trip should carry a spare set.", probes >= (input.tripProfile === "expedition" || input.option === "wormhole" ? 16 : 8), `Only ${probes} scanner probes were recognized. Carry at least 8, or 16 for wormholes and trips far from home.`, "supplies"),
    equipmentCheck(input, "propulsion", "Propulsion module", "An afterburner or microwarpdrive was found for traversal and escape.", fitted(input, PROPULSION)),
  ];
  if (input.option === "data") result.push(equipmentCheck(input, "analyzer", "Data analyzer fitted", "A data analyzer was found.", fitted(input, /data analyzer/i)));
  if (input.option === "relic") result.push(equipmentCheck(input, "analyzer", "Relic analyzer fitted", "A relic analyzer was found.", fitted(input, /relic analyzer/i)));
  result.push({ id: "cloak", status: fitted(input, /cloaking device/i) ? "pass" : "info", section: "fit", title: fitted(input, /cloaking device/i) ? "Cloaking device fitted" : "Cloak not fitted", detail: fitted(input, /cloaking device/i) ? "A cloak was recognized. Confirm you have the skill and understand its movement restrictions." : "A cloak is optional in high-sec but increasingly valuable in wormholes and hostile space." });
  if (input.tripProfile === "expedition") result.push(pasteCheck(input, true));
  result.push(manual("bookmarks", "Prepare safe spots and bookmarks", "Bookmark entrances, exits and useful perches. ESI cannot see whether your personal bookmarks are ready."));
  result.push(manual("local-dscan", "Check Local and d-scan before hacking", "A hacking ship is vulnerable while focused on the minigame. Stop and leave when probes or threatening ships appear."));
  if (input.option === "wormhole") result.push(info("return-probes", "Keep probes available until you are home", "Bookmark both sides of every wormhole and never leave your only probe launcher or probes behind."));
  return result;
}

function harvestingChecks(input: PreflightInput): PreflightCheck[] {
  const tool = input.option === "gas" ? /gas cloud harvester/i : input.option === "ice" ? /ice harvester/i : /(mining laser|strip miner|deep core miner)/i;
  const label = input.option === "gas" ? "Gas harvesters fitted" : input.option === "ice" ? "Ice harvesters fitted" : "Mining modules fitted";
  const checks: PreflightCheck[] = [
    equipmentCheck(input, "harvester", label, "The matching harvesting equipment was found. Confirm the hull has the appropriate hold and bonuses.", fitted(input, tool)),
    { id: "survey", status: fitted(input, /survey scanner/i) ? "pass" : "info", section: "fit", title: fitted(input, /survey scanner/i) ? "Survey scanner fitted" : "Survey scanner optional", detail: "A survey scanner helps avoid wasting cycles, but it is not required to begin harvesting." },
    manual("hold", "Confirm the correct hold has room", "The fitting window shows ore, ice or gas hold capacity and current usage; ESI's asset list does not expose the capacity meter."),
    manual("rats", "Plan for rats and player threats", "Check Local and d-scan, and decide whether drones will fight, mine or stay recalled while you leave immediately."),
  ];
  const modulated = fitted(input, /modulated (deep core|strip) miner/i);
  if (modulated) checks.push(equipmentCheck(input, "mining-crystals", "Mining crystals for the target ore", "Mining crystals were recognized in the ship. Confirm they match what you intend to mine.", carried(input, /mining crystal/i), undefined, "supplies"));
  const drones = quantity(input, /(mining drone|acolyte|hobgoblin|warrior|hornet)/i, /^(DroneBay|FighterBay)/);
  if (drones) checks.push({ id: "harvest-drones", status: "pass", section: "supplies", title: `${drones} mining or defensive drone${drones === 1 ? "" : "s"} aboard`, detail: "Confirm the intended flight is complete and recall it before warping." });
  if (input.tripProfile !== "one") checks.push(pasteCheck(input, input.option === "gas"));
  return checks;
}

function haulingChecks(input: PreflightInput): PreflightCheck[] {
  const cargo = input.contents.filter((item) => BAY.test(item.locationFlag) && !/^(DroneBay|FighterBay)/.test(item.locationFlag));
  const value = cargo.reduce((sum, item) => sum + item.estimatedValue, 0);
  return [
    equipmentCheck(input, "manifest", "Cargo manifest", `${cargo.length} carried stack${cargo.length === 1 ? "" : "s"} detected, worth roughly ${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)} ISK.`, cargo.length > 0, "No cargo is visible. That is fine only if you are flying to the pickup; otherwise load and recheck it.", "supplies"),
    { id: "tank", status: fitted(input, TANK) ? "pass" : "warning", section: "fit", title: fitted(input, TANK) ? "Defensive tank fitted" : "No defensive tank recognized", detail: fitted(input, TANK) ? "A buffer, resistance or repair module was recognized. Confirm it does not ruin the align or cloak plan." : "Even high-sec haulers need enough tank to avoid being an easy profitable target." },
    { id: "propulsion", status: fitted(input, PROPULSION) ? "pass" : "info", section: "fit", title: fitted(input, PROPULSION) ? "Propulsion module fitted" : "Propulsion module not recognized", detail: "A propulsion module may help with cloak/MWD or escape plans, but the correct choice depends on hull and route." },
    manual("contract", input.option === "courier" ? "Verify collateral, volume and exact destination" : "Verify pickup, cargo volume and destination", "Confirm the cargo fits before accepting or buying, and inspect the entire route for low-sec, null-sec or known choke points."),
    manual("autopilot", "Keep autopilot off for valuable cargo", "Warp gate-to-gate manually. Autopilot lands away from gates and makes the trip slower and easier to attack."),
    manual("instadock", "Prepare docking and escape bookmarks", "For valuable or dangerous routes, use trusted instant-dock/undock bookmarks or a scout. ESI cannot verify them."),
  ];
}

function salvageChecks(input: PreflightInput): PreflightCheck[] {
  if (input.option === "loot") {
    return [
      equipmentCheck(input, "tractor", "Tractor or mobile tractor available", "A tractor module or deployable was found.", fitted(input, /tractor beam/i) || carried(input, /mobile tractor unit/i)),
      manual("ownership", "Check wreck ownership", "Taking from a yellow wreck can create a suspect timer. Confirm the wreck belongs to you or your fleet."),
      manual("cargo-room", "Leave room for recovered loot", "Confirm cargo capacity in the fitting window and do not carry unrelated valuables into a cleanup site."),
    ];
  }
  return [
    equipmentCheck(input, "salvager", "Salvager fitted", "A salvager module was found in a high slot.", fitted(input, /salvager/i)),
    { id: "tractor", status: fitted(input, /tractor beam/i) || carried(input, /mobile tractor unit/i) ? "pass" : "info", section: "fit", title: "Tractor equipment", detail: "A tractor beam or mobile tractor unit speeds cleanup, but it is not mandatory." },
    equipmentCheck(input, "propulsion", "Propulsion module", "A propulsion module was found for moving between spread-out wrecks.", fitted(input, PROPULSION)),
    manual("cargo-room", "Leave room for salvage", "Confirm cargo capacity in the fitting window. ESI can list contents but not the capacity meter."),
  ];
}

function supportChecks(input: PreflightInput): PreflightCheck[] {
  let checks: PreflightCheck[];
  if (input.option === "repair") checks = [equipmentCheck(input, "remote-repair", "Remote repair or capacitor module", "A remote repair or capacitor-transfer module was found.", fitted(input, /(remote armor repairer|remote shield booster|shield transporter|remote hull repairer|energy transfer|capacitor transmitter)/i)), manual("broadcasts", "Set broadcasts and watch list", "Know who you are repairing, how to lock them quickly, and when the fleet commander wants you to disengage.")];
  else if (input.option === "boost") checks = [equipmentCheck(input, "bursts", "Command burst fitted", "A command burst was found. Confirm its charge matches the fleet's requested boost.", fitted(input, /command burst/i)), equipmentCheck(input, "burst-charge", "Command burst charges", "A command burst charge was found aboard.", carried(input, /charge/i), undefined, "supplies")];
  else if (input.option === "ewar") checks = [equipmentCheck(input, "ewar", "Tackle or electronic warfare fitted", "A web, point, scram, painter, jammer or disruption module was found.", fitted(input, /(stasis webifier|warp disruptor|warp scrambler|target painter|ecm|sensor dampener|tracking disruptor|weapon disruptor|interdiction sphere)/i)), manual("targets", "Confirm target priority", "Agree which targets you hold or disrupt; random tackle can pull the fleet into the wrong fight.")];
  else checks = [equipmentCheck(input, "scout-tools", "Scout tools fitted", "A probe launcher, cloak or fast propulsion module was found.", fitted(input, /(probe launcher|cloaking device|afterburner|microwarpdrive)/i)), manual("reporting", "Use short, exact reports", "Report system, gate, ship types, count and direction of travel; do not guess when the fleet is moving on your information.")];
  checks.push(...supplyChecks(input, false));
  checks.push(pasteCheck(input, input.tripProfile !== "one"));
  checks.push(manual("support-cap", "Test capacitor under sustained support load", "Remote repair, transfers, EWAR and boosts can consume capacitor quickly. Confirm the intended active modules in the fitting simulator."));
  return checks;
}

function travelChecks(input: PreflightInput): PreflightCheck[] {
  const cargoValue = input.contents.filter((item) => BAY.test(item.locationFlag)).reduce((sum, item) => sum + item.estimatedValue, 0);
  const checks: PreflightCheck[] = [
    { id: "route", status: input.option === "dangerous" || input.systemSecurity < 0.5 ? "warning" : "manual", section: "before-undock", title: input.option === "dangerous" ? "Dangerous-space route selected" : "Inspect the entire route", detail: "Use the route map, check nearby action, and look for security changes or choke points before leaving." },
    { id: "cargo-value", status: cargoValue > 100_000_000 ? "warning" : "info", section: "ship", title: cargoValue > 0 ? `About ${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(cargoValue)} ISK carried` : "No valuable cargo detected", detail: cargoValue > 100_000_000 ? "Consider a safer hull, scout or separate trip before moving this value." : "Asset estimates can miss rare or unusual items, so still inspect the cargo manually." },
    { id: "travel-prop", status: fitted(input, PROPULSION) ? "pass" : "info", section: "fit", title: fitted(input, PROPULSION) ? "Propulsion module fitted" : "No propulsion module recognized", detail: "The correct travel fit depends on hull, align time, cloak capability and route risk." },
    manual("travel-repair", "Repair the ship and clear combat timers", "Confirm hull, armor, modules and drones are repaired. Wait out any timer that could prevent docking or safe travel."),
  ];
  if (input.tripProfile === "expedition" || input.option === "dangerous") checks.push(pasteCheck(input, true));
  if (input.option === "filament") checks.push(equipmentCheck(input, "travel-item", "Travel filament or scanner tools", "A filament or probe equipment was found aboard.", carried(input, /filament/i) || (fitted(input, /probe launcher/i) && carried(input, /scanner probe/i)), undefined, "supplies"));
  return checks;
}

function industryChecks(input: PreflightInput): PreflightCheck[] {
  if (input.option === "job") return [{ id: "docked", status: input.docked ? "pass" : "warning", section: "ship", title: input.docked ? "Docked for industry work" : "Dock before starting the job", detail: "Manufacturing, research, copying, invention and reactions are facility jobs. The ship matters mainly for staging and hauling inputs." }, manual("materials", "Check blueprint, materials, facility, duration and fees", "Use the Industry window's final quote. The active ship alone cannot prove that an industry job is ready.")];
  if (input.option === "deployment") return [equipmentCheck(input, "deployable", "Deployable equipment in cargo", "A mobile unit or structure was found aboard.", carried(input, /(mobile depot|mobile tractor unit|mobile cynosural inhibitor|mobile scan inhibitor|deployable|control tower|citadel|engineering complex|refinery)/i), undefined, "supplies"), manual("space-rules", "Confirm anchoring rules and permissions", "Security space, distance restrictions and corporation permissions can block deployment even when the item is aboard.")];
  return haulingChecks({ ...input, activity: "hauling", option: "assets" });
}

export function detectedFleetScale(memberCount?: number): FleetScale {
  if (!memberCount || memberCount <= 1) return "solo";
  return memberCount >= 10 ? "organized" : "small";
}

export function evaluatePreflight(input: PreflightInput): PreflightCheck[] {
  const activityChecks: Record<ActivityId, (value: PreflightInput) => PreflightCheck[]> = {
    combat: combatChecks,
    exploration: explorationChecks,
    harvesting: harvestingChecks,
    hauling: haulingChecks,
    salvage: salvageChecks,
    support: supportChecks,
    travel: travelChecks,
    industry: industryChecks,
  };
  return [...universalChecks(input), ...activityChecks[input.activity](input)];
}
