export interface EsiCharacter {
  name: string;
  corporation_id: number;
  alliance_id?: number;
  birthday: string;
  security_status?: number;
}

export interface EsiPortrait {
  px128x128: string;
  px256x256: string;
}

export interface EsiNamedEntity {
  id: number;
  name: string;
  category?: string;
}

export interface EsiLocation {
  solar_system_id: number;
  station_id?: number;
  structure_id?: number;
}

export interface EsiShip {
  ship_item_id: number;
  ship_name: string;
  ship_type_id: number;
}

export interface EsiCharacterFleet {
  fleet_id: number;
  role: string;
  squad_id: number;
  wing_id: number;
}

export interface EsiFleetMember {
  character_id: number;
  join_time: string;
  role: string;
  role_name: string;
  ship_type_id: number;
  solar_system_id: number;
  squad_id: number;
  station_id?: number;
  takes_fleet_warp: boolean;
  wing_id: number;
}

export interface EsiOnline {
  online: boolean;
  last_login?: string;
  last_logout?: string;
  logins?: number;
}

export interface EsiAsset {
  is_blueprint_copy?: boolean;
  is_singleton: boolean;
  item_id: number;
  location_flag: string;
  location_id: number;
  location_type: "station" | "solar_system" | "item" | "other";
  quantity: number;
  type_id: number;
}

export interface EsiMarketPrice {
  adjusted_price?: number;
  average_price?: number;
  type_id: number;
}

export interface EsiType {
  name: string;
  description: string;
  group_id: number;
  market_group_id?: number;
  packaged_volume?: number;
  volume?: number;
}

export interface EsiSystem {
  name: string;
  security_status: number;
  constellation_id: number;
  position: { x: number; y: number; z: number };
}

export interface EsiStructure {
  name: string;
  solar_system_id: number;
  type_id: number;
}

export interface EsiSkills {
  skills: Array<{
    active_skill_level: number;
    skill_id: number;
    skillpoints_in_skill: number;
    trained_skill_level: number;
  }>;
  total_sp: number;
  unallocated_sp?: number;
}

export interface EsiSkillQueueItem {
  finish_date?: string;
  finished_level: number;
  level_end_sp?: number;
  level_start_sp?: number;
  queue_position: number;
  skill_id: number;
  start_date?: string;
  training_start_sp?: number;
}

export interface EsiOrder {
  duration: number;
  escrow?: number;
  is_buy_order?: boolean;
  issued: string;
  location_id: number;
  min_volume: number;
  order_id: number;
  price: number;
  range: string;
  region_id: number;
  system_id: number;
  type_id: number;
  volume_remain: number;
  volume_total: number;
}

export interface EsiIndustryJob {
  activity_id: number;
  blueprint_type_id: number;
  end_date: string;
  job_id: number;
  product_type_id?: number;
  runs: number;
  start_date: string;
  status: string;
}

export interface EsiContract {
  contract_id: number;
  date_expired: string;
  date_issued: string;
  issuer_id: number;
  price?: number;
  reward?: number;
  status: string;
  title?: string;
  type: string;
}

export interface EsiBlueprint {
  item_id: number;
  location_flag: string;
  location_id: number;
  material_efficiency: number;
  quantity: number;
  runs: number;
  time_efficiency: number;
  type_id: number;
}

export interface EsiWalletJournalEntry {
  amount?: number;
  balance?: number;
  date: string;
  description: string;
  id: number;
  ref_type: string;
}

export interface EsiWalletTransaction {
  client_id: number;
  date: string;
  is_buy: boolean;
  journal_ref_id: number;
  quantity: number;
  transaction_id: number;
  type_id: number;
  unit_price: number;
}

export interface EsiPlanetSummary {
  last_update: string;
  num_pins: number;
  owner_id: number;
  planet_id: number;
  planet_type: string;
  solar_system_id: number;
  upgrade_level: number;
}

export interface EsiFittingSummary {
  description: string;
  fitting_id: number;
  name: string;
  ship_type_id: number;
}

export interface EsiLoyaltyPoints {
  corporation_id: number;
  loyalty_points: number;
}

export interface EsiMiningEntry {
  date: string;
  quantity: number;
  solar_system_id: number;
  type_id: number;
}

export interface EsiCloneData {
  home_location?: { location_id: number; location_type: string };
  jump_clones: Array<{
    clone_id: number;
    implants: number[];
    location_id: number;
    location_type: string;
    name?: string;
  }>;
  last_clone_jump_date?: string;
}
