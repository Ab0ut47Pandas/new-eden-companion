import type { FitSkillTarget, FitTemplate, ShipTask } from "@/lib/ships/task-planner";

export interface AbyssalFitMetadata {
  validation: string;
  sourceUrl: string;
  eft: string;
}

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

function fit(template: FitTemplate): FitTemplate {
  return template;
}

const starterCore: FitSkillTarget[] = [
  { name: "CPU Management", required: 3, target: 4, area: "Utility" },
  { name: "Power Grid Management", required: 3, target: 4, area: "Utility" },
  { name: "Capacitor Management", required: 3, target: 4, area: "Utility" },
  { name: "Capacitor Systems Operation", required: 3, target: 4, area: "Utility" },
  { name: "Navigation", required: 3, target: 4, area: "Navigation" },
  { name: "Thermodynamics", required: 1, target: 3, area: "Utility" },
];

const advancedCore: FitSkillTarget[] = [
  { name: "CPU Management", required: 4, target: 5, area: "Utility" },
  { name: "Power Grid Management", required: 4, target: 5, area: "Utility" },
  { name: "Capacitor Management", required: 4, target: 5, area: "Utility" },
  { name: "Capacitor Systems Operation", required: 4, target: 5, area: "Utility" },
  { name: "Navigation", required: 4, target: 5, area: "Navigation" },
  { name: "Afterburner", required: 3, target: 4, area: "Navigation" },
  { name: "Thermodynamics", required: 3, target: 4, area: "Utility" },
  { name: "Jury Rigging", required: 3, target: 4, area: "Utility" },
];

const starterMissiles: FitSkillTarget[] = [
  { name: "Missile Launcher Operation", required: 3, target: 4, area: "Weapons" },
  { name: "Rapid Launch", required: 2, target: 4, area: "Weapons" },
  { name: "Warhead Upgrades", required: 2, target: 3, area: "Weapons" },
  { name: "Target Navigation Prediction", required: 2, target: 3, area: "Weapons" },
];

const advancedMissiles: FitSkillTarget[] = [
  { name: "Missile Launcher Operation", required: 4, target: 5, area: "Weapons" },
  { name: "Rapid Launch", required: 3, target: 4, area: "Weapons" },
  { name: "Warhead Upgrades", required: 3, target: 4, area: "Weapons" },
  { name: "Target Navigation Prediction", required: 3, target: 4, area: "Weapons" },
  { name: "Guided Missile Precision", required: 2, target: 4, area: "Weapons" },
];

const starterShield: FitSkillTarget[] = [
  { name: "Shield Operation", required: 3, target: 4, area: "Tank" },
  { name: "Shield Management", required: 3, target: 4, area: "Tank" },
  { name: "Shield Compensation", required: 2, target: 3, area: "Tank" },
];

const advancedShield: FitSkillTarget[] = [
  { name: "Shield Operation", required: 4, target: 5, area: "Tank" },
  { name: "Shield Management", required: 4, target: 5, area: "Tank" },
  { name: "Shield Compensation", required: 3, target: 4, area: "Tank" },
  { name: "Tactical Shield Manipulation", required: 4, target: 4, area: "Tank" },
];

const starterArmor: FitSkillTarget[] = [
  { name: "Mechanics", required: 3, target: 4, area: "Tank" },
  { name: "Hull Upgrades", required: 3, target: 4, area: "Tank" },
  { name: "Repair Systems", required: 3, target: 4, area: "Tank" },
];

const starterDrones: FitSkillTarget[] = [
  { name: "Drones", required: 5, target: 5, area: "Drones" },
  { name: "Drone Interfacing", required: 2, target: 4, area: "Drones" },
  { name: "Drone Navigation", required: 2, target: 4, area: "Drones" },
  { name: "Drone Durability", required: 2, target: 4, area: "Drones" },
  { name: "Drone Sharpshooting", required: 2, target: 4, area: "Drones" },
];

const advancedDrones: FitSkillTarget[] = [
  { name: "Drones", required: 5, target: 5, area: "Drones" },
  { name: "Drone Interfacing", required: 3, target: 5, area: "Drones" },
  { name: "Drone Navigation", required: 3, target: 4, area: "Drones" },
  { name: "Drone Durability", required: 3, target: 4, area: "Drones" },
  { name: "Drone Sharpshooting", required: 3, target: 4, area: "Drones" },
];

const kestrelT0 = fit({
  id: "abyss-kestrel-t0-dark-community",
  shipName: "Kestrel",
  name: "Community-tested T0 Dark rocket Kestrel",
  effectiveness: 97,
  summary: "Exact EVE University community starter fit for Tranquil Dark. Their published test profile is about 82 DPS and 33 EHP/s, with extensive testing against the dangerous T0 rooms.",
  loadout: [
    { slot: "Low", items: ["2× Ballistic Control System I"] },
    { slot: "Mid", items: ["1MN Monopropellant Enduring Afterburner", "Small Compact Pb-Acid Cap Battery", "Enduring Multispectrum Shield Hardener", "Small Clarity Ward Enduring Shield Booster"] },
    { slot: "High", items: ["4× 'Arbalest' Rocket Launcher I"] },
    { slot: "Rigs", items: ["Small Warhead Calefaction Catalyst I", "2× Small Capacitor Control Circuit I"] },
  ],
  supplies: ["Tranquil Dark Filament ×3", "Inferno Rocket", "Caldari Navy Inferno Rocket for hard active-tank targets", "Nanite Repair Paste ×20"],
  skills: mergeSkills(starterCore, starterMissiles, starterShield, [
    { name: "Caldari Frigate", required: 3, target: 4, area: "Hull" },
    { name: "Rockets", required: 4, target: 4, area: "Weapons" },
    { name: "Afterburner", required: 2, target: 4, area: "Navigation" },
  ]),
});

const punisherT0 = fit({
  id: "abyss-punisher-t0-electrical-community",
  shipName: "Punisher",
  name: "Community-tested T0 Electrical dual-rep Punisher",
  effectiveness: 99,
  summary: "Exact EVE University community starter fit for Tranquil Electrical. Their testers describe it as probably the safest of the four starter fits, with roughly 112 DPS and 65 EHP/s at the published skill plan.",
  loadout: [
    { slot: "Low", items: ["2× Small I-a Enduring Armor Repairer", "2× Extruded Compact Heat Sink", "Damage Control II"] },
    { slot: "Mid", items: ["1MN Y-S8 Compact Afterburner", "Eutectic Compact Cap Recharger"] },
    { slot: "High", items: ["4× Small Focused Anode Particle Stream I"] },
    { slot: "Rigs", items: ["Small Energy Locus Coordinator I", "Small Auxiliary Thrusters I", "Small Processor Overclocking Unit I"] },
  ],
  supplies: ["Tranquil Electrical Filament ×3", "Imperial Navy Multifrequency S", "Imperial Navy Standard S for range", "Nanite Repair Paste ×20"],
  skills: mergeSkills(starterCore, starterArmor, [
    { name: "Amarr Frigate", required: 3, target: 4, area: "Hull" },
    { name: "Small Energy Turret", required: 4, target: 4, area: "Weapons" },
    { name: "Controlled Bursts", required: 3, target: 4, area: "Weapons" },
    { name: "Motion Prediction", required: 3, target: 4, area: "Weapons" },
    { name: "Rapid Firing", required: 3, target: 4, area: "Weapons" },
    { name: "Sharpshooter", required: 3, target: 4, area: "Weapons" },
  ]),
});

const rifterT0 = fit({
  id: "abyss-rifter-t0-electrical-community",
  shipName: "Rifter",
  name: "Community-tested T0 Electrical dual-rep Rifter",
  effectiveness: 96,
  summary: "Exact EVE University community T0 Electrical fit. It uses a shield booster plus armor repairer, a web, and close-range autocannons; the published test profile is about 110 DPS and 50 EHP/s.",
  loadout: [
    { slot: "High", items: ["3× 200mm Light 'Scout' Autocannon I"] },
    { slot: "Mid", items: ["X5 Enduring Stasis Webifier", "1MN Monopropellant Enduring Afterburner", "Small Clarity Ward Enduring Shield Booster"] },
    { slot: "Low", items: ["2× Counterbalanced Compact Gyrostabilizer", "Small I-a Enduring Armor Repairer", "Damage Control I"] },
    { slot: "Rigs", items: ["2× Small Capacitor Control Circuit I", "Small Processor Overclocking Unit I"] },
  ],
  supplies: ["Tranquil Electrical Filament ×3", "EMP S ×4000", "Nanite Repair Paste ×20"],
  skills: mergeSkills(starterCore, starterShield, starterArmor, [
    { name: "Minmatar Frigate", required: 3, target: 4, area: "Hull" },
    { name: "Small Projectile Turret", required: 4, target: 4, area: "Weapons" },
    { name: "Motion Prediction", required: 3, target: 4, area: "Weapons" },
    { name: "Rapid Firing", required: 3, target: 4, area: "Weapons" },
    { name: "Surgical Strike", required: 3, target: 4, area: "Weapons" },
  ]),
});

const tristanT0 = fit({
  id: "abyss-tristan-t0-electrical-a2o",
  shipName: "Tristan",
  name: "A2O T0 Electrical drone Tristan",
  effectiveness: 94,
  summary: "The Alpha-to-Omega Day-0 Tristan still referenced by EVE University's current T0 community page: active shield tank, three drone damage amplifiers, Acolytes for the Electrical EM hole, and autocannons for the cache and extra damage.",
  loadout: [
    { slot: "High", items: ["2× 200mm AutoCannon I"] },
    { slot: "Mid", items: ["1MN Monopropellant Enduring Afterburner", "Multispectrum Shield Hardener I", "Small Clarity Ward Enduring Shield Booster"] },
    { slot: "Low", items: ["3× AE-K Compact Drone Damage Amplifier"] },
    { slot: "Rigs", items: ["Small Processor Overclocking Unit I", "2× Small Capacitor Control Circuit I"] },
    { slot: "Drones", items: ["Acolyte I ×8"] },
  ],
  supplies: ["Tranquil Electrical Filament ×3", "EMP S ×7740", "Acolyte I ×8", "Nanite Repair Paste ×20"],
  skills: mergeSkills(starterCore, starterShield, starterDrones, [
    { name: "Gallente Frigate", required: 3, target: 4, area: "Hull" },
    { name: "Light Drone Operation", required: 4, target: 5, area: "Drones" },
    { name: "Small Projectile Turret", required: 1, target: 3, area: "Weapons" },
    { name: "Afterburner", required: 2, target: 4, area: "Navigation" },
  ]),
});

const hookbillT1 = fit({
  id: "abyss-hookbill-t1-dark",
  shipName: "Caldari Navy Hookbill",
  name: "T1 Dark rocket Hookbill",
  effectiveness: 97,
  summary: "A current low-tier Dark progression fit: rockets ignore Dark's turret-range penalty while the weather's speed bonus helps the Hookbill mitigate incoming turret damage.",
  loadout: [
    { slot: "Low", items: ["Ballistic Control System II", "Crosslink Compact Ballistic Control System"] },
    { slot: "Mid", items: ["1MN Monopropellant Enduring Afterburner", "Small Shield Booster II", "2× Small Compact Pb-Acid Cap Battery", "Compact Thermal Shield Amplifier"] },
    { slot: "High", items: ["3× Rocket Launcher II"] },
    { slot: "Rigs", items: ["Small Rocket Fuel Cache Partition II", "Small EM Shield Reinforcer I", "Small Hydraulic Bay Thrusters II"] },
  ],
  supplies: ["Calm Dark Filament ×3", "Faction rockets in multiple damage types", "Nanite Repair Paste"],
  skills: mergeSkills(starterCore, starterMissiles, starterShield, [
    { name: "Caldari Frigate", required: 4, target: 5, area: "Hull" },
    { name: "Rockets", required: 5, target: 5, area: "Weapons" },
    { name: "Rocket Specialization", required: 1, target: 3, area: "Weapons" },
    { name: "Weapon Upgrades", required: 4, target: 4, area: "Weapons" },
    { name: "Afterburner", required: 3, target: 4, area: "Navigation" },
  ]),
});

const wormT1 = fit({
  id: "abyss-worm-t1-electrical-a2o",
  shipName: "Worm",
  name: "A2O upgraded T1 Electrical Worm",
  effectiveness: 96,
  summary: "The established A2O Calm Electrical progression fit. It combines faction EM drones and missiles with a small active shield tank and MWD; the guide explicitly recommends graduating through T0 before moving into this ship.",
  loadout: [
    { slot: "High", items: ["3× Arbalest Compact Light Missile Launcher"] },
    { slot: "Mid", items: ["Small Shield Booster II", "Small Shield Extender II", "Small Cap Battery II", "5MN Cold-Gas Enduring Microwarpdrive"] },
    { slot: "Low", items: ["2× Drone Damage Amplifier II"] },
    { slot: "Rigs", items: ["Small EM Shield Reinforcer I", "Small Thermal Shield Reinforcer I", "Small Capacitor Control Circuit I"] },
    { slot: "Drones", items: ["Imperial Navy Acolyte ×5"] },
  ],
  supplies: ["Calm Electrical Filament ×3", "Caldari Navy Mjolnir Light Missile ×884", "Imperial Navy Acolyte ×5", "Nanite Repair Paste ×10"],
  skills: mergeSkills(starterCore, starterMissiles, starterShield, starterDrones, [
    { name: "Caldari Frigate", required: 3, target: 4, area: "Hull" },
    { name: "Gallente Frigate", required: 3, target: 4, area: "Hull" },
    { name: "Light Missiles", required: 3, target: 4, area: "Weapons" },
    { name: "Light Drone Operation", required: 5, target: 5, area: "Drones" },
    { name: "High Speed Maneuvering", required: 1, target: 3, area: "Navigation" },
  ]),
});

const gilaT3Gamma = fit({
  id: "abyss-gila-t3-gamma-passive",
  shipName: "Gila",
  name: "T3 Gamma buffer/passive Gila",
  effectiveness: 95,
  summary: "A 2025 community-posted Gamma Gila that was being used successfully in T2/T3. A responder specifically advised treating this version as a T3 Gamma fit rather than assuming the T4 label was safe, so the companion caps it at T3.",
  loadout: [
    { slot: "Low", items: ["3× Drone Damage Amplifier II"] },
    { slot: "Mid", items: ["10MN Afterburner II", "Multispectrum Shield Hardener II", "4× Caldari Navy Large Shield Extender"] },
    { slot: "High", items: ["4× Rapid Light Missile Launcher II", "Drone Link Augmentor II"] },
    { slot: "Rigs", items: ["3× Medium Core Defense Field Extender II"] },
    { slot: "Drones", items: ["Republic Fleet Valkyrie ×4", "Valkyrie II ×6"] },
  ],
  supplies: ["Fierce Gamma Filament ×1", "Republic Fleet Valkyrie ×4 + Valkyrie II ×6", "Caldari Navy Inferno Light Missile", "Caldari Navy Scourge Light Missile", "Nanite Repair Paste ×35"],
  skills: mergeSkills(advancedCore, advancedMissiles, advancedShield, advancedDrones, [
    { name: "Caldari Cruiser", required: 3, target: 4, area: "Hull" },
    { name: "Gallente Cruiser", required: 3, target: 4, area: "Hull" },
    { name: "Light Missiles", required: 5, target: 5, area: "Weapons" },
    { name: "Light Missile Specialization", required: 1, target: 3, area: "Weapons" },
    { name: "Medium Drone Operation", required: 4, target: 5, area: "Drones" },
  ]),
});

const gilaT4Electrical = fit({
  id: "abyss-gila-t4-electrical-active",
  shipName: "Gila",
  name: "T4 Electrical active dual-booster Gila",
  effectiveness: 98,
  summary: "A current-guide T4 Electrical Gila archetype with dual medium boosters, dual multispectrum hardeners, a large cap battery, and EM drones. Electrical weather doubles capacitor recharge rate, which is why this active-tank layout is paired specifically with Electrical filaments.",
  loadout: [
    { slot: "Low", items: ["Damage Control II", "2× Drone Damage Amplifier II"] },
    { slot: "Mid", items: ["Republic Fleet Large Cap Battery", "2× Pithum C-Type Medium Shield Booster", "2× Multispectrum Shield Hardener II", "10MN Afterburner II"] },
    { slot: "High", items: ["4× Prototype 'Arbalest' Rapid Light Missile Launcher", "Drone Link Augmentor I"] },
    { slot: "Rigs", items: ["Medium EM Shield Reinforcer II", "Medium Capacitor Control Circuit I", "Medium Capacitor Control Circuit II"] },
    { slot: "Drones", items: ["Imperial Navy Infiltrator ×10"] },
  ],
  supplies: ["Raging Electrical Filament ×1", "Imperial Navy Infiltrator ×10", "Caldari Navy Mjolnir Light Missile", "Nanite Repair Paste ×100", "Standard Blue Pill / Agency Hardshell only after checking the exact fit and your skills"],
  skills: mergeSkills(advancedCore, advancedMissiles, advancedShield, advancedDrones, [
    { name: "Caldari Cruiser", required: 3, target: 4, area: "Hull" },
    { name: "Gallente Cruiser", required: 3, target: 4, area: "Hull" },
    { name: "Light Missiles", required: 4, target: 5, area: "Weapons" },
    { name: "Medium Drone Operation", required: 4, target: 5, area: "Drones" },
  ]),
});

export const ABYSSAL_TASKS: ShipTask[] = [
  {
    id: "abyssal-vetted-t0-frigate",
    role: "Combat",
    title: "Abyss T0 — vetted starter frigates",
    environment: "Tranquil · solo frigate · 3 filaments",
    description: "Exact low-cost starter fits backed by EVE University's Abyssal community testing. Frigates also receive the three-pilot loot multiplier when run solo, making this the recommended learning format rather than an oversized T0 cruiser.",
    caution: "Abyssal Deadspace has a hard twenty-minute timer and no normal escape. Use the weather named on the fit, form a fleet even when solo, carry three matching filaments, and learn the dangerous room priorities before assuming a cheap hull means a safe run.",
    fits: [punisherT0, kestrelT0, rifterT0, tristanT0],
  },
  {
    id: "abyssal-vetted-t1-frigate",
    role: "Combat",
    title: "Abyss T1 — faction frigate progression",
    environment: "Calm · solo frigate · 3 filaments",
    description: "The next step after repeated T0 clears: a Dark rocket Hookbill or the established Electrical Worm progression. Both keep the frigate loot multiplier but demand better piloting and support skills.",
    caution: "Do not skip the learning step just because you can afford the hull. Current community guidance recommends getting comfortable in T0 first; Angel, Skybreaker, neuting, and boundary mistakes can still end an expensive frigate quickly.",
    fits: [hookbillT1, wormT1],
  },
  {
    id: "abyssal-vetted-t3-cruiser",
    role: "Combat",
    title: "Abyss T3 — Gila progression",
    environment: "Fierce · solo cruiser · 1 filament",
    description: "The point where solo cruiser progression becomes the normal recommendation. This Gamma Gila deliberately uses the weather's shield-HP bonus and explosive hole through Valkyries.",
    caution: "This exact Gamma fit is intentionally rated for T3. A 2025 fit discussion warned against treating it as a safe T4 setup. Run many T3 rooms, watch drone aggro, and do not promote a fit to the next tier because one or two runs felt easy.",
    fits: [gilaT3Gamma],
  },
  {
    id: "abyssal-vetted-t4-cruiser",
    role: "Combat",
    title: "Abyss T4 — active Electrical Gila",
    environment: "Raging Electrical · experienced solo cruiser",
    description: "A weather-specific active Gila built around Electrical capacitor recharge, dual shield boosters, a large cap battery, and EM drones. This is the first library tier where the fit is expensive enough that pilot knowledge matters as much as module quality.",
    caution: "T4 is not a blind upgrade from T3. The weather resistance penalty can roll to 70%, neut pressure and high-DPS rooms can overlap, and the twenty-minute timer remains absolute. Practice the exact weather in T3 first, simulate the fit with your skills, and understand kill priorities before risking the hull.",
    fits: [gilaT4Electrical],
  },
];

export const ABYSSAL_FIT_METADATA: Record<string, AbyssalFitMetadata> = {
  [kestrelT0.id]: {
    validation: "EVE University Abyssal Community Fits (current page, tested against Skybreaker and Devoted Hunter); exact modules cross-checked against Halsky's preserved community fit.",
    sourceUrl: "https://wiki.eveuniversity.org/Abyssal_Community_Fits",
    eft: `[Kestrel, Abyssal Kestrel T0]\nBallistic Control System I\nBallistic Control System I\n\n1MN Monopropellant Enduring Afterburner\nSmall Compact Pb-Acid Cap Battery\nEnduring Multispectrum Shield Hardener\nSmall Clarity Ward Enduring Shield Booster\n\n'Arbalest' Rocket Launcher I\n'Arbalest' Rocket Launcher I\n'Arbalest' Rocket Launcher I\n'Arbalest' Rocket Launcher I\n\nSmall Warhead Calefaction Catalyst I\nSmall Capacitor Control Circuit I\nSmall Capacitor Control Circuit I\n\n\nInferno Rocket x7200\nCaldari Navy Inferno Rocket x720\nNanite Repair Paste x20\nTranquil Dark Filament x3`,
  },
  [punisherT0.id]: {
    validation: "EVE University Abyssal Community Fits; published as probably the safest community T0 starter and extensively tested at the recommended skill plan.",
    sourceUrl: "https://wiki.eveuniversity.org/Abyssal_Community_Fits",
    eft: `[Punisher, Abyssal Punisher T0]\nSmall I-a Enduring Armor Repairer\nExtruded Compact Heat Sink\nDamage Control II\nExtruded Compact Heat Sink\nSmall I-a Enduring Armor Repairer\n\n1MN Y-S8 Compact Afterburner\nEutectic Compact Cap Recharger\n\nSmall Focused Anode Particle Stream I\nSmall Focused Anode Particle Stream I\nSmall Focused Anode Particle Stream I\nSmall Focused Anode Particle Stream I\n\nSmall Energy Locus Coordinator I\nSmall Auxiliary Thrusters I\nSmall Processor Overclocking Unit I\n\n\nImperial Navy Multifrequency S x8\nImperial Navy Standard S x8\nNanite Repair Paste x20\nTranquil Electrical Filament x3`,
  },
  [rifterT0.id]: {
    validation: "EVE University Abyssal Community Fits; exact dual-rep fit preserved by the fit author and tested against the standard T0 danger rooms.",
    sourceUrl: "https://wiki.eveuniversity.org/Abyssal_Community_Fits",
    eft: `[Rifter, Abyssal Rifter T0]\nCounterbalanced Compact Gyrostabilizer\nCounterbalanced Compact Gyrostabilizer\nSmall I-a Enduring Armor Repairer\nDamage Control I\n\nX5 Enduring Stasis Webifier\n1MN Monopropellant Enduring Afterburner\nSmall Clarity Ward Enduring Shield Booster\n\n200mm Light 'Scout' Autocannon I\n200mm Light 'Scout' Autocannon I\n200mm Light 'Scout' Autocannon I\n\nSmall Capacitor Control Circuit I\nSmall Capacitor Control Circuit I\nSmall Processor Overclocking Unit I\n\n\nEMP S x4000\nNanite Repair Paste x20\nTranquil Electrical Filament x3`,
  },
  [tristanT0.id]: {
    validation: "Alpha-to-Omega Day-0 Tristan referenced by EVE University's current T0 community guide; the A2O guide records it as a tried-and-tested T0 Electrical progression fit.",
    sourceUrl: "https://wiki.eveuniversity.org/User:Uriel_Tkarmminni",
    eft: `[Tristan, A2O Day0 Tristan (Step 1)]\nAE-K Compact Drone Damage Amplifier\nAE-K Compact Drone Damage Amplifier\nAE-K Compact Drone Damage Amplifier\n\n1MN Monopropellant Enduring Afterburner\nMultispectrum Shield Hardener I\nSmall Clarity Ward Enduring Shield Booster\n\n200mm AutoCannon I\n200mm AutoCannon I\n[Empty High slot]\n\nSmall Processor Overclocking Unit I\nSmall Capacitor Control Circuit I\nSmall Capacitor Control Circuit I\n\nAcolyte I x8\n\nEMP S x7740\nNanite Repair Paste x20\nTranquil Electrical Filament x3`,
  },
  [hookbillT1.id]: {
    validation: "Current Goon Wiki Abyss guide T1 Dark Hookbill; cross-checked against current EVE Uni guidance that Hookbill is a normal low-SP T1 progression option.",
    sourceUrl: "https://wiki.goonswarm.org/w/Abyssal_Deadspace",
    eft: `[Caldari Navy Hookbill, Alpha T1 Dark Rocket]\nBallistic Control System II\nCrosslink Compact Ballistic Control System\n\n1MN Monopropellant Enduring Afterburner\nSmall Shield Booster II\nSmall Compact Pb-Acid Cap Battery\nSmall Compact Pb-Acid Cap Battery\nCompact Thermal Shield Amplifier\n\nRocket Launcher II\nRocket Launcher II\nRocket Launcher II\n\nSmall Rocket Fuel Cache Partition II\nSmall EM Shield Reinforcer I\nSmall Hydraulic Bay Thrusters II\n\n\nCaldari Navy Inferno Rocket x1200\nCaldari Navy Mjolnir Rocket x1200\nCaldari Navy Nova Rocket x1200\nNanite Repair Paste x30\nCalm Dark Filament x3`,
  },
  [wormT1.id]: {
    validation: "A2O upgraded Calm Electrical Worm progression; EVE University's current FAQ continues to name Worm/Hookbill as low-SP T1 options and recommends learning T0 first.",
    sourceUrl: "https://wiki.eveuniversity.org/User:Uriel_Tkarmminni",
    eft: `[Worm, A2O Upgraded Electrical-Worm (Step 4)]\nDrone Damage Amplifier II\nDrone Damage Amplifier II\n\nSmall Shield Booster II\nSmall Shield Extender II\nSmall Cap Battery II\n5MN Cold-Gas Enduring Microwarpdrive\n\nArbalest Compact Light Missile Launcher\nArbalest Compact Light Missile Launcher\nArbalest Compact Light Missile Launcher\n\nSmall EM Shield Reinforcer I\nSmall Thermal Shield Reinforcer I\nSmall Capacitor Control Circuit I\n\nImperial Navy Acolyte x5\n\nCaldari Navy Mjolnir Light Missile x884\nNanite Repair Paste x10\nCalm Electrical Filament x3`,
  },
  [gilaT3Gamma.id]: {
    validation: "2025 EVE forum Gamma Gila posted by a pilot running T2/T3; a knowledgeable responder explicitly advised treating this passive version as T3 rather than assuming T4 safety.",
    sourceUrl: "https://forums.eveonline.com/t/which-fit-is-preferable-for-abyssals/477494",
    eft: `[Gila, Gamma T3]\nDrone Damage Amplifier II\nDrone Damage Amplifier II\nDrone Damage Amplifier II\n\n10MN Afterburner II\nMultispectrum Shield Hardener II\nCaldari Navy Large Shield Extender\nCaldari Navy Large Shield Extender\nCaldari Navy Large Shield Extender\nCaldari Navy Large Shield Extender\n\nRapid Light Missile Launcher II\nRapid Light Missile Launcher II\nRapid Light Missile Launcher II\nRapid Light Missile Launcher II\nDrone Link Augmentor II\n\nMedium Core Defense Field Extender II\nMedium Core Defense Field Extender II\nMedium Core Defense Field Extender II\n\nRepublic Fleet Valkyrie x4\nValkyrie II x6\n\nCaldari Navy Inferno Light Missile x2500\nCaldari Navy Scourge Light Missile x2500\nNanite Repair Paste x35\nFierce Gamma Filament x1`,
  },
  [gilaT4Electrical.id]: {
    validation: "Current Goon Wiki T4 Electrical active Gila archetype, cross-checked against current EVE mechanics and multiple community sources using the same dual-booster/cap-battery approach.",
    sourceUrl: "https://wiki.goonswarm.org/w/Abyssal_Deadspace",
    eft: `[Gila, T4 Electrical active]\nDamage Control II\nDrone Damage Amplifier II\nDrone Damage Amplifier II\n\nRepublic Fleet Large Cap Battery\nPithum C-Type Medium Shield Booster\nPithum C-Type Medium Shield Booster\nMultispectrum Shield Hardener II\nMultispectrum Shield Hardener II\n10MN Afterburner II\n\nPrototype 'Arbalest' Rapid Light Missile Launcher\nPrototype 'Arbalest' Rapid Light Missile Launcher\nPrototype 'Arbalest' Rapid Light Missile Launcher\nPrototype 'Arbalest' Rapid Light Missile Launcher\nDrone Link Augmentor I\n\nMedium EM Shield Reinforcer II\nMedium Capacitor Control Circuit I\nMedium Capacitor Control Circuit II\n\nImperial Navy Infiltrator x10\n\nCaldari Navy Mjolnir Light Missile x3000\nNanite Repair Paste x100\nRaging Electrical Filament x1`,
  },
};
