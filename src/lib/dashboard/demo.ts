import { generateAdvice } from "@/lib/dashboard/advisor";
import type { DashboardData } from "@/lib/dashboard/model";

export function demoDashboard(): DashboardData {
  const queue = [
    {
      skillId: 3436,
      name: "Drones V",
      targetLevel: 5,
      finishDate: new Date(Date.now() + 17 * 60 * 60 * 1_000).toISOString(),
      active: true,
    },
    {
      skillId: 12484,
      name: "Amarr Cruiser IV",
      targetLevel: 4,
      finishDate: new Date(Date.now() + 3.6 * 86_400_000).toISOString(),
      active: false,
    },
    {
      skillId: 16591,
      name: "Heavy Assault Cruisers I",
      targetLevel: 1,
      finishDate: new Date(Date.now() + 4.1 * 86_400_000).toISOString(),
      active: false,
    },
  ];
  const locations = [
    { id: 60003760, name: "Jita IV - Moon 4", itemCount: 184, estimatedValue: 2_890_000_000, share: 0.74 },
    { id: 60008494, name: "Amarr VIII (Oris)", itemCount: 57, estimatedValue: 712_000_000, share: 0.18 },
    { id: 1028858195912, name: "Quiet Forge", itemCount: 31, estimatedValue: 311_000_000, share: 0.08 },
  ];
  const orders = [
    {
      id: 9981,
      item: "Heavy Assault Missile Launcher II",
      side: "Sell" as const,
      price: 1_784_000,
      remaining: 14,
      total: 28,
      expiresAt: new Date(Date.now() + 1.8 * 86_400_000).toISOString(),
    },
    {
      id: 9982,
      item: "Scourge Rage Heavy Assault Missile",
      side: "Buy" as const,
      price: 711,
      remaining: 81_450,
      total: 100_000,
      expiresAt: new Date(Date.now() + 18 * 86_400_000).toISOString(),
    },
  ];
  const jobs = [
    {
      id: 8871,
      item: "Scourge Fury Heavy Missile",
      status: "active",
      runs: 10,
      endDate: new Date(Date.now() + 9 * 60 * 60 * 1_000).toISOString(),
    },
  ];
  const base: DashboardData = {
    mode: "demo",
    fetchedAt: new Date().toISOString(),
    character: {
      id: 2112345678,
      name: "Astra Veyr",
      portrait: "https://images.evetech.net/characters/2112345678/portrait?size=256",
      corporation: "Signal Cartel",
      securityStatus: 1.8,
      online: true,
      location: "Jita IV - Moon 4 - Caldari Navy Assembly Plant",
      solarSystemId: 30000142,
      solarSystem: "Jita",
      systemSecurity: 0.9,
      systemPosition: { x: -129064861735000000, y: 60755306910000000, z: 117469227060000000 },
      shipName: "Second Thoughts",
      shipType: "Cerberus",
      shipGroupId: 358,
      shipItemId: 90000001,
      docked: true,
      shipInventoryReadable: true,
      fleet: null,
      storedSupplies: [
        { typeId: 28668, name: "Nanite Repair Paste", quantity: 500, location: "Jita IV - Moon 4", locationFlag: "Hangar" },
      ],
      shipContents: [
        { itemId: 101, typeId: 3242, name: "Heavy Assault Missile Launcher II", quantity: 5, locationFlag: "HiSlot0", estimatedValue: 9_200_000 },
        { itemId: 102, typeId: 5975, name: "10MN Afterburner II", quantity: 1, locationFlag: "MedSlot0", estimatedValue: 1_350_000 },
        { itemId: 103, typeId: 2281, name: "Adaptive Invulnerability Shield Hardener II", quantity: 1, locationFlag: "MedSlot1", estimatedValue: 2_100_000 },
        { itemId: 104, typeId: 3831, name: "Medium Shield Booster II", quantity: 1, locationFlag: "MedSlot2", estimatedValue: 1_900_000 },
        { itemId: 105, typeId: 27441, name: "Caldari Navy Scourge Heavy Assault Missile", quantity: 2600, locationFlag: "Cargo", estimatedValue: 2_470_000 },
        { itemId: 106, typeId: 28668, name: "Nanite Repair Paste", quantity: 120, locationFlag: "Cargo", estimatedValue: 3_840_000 },
        { itemId: 107, typeId: 2488, name: "Warrior II", quantity: 5, locationFlag: "DroneBay", estimatedValue: 1_150_000 },
      ],
    },
    summary: {
      wallet: 348_600_000,
      assetValue: 3_913_000_000,
      netWorth: 4_261_600_000,
      totalSkillPoints: 42_781_430,
      activeOrders: orders.length,
      activeJobs: jobs.length,
    },
    assets: {
      itemCount: 272,
      uniqueTypes: 96,
      estimatedValue: 3_913_000_000,
      locations,
      truncated: false,
      topItems: [
        { itemId: 1, typeId: 29990, name: "Loki", quantity: 1, location: locations[0].name, locationFlag: "Hangar", estimatedValue: 612_000_000 },
        { itemId: 2, typeId: 28659, name: "Paladin", quantity: 1, location: locations[1].name, locationFlag: "Hangar", estimatedValue: 1_338_000_000 },
        { itemId: 3, typeId: 44996, name: "PLEX", quantity: 500, location: locations[0].name, locationFlag: "AssetSafety", estimatedValue: 1_245_000_000 },
        { itemId: 4, typeId: 11995, name: "Scimitar", quantity: 1, location: locations[0].name, locationFlag: "Hangar", estimatedValue: 267_000_000 },
        { itemId: 5, typeId: 33474, name: "Mobile Tractor Unit", quantity: 6, location: locations[2].name, locationFlag: "Hangar", estimatedValue: 61_800_000 },
      ].sort((a, b) => b.estimatedValue - a.estimatedValue),
    },
    skills: {
      totalSp: 42_781_430,
      unallocatedSp: 150_000,
      trainedSkills: 173,
      trained: [
        { skillId: 3300, name: "Caldari Battlecruiser", trainedLevel: 3, activeLevel: 3, skillpoints: 48_000 },
        { skillId: 3324, name: "Heavy Missiles", trainedLevel: 5, activeLevel: 5, skillpoints: 768_000 },
        { skillId: 20211, name: "Heavy Missile Specialization", trainedLevel: 2, activeLevel: 2, skillpoints: 7_071 },
        { skillId: 21071, name: "Rapid Launch", trainedLevel: 3, activeLevel: 3, skillpoints: 16_000 },
      ],
      queue,
    },
    activity: {
      orders,
      jobs,
      walletEntries: [
        { id: 401, amount: 58_420_000, balance: 348_600_000, date: new Date(Date.now() - 2.2 * 3_600_000).toISOString(), description: "Market transaction", type: "market_transaction" },
        { id: 402, amount: -12_640_000, balance: 290_180_000, date: new Date(Date.now() - 7.5 * 3_600_000).toISOString(), description: "Broker fee", type: "brokers_fee" },
        { id: 403, amount: 24_100_000, balance: 302_820_000, date: new Date(Date.now() - 31 * 3_600_000).toISOString(), description: "Bounty prizes", type: "bounty_prizes" },
      ],
      contracts: { active: 2, attention: 1 },
      blueprints: 47,
      jumpClones: 3,
      implants: 5,
      colonies: 4,
      fittings: 19,
      loyaltyPrograms: 3,
      miningRecords: 26,
    },
    advice: [],
    dataQuality: {
      unavailable: [],
      valuationNote: "Demo values use fictional ESI-style market averages and are not live quotes.",
    },
  };
  base.advice = generateAdvice({
    wallet: base.summary.wallet,
    assetValue: base.summary.assetValue,
    queue,
    location: base.character.location,
    systemSecurity: base.character.systemSecurity,
    shipType: base.character.shipType,
    online: base.character.online,
    orders,
    jobs,
    locations,
    unavailable: [],
  });
  return base;
}
