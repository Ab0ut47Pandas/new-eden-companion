export interface PlanetColonySummary {
  last_update: string;
  num_pins: number;
  owner_id: number;
  planet_id: number;
  planet_type: string;
  solar_system_id: number;
  upgrade_level: number;
}

export interface PlanetColonyPin {
  pin_id: number;
  type_id: number;
  latitude: number;
  longitude: number;
  contents?: Array<{
    amount: number;
    type_id: number;
  }>;
  expiry_time?: string;
  extractor_details?: {
    cycle_time: number;
    head_radius: number;
    heads: Array<{
      head_id: number;
      latitude: number;
      longitude: number;
    }>;
    product_type_id: number;
    qty_per_cycle: number;
  };
  factory_details?: {
    schematic_id: number;
  };
  install_time?: string;
  last_cycle_start?: string;
}

export interface PlanetColonyRoute {
  content_type_id: number;
  destination_pin_id: number;
  quantity: number;
  route_id: number;
  source_pin_id: number;
  waypoints?: number[];
}

export interface PlanetColonyDetail {
  links: Array<{
    destination_pin_id: number;
    link_level: number;
    source_pin_id: number;
  }>;
  pins: PlanetColonyPin[];
  routes: PlanetColonyRoute[];
}

export type ColonyAttentionSeverity = "ok" | "info" | "warning" | "unknown";
export type ColonyAttentionCategory = "extractor" | "factory" | "storage" | "snapshot";

export interface ColonyAttention {
  category: ColonyAttentionCategory;
  severity: ColonyAttentionSeverity;
  pinId: number | null;
  title: string;
  detail: string;
}

export interface ColonyReadiness {
  planetId: number;
  solarSystemId: number;
  planetType: string;
  lastUpdate: string;
  pinCount: number;
  routeCount: number;
  linkCount: number;
  extractorCount: number;
  factoryCount: number;
  contentPinCount: number;
  status: "ok" | "attention" | "unknown";
  attention: ColonyAttention[];
}

const EXPIRING_SOON_MS = 6 * 60 * 60 * 1000;

function timeRemainingLabel(milliseconds: number): string {
  if (milliseconds <= 0) return "expired";
  const minutes = Math.ceil(milliseconds / 60_000);
  if (minutes < 60) return `${minutes} min remaining`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return `${hours} hr remaining`;
  return `${Math.ceil(hours / 24)} days remaining`;
}

function validTime(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function assessPlanetColony(
  summary: PlanetColonySummary,
  detail: PlanetColonyDetail | null,
  now = new Date(),
): ColonyReadiness {
  if (!detail) {
    return {
      planetId: summary.planet_id,
      solarSystemId: summary.solar_system_id,
      planetType: summary.planet_type,
      lastUpdate: summary.last_update,
      pinCount: summary.num_pins,
      routeCount: 0,
      linkCount: 0,
      extractorCount: 0,
      factoryCount: 0,
      contentPinCount: 0,
      status: "unknown",
      attention: [{
        category: "snapshot",
        severity: "unknown",
        pinId: null,
        title: "Colony detail unavailable",
        detail: "NEC can see the colony summary but could not read its pins and routes. Reconnect EVE permissions or retry before treating this colony as assessed.",
      }],
    };
  }

  const attention: ColonyAttention[] = [];
  const incomingRoutes = new Map<number, PlanetColonyRoute[]>();
  const outgoingRoutes = new Map<number, PlanetColonyRoute[]>();
  for (const route of detail.routes) {
    incomingRoutes.set(route.destination_pin_id, [...(incomingRoutes.get(route.destination_pin_id) ?? []), route]);
    outgoingRoutes.set(route.source_pin_id, [...(outgoingRoutes.get(route.source_pin_id) ?? []), route]);
  }

  const extractors = detail.pins.filter((pin) => pin.extractor_details !== undefined);
  const factories = detail.pins.filter((pin) => pin.factory_details !== undefined);
  const contentPins = detail.pins.filter((pin) => (pin.contents?.length ?? 0) > 0);
  const nowMs = now.getTime();

  for (const pin of extractors) {
    const expiry = validTime(pin.expiry_time);
    if (expiry === null) {
      attention.push({
        category: "extractor",
        severity: "unknown",
        pinId: pin.pin_id,
        title: "Extractor expiry unknown",
        detail: "ESI did not provide a usable expiry time for this extractor. NEC will not guess whether its program is active.",
      });
      continue;
    }
    const remaining = expiry - nowMs;
    if (remaining <= 0) {
      attention.push({
        category: "extractor",
        severity: "warning",
        pinId: pin.pin_id,
        title: "Extractor program expired",
        detail: `The ESI snapshot reports this extractor program expired at ${pin.expiry_time}. Restarting or changing it still has to be done in EVE.`,
      });
    } else if (remaining <= EXPIRING_SOON_MS) {
      attention.push({
        category: "extractor",
        severity: "warning",
        pinId: pin.pin_id,
        title: "Extractor expires soon",
        detail: `${timeRemainingLabel(remaining)}. Six hours is an NEC attention threshold, not an EVE failure rule.`,
      });
    } else {
      attention.push({
        category: "extractor",
        severity: "ok",
        pinId: pin.pin_id,
        title: "Extractor program has time remaining",
        detail: timeRemainingLabel(remaining),
      });
    }
  }

  for (const pin of factories) {
    const incoming = incomingRoutes.get(pin.pin_id) ?? [];
    if (incoming.length === 0) {
      attention.push({
        category: "factory",
        severity: "warning",
        pinId: pin.pin_id,
        title: "Factory has no visible inbound route",
        detail: "No ESI route currently targets this factory. NEC flags the missing route for review, but does not claim the factory is actively starved.",
      });
    } else if ((pin.contents?.length ?? 0) === 0) {
      attention.push({
        category: "factory",
        severity: "unknown",
        pinId: pin.pin_id,
        title: "Factory supply cannot be proven",
        detail: `${incoming.length} inbound route${incoming.length === 1 ? " is" : "s are"} visible, but the snapshot does not prove future input availability or continuous production.`,
      });
    }
  }

  for (const pin of contentPins) {
    if ((outgoingRoutes.get(pin.pin_id)?.length ?? 0) > 0) continue;
    attention.push({
      category: "storage",
      severity: "info",
      pinId: pin.pin_id,
      title: "Stored material has no visible outgoing route",
      detail: "This pin contains material in the ESI snapshot but has no outgoing route. Review whether that is intentional; NEC is not inferring storage capacity or fullness.",
    });
  }

  if (attention.length === 0) {
    attention.push({
      category: "snapshot",
      severity: "info",
      pinId: null,
      title: "No obvious colony attention found",
      detail: "Pins and routes were readable, but ESI is still a snapshot. NEC cannot see the in-game resource heatmap or live player attention.",
    });
  }

  const hasWarning = attention.some((item) => item.severity === "warning");
  const hasUnknown = attention.some((item) => item.severity === "unknown");
  return {
    planetId: summary.planet_id,
    solarSystemId: summary.solar_system_id,
    planetType: summary.planet_type,
    lastUpdate: summary.last_update,
    pinCount: detail.pins.length,
    routeCount: detail.routes.length,
    linkCount: detail.links.length,
    extractorCount: extractors.length,
    factoryCount: factories.length,
    contentPinCount: contentPins.length,
    status: hasWarning ? "attention" : hasUnknown ? "unknown" : "ok",
    attention,
  };
}
