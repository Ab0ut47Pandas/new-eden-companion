import "server-only";

import { generateAdvice } from "@/lib/dashboard/advisor";
import type {
  AssetItemView,
  AssetLocationView,
  DashboardData,
  SkillQueueView,
} from "@/lib/dashboard/model";
import { esi, esiPaginated, resolveNames } from "@/lib/esi/client";
import type {
  EsiAsset,
  EsiBlueprint,
  EsiCharacter,
  EsiCloneData,
  EsiCharacterFleet,
  EsiContract,
  EsiFleetMember,
  EsiIndustryJob,
  EsiLocation,
  EsiLoyaltyPoints,
  EsiMarketPrice,
  EsiMiningEntry,
  EsiOnline,
  EsiOrder,
  EsiPortrait,
  EsiPlanetSummary,
  EsiFittingSummary,
  EsiShip,
  EsiSkillQueueItem,
  EsiSkills,
  EsiStructure,
  EsiSystem,
  EsiType,
  EsiWalletJournalEntry,
  EsiWalletTransaction,
} from "@/lib/esi/types";

interface BuildOptions {
  characterId: number;
  characterName: string;
  token: string;
}

interface CorporationResult {
  name: string;
}

interface StationResult {
  name: string;
}

function addDays(date: string, days: number): string {
  return new Date(new Date(date).getTime() + days * 86_400_000).toISOString();
}

function marketValue(asset: EsiAsset, prices: Map<number, number>): number {
  return Math.max(0, asset.quantity) * (prices.get(asset.type_id) ?? 0);
}

function rootLocation(asset: EsiAsset, assetsById: Map<number, EsiAsset>): { id: number; type: EsiAsset["location_type"] } {
  let current = asset;
  const visited = new Set<number>([asset.item_id]);
  while (assetsById.has(current.location_id) && !visited.has(current.location_id)) {
    visited.add(current.location_id);
    current = assetsById.get(current.location_id)!;
  }
  return { id: current.location_id, type: current.location_type };
}

export async function buildLiveDashboard(options: BuildOptions): Promise<DashboardData> {
  const { characterId, characterName, token } = options;
  const unavailable: string[] = [];
  async function read<T>(label: string, operation: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.warn(`ESI category unavailable: ${label}`, error);
      unavailable.push(label);
      return fallback;
    }
  }

  const emptySkills: EsiSkills = { skills: [], total_sp: 0 };
  const [character, portrait, location, ship, online, wallet, walletJournal, walletTransactions, assets, skills, queue, orders, jobs, contracts, blueprints, clones, implants, planets, fittings, loyalty, mining] =
    await Promise.all([
      read("character", () => esi<EsiCharacter>(`/characters/${characterId}`), {
        name: characterName,
        corporation_id: 0,
        birthday: "",
      }),
      read("portrait", () => esi<EsiPortrait>(`/characters/${characterId}/portrait`), {
        px128x128: `https://images.evetech.net/characters/${characterId}/portrait?size=128`,
        px256x256: `https://images.evetech.net/characters/${characterId}/portrait?size=256`,
      }),
      read("location", () => esi<EsiLocation>(`/characters/${characterId}/location`, { token }), {
        solar_system_id: 0,
      }),
      read("ship", () => esi<EsiShip>(`/characters/${characterId}/ship`, { token }), {
        ship_item_id: 0,
        ship_name: "Unknown ship",
        ship_type_id: 0,
      }),
      read("online status", () => esi<EsiOnline>(`/characters/${characterId}/online`, { token }), { online: false }),
      read("wallet", () => esi<number>(`/characters/${characterId}/wallet`, { token }), 0),
      read("wallet journal", () => esiPaginated<EsiWalletJournalEntry>(`/characters/${characterId}/wallet/journal`, token, 4), []),
      read("wallet transactions", () => esi<EsiWalletTransaction[]>(`/characters/${characterId}/wallet/transactions`, { token }), []),
      read("assets", () => esiPaginated<EsiAsset>(`/characters/${characterId}/assets`, token), []),
      read("skills", () => esi<EsiSkills>(`/characters/${characterId}/skills`, { token }), emptySkills),
      read("skill queue", () => esi<EsiSkillQueueItem[]>(`/characters/${characterId}/skillqueue`, { token }), []),
      read("market orders", () => esi<EsiOrder[]>(`/characters/${characterId}/orders`, { token }), []),
      read("industry jobs", () => esi<EsiIndustryJob[]>(`/characters/${characterId}/industry/jobs`, { token }), []),
      read("contracts", () => esiPaginated<EsiContract>(`/characters/${characterId}/contracts`, token, 10), []),
      read("blueprints", () => esiPaginated<EsiBlueprint>(`/characters/${characterId}/blueprints`, token, 20), []),
      read("clones", () => esi<EsiCloneData>(`/characters/${characterId}/clones`, { token }), { jump_clones: [] }),
      read("implants", () => esi<number[]>(`/characters/${characterId}/implants`, { token }), []),
      read("planetary colonies", () => esi<EsiPlanetSummary[]>(`/characters/${characterId}/planets`, { token }), []),
      read("fittings", () => esi<EsiFittingSummary[]>(`/characters/${characterId}/fittings`, { token }), []),
      read("loyalty points", () => esi<EsiLoyaltyPoints[]>(`/characters/${characterId}/loyalty/points`, { token }), []),
      read("mining ledger", () => esi<EsiMiningEntry[]>(`/characters/${characterId}/mining`, { token }), []),
    ]);

  let fleet: DashboardData["character"]["fleet"] = null;
  try {
    const fleetInfo = await esi<EsiCharacterFleet>(`/characters/${characterId}/fleet`, { token });
    const fleetMembers = await esi<EsiFleetMember[]>(`/fleets/${fleetInfo.fleet_id}/members`, { token });
    fleet = { memberCount: fleetMembers.length, role: fleetInfo.role };
  } catch {
    // Being out of fleet is normal, and missing fleet visibility should not become a dashboard error.
  }

  const [corporation, system, station, structure, shipType, marketPrices] = await Promise.all([
    character.corporation_id
      ? read("corporation", () => esi<CorporationResult>(`/corporations/${character.corporation_id}`), { name: "Unknown corporation" })
      : Promise.resolve({ name: "Unknown corporation" }),
    location.solar_system_id
      ? read("solar system", () => esi<EsiSystem>(`/universe/systems/${location.solar_system_id}`), { name: "Unknown system", security_status: 0, constellation_id: 0, position: { x: 0, y: 0, z: 0 } })
      : Promise.resolve({ name: "Unknown system", security_status: 0, constellation_id: 0, position: { x: 0, y: 0, z: 0 } }),
    location.station_id
      ? read("station", () => esi<StationResult>(`/universe/stations/${location.station_id}`), { name: `Station ${location.station_id}` })
      : Promise.resolve(null),
    location.structure_id
      ? read("structure", () => esi<EsiStructure>(`/universe/structures/${location.structure_id}`, { token }), {
          name: `Structure ${location.structure_id}`,
          solar_system_id: location.solar_system_id,
          type_id: 0,
        })
      : Promise.resolve(null),
    ship.ship_type_id
      ? read("ship type", () => esi<EsiType>(`/universe/types/${ship.ship_type_id}`), {
          name: "Unknown hull",
          description: "",
          group_id: 0,
        })
      : Promise.resolve({ name: "Unknown hull", description: "", group_id: 0 }),
    read("market prices", () => esi<EsiMarketPrice[]>("/markets/prices", { revalidate: 3_600 }), []),
  ]);

  const allTypeIds = [
    ...assets.map((asset) => asset.type_id),
    ...skills.skills.map((skill) => skill.skill_id),
    ...queue.map((item) => item.skill_id),
    ...orders.map((order) => order.type_id),
    ...walletTransactions.map((transaction) => transaction.type_id),
    ...jobs.flatMap((job) => [job.product_type_id, job.blueprint_type_id].filter((id): id is number => Boolean(id))),
  ];
  const typeNames = await read("item names", () => resolveNames(allTypeIds), new Map<number, string>());
  if (ship.ship_type_id) typeNames.set(ship.ship_type_id, shipType.name);

  const prices = new Map<number, number>();
  for (const price of marketPrices) {
    prices.set(price.type_id, price.average_price ?? price.adjusted_price ?? 0);
  }

  const assetsById = new Map(assets.map((asset) => [asset.item_id, asset]));
  const rootByItem = new Map<number, { id: number; type: EsiAsset["location_type"] }>();
  for (const asset of assets) rootByItem.set(asset.item_id, rootLocation(asset, assetsById));
  const resolvableLocationIds = [...new Set(
    [...rootByItem.values()]
      .filter((root) => root.type === "station" || root.type === "solar_system")
      .map((root) => root.id),
  )];
  const locationNames = await read("asset locations", () => resolveNames(resolvableLocationIds), new Map<number, string>());
  if (location.station_id && station) locationNames.set(location.station_id, station.name);
  if (location.structure_id && structure) locationNames.set(location.structure_id, structure.name);

  const labelLocation = (id: number): string =>
    locationNames.get(id) ??
    (id === location.structure_id ? structure?.name : undefined) ??
    (id > 1_000_000_000_000 ? `Private structure ${id}` : `Location ${id}`);

  const assetValue = assets.reduce((sum, asset) => sum + marketValue(asset, prices), 0);
  const grouped = new Map<number, { count: number; value: number }>();
  for (const asset of assets) {
    const root = rootByItem.get(asset.item_id)!;
    const current = grouped.get(root.id) ?? { count: 0, value: 0 };
    current.count += 1;
    current.value += marketValue(asset, prices);
    grouped.set(root.id, current);
  }
  const locations: AssetLocationView[] = [...grouped.entries()]
    .map(([id, group]) => ({
      id,
      name: labelLocation(id),
      itemCount: group.count,
      estimatedValue: group.value,
      share: assetValue > 0 ? group.value / assetValue : 0,
    }))
    .sort((a, b) => b.estimatedValue - a.estimatedValue);

  const topItems: AssetItemView[] = assets
    .map((asset) => {
      const root = rootByItem.get(asset.item_id)!;
      return {
        itemId: asset.item_id,
        typeId: asset.type_id,
        name: typeNames.get(asset.type_id) ?? `Type ${asset.type_id}`,
        quantity: asset.quantity,
        location: labelLocation(root.id),
        locationFlag: asset.location_flag,
        estimatedValue: marketValue(asset, prices),
      };
    })
    .sort((a, b) => b.estimatedValue - a.estimatedValue)
    .slice(0, 250);

  const shipContents = assets
    .filter((asset) => ship.ship_item_id > 0 && asset.location_id === ship.ship_item_id)
    .map((asset) => ({
      itemId: asset.item_id,
      typeId: asset.type_id,
      name: typeNames.get(asset.type_id) ?? `Type ${asset.type_id}`,
      quantity: asset.quantity,
      locationFlag: asset.location_flag,
      estimatedValue: marketValue(asset, prices),
    }))
    .sort((left, right) => left.locationFlag.localeCompare(right.locationFlag) || left.name.localeCompare(right.name));

  const trackedSupply = /(nanite repair paste|scanner probe|cap booster|script|filament|command burst charge|mining crystal)/i;
  const storedSupplies = assets
    .filter((asset) => asset.location_id !== ship.ship_item_id && trackedSupply.test(typeNames.get(asset.type_id) ?? ""))
    .map((asset) => {
      const root = rootByItem.get(asset.item_id)!;
      return {
        typeId: asset.type_id,
        name: typeNames.get(asset.type_id) ?? `Type ${asset.type_id}`,
        quantity: asset.quantity,
        location: labelLocation(root.id),
        locationFlag: asset.location_flag,
      };
    });

  const skillQueue: SkillQueueView[] = queue
    .sort((a, b) => a.queue_position - b.queue_position)
    .map((item, index) => ({
      skillId: item.skill_id,
      name: typeNames.get(item.skill_id) ?? `Skill ${item.skill_id}`,
      targetLevel: item.finished_level,
      finishDate: item.finish_date,
      active: index === 0 && Boolean(item.start_date),
    }));
  const trainedSkills = skills.skills
    .map((skill) => ({
      skillId: skill.skill_id,
      name: typeNames.get(skill.skill_id) ?? `Skill ${skill.skill_id}`,
      trainedLevel: skill.trained_skill_level,
      activeLevel: skill.active_skill_level,
      skillpoints: skill.skillpoints_in_skill,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  const orderViews: DashboardData["activity"]["orders"] = orders
    .map((order) => ({
      id: order.order_id,
      item: typeNames.get(order.type_id) ?? `Type ${order.type_id}`,
      side: order.is_buy_order ? ("Buy" as const) : ("Sell" as const),
      price: order.price,
      remaining: order.volume_remain,
      total: order.volume_total,
      expiresAt: addDays(order.issued, order.duration),
    }))
    .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());

  const jobViews: DashboardData["activity"]["jobs"] = jobs
    .map((job) => ({
      id: job.job_id,
      item: typeNames.get(job.product_type_id ?? job.blueprint_type_id) ?? `Type ${job.product_type_id ?? job.blueprint_type_id}`,
      status: job.status,
      runs: job.runs,
      endDate: job.end_date,
    }))
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  const activeContracts = contracts.filter((contract) => ["outstanding", "in_progress"].includes(contract.status));
  const attentionContracts = contracts.filter((contract) => ["rejected", "failed", "reversed"].includes(contract.status));
  const exactLocation = structure?.name ?? station?.name ?? system.name;

  const dashboard: DashboardData = {
    mode: "live",
    fetchedAt: new Date().toISOString(),
    character: {
      id: characterId,
      name: character.name || characterName,
      portrait: portrait.px256x256,
      corporation: corporation.name,
      securityStatus: character.security_status ?? 0,
      online: online.online,
      location: exactLocation,
      solarSystemId: location.solar_system_id,
      solarSystem: system.name,
      systemSecurity: system.security_status,
      systemPosition: system.position,
      shipName: ship.ship_name,
      shipType: shipType.name,
      shipGroupId: shipType.group_id,
      shipItemId: ship.ship_item_id,
      docked: Boolean(location.station_id || location.structure_id),
      shipInventoryReadable: !unavailable.includes("assets") && ship.ship_item_id > 0,
      shipContents,
      storedSupplies,
      fleet,
    },
    summary: {
      wallet,
      assetValue,
      netWorth: wallet + assetValue,
      totalSkillPoints: skills.total_sp,
      activeOrders: orders.length,
      activeJobs: jobs.filter((job) => ["active", "paused", "ready"].includes(job.status)).length,
    },
    assets: {
      itemCount: assets.length,
      uniqueTypes: new Set(assets.map((asset) => asset.type_id)).size,
      estimatedValue: assetValue,
      locations,
      topItems,
      truncated: assets.length >= 50_000,
    },
    skills: {
      totalSp: skills.total_sp,
      unallocatedSp: skills.unallocated_sp ?? 0,
      trainedSkills: skills.skills.length,
      trained: trainedSkills,
      queue: skillQueue,
    },
    activity: {
      orders: orderViews,
      jobs: jobViews,
      walletEntries: walletJournal
        .map((entry) => ({
          id: entry.id,
          amount: entry.amount ?? 0,
          balance: entry.balance,
          date: entry.date,
          description: entry.description,
          type: entry.ref_type,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 50),
      contracts: { active: activeContracts.length, attention: attentionContracts.length },
      blueprints: blueprints.length,
      jumpClones: clones.jump_clones.length,
      implants: implants.length,
      colonies: planets.length,
      fittings: fittings.length,
      loyaltyPrograms: loyalty.length,
      miningRecords: mining.length,
    },
    advice: [],
    dataQuality: {
      unavailable: [...new Set(unavailable)],
      valuationNote: "Asset values are estimates from ESI average or adjusted prices. Fitted, rare, blueprint, and structure values can differ materially.",
    },
  };
  dashboard.advice = generateAdvice({
    wallet,
    assetValue,
    queue: skillQueue,
    location: exactLocation,
    systemSecurity: system.security_status,
    shipType: shipType.name,
    online: online.online,
    orders: orderViews,
    jobs: jobViews,
    locations,
    unavailable: dashboard.dataQuality.unavailable,
  });
  return dashboard;
}
