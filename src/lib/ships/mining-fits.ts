import type { FitSkillTarget, FitTemplate, ShipTask } from "@/lib/ships/task-planner";

export interface MiningFitMetadata {
  validation: string;
  sourceUrl: string;
  eft: string;
}

const metadata: Record<string, MiningFitMetadata> = {};

function mergeSkills(...groups: FitSkillTarget[][]): FitSkillTarget[] {
  const merged = new Map<string, FitSkillTarget>();
  for (const skill of groups.flat()) {
    const current = merged.get(skill.name);
    merged.set(skill.name, current
      ? { ...skill, required: Math.max(current.required, skill.required), target: Math.max(current.target, skill.target) }
      : skill);
  }
  return [...merged.values()];
}

function sourcedFit(template: FitTemplate, fitMetadata: MiningFitMetadata): FitTemplate {
  metadata[template.id] = fitMetadata;
  return template;
}

const miningCore: FitSkillTarget[] = [
  { name: "Mining", required: 4, target: 5, area: "Utility" },
  { name: "Astrogeology", required: 3, target: 5, area: "Utility" },
  { name: "Mining Upgrades", required: 1, target: 4, area: "Utility" },
  { name: "CPU Management", required: 4, target: 5, area: "Utility" },
  { name: "Power Grid Management", required: 3, target: 4, area: "Utility" },
  { name: "Shield Operation", required: 3, target: 4, area: "Tank" },
  { name: "Shield Management", required: 3, target: 4, area: "Tank" },
  { name: "Shield Upgrades", required: 3, target: 4, area: "Tank" },
  { name: "Navigation", required: 3, target: 4, area: "Navigation" },
];

const t2StripCore: FitSkillTarget[] = [
  { name: "Mining", required: 5, target: 5, area: "Utility" },
  { name: "Astrogeology", required: 4, target: 5, area: "Utility" },
  { name: "Mining Upgrades", required: 4, target: 5, area: "Utility" },
  { name: "Mining Barge", required: 1, target: 4, area: "Hull" },
  { name: "Tactical Shield Manipulation", required: 4, target: 4, area: "Tank" },
];

interface OreGroup {
  key: string;
  title: string;
  environment: string;
  ores: string;
  crystal: string;
  processingSkill: string;
  sourceUrl?: string;
}

const CRYSTAL_SOURCE = "https://wiki.eveuniversity.org/Mining_crystals";
const BARGE_SOURCE = "https://wiki.eveuniversity.org/ORE_Basic_Ship_and_Skill_Guide";
const GAS_SOURCE = "https://wiki.eveuniversity.org/Gas_cloud_harvesting";
const ICE_SOURCE = "https://wiki.eveuniversity.org/Archive:Industry_at_the_NSC";
const PRISMATICITE_SOURCE = "https://www.eveonline.com/news/view/mining-in-focus-new-ore-and-more";

function oreSkills(processingSkill: string, extra: FitSkillTarget[] = []): FitSkillTarget[] {
  return mergeSkills(miningCore, t2StripCore, [
    { name: processingSkill, required: 4, target: 4, area: "Utility" },
    ...extra,
  ]);
}

function retrieverOre(group: OreGroup): FitTemplate {
  const id = `mining-${group.key}-retriever`;
  return sourcedFit({
    id,
    shipName: "Retriever",
    name: `${group.title} — solo-hold Retriever`,
    effectiveness: 92,
    summary: `Large mining hold for solo ${group.title.toLowerCase()}. Type A II is the balanced low-residue crystal; swap only when the target ore group changes.`,
    loadout: [
      { slot: "High", items: [`2× Modulated Strip Miner II + ${group.crystal}`] },
      { slot: "Mid", items: ["Medium Azeotropic Restrained Shield Extender", "Enduring Multispectrum Shield Hardener"] },
      { slot: "Low", items: ["2× Mining Laser Upgrade II", "Damage Control II"] },
      { slot: "Rigs", items: ["3× Medium Core Defense Field Extender I"] },
      { slot: "Drones", items: ["5× Hobgoblin I"] },
    ],
    supplies: [`${group.crystal} ×4 or more`, "Spare light combat drones"],
    skills: oreSkills(group.processingSkill),
  }, {
    validation: `Current crystal compatibility maps ${group.ores} to ${group.crystal}. Retriever is the hold-focused mining barge; this fit keeps two yield upgrades while retaining a basic shield/DC buffer.`,
    sourceUrl: group.sourceUrl ?? CRYSTAL_SOURCE,
    eft: `[Retriever, ${group.title} - Solo Type A]\nMining Laser Upgrade II\nMining Laser Upgrade II\nDamage Control II\n\nMedium Azeotropic Restrained Shield Extender\nEnduring Multispectrum Shield Hardener\n\nModulated Strip Miner II, ${group.crystal}\nModulated Strip Miner II, ${group.crystal}\n\nMedium Core Defense Field Extender I\nMedium Core Defense Field Extender I\nMedium Core Defense Field Extender I\n\nHobgoblin I x5\n\n${group.crystal} x4`,
  });
}

function procurerOre(group: OreGroup, deepCore = false): FitTemplate {
  const id = `mining-${group.key}-procurer`;
  const miner = deepCore ? "Modulated Deep Core Strip Miner II" : "Modulated Strip Miner II";
  const rig = deepCore ? "Medium Deep Core Mining Optimization I" : "Medium Core Defense Field Extender I";
  return sourcedFit({
    id,
    shipName: "Procurer",
    name: `${group.title} — tanked Procurer`,
    effectiveness: 95,
    summary: deepCore
      ? "A tank-first Mercoxit barge using the required deep-core strip miners, Type A II crystals, and the dedicated deep-core yield rig."
      : `Tank-first ${group.title.toLowerCase()} barge for places where losing a little yield is preferable to losing the ship.`,
    loadout: [
      { slot: "High", items: [`2× ${miner} + ${group.crystal}`] },
      { slot: "Mid", items: ["Medium Azeotropic Restrained Shield Extender", "2× Enduring Multispectrum Shield Hardener"] },
      { slot: "Low", items: ["2× Mining Laser Upgrade II", "Damage Control II"] },
      { slot: "Rigs", items: deepCore ? [rig, "2× Medium Core Defense Field Extender I"] : ["3× Medium Core Defense Field Extender I"] },
      { slot: "Drones", items: ["5× Hobgoblin I"] },
    ],
    supplies: [`${group.crystal} ×4 or more`, "Spare light combat drones"],
    skills: oreSkills(group.processingSkill, deepCore ? [
      { name: "Deep Core Mining", required: 2, target: 4, area: "Utility" },
      { name: "Jury Rigging", required: 1, target: 3, area: "Utility" },
    ] : []),
  }, {
    validation: deepCore
      ? "Current mining guidance requires Modulated Deep Core Strip Miner II for barge/exhumer Mercoxit mining; the current Medium Deep Core Mining Optimization I boosts deep-core strip yield."
      : `Current crystal compatibility maps ${group.ores} to ${group.crystal}; Procurer remains the tank-oriented barge choice.`,
    sourceUrl: deepCore ? BARGE_SOURCE : (group.sourceUrl ?? CRYSTAL_SOURCE),
    eft: `[Procurer, ${group.title} - Tanked Type A]\nMining Laser Upgrade II\nMining Laser Upgrade II\nDamage Control II\n\nMedium Azeotropic Restrained Shield Extender\nEnduring Multispectrum Shield Hardener\nEnduring Multispectrum Shield Hardener\n\n${miner}, ${group.crystal}\n${miner}, ${group.crystal}\n\n${rig}\nMedium Core Defense Field Extender I\nMedium Core Defense Field Extender I\n\nHobgoblin I x5\n\n${group.crystal} x4`,
  });
}

function covetorOre(group: OreGroup, deepCore = false): FitTemplate {
  const id = `mining-${group.key}-covetor`;
  const miner = deepCore ? "Modulated Deep Core Strip Miner II" : "Modulated Strip Miner II";
  return sourcedFit({
    id,
    shipName: "Covetor",
    name: `${group.title} — yield Covetor`,
    effectiveness: 98,
    summary: deepCore
      ? "Yield-focused Mercoxit barge. Better when a fleet, intel, and hauling support make the Covetor's weaker tank acceptable."
      : `Yield-first ${group.title.toLowerCase()} barge for supported mining. The Covetor gives up hold and tank for extraction rate.`,
    loadout: [
      { slot: "High", items: [`2× ${miner} + ${group.crystal}`] },
      { slot: "Mid", items: ["Multispectrum Shield Hardener II"] },
      { slot: "Low", items: ["2× Mining Laser Upgrade II", "Elara Restrained Mining Laser Upgrade"] },
      { slot: "Rigs", items: deepCore
        ? ["Medium Deep Core Mining Optimization I", "Medium Processor Overclocking Unit I", "Medium Core Defense Field Extender I"]
        : ["Medium Processor Overclocking Unit I", "2× Medium Core Defense Field Extender I"] },
      { slot: "Drones", items: ["5× Hobgoblin I"] },
    ],
    supplies: [`${group.crystal} ×4 or more`, "Hauling/compression support recommended"],
    skills: oreSkills(group.processingSkill, deepCore ? [
      { name: "Deep Core Mining", required: 2, target: 4, area: "Utility" },
      { name: "Jury Rigging", required: 1, target: 3, area: "Utility" },
    ] : []),
  }, {
    validation: deepCore
      ? "The deep-core module/crystal/rig combination follows current Mercoxit module rules; Covetor is the barge yield specialist and is best used with support."
      : `The low/rig layout follows the established Covetor yield archetype, updated to the current grouped Type A II crystal for ${group.ores}.`,
    sourceUrl: deepCore ? BARGE_SOURCE : (group.sourceUrl ?? BARGE_SOURCE),
    eft: `[Covetor, ${group.title} - Yield Type A]\nMining Laser Upgrade II\nMining Laser Upgrade II\nElara Restrained Mining Laser Upgrade\n\nMultispectrum Shield Hardener II\n\n${miner}, ${group.crystal}\n${miner}, ${group.crystal}\n\n${deepCore ? "Medium Deep Core Mining Optimization I\n" : ""}Medium Processor Overclocking Unit I\nMedium Core Defense Field Extender I${deepCore ? "" : "\nMedium Core Defense Field Extender I"}\n\nHobgoblin I x5\n\n${group.crystal} x4`,
  });
}

function regularOreTask(group: OreGroup, includePioneer = false): ShipTask {
  const fits: FitTemplate[] = [];
  if (includePioneer) fits.push(pioneerStarter);
  fits.push(procurerOre(group), retrieverOre(group), covetorOre(group));
  return {
    id: `mining-${group.key}`,
    role: "Mining",
    title: group.title,
    environment: group.environment,
    description: `${group.ores}. Use ${group.crystal} in Modulated Strip Miner II modules; Type A is the normal balanced/low-residue choice.`,
    caution: "Crystal compatibility is exact by ore group. A wrong crystal gives no specialization benefit. Type B trades resource efficiency for faster extraction; Type C is for deliberate rock removal, not normal mining.",
    fits,
  };
}

const pioneerStarter = sourcedFit({
  id: "mining-simple-pioneer-starter",
  shipName: "Pioneer",
  name: "Starter ore Pioneer",
  effectiveness: 87,
  summary: "Current post-Catalyst bridge between Venture and mining barges: three bonused scoped miners, two yield upgrades, and a real shield tank.",
  loadout: [
    { slot: "High", items: ["3× EP-S Gaussian Scoped Mining Laser"] },
    { slot: "Mid", items: ["Medium Azeotropic Restrained Shield Extender", "Enduring Multispectrum Shield Hardener", "Compact Thermal Shield Amplifier"] },
    { slot: "Low", items: ["2× Mining Laser Upgrade II"] },
    { slot: "Rigs", items: ["Small Processor Overclocking Unit I", "2× Small EM Shield Reinforcer II"] },
    { slot: "Drones", items: ["4× Hobgoblin I"] },
  ],
  supplies: ["No crystals required with these scoped T1 mining lasers", "Spare light combat drones"],
  skills: mergeSkills(miningCore, [
    { name: "Mining Destroyer", required: 1, target: 4, area: "Hull" },
    { name: "Mining Upgrades", required: 4, target: 4, area: "Utility" },
  ]),
}, {
  validation: "Based on the current recommended T2-tank Pioneer archetype: three EP-S scoped mining lasers, dual Mining Laser Upgrade II, and shield buffer/resists. The fourth high is intentionally unused for normal belt mining.",
  sourceUrl: "https://wiki.eveuniversity.org/User:Boniface_Vachon/Homefront_Strategy_(2025)",
  eft: `[Pioneer, Starter Ore - Tanked]\nMining Laser Upgrade II\nMining Laser Upgrade II\n\nMedium Azeotropic Restrained Shield Extender\nEnduring Multispectrum Shield Hardener\nCompact Thermal Shield Amplifier\n\nEP-S Gaussian Scoped Mining Laser\nEP-S Gaussian Scoped Mining Laser\nEP-S Gaussian Scoped Mining Laser\n\nSmall Processor Overclocking Unit I\nSmall EM Shield Reinforcer II\nSmall EM Shield Reinforcer II\n\nHobgoblin I x4`,
});

const oreGroups: OreGroup[] = [
  {
    key: "simple",
    title: "Simple ore — Veldspar / Scordite / Pyroxeres / Plagioclase / Mordunium",
    environment: "Mostly high-sec asteroid belts and anomalies",
    ores: "Veldspar, Scordite, Pyroxeres, Plagioclase, Mordunium",
    crystal: "Simple Asteroid Mining Crystal Type A II",
    processingSkill: "Simple Ore Processing",
  },
  {
    key: "coherent",
    title: "Coherent ore — Omber / Kernite / Jaspet / Hemorphite / Hedbergite +",
    environment: "Higher-value asteroid belts and anomalies",
    ores: "Omber, Kernite, Jaspet, Hemorphite, Hedbergite, Griemeer, Nocxite, Ytirium",
    crystal: "Coherent Asteroid Mining Crystal Type A II",
    processingSkill: "Coherent Ore Processing",
  },
  {
    key: "variegated",
    title: "Variegated ore — Gneiss / Dark Ochre / Crokite / Kylixium",
    environment: "Low/null/wormhole and richer anomalies",
    ores: "Gneiss, Dark Ochre, Crokite, Kylixium",
    crystal: "Variegated Asteroid Mining Crystal Type A II",
    processingSkill: "Variegated Ore Processing",
  },
  {
    key: "complex",
    title: "Complex ore — Bistot / Arkonor / Spodumain +",
    environment: "Null-sec and high-end ore anomalies",
    ores: "Bistot, Arkonor, Spodumain, Eifyrium, Ducinium, Hezorime, Ueganite",
    crystal: "Complex Asteroid Mining Crystal Type A II",
    processingSkill: "Complex Ore Processing",
  },
  {
    key: "abyssal-ore",
    title: "Abyssal ore — Bezdnacine / Rakovene / Talassonite",
    environment: "Abyss-connected and special ore sources",
    ores: "Bezdnacine, Rakovene, Talassonite",
    crystal: "Abyssal Asteroid Mining Crystal Type A II",
    processingSkill: "Abyssal Ore Processing",
  },
];

const mercoxitGroup: OreGroup = {
  key: "mercoxit",
  title: "Mercoxit",
  environment: "Null-sec Mercoxit deposits",
  ores: "Mercoxit",
  crystal: "Mercoxit Asteroid Mining Crystal Type A II",
  processingSkill: "Mercoxit Ore Processing",
};

const moonGroups: OreGroup[] = [
  ["moon-ubiquitous", "Ubiquitous moon ore", "Ubiquitous Moon Mining Crystal Type A II", "Ubiquitous Moon Ore Processing", "Zeolites, Sylvite, Bitumens, Coesite"],
  ["moon-common", "Common moon ore", "Common Moon Mining Crystal Type A II", "Common Moon Ore Processing", "Cobaltite, Euxenite, Titanite, Scheelite"],
  ["moon-uncommon", "Uncommon moon ore", "Uncommon Moon Mining Crystal Type A II", "Uncommon Moon Ore Processing", "Otavite, Sperrylite, Vanadinite, Chromite"],
  ["moon-rare", "Rare moon ore", "Rare Moon Mining Crystal Type A II", "Rare Moon Ore Processing", "Carnotite, Zircon, Pollucite, Cinnabar"],
  ["moon-exceptional", "Exceptional moon ore", "Exceptional Moon Mining Crystal Type A II", "Exceptional Moon Ore Processing", "Xenotime, Monazite, Loparite, Ytterbite"],
].map(([key, title, crystal, processingSkill, ores]) => ({
  key,
  title,
  environment: "Moon extraction fields",
  ores,
  crystal,
  processingSkill,
}));

const moonFits = moonGroups.map((group) => covetorOre(group));

const ventureGas = sourcedFit({
  id: "mining-gas-venture",
  shipName: "Venture",
  name: "Cheap gas Venture",
  effectiveness: 91,
  summary: "Cheap, agile, and warp-core-stabilized by hull bonus. Two T1 scoops keep the skill floor low; the probe launcher is useful for finding wormhole gas sites and exits.",
  loadout: [
    { slot: "High", items: ["2× Gas Cloud Scoop I", "Core Probe Launcher I"] },
    { slot: "Mid", items: ["5MN Y-T8 Compact Microwarpdrive", "Medium Azeotropic Restrained Shield Extender", "Enduring Multispectrum Shield Hardener"] },
    { slot: "Low", items: ["Nanofiber Internal Structure II"] },
    { slot: "Rigs", items: ["2× Small Core Defense Field Extender I", "Small Low Friction Nozzle Joints I"] },
    { slot: "Drones", items: ["2× Hobgoblin I"] },
  ],
  supplies: ["Core Scanner Probe I ×16", "Mobile Depot for hostile-space refits if desired"],
  skills: mergeSkills(miningCore, [
    { name: "Mining Frigate", required: 3, target: 5, area: "Hull" },
    { name: "Gas Cloud Harvesting", required: 2, target: 5, area: "Utility" },
    { name: "Astrometrics", required: 1, target: 3, area: "Utility" },
    { name: "High Speed Maneuvering", required: 1, target: 3, area: "Navigation" },
  ]),
}, {
  validation: "Current gas guidance identifies Venture as the common cheap gas ship. Gas Cloud Harvesting II allows two T1 scoops; unlike ore/ice, gas has no low-slot yield upgrade.",
  sourceUrl: GAS_SOURCE,
  eft: `[Venture, Gas - Cheap Scanner]\nNanofiber Internal Structure II\n\n5MN Y-T8 Compact Microwarpdrive\nMedium Azeotropic Restrained Shield Extender\nEnduring Multispectrum Shield Hardener\n\nGas Cloud Scoop I\nGas Cloud Scoop I\nCore Probe Launcher I, Core Scanner Probe I\n\nSmall Core Defense Field Extender I\nSmall Core Defense Field Extender I\nSmall Low Friction Nozzle Joints I\n\nHobgoblin I x2\n\nCore Scanner Probe I x16`,
});

const pioneerGas = sourcedFit({
  id: "mining-gas-pioneer",
  shipName: "Pioneer",
  name: "Three-scoop gas Pioneer",
  effectiveness: 96,
  summary: "Three turret hardpoints plus Pioneer gas-duration bonuses make this the natural throughput step above Venture when you can use T2 scoops.",
  loadout: [
    { slot: "High", items: ["3× Gas Cloud Scoop II", "Core Probe Launcher I"] },
    { slot: "Mid", items: ["5MN Y-T8 Compact Microwarpdrive", "Medium Azeotropic Restrained Shield Extender", "Enduring Multispectrum Shield Hardener"] },
    { slot: "Low", items: ["Damage Control II", "Nanofiber Internal Structure II"] },
    { slot: "Rigs", items: ["2× Small Core Defense Field Extender I", "Small Low Friction Nozzle Joints I"] },
    { slot: "Drones", items: ["4× Hobgoblin I"] },
  ],
  supplies: ["Core Scanner Probe I ×16", "No Mining Laser Upgrades: they do not improve gas scoops"],
  skills: mergeSkills(miningCore, [
    { name: "Mining Destroyer", required: 2, target: 5, area: "Hull" },
    { name: "Gas Cloud Harvesting", required: 5, target: 5, area: "Utility" },
    { name: "Astrometrics", required: 1, target: 3, area: "Utility" },
    { name: "High Speed Maneuvering", required: 1, target: 3, area: "Navigation" },
  ]),
}, {
  validation: "Pioneer currently has three mining/gas turret hardpoints and both a hull gas-duration bonus and a role gas-duration bonus. T2 scoops require Gas Cloud Harvesting V.",
  sourceUrl: "https://wiki.eveuniversity.org/Pioneer",
  eft: `[Pioneer, Gas - Three Scoop]\nDamage Control II\nNanofiber Internal Structure II\n\n5MN Y-T8 Compact Microwarpdrive\nMedium Azeotropic Restrained Shield Extender\nEnduring Multispectrum Shield Hardener\n\nGas Cloud Scoop II\nGas Cloud Scoop II\nGas Cloud Scoop II\nCore Probe Launcher I, Core Scanner Probe I\n\nSmall Core Defense Field Extender I\nSmall Core Defense Field Extender I\nSmall Low Friction Nozzle Joints I\n\nHobgoblin I x4\n\nCore Scanner Probe I x16`,
});

const prospectGas = sourcedFit({
  id: "mining-gas-prospect",
  shipName: "Prospect",
  name: "Covert hostile-space gas Prospect",
  effectiveness: 94,
  summary: "Same two-scoop gas concept as Venture but with a much larger mining hold and covert-ops cloak for travel through hostile space.",
  loadout: [
    { slot: "High", items: ["2× Gas Cloud Scoop II", "Covert Ops Cloaking Device II"] },
    { slot: "Mid", items: ["5MN Y-T8 Compact Microwarpdrive", "Medium Azeotropic Restrained Shield Extender", "Enduring Multispectrum Shield Hardener"] },
    { slot: "Low", items: ["Damage Control II", "3× Nanofiber Internal Structure II"] },
    { slot: "Rigs", items: ["2× Small Low Friction Nozzle Joints I"] },
  ],
  supplies: ["Mobile Depot", "Core probe launcher + probes in cargo if operating through wormholes"],
  skills: mergeSkills(miningCore, [
    { name: "Mining Frigate", required: 5, target: 5, area: "Hull" },
    { name: "Expedition Frigates", required: 1, target: 4, area: "Hull" },
    { name: "Gas Cloud Harvesting", required: 5, target: 5, area: "Utility" },
    { name: "Cloaking", required: 4, target: 4, area: "Utility" },
    { name: "High Speed Maneuvering", required: 1, target: 3, area: "Navigation" },
  ]),
}, {
  validation: "Current Prospect guidance specifically highlights gas harvesting, its 12,500 m³ mining hold, and covert-ops travel. It harvests at the same rate as an equivalently skilled Venture but is safer to move through hostile space.",
  sourceUrl: "https://wiki.eveuniversity.org/Prospect",
  eft: `[Prospect, Gas - Covert]\nDamage Control II\nNanofiber Internal Structure II\nNanofiber Internal Structure II\nNanofiber Internal Structure II\n\n5MN Y-T8 Compact Microwarpdrive\nMedium Azeotropic Restrained Shield Extender\nEnduring Multispectrum Shield Hardener\n\nGas Cloud Scoop II\nGas Cloud Scoop II\nCovert Ops Cloaking Device II\n\nSmall Low Friction Nozzle Joints I\nSmall Low Friction Nozzle Joints I`,
});

const enduranceIce = sourcedFit({
  id: "mining-ice-endurance",
  shipName: "Endurance",
  name: "Solo / expedition ice Endurance",
  effectiveness: 96,
  summary: "Dedicated expedition-frigate ice miner with strong cycle bonuses, a cloak, speed tank, shield resists, and enough drones for light rats.",
  loadout: [
    { slot: "High", items: ["Ice Mining Laser II", "Prototype Cloaking Device I"] },
    { slot: "Mid", items: ["1MN Afterburner II", "Medium F-S9 Regolith Compact Shield Extender", "2× Multispectrum Shield Hardener II"] },
    { slot: "Low", items: ["3× Ice Harvester Upgrade II"] },
    { slot: "Rigs", items: ["2× Small Core Defense Field Extender I"] },
    { slot: "Drones", items: ["3× Hornet II", "3× Hornet EC-300"] },
  ],
  supplies: ["Nanite Repair Paste", "Appropriate combat drones for local rats"],
  skills: mergeSkills(miningCore, [
    { name: "Mining Frigate", required: 5, target: 5, area: "Hull" },
    { name: "Expedition Frigates", required: 1, target: 4, area: "Hull" },
    { name: "Ice Harvesting", required: 5, target: 5, area: "Utility" },
    { name: "Afterburner", required: 3, target: 4, area: "Navigation" },
  ]),
}, {
  validation: "Exact EVE University NSC solo/BYOC Endurance fit, marked LATEST in the fit archive. Current Endurance bonuses make it the dedicated expedition-frigate ice specialist.",
  sourceUrl: ICE_SOURCE,
  eft: `[Endurance, NSC Solo/BYOC]\nIce Harvester Upgrade II\nIce Harvester Upgrade II\nIce Harvester Upgrade II\n\n1MN Afterburner II\nMedium F-S9 Regolith Compact Shield Extender\nMultispectrum Shield Hardener II\nMultispectrum Shield Hardener II\n\nPrototype Cloaking Device I\nIce Mining Laser II\n\nSmall Core Defense Field Extender I\nSmall Core Defense Field Extender I\n\nHornet II x3\nHornet EC-300 x3`,
});

const covetorIce = sourcedFit({
  id: "mining-ice-covetor",
  shipName: "Covetor",
  name: "Yield ice Covetor",
  effectiveness: 98,
  summary: "Fleet/support ice fit: two T2 harvesters, three ice upgrades, and CPU rigs to make the yield-first Covetor layout work.",
  loadout: [
    { slot: "High", items: ["2× Ice Harvester II"] },
    { slot: "Mid", items: ["Multispectrum Shield Hardener II"] },
    { slot: "Low", items: ["3× Ice Harvester Upgrade II"] },
    { slot: "Rigs", items: ["2× Medium Processor Overclocking Unit I", "Medium Core Defense Field Extender I"] },
    { slot: "Drones", items: ["5× Hobgoblin I"] },
  ],
  supplies: ["Hauling/compression support recommended"],
  skills: mergeSkills(miningCore, [
    { name: "Mining Barge", required: 1, target: 4, area: "Hull" },
    { name: "Ice Harvesting", required: 5, target: 5, area: "Utility" },
    { name: "Mining Upgrades", required: 4, target: 5, area: "Utility" },
  ]),
}, {
  validation: "Uses the established EVE University Covetor ice shared-can archetype: dual Ice Harvester II, triple Ice Harvester Upgrade II, and processor rigs. Covetor is the yield barge, so use this where support offsets its weak tank/hold.",
  sourceUrl: ICE_SOURCE,
  eft: `[Covetor, Ice - Yield]\nIce Harvester Upgrade II\nIce Harvester Upgrade II\nIce Harvester Upgrade II\n\nMultispectrum Shield Hardener II\n\nIce Harvester II\nIce Harvester II\n\nMedium Processor Overclocking Unit I\nMedium Processor Overclocking Unit I\nMedium Core Defense Field Extender I\n\nHobgoblin I x5`,
});

const prismaticiteGroup: OreGroup = {
  key: "prismaticite",
  title: "Prismaticite — Phased Fields",
  environment: "Probe-scanned low/null-sec Phased Fields",
  ores: "Prismaticite",
  crystal: "Erratic Ore Mining Crystal Type A II",
  processingSkill: "Erratic Ore Processing",
  sourceUrl: PRISMATICITE_SOURCE,
};

const prismaticiteFits = [procurerOre(prismaticiteGroup), covetorOre(prismaticiteGroup)];

export const MINING_TASKS: ShipTask[] = [
  regularOreTask(oreGroups[0], true),
  ...oreGroups.slice(1).map((group) => regularOreTask(group)),
  {
    id: "mining-moon-ore",
    role: "Mining",
    title: "Moon ore — pick the tier crystal",
    environment: "Athanor/Tatara moon extraction fields",
    description: "Choose the fit matching the moon ore tier: Ubiquitous, Common, Uncommon, Rare, or Exceptional. The hull is the same; the crystal family is not interchangeable.",
    caution: "Confirm the moon ore tier before undocking. These fits default to balanced Type A II crystals; organized fleets may set their own Type A/B residue rules.",
    fits: moonFits,
  },
  {
    id: "mining-mercoxit",
    role: "Mining",
    title: "Mercoxit — deep-core mining",
    environment: "Null-sec Mercoxit deposits",
    description: "Mercoxit requires deep-core mining equipment. These fits use Modulated Deep Core Strip Miner II, Mercoxit Type A II crystals, and the current deep-core yield rig.",
    caution: "Mercoxit mining can create damaging clouds. Keep range and local-site hazards in mind, and do not replace the deep-core miners with ordinary strip miners.",
    fits: [procurerOre(mercoxitGroup, true), covetorOre(mercoxitGroup, true)],
  },
  {
    id: "mining-ice",
    role: "Mining",
    title: "Ice",
    environment: "Ice belts and ice anomalies",
    description: "Use dedicated ice harvesting modules, not ore strip miners. Endurance is the mobile/expedition option; Covetor is the supported yield option.",
    caution: "Ice belts attract predictable traffic. The Covetor fit is yield-first and should not be treated like a tanked solo barge; use the Endurance when mobility and escape matter more.",
    fits: [enduranceIce, covetorIce],
  },
  {
    id: "mining-gas",
    role: "Mining",
    title: "Gas clouds",
    environment: "Wormhole, low/null and special gas sites",
    description: "Small ships use Gas Cloud Scoops; mining barges/exhumers use Gas Cloud Harvesters. There are no Mining Laser Upgrade equivalents for gas, so fit the rest of the ship for survival, scanning, and travel.",
    caution: "Many valuable gas sites are in hostile space and some sites contain dangerous NPC waves or environmental damage. Know the site before settling into a cloud.",
    fits: [ventureGas, pioneerGas, prospectGas],
  },
  {
    id: "mining-prismaticite",
    role: "Mining",
    title: "Prismaticite — Phased Fields",
    environment: "Probe-scanned low/null-sec Phased Fields",
    description: "Prismaticite is Erratic Ore. Use Erratic Ore Mining Crystal Type A II in modulated strip miners and bring a Mobile Phase Anchor plus command-ship support.",
    caution: "Without an energized Mobile Phase Anchor, phased asteroids mine at only 10% efficiency. Full power requires 100 energy: 1 Rorqual, 2 Orcas, 3 Porpoises, or a mixed combination. The site later becomes public and is a PvP magnet.",
    fits: prismaticiteFits,
  },
];

export const MINING_FIT_METADATA: Readonly<Record<string, MiningFitMetadata>> = metadata;
