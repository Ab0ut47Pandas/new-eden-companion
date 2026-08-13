import type { TrainedSkillView } from "@/lib/dashboard/model";
import type { ShipCatalogEntry, ShipSkillRequirement } from "@/lib/ships/model";

export type ShipTaskRole = "Combat" | "Mining" | "Exploration" | "Hauling" | "Fleet support";

export interface FitSkillTarget {
  name: string;
  required: number;
  target: number;
  area: "Hull" | "Weapons" | "Tank" | "Navigation" | "Utility" | "Drones";
}

export interface FitTemplate {
  id: string;
  shipName: string;
  name: string;
  summary: string;
  effectiveness: number;
  loadout: Array<{ slot: string; items: string[] }>;
  supplies: string[];
  skills: FitSkillTarget[];
}

export interface ShipTask {
  id: string;
  role: ShipTaskRole;
  title: string;
  environment: string;
  description: string;
  caution: string;
  fits: FitTemplate[];
}

export interface FitSkillAssessment extends FitSkillTarget {
  current: number;
  requiredMet: boolean;
  targetMet: boolean;
}

export interface FitRecommendation extends FitTemplate {
  ship: ShipCatalogEntry;
  owned: boolean;
  canBoard: boolean;
  boardingGaps: Array<ShipSkillRequirement & { current: number }>;
  canUseTemplate: boolean;
  skillAssessments: FitSkillAssessment[];
  requiredGaps: FitSkillAssessment[];
  targetGaps: FitSkillAssessment[];
  targetsMet: number;
  targetTotal: number;
  coverage: number;
  status: "Ready for task" | "Usable; improve support" | "Hull ready; fit blocked" | "Train hull first";
  sortScore: number;
}

const coreCombat: FitSkillTarget[] = [
  { name: "CPU Management", required: 3, target: 5, area: "Utility" },
  { name: "Power Grid Management", required: 3, target: 5, area: "Utility" },
  { name: "Capacitor Management", required: 3, target: 4, area: "Utility" },
  { name: "Navigation", required: 3, target: 4, area: "Navigation" },
  { name: "Target Management", required: 3, target: 4, area: "Utility" },
  { name: "Thermodynamics", required: 0, target: 3, area: "Utility" },
];

const missileSupport: FitSkillTarget[] = [
  { name: "Missile Launcher Operation", required: 1, target: 5, area: "Weapons" },
  { name: "Rapid Launch", required: 2, target: 4, area: "Weapons" },
  { name: "Warhead Upgrades", required: 2, target: 4, area: "Weapons" },
  { name: "Target Navigation Prediction", required: 2, target: 4, area: "Weapons" },
  { name: "Guided Missile Precision", required: 0, target: 3, area: "Weapons" },
];

const shieldTank: FitSkillTarget[] = [
  { name: "Shield Operation", required: 3, target: 4, area: "Tank" },
  { name: "Shield Management", required: 3, target: 4, area: "Tank" },
  { name: "Shield Upgrades", required: 3, target: 4, area: "Tank" },
  { name: "Tactical Shield Manipulation", required: 1, target: 4, area: "Tank" },
];

const armorTank: FitSkillTarget[] = [
  { name: "Mechanics", required: 3, target: 4, area: "Tank" },
  { name: "Hull Upgrades", required: 3, target: 4, area: "Tank" },
  { name: "Repair Systems", required: 2, target: 4, area: "Tank" },
];

const drones: FitSkillTarget[] = [
  { name: "Drones", required: 3, target: 5, area: "Drones" },
  { name: "Drone Interfacing", required: 1, target: 4, area: "Drones" },
  { name: "Drone Navigation", required: 2, target: 4, area: "Drones" },
  { name: "Drone Durability", required: 2, target: 4, area: "Drones" },
];

function mergeSkills(...groups: FitSkillTarget[][]): FitSkillTarget[] {
  const merged = new Map<string, FitSkillTarget>();
  for (const skill of groups.flat()) {
    const current = merged.get(skill.name);
    merged.set(skill.name, current ? { ...skill, required: Math.max(current.required, skill.required), target: Math.max(current.target, skill.target) } : skill);
  }
  return [...merged.values()];
}

function fit(template: FitTemplate): FitTemplate {
  return template;
}

const kestrelMission = fit({
  id: "kestrel-level-1", shipName: "Kestrel", name: "Beginner light-missile Kestrel", effectiveness: 91,
  summary: "A cheap ranged frigate that teaches missile range, shield management, and target priority without turret tracking.",
  loadout: [
    { slot: "High", items: ["4× Light Missile Launcher"] },
    { slot: "Mid", items: ["1MN Afterburner", "Medium Shield Extender", "shield resistance module", "utility or small shield booster"] },
    { slot: "Low", items: ["2× Ballistic Control System"] },
    { slot: "Rigs", items: ["Light-missile damage/application and shield rigs"] },
  ],
  supplies: ["Light missiles in all four damage types", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, missileSupport, shieldTank, [
    { name: "Caldari Frigate", required: 1, target: 4, area: "Hull" },
    { name: "Light Missiles", required: 1, target: 4, area: "Weapons" },
    { name: "Afterburner", required: 1, target: 3, area: "Navigation" },
  ]),
});

const punisherMission = fit({
  id: "punisher-level-1", shipName: "Punisher", name: "Beginner laser Punisher", effectiveness: 87,
  summary: "A durable armor frigate with reusable crystals; capacitor and range selection are the lessons.",
  loadout: [
    { slot: "High", items: ["4× Small Pulse or Beam Laser"] },
    { slot: "Mid", items: ["1MN Afterburner", "Cap Recharger"] },
    { slot: "Low", items: ["Small Armor Repairer", "armor hardeners", "Heat Sink", "capacitor support"] },
    { slot: "Rigs", items: ["Capacitor and armor-repair rigs"] },
  ],
  supplies: ["Multifrequency, Standard and Radio crystals", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, armorTank, [
    { name: "Amarr Frigate", required: 1, target: 4, area: "Hull" },
    { name: "Small Energy Turret", required: 1, target: 4, area: "Weapons" },
    { name: "Controlled Bursts", required: 1, target: 3, area: "Weapons" },
    { name: "Motion Prediction", required: 1, target: 3, area: "Weapons" },
  ]),
});

const tristanMission = fit({
  id: "tristan-level-1", shipName: "Tristan", name: "Beginner drone Tristan", effectiveness: 88,
  summary: "A flexible frigate for learning drone control while the hull maintains range and repairs armor.",
  loadout: [
    { slot: "High", items: ["2× Small Railgun", "utility high"] },
    { slot: "Mid", items: ["1MN Afterburner", "Cap Recharger", "Webifier or drone utility"] },
    { slot: "Low", items: ["Small Armor Repairer", "Drone Damage Amplifier", "armor resistance module"] },
    { slot: "Rigs", items: ["Capacitor and armor-repair rigs"] },
  ],
  supplies: ["5× light combat drones plus spares", "Small hybrid charges", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, armorTank, drones, [
    { name: "Gallente Frigate", required: 1, target: 4, area: "Hull" },
    { name: "Light Drone Operation", required: 1, target: 4, area: "Drones" },
    { name: "Small Hybrid Turret", required: 1, target: 3, area: "Weapons" },
  ]),
});

const drake = fit({
  id: "drake-heavy-shield", shipName: "Drake", name: "Heavy-missile shield Drake", effectiveness: 92,
  summary: "Long-range missiles, a forgiving shield tank, and light drones for smaller targets.",
  loadout: [
    { slot: "High", items: ["6× Heavy Missile Launcher"] },
    { slot: "Mid", items: ["10MN Afterburner", "2× Large Shield Extender", "3× mission-specific shield hardeners"] },
    { slot: "Low", items: ["3× Ballistic Control System", "Shield Power Relay or Damage Control"] },
    { slot: "Rigs", items: ["3× Core Defense Field Purger"] },
  ],
  supplies: ["Scourge plus the other three damage types", "Precision ammunition for frigates", "5× light combat drones", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, missileSupport, shieldTank, drones, [
    { name: "Caldari Battlecruiser", required: 1, target: 4, area: "Hull" },
    { name: "Heavy Missiles", required: 1, target: 5, area: "Weapons" },
    { name: "Missile Bombardment", required: 2, target: 4, area: "Weapons" },
    { name: "Missile Projection", required: 2, target: 4, area: "Weapons" },
  ]),
});

const myrmidon = fit({
  id: "myrmidon-drone-armor", shipName: "Myrmidon", name: "Drone armor Myrmidon", effectiveness: 87,
  summary: "A repairable armor platform whose drones do most of the work while the hull controls range.",
  loadout: [
    { slot: "High", items: ["Drone Link Augmentor", "Medium railguns or utility modules"] },
    { slot: "Mid", items: ["10MN Afterburner", "Cap Rechargers", "Omnidirectional Tracking Link"] },
    { slot: "Low", items: ["Medium Armor Repairers", "mission-specific armor hardeners", "Drone Damage Amplifiers"] },
    { slot: "Rigs", items: ["Capacitor Control and armor-repair rigs"] },
  ],
  supplies: ["Flight of light drones", "Flight of medium drones", "Spare drones", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, armorTank, drones, [
    { name: "Gallente Battlecruiser", required: 1, target: 4, area: "Hull" },
    { name: "Medium Drone Operation", required: 1, target: 4, area: "Drones" },
  ]),
});

const harbinger = fit({
  id: "harbinger-beam-armor", shipName: "Harbinger", name: "Beam armor Harbinger", effectiveness: 84,
  summary: "Medium beam lasers with an active armor tank; strongest against EM- and thermal-vulnerable enemies.",
  loadout: [
    { slot: "High", items: ["7× Medium Beam Laser"] },
    { slot: "Mid", items: ["10MN Afterburner", "Tracking Computer", "Cap Rechargers"] },
    { slot: "Low", items: ["Medium Armor Repairer", "mission-specific hardeners", "Heat Sinks"] },
    { slot: "Rigs", items: ["Capacitor Control Circuits"] },
  ],
  supplies: ["Multifrequency, Standard and Radio crystals", "5× light drones", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, armorTank, drones, [
    { name: "Amarr Battlecruiser", required: 1, target: 4, area: "Hull" },
    { name: "Medium Energy Turret", required: 1, target: 4, area: "Weapons" },
    { name: "Controlled Bursts", required: 2, target: 4, area: "Weapons" },
    { name: "Sharpshooter", required: 2, target: 4, area: "Weapons" },
  ]),
});

const praxis = fit({
  id: "praxis-rapid-heavy", shipName: "Praxis", name: "Rapid-heavy shield Praxis", effectiveness: 90,
  summary: "Uses existing heavy-missile skills on a battleship hull while drones cover the long reload.",
  loadout: [
    { slot: "High", items: ["6× Rapid Heavy Missile Launcher", "Drone Link Augmentor"] },
    { slot: "Mid", items: ["Large or X-Large Shield Booster", "Shield Boost Amplifier", "mission-specific hardeners", "Heavy Capacitor Booster", "propulsion"] },
    { slot: "Low", items: ["Ballistic Control Systems", "Drone Damage Amplifiers", "Damage Control"] },
    { slot: "Rigs", items: ["Capacitor and missile-application rigs"] },
  ],
  supplies: ["Heavy missiles in all damage types", "Precision ammunition", "Cap Booster charges", "Light and medium drones", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, missileSupport, shieldTank, drones, [
    { name: "Heavy Missiles", required: 1, target: 5, area: "Weapons" },
    { name: "Heavy Drone Operation", required: 1, target: 4, area: "Drones" },
  ]),
});

const raven = fit({
  id: "raven-cruise", shipName: "Raven", name: "Cruise-missile shield Raven", effectiveness: 95,
  summary: "A dedicated long-range mission battleship with selectable missile damage and strong application bonuses.",
  loadout: [
    { slot: "High", items: ["6× Cruise Missile Launcher", "utility high"] },
    { slot: "Mid", items: ["X-Large Shield Booster", "Shield Boost Amplifier", "mission-specific hardeners", "Micro Jump Drive"] },
    { slot: "Low", items: ["Ballistic Control Systems", "Missile Guidance Enhancer", "Damage Control"] },
    { slot: "Rigs", items: ["Warhead Rigor and capacitor rigs"] },
  ],
  supplies: ["Cruise missiles in all damage types", "Precision ammunition", "5× light drones", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, missileSupport, shieldTank, drones, [
    { name: "Caldari Battleship", required: 1, target: 4, area: "Hull" },
    { name: "Cruise Missiles", required: 1, target: 4, area: "Weapons" },
    { name: "Missile Bombardment", required: 2, target: 4, area: "Weapons" },
    { name: "Missile Projection", required: 2, target: 4, area: "Weapons" },
  ]),
});

const apocalypse = fit({
  id: "apocalypse-beam", shipName: "Apocalypse", name: "Beam armor Apocalypse", effectiveness: 88,
  summary: "A long-range laser mission hull; easy ammunition logistics, but capacitor and armor support matter.",
  loadout: [
    { slot: "High", items: ["8× Large Beam Laser"] },
    { slot: "Mid", items: ["Large Micro Jump Drive", "Tracking Computer", "Cap Rechargers"] },
    { slot: "Low", items: ["Large Armor Repairer", "mission-specific hardeners", "Heat Sinks", "capacitor support"] },
    { slot: "Rigs", items: ["Capacitor Control Circuits"] },
  ],
  supplies: ["Multifrequency, Standard and Radio crystals", "5× light drones", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, armorTank, drones, [
    { name: "Amarr Battleship", required: 1, target: 4, area: "Hull" },
    { name: "Large Energy Turret", required: 1, target: 4, area: "Weapons" },
    { name: "Controlled Bursts", required: 2, target: 4, area: "Weapons" },
    { name: "Sharpshooter", required: 2, target: 4, area: "Weapons" },
  ]),
});

const caracal = fit({
  id: "caracal-rapid-light", shipName: "Caracal", name: "Rapid-light shield Caracal", effectiveness: 88,
  summary: "A fast, inexpensive cruiser for clearing frigates and ordinary high-sec anomalies.",
  loadout: [
    { slot: "High", items: ["5× Rapid Light Missile Launcher"] },
    { slot: "Mid", items: ["10MN Afterburner", "Large Shield Extenders", "shield hardeners"] },
    { slot: "Low", items: ["Ballistic Control Systems", "Damage Control"] },
    { slot: "Rigs", items: ["Shield and missile-application rigs"] },
  ],
  supplies: ["Light missiles in all damage types", "Precision ammunition", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, missileSupport, shieldTank, [
    { name: "Caldari Cruiser", required: 1, target: 4, area: "Hull" },
    { name: "Light Missiles", required: 1, target: 4, area: "Weapons" },
  ]),
});

const caracalMission = fit({
  id: "caracal-level-2", shipName: "Caracal", name: "Active-shield Level 2 Caracal", effectiveness: 93,
  summary: "A forgiving missile cruiser with selectable damage, good range, and an active mission tank.",
  loadout: [
    { slot: "High", items: ["5× Rapid Light or Heavy Missile Launcher"] },
    { slot: "Mid", items: ["10MN Afterburner", "Medium Shield Booster", "Cap Battery", "2× mission-specific shield hardener"] },
    { slot: "Low", items: ["Ballistic Control Systems", "Damage Control or fitting support"] },
    { slot: "Rigs", items: ["Capacitor and missile-application rigs"] },
  ],
  supplies: ["Missiles in all four damage types", "Precision ammunition when unlocked", "2× light drones", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, missileSupport, shieldTank, drones, [
    { name: "Caldari Cruiser", required: 1, target: 4, area: "Hull" },
    { name: "Light Missiles", required: 1, target: 4, area: "Weapons" },
    { name: "Heavy Missiles", required: 0, target: 4, area: "Weapons" },
  ]),
});

const vexor = fit({
  id: "vexor-drone-armor", shipName: "Vexor", name: "Drone armor Vexor", effectiveness: 86,
  summary: "A low-attention drone cruiser with flexible damage types and a repairable armor tank.",
  loadout: [
    { slot: "High", items: ["Drone Link Augmentor", "railguns or utility highs"] },
    { slot: "Mid", items: ["10MN Afterburner", "Cap Rechargers", "Drone Navigation Computer"] },
    { slot: "Low", items: ["Medium Armor Repairer", "armor hardeners", "Drone Damage Amplifiers"] },
    { slot: "Rigs", items: ["Capacitor and armor-repair rigs"] },
  ],
  supplies: ["Light and medium drones in multiple damage types", "Spare drones", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, armorTank, drones, [
    { name: "Gallente Cruiser", required: 1, target: 4, area: "Hull" },
    { name: "Medium Drone Operation", required: 1, target: 4, area: "Drones" },
  ]),
});

const omenMission = fit({
  id: "omen-level-2", shipName: "Omen", name: "Active-armor Level 2 Omen", effectiveness: 87,
  summary: "A laser cruiser with reusable ammunition and strong damage against EM- and thermal-vulnerable mission enemies.",
  loadout: [
    { slot: "High", items: ["5× Focused Medium Beam or Pulse Laser"] },
    { slot: "Mid", items: ["10MN Afterburner", "Tracking Computer", "Cap Recharger"] },
    { slot: "Low", items: ["Medium Armor Repairer", "mission-specific hardeners", "Heat Sinks", "capacitor support"] },
    { slot: "Rigs", items: ["Capacitor Control Circuits"] },
  ],
  supplies: ["Multifrequency, Standard and Radio crystals", "3× light drones", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, armorTank, drones, [
    { name: "Amarr Cruiser", required: 1, target: 4, area: "Hull" },
    { name: "Medium Energy Turret", required: 1, target: 4, area: "Weapons" },
    { name: "Controlled Bursts", required: 2, target: 4, area: "Weapons" },
    { name: "Motion Prediction", required: 2, target: 4, area: "Weapons" },
  ]),
});

const dragoon = fit({
  id: "dragoon-t0-electrical", shipName: "Dragoon", name: "T0 Electrical drone Dragoon", effectiveness: 83,
  summary: "A cheap destroyer template for learning Tranquil Electrical rooms, drone control, and the timer.",
  loadout: [
    { slot: "High", items: ["Light missile launchers", "small energy turrets or utility"] },
    { slot: "Mid", items: ["5MN Microwarpdrive", "Target Painter", "Missile Guidance Computer"] },
    { slot: "Low", items: ["Small Armor Repairer", "Drone Damage Amplifiers", "drone tracking"] },
    { slot: "Rigs", items: ["Fitting and missile-application rigs"] },
  ],
  supplies: ["Acolytes plus spare drones", "Light missiles", "Tranquil Electrical Filaments ×2 per solo destroyer activation", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, armorTank, drones, missileSupport, [
    { name: "Amarr Destroyer", required: 1, target: 4, area: "Hull" },
    { name: "Light Missiles", required: 1, target: 4, area: "Weapons" },
  ]),
});

const caracalAbyss = fit({
  id: "caracal-t0-exotic", shipName: "Caracal", name: "T0 Exotic solo Caracal", effectiveness: 94,
  summary: "The roomy beginner format: one cruiser, one Exotic filament, kinetic missiles, and an active shield tank.",
  loadout: [
    { slot: "High", items: ["5× Rapid Light Missile Launcher"] },
    { slot: "Mid", items: ["10MN Afterburner", "Medium Shield Booster", "Cap Battery", "Multispectrum Shield Hardener", "Shield Boost Amplifier"] },
    { slot: "Low", items: ["Ballistic Control Systems", "Damage Control"] },
    { slot: "Rigs", items: ["Capacitor and missile-application rigs"] },
  ],
  supplies: ["Tranquil Exotic Filament ×1", "Scourge light missiles", "2× light drones", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, missileSupport, shieldTank, drones, [
    { name: "Caldari Cruiser", required: 1, target: 4, area: "Hull" },
    { name: "Light Missiles", required: 1, target: 4, area: "Weapons" },
    { name: "Afterburner", required: 2, target: 4, area: "Navigation" },
  ]),
});

const vexorAbyss = fit({
  id: "vexor-t0-electrical", shipName: "Vexor", name: "T0 Electrical solo Vexor", effectiveness: 90,
  summary: "A drone cruiser with room for replacements; Electrical weather supports capacitor and Acolytes exploit the EM resistance penalty.",
  loadout: [
    { slot: "High", items: ["Drone Link Augmentor", "small or medium guns for extra damage"] },
    { slot: "Mid", items: ["10MN Afterburner", "Cap Battery", "Cap Recharger", "drone application module"] },
    { slot: "Low", items: ["Medium Armor Repairer", "armor resistance modules", "Drone Damage Amplifiers"] },
    { slot: "Rigs", items: ["Capacitor and armor-repair rigs"] },
  ],
  supplies: ["Tranquil Electrical Filament ×1", "Acolytes plus spare light/medium drones", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, armorTank, drones, [
    { name: "Gallente Cruiser", required: 1, target: 4, area: "Hull" },
    { name: "Medium Drone Operation", required: 1, target: 4, area: "Drones" },
    { name: "Afterburner", required: 2, target: 4, area: "Navigation" },
  ]),
});

const omenAbyss = fit({
  id: "omen-t0-electrical", shipName: "Omen", name: "T0 Electrical solo Omen", effectiveness: 89,
  summary: "An EM-laser cruiser that benefits naturally from Electrical weather, with more room for error than the frigate format.",
  loadout: [
    { slot: "High", items: ["5× Focused Medium Pulse Laser"] },
    { slot: "Mid", items: ["10MN Afterburner", "Cap Battery", "Tracking Computer"] },
    { slot: "Low", items: ["Medium Armor Repairer", "armor resistance modules", "Heat Sinks", "capacitor support"] },
    { slot: "Rigs", items: ["Capacitor and armor-repair rigs"] },
  ],
  supplies: ["Tranquil Electrical Filament ×1", "Multifrequency and longer-range crystals", "3× Acolytes", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, armorTank, drones, [
    { name: "Amarr Cruiser", required: 1, target: 4, area: "Hull" },
    { name: "Medium Energy Turret", required: 1, target: 4, area: "Weapons" },
    { name: "Controlled Bursts", required: 2, target: 4, area: "Weapons" },
    { name: "Afterburner", required: 2, target: 4, area: "Navigation" },
  ]),
});

const coraxAbyss = fit({
  id: "corax-t0-exotic", shipName: "Corax", name: "T0 Exotic missile Corax", effectiveness: 88,
  summary: "A destroyer missile alternative to the Dragoon; use kinetic missiles in Exotic weather and keep moving.",
  loadout: [
    { slot: "High", items: ["7× Light Missile Launcher"] },
    { slot: "Mid", items: ["1MN Afterburner", "Medium Shield Extender", "Small Shield Booster", "Multispectrum Shield Hardener"] },
    { slot: "Low", items: ["Ballistic Control System", "Damage Control"] },
    { slot: "Rigs", items: ["Shield and missile-application rigs"] },
  ],
  supplies: ["Tranquil Exotic Filaments ×2", "Scourge light missiles", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, missileSupport, shieldTank, [
    { name: "Caldari Destroyer", required: 1, target: 4, area: "Hull" },
    { name: "Light Missiles", required: 1, target: 4, area: "Weapons" },
    { name: "Afterburner", required: 2, target: 4, area: "Navigation" },
  ]),
});

const algosAbyss = fit({
  id: "algos-t0-electrical", shipName: "Algos", name: "T0 Electrical drone Algos", effectiveness: 87,
  summary: "A fast drone destroyer with hybrid backup weapons and multiple replacement drones.",
  loadout: [
    { slot: "High", items: ["Small railguns", "Drone Link Augmentor where useful"] },
    { slot: "Mid", items: ["1MN Afterburner", "Cap Recharger", "Webifier or drone utility"] },
    { slot: "Low", items: ["Small Armor Repairer", "Drone Damage Amplifiers", "armor resistance module"] },
    { slot: "Rigs", items: ["Capacitor and armor-repair rigs"] },
  ],
  supplies: ["Tranquil Electrical Filaments ×2", "Acolytes plus spare drones", "Small hybrid charges", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, armorTank, drones, [
    { name: "Gallente Destroyer", required: 1, target: 4, area: "Hull" },
    { name: "Light Drone Operation", required: 1, target: 4, area: "Drones" },
    { name: "Small Hybrid Turret", required: 1, target: 3, area: "Weapons" },
    { name: "Afterburner", required: 2, target: 4, area: "Navigation" },
  ]),
});

const kestrelAbyss = fit({
  id: "kestrel-t0-exotic", shipName: "Kestrel", name: "T0 Exotic solo Kestrel", effectiveness: 86,
  summary: "A cheap but tighter solo format: three Exotic filaments, kinetic missiles, manual movement, and less room for mistakes.",
  loadout: [
    { slot: "High", items: ["4× Rocket or Light Missile Launcher"] },
    { slot: "Mid", items: ["1MN Afterburner", "Small Shield Booster", "Multispectrum Shield Hardener", "Cap Battery or extender"] },
    { slot: "Low", items: ["Ballistic Control Systems"] },
    { slot: "Rigs", items: ["Shield and missile damage/application rigs"] },
  ],
  supplies: ["Tranquil Exotic Filaments ×3", "Scourge ammunition", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, missileSupport, shieldTank, [
    { name: "Caldari Frigate", required: 1, target: 4, area: "Hull" },
    { name: "Light Missiles", required: 1, target: 4, area: "Weapons" },
    { name: "Afterburner", required: 2, target: 4, area: "Navigation" },
  ]),
});

const punisherAbyss = fit({
  id: "punisher-t0-electrical", shipName: "Punisher", name: "T0 Electrical solo Punisher", effectiveness: 84,
  summary: "A tanky laser frigate for Electrical weather, but slower damage makes target priority and range discipline important.",
  loadout: [
    { slot: "High", items: ["4× Small Pulse Laser"] },
    { slot: "Mid", items: ["1MN Afterburner", "Cap Recharger"] },
    { slot: "Low", items: ["Small Armor Repairer", "armor resistance modules", "Heat Sink", "capacitor support"] },
    { slot: "Rigs", items: ["Capacitor and armor-repair rigs"] },
  ],
  supplies: ["Tranquil Electrical Filaments ×3", "Multifrequency and long-range crystals", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, armorTank, [
    { name: "Amarr Frigate", required: 1, target: 4, area: "Hull" },
    { name: "Small Energy Turret", required: 1, target: 4, area: "Weapons" },
    { name: "Controlled Bursts", required: 1, target: 4, area: "Weapons" },
    { name: "Afterburner", required: 2, target: 4, area: "Navigation" },
  ]),
});

const tristanAbyss = fit({
  id: "tristan-t0-electrical", shipName: "Tristan", name: "T0 Electrical solo Tristan", effectiveness: 85,
  summary: "A drone frigate with damage flexibility and replacements, balanced by the need to recall damaged drones quickly.",
  loadout: [
    { slot: "High", items: ["Small railguns", "utility high"] },
    { slot: "Mid", items: ["1MN Afterburner", "Cap Recharger", "Webifier or drone utility"] },
    { slot: "Low", items: ["Small Armor Repairer", "Drone Damage Amplifier", "armor resistance module"] },
    { slot: "Rigs", items: ["Capacitor and armor-repair rigs"] },
  ],
  supplies: ["Tranquil Electrical Filaments ×3", "Acolytes plus spare light drones", "Nanite Repair Paste"],
  skills: mergeSkills(coreCombat, armorTank, drones, [
    { name: "Gallente Frigate", required: 1, target: 4, area: "Hull" },
    { name: "Light Drone Operation", required: 1, target: 4, area: "Drones" },
    { name: "Afterburner", required: 2, target: 4, area: "Navigation" },
  ]),
});

const venture = fit({
  id: "venture-highsec-ore", shipName: "Venture", name: "High-sec ore Venture", effectiveness: 78,
  summary: "The inexpensive official starting point: mine, survey the rock, kill belt rats, and leave quickly.",
  loadout: [
    { slot: "High", items: ["2× scoped Mining Laser", "Salvager"] },
    { slot: "Mid", items: ["Medium Shield Extender", "1MN Afterburner", "Survey Scanner"] },
    { slot: "Low", items: ["Mining Laser Upgrade"] },
    { slot: "Rigs", items: ["Small shield resistance rigs"] },
  ],
  supplies: ["2× light combat drones", "2× mining drones", "Nanite Repair Paste"],
  skills: mergeSkills(shieldTank, drones, [
    { name: "Mining Frigate", required: 1, target: 4, area: "Hull" },
    { name: "Mining", required: 1, target: 4, area: "Utility" },
    { name: "Mining Upgrades", required: 1, target: 4, area: "Utility" },
    { name: "Astrogeology", required: 0, target: 4, area: "Utility" },
    { name: "Navigation", required: 2, target: 4, area: "Navigation" },
  ]),
});

function barge(shipName: "Retriever" | "Procurer", safe: boolean): FitTemplate {
  return fit({
    id: `${shipName.toLowerCase()}-highsec-ore`, shipName, name: safe ? "Tank-first high-sec Procurer" : "Large-hold high-sec Retriever", effectiveness: safe ? 90 : 86,
    summary: safe ? "Lower attention and a sturdier shield tank when survival matters more than maximum yield." : "A roomy solo mining barge for fewer station trips; less forgiving if someone chooses you as a target.",
    loadout: [
      { slot: "High", items: ["2× Strip Miner"] },
      { slot: "Mid", items: ["Survey Scanner", "shield extender", "shield hardeners"] },
      { slot: "Low", items: ["Mining Laser Upgrades", safe ? "Damage Control" : "additional yield module"] },
      { slot: "Rigs", items: [safe ? "Shield durability rigs" : "Ice or ore yield / agility rigs"] },
    ],
    supplies: ["5× light combat drones", "Mining crystals only when using matching modulated strip miners", "Nanite Repair Paste"],
    skills: mergeSkills(shieldTank, drones, [
      { name: "Mining Barge", required: 1, target: 4, area: "Hull" },
      { name: "Mining", required: 4, target: 5, area: "Utility" },
      { name: "Astrogeology", required: 3, target: 4, area: "Utility" },
      { name: "Mining Upgrades", required: 2, target: 4, area: "Utility" },
    ]),
  });
}

function explorer(shipName: "Heron" | "Magnate" | "Imicus", effectiveness: number): FitTemplate {
  return fit({
    id: `${shipName.toLowerCase()}-relic-data`, shipName, name: `${shipName} relic/data scout`, effectiveness,
    summary: "A cheap scanning frigate that finds signatures, hacks containers, and aligns out instead of fighting.",
    loadout: [
      { slot: "High", items: ["Core Probe Launcher", "Prototype Cloaking Device if it fits"] },
      { slot: "Mid", items: ["5MN Microwarpdrive", "Relic Analyzer", "Data Analyzer", "scan-strength module where slots allow"] },
      { slot: "Low", items: ["Nanofiber Internal Structures or Inertial Stabilizers"] },
      { slot: "Rigs", items: ["2× Gravity Capacitor Upgrade"] },
    ],
    supplies: ["16× Core Scanner Probes", "Sisters probes when affordable", "Nanite Repair Paste"],
    skills: [
      { name: `${shipName === "Heron" ? "Caldari" : shipName === "Magnate" ? "Amarr" : "Gallente"} Frigate`, required: 1, target: 4, area: "Hull" },
      { name: "Astrometrics", required: 1, target: 4, area: "Utility" },
      { name: "Astrometric Rangefinding", required: 0, target: 3, area: "Utility" },
      { name: "Astrometric Acquisition", required: 0, target: 3, area: "Utility" },
      { name: "Astrometric Pinpointing", required: 0, target: 3, area: "Utility" },
      { name: "Hacking", required: 1, target: 4, area: "Utility" },
      { name: "Archaeology", required: 1, target: 4, area: "Utility" },
      { name: "High Speed Maneuvering", required: 1, target: 3, area: "Navigation" },
      { name: "Cloaking", required: 0, target: 3, area: "Utility" },
    ],
  });
}

function hauler(shipName: "Badger" | "Bestower" | "Nereus", effectiveness: number): FitTemplate {
  const race = shipName === "Badger" ? "Caldari" : shipName === "Bestower" ? "Amarr" : "Gallente";
  return fit({
    id: `${shipName.toLowerCase()}-highsec-hauler`, shipName, name: `${shipName} cautious high-sec hauler`, effectiveness,
    summary: "A cheap cargo fit that favors alignment and effective hit points over cramming in every last cubic meter.",
    loadout: [
      { slot: "High", items: ["Improved Cloaking Device when trained"] },
      { slot: "Mid", items: ["10MN Afterburner or 50MN Microwarpdrive", "shield extenders and resistance modules"] },
      { slot: "Low", items: ["Inertial Stabilizers", "Damage Control", "cargo expanders only as needed"] },
      { slot: "Rigs", items: ["Cargo, agility, or warp-speed rigs to match the trip"] },
    ],
    supplies: ["Nanite Repair Paste", "Never carry more than you can afford to lose"],
    skills: [
      { name: `${race} Hauler`, required: 1, target: 4, area: "Hull" },
      { name: "Navigation", required: 3, target: 4, area: "Navigation" },
      { name: "Evasive Maneuvering", required: 3, target: 4, area: "Navigation" },
      { name: "Warp Drive Operation", required: 3, target: 4, area: "Navigation" },
      { name: "Hull Upgrades", required: 3, target: 4, area: "Tank" },
      { name: "Shield Management", required: 3, target: 4, area: "Tank" },
      { name: "Cloaking", required: 0, target: 3, area: "Utility" },
    ],
  });
}

function logistics(shipName: "Osprey" | "Augoror" | "Exequror", tank: "shield" | "armor", effectiveness: number): FitTemplate {
  const hullSkill = shipName === "Osprey" ? "Caldari Cruiser" : shipName === "Augoror" ? "Amarr Cruiser" : "Gallente Cruiser";
  const repSkill = tank === "shield" ? "Shield Emission Systems" : "Remote Armor Repair Systems";
  return fit({
    id: `${shipName.toLowerCase()}-fleet-logistics`, shipName, name: `${shipName} entry fleet logistics`, effectiveness,
    summary: `A ${tank}-repair cruiser for an organized group. The fleet commander still decides ranges, cap chain, and exact resistances.`,
    loadout: [
      { slot: "High", items: [tank === "shield" ? "Medium Remote Shield Boosters" : "Medium Remote Armor Repairers", "capacitor transfers where the doctrine uses them"] },
      { slot: "Mid", items: ["propulsion", "capacitor support", tank === "shield" ? "shield tank" : "sensor and utility modules"] },
      { slot: "Low", items: [tank === "armor" ? "armor tank and capacitor modules" : "capacitor and fitting modules"] },
      { slot: "Rigs", items: ["Capacitor Control Circuits or doctrine-specific rigs"] },
    ],
    supplies: ["Nanite Repair Paste", "Light drones", "Cap Booster charges if the fit uses them"],
    skills: mergeSkills(coreCombat, tank === "shield" ? shieldTank : armorTank, [
      { name: hullSkill, required: 1, target: 4, area: "Hull" },
      { name: repSkill, required: 1, target: 4, area: "Utility" },
      { name: "Capacitor Emission Systems", required: shipName === "Augoror" ? 1 : 0, target: 4, area: "Utility" },
      { name: "Long Range Targeting", required: 3, target: 4, area: "Utility" },
      { name: "Signature Analysis", required: 3, target: 4, area: "Utility" },
    ]),
  });
}

export const SHIP_TASKS: ShipTask[] = [
  {
    id: "security-l1", role: "Combat", title: "Career agents and Level 1 missions", environment: "New-player high-sec PvE",
    description: "Cheap frigates for learning range, tank, ammunition, drones, and mission controls without risking meaningful ISK.",
    caution: "Use the civilian or basic modules the tutorial gives you until the controls make sense. Level 1 rewards do not justify expensive faction ammunition or a shiny hull.",
    fits: [kestrelMission, tristanMission, punisherMission],
  },
  {
    id: "security-l2", role: "Combat", title: "Level 2 security missions", environment: "Beginner high-sec PvE",
    description: "Cruiser missions that introduce sustained tanking and larger weapon systems while remaining inexpensive to replace.",
    caution: "A well-fit destroyer can complete many Level 2 missions, but a cruiser is the more forgiving beginner recommendation. Match resistance modules to the NPC damage type.",
    fits: [caracalMission, vexor, omenMission],
  },
  {
    id: "security-l3", role: "Combat", title: "Level 3 security missions", environment: "High-sec PvE",
    description: "Comfortable battlecruiser missions with enough range, tank, and application to handle mixed NPC sizes.",
    caution: "Match hardeners and damage type to the mission, read the trigger notes, and do not accept low-sec destinations by accident.",
    fits: [drake, myrmidon, harbinger],
  },
  {
    id: "security-l4", role: "Combat", title: "Level 4 security missions", environment: "High-sec advanced PvE",
    description: "Battleship missions where range control, sustained tank, capacitor, and damage application all matter.",
    caution: "A boardable battleship is not automatically Level-4 ready. Simulate the fit and start with an easier mission rather than an expensive hull stress test.",
    fits: [praxis, raven, apocalypse],
  },
  {
    id: "combat-sites", role: "Combat", title: "High-sec combat sites", environment: "Anomalies and signatures",
    description: "Mobile PvE fits for ordinary anomalies and escalations without committing a battleship.",
    caution: "Escalations and named DED sites vary sharply. Check the site before entering and do not assume every acceleration gate accepts the same hull size.",
    fits: [drake, caracal, vexor],
  },
  {
    id: "abyssal-t0-cruiser", role: "Combat", title: "T0 Abyss — solo cruiser", environment: "1 filament · most forgiving",
    description: "The easiest format to learn Tranquil rooms: one pilot, one cruiser, one filament, and the largest fitting budget.",
    caution: "There is no normal escape; complete all three rooms before twenty minutes or the ship and capsule are destroyed. Simulate the exact modules and weather before activation.",
    fits: [caracalAbyss, vexorAbyss, omenAbyss],
  },
  {
    id: "abyssal-t0-destroyer", role: "Combat", title: "T0 Abyss — destroyer", environment: "2 filaments · tighter solo run",
    description: "Use the two-destroyer entry format alone or with a second pilot. It costs two identical filaments and leaves less tank and fitting room.",
    caution: "Form a fleet before activation and carry two identical Tranquil filaments. A single destroyer may enter the opened trace, but this is less forgiving than the cruiser format.",
    fits: [dragoon, coraxAbyss, algosAbyss],
  },
  {
    id: "abyssal-t0-frigate", role: "Combat", title: "T0 Abyss — frigate", environment: "3 filaments · highest execution demand",
    description: "Use the three-frigate format alone or with friends. Cheap hulls and multiplied loot are balanced by tiny tanks and strict piloting demands.",
    caution: "Form a fleet and carry three identical Tranquil filaments. Solo frigate runs are possible, but they are not the beginner-safe option just because the hull is cheap.",
    fits: [kestrelAbyss, tristanAbyss, punisherAbyss],
  },
  {
    id: "highsec-mining", role: "Mining", title: "Casual high-sec ore mining", environment: "Asteroid belts and anomalies",
    description: "Low-attention ore harvesting with a clear choice between cheap entry, large ore hold, and defensive tank.",
    caution: "High security is not perfect safety. Stay aligned when practical, watch local and directional scan, and do not overvalue the cargo in a fragile barge.",
    fits: [venture, barge("Procurer", true), barge("Retriever", false)],
  },
  {
    id: "relic-data", role: "Exploration", title: "Relic and data exploration", environment: "Cosmic signatures",
    description: "Scan signatures, hack containers, and escape quickly in a cheap bonused frigate.",
    caution: "T1 exploration frigates cannot warp cloaked. Use safe spots, keep probes out only when needed, and assume other pilots may be hunting the site.",
    fits: [explorer("Heron", 91), explorer("Magnate", 89), explorer("Imicus", 88)],
  },
  {
    id: "highsec-hauling", role: "Hauling", title: "Routine high-sec hauling", environment: "Trade and distribution routes",
    description: "Move ordinary cargo without turning a cheap industrial into an obvious loot piñata.",
    caution: "Cargo value matters more than security color. Use manual warp for valuable loads, avoid autopilot, and split anything you cannot comfortably replace.",
    fits: [hauler("Badger", 88), hauler("Bestower", 87), hauler("Nereus", 86)],
  },
  {
    id: "fleet-logistics", role: "Fleet support", title: "Small-fleet logistics", environment: "Organized group support",
    description: "Keep other pilots alive with remote repairs and capacitor management instead of chasing personal damage.",
    caution: "Do not invent a solo logistics fit for a doctrine fleet. Ask the fleet commander whether the group needs shield or armor repairs and whether it uses a capacitor chain.",
    fits: [logistics("Osprey", "shield", 90), logistics("Augoror", "armor", 90), logistics("Exequror", "armor", 86)],
  },
];

export function recommendFits(task: ShipTask, catalog: ShipCatalogEntry[], trained: TrainedSkillView[], ownedShipNames: Set<string>): FitRecommendation[] {
  const levelsById = new Map(trained.map((skill) => [skill.skillId, skill.activeLevel]));
  const levelsByName = new Map(trained.map((skill) => [skill.name, skill.activeLevel]));
  const shipsByName = new Map(catalog.map((ship) => [ship.name, ship]));

  return task.fits.flatMap((template) => {
    const ship = shipsByName.get(template.shipName);
    if (!ship) return [];
    const boardingGaps = ship.requirements
      .map((requirement) => ({ ...requirement, current: levelsById.get(requirement.skillId) ?? 0 }))
      .filter((requirement) => requirement.current < requirement.level);
    const skillAssessments = template.skills.map((skill) => {
      const current = levelsByName.get(skill.name) ?? 0;
      return { ...skill, current, requiredMet: current >= skill.required, targetMet: current >= skill.target };
    });
    const requiredGaps = skillAssessments.filter((skill) => !skill.requiredMet);
    const targetGaps = skillAssessments.filter((skill) => !skill.targetMet);
    const coverage = skillAssessments.length
      ? skillAssessments.reduce((sum, skill) => sum + Math.min(1, skill.current / Math.max(1, skill.target)), 0) / skillAssessments.length
      : 0;
    const canBoard = boardingGaps.length === 0;
    const canUseTemplate = requiredGaps.length === 0;
    const status: FitRecommendation["status"] = !canBoard
      ? "Train hull first"
      : !canUseTemplate
        ? "Hull ready; fit blocked"
        : coverage >= 0.78
          ? "Ready for task"
          : "Usable; improve support";
    const owned = ownedShipNames.has(template.shipName);
    const sortScore = Number(canBoard) * 1000 + Number(canUseTemplate) * 400 + coverage * 100 + template.effectiveness + Number(owned) * 25;
    return [{
      ...template,
      ship,
      owned,
      canBoard,
      boardingGaps,
      canUseTemplate,
      skillAssessments,
      requiredGaps,
      targetGaps,
      targetsMet: skillAssessments.length - targetGaps.length,
      targetTotal: skillAssessments.length,
      coverage,
      status,
      sortScore,
    }];
  }).sort((left, right) => right.sortScore - left.sortScore || left.shipName.localeCompare(right.shipName));
}
