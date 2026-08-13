export interface OpportunityType {
  id: number;
  name: string;
  volume: number;
}

export const TRADE_TYPES: OpportunityType[] = [
  { id: 34, name: "Tritanium", volume: 0.01 },
  { id: 35, name: "Pyerite", volume: 0.01 },
  { id: 36, name: "Mexallon", volume: 0.01 },
  { id: 37, name: "Isogen", volume: 0.01 },
  { id: 38, name: "Nocxium", volume: 0.01 },
  { id: 39, name: "Zydrine", volume: 0.01 },
  { id: 40, name: "Megacyte", volume: 0.01 },
  { id: 11399, name: "Morphite", volume: 0.01 },
  { id: 3828, name: "Construction Blocks", volume: 0.75 },
  { id: 9832, name: "Coolant", volume: 0.75 },
  { id: 44, name: "Enriched Uranium", volume: 0.75 },
  { id: 3689, name: "Mechanical Parts", volume: 0.75 },
  { id: 9848, name: "Robotics", volume: 3 },
  { id: 28668, name: "Nanite Repair Paste", volume: 0.01 },
  { id: 40520, name: "Large Skill Injector", volume: 0.01 },
  { id: 40519, name: "Skill Extractor", volume: 0.01 },
  { id: 4247, name: "Helium Fuel Block", volume: 5 },
  { id: 4246, name: "Hydrogen Fuel Block", volume: 5 },
  { id: 4051, name: "Nitrogen Fuel Block", volume: 5 },
  { id: 4312, name: "Oxygen Fuel Block", volume: 5 },
];

export const ORE_TYPES: OpportunityType[] = [
  { id: 1230, name: "Veldspar", volume: 0.1 },
  { id: 1228, name: "Scordite", volume: 0.15 },
  { id: 1224, name: "Pyroxeres", volume: 0.3 },
  { id: 18, name: "Plagioclase", volume: 0.35 },
  { id: 1227, name: "Omber", volume: 0.6 },
  { id: 20, name: "Kernite", volume: 1.2 },
  { id: 1226, name: "Jaspet", volume: 2 },
  { id: 1231, name: "Hemorphite", volume: 3 },
  { id: 21, name: "Hedbergite", volume: 3 },
  { id: 1229, name: "Gneiss", volume: 5 },
  { id: 1232, name: "Dark Ochre", volume: 8 },
  { id: 19, name: "Spodumain", volume: 16 },
  { id: 1225, name: "Crokite", volume: 16 },
  { id: 1223, name: "Bistot", volume: 16 },
  { id: 22, name: "Arkonor", volume: 16 },
  { id: 11396, name: "Mercoxit", volume: 40 },
];

