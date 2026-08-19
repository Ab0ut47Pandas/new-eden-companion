import type { AssetCleanupDecision } from "@/lib/economy/asset-cleanup";

export type AdvicePriority = "now" | "next" | "watch";

export interface AdviceCard {
  id: string;
  priority: AdvicePriority;
  title: string;
  summary: string;
  evidence: string;
  action: string;
}

export interface AssetItemView {
  itemId: number;
  typeId: number;
  name: string;
  quantity: number;
  location: string;
  locationFlag: string;
  estimatedValue: number;
}

export interface AssetLocationView {
  id: number;
  name: string;
  itemCount: number;
  estimatedValue: number;
  share: number;
}

export interface SkillQueueView {
  skillId: number;
  name: string;
  targetLevel: number;
  finishDate?: string;
  active: boolean;
}

export interface TrainedSkillView {
  skillId: number;
  name: string;
  trainedLevel: number;
  activeLevel: number;
  skillpoints: number;
}

export interface ActiveShipItemView {
  itemId: number;
  typeId: number;
  name: string;
  quantity: number;
  locationFlag: string;
  estimatedValue: number;
}

export interface StoredSupplyView {
  typeId: number;
  name: string;
  quantity: number;
  location: string;
  locationFlag: string;
}

export interface DashboardData {
  mode: "live" | "demo";
  fetchedAt: string;
  character: {
    id: number;
    name: string;
    portrait: string;
    corporation: string;
    securityStatus: number;
    online: boolean;
    location: string;
    solarSystemId: number;
    solarSystem: string;
    systemSecurity: number;
    systemPosition: { x: number; y: number; z: number };
    shipName: string;
    shipType: string;
    shipGroupId: number;
    shipItemId: number;
    docked: boolean;
    shipInventoryReadable: boolean;
    shipContents: ActiveShipItemView[];
    storedSupplies: StoredSupplyView[];
    fleet: {
      memberCount: number;
      role: string;
    } | null;
  };
  summary: {
    wallet: number;
    assetValue: number;
    netWorth: number;
    totalSkillPoints: number;
    activeOrders: number;
    activeJobs: number;
  };
  assets: {
    itemCount: number;
    uniqueTypes: number;
    estimatedValue: number;
    locations: AssetLocationView[];
    topItems: AssetItemView[];
    cleanup: AssetCleanupDecision[];
    truncated: boolean;
  };
  skills: {
    totalSp: number;
    unallocatedSp: number;
    trainedSkills: number;
    trained: TrainedSkillView[];
    queue: SkillQueueView[];
  };
  activity: {
    orders: Array<{
      id: number;
      item: string;
      side: "Buy" | "Sell";
      price: number;
      remaining: number;
      total: number;
      expiresAt: string;
    }>;
    jobs: Array<{
      id: number;
      item: string;
      status: string;
      runs: number;
      endDate: string;
    }>;
    walletEntries: Array<{
      id: number;
      amount: number;
      balance?: number;
      date: string;
      description: string;
      type: string;
    }>;
    contracts: { active: number; attention: number };
    blueprints: number;
    jumpClones: number;
    implants: number;
    colonies: number;
    fittings: number;
    loyaltyPrograms: number;
    miningRecords: number;
  };
  advice: AdviceCard[];
  dataQuality: {
    unavailable: string[];
    valuationNote: string;
  };
}
