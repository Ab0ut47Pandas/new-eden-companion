#!/usr/bin/env node

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const ESI_BASE = "https://esi.evetech.net";
const TOKEN_URL = "https://login.eveonline.com/v2/oauth/token";
const compatibilityDate = process.env.ESI_COMPATIBILITY_DATE?.trim() || "2026-08-12";
const userAgent = `NewEdenCompanion/0.1 (${process.env.ESI_CONTACT?.trim() || "local-user"})`;
const command = process.argv[2]?.toLowerCase() || "help";
const args = process.argv.slice(3);

function output(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

class BridgeFailure extends Error {
  constructor(message, details = undefined, exitCode = 1) {
    super(message);
    this.details = details;
    this.exitCode = exitCode;
  }
}

function fatal(message, details = undefined, exitCode = 1) {
  output({ ok: false, error: message, ...(details ? { details } : {}) });
  process.exit(exitCode);
}

function fail(message, details = undefined, exitCode = 1) {
  throw new BridgeFailure(message, details, exitCode);
}

function help() {
  output({
    ok: true,
    purpose: "Local command bridge for the EVE companion.",
    commands: {
      status: "Current character location, ship, wallet, and online state.",
      'find "query"': "Find matching items across the character's personal assets.",
      'search "query"': "Search EVE systems, stations, structures, characters, corporations, and item types.",
      "waypoint <destination_id> --confirm <destination_id> [--replace] [--beginning]": "Set an EVE client waypoint. Confirmation is mandatory; --replace clears the existing route.",
      "market <type_id>": "Open an item type in the EVE market window.",
      "info <target_id>": "Open an EVE information window.",
      "contract <contract_id>": "Open an EVE contract window.",
      "get <ESI path> [--query key=value]": "Call any authenticated read endpoint without exposing the token.",
      "write <POST|PUT|DELETE> <ESI path> --confirm-write <METHOD:path> [--query key=value] [--body JSON]": "Call any authenticated ESI write endpoint with an exact confirmation guard.",
    },
  });
}

if (["help", "--help", "-h"].includes(command)) {
  help();
  process.exit(0);
}

const authSecret = process.env.AUTH_SECRET?.trim() || "";
const clientId = process.env.EVE_CLIENT_ID?.trim() || "";
if (authSecret.length < 32) fatal("AUTH_SECRET is missing or too short. Configure .env.local first.");
if (!clientId) fatal("EVE_CLIENT_ID is missing. Save the EVE application and configure .env.local first.");

const databasePath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), "data", "eve-companion.db");
if (!existsSync(databasePath)) {
  fatal("No local EVE session exists. Start the dashboard and connect your character first.");
}
mkdirSync(path.dirname(databasePath), { recursive: true });
const database = new DatabaseSync(databasePath);

function encryptionKey() {
  return createHash("sha256").update(authSecret).digest();
}

function encrypt(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

function decrypt(value) {
  const [ivPart, tagPart, encryptedPart] = value.split(".");
  if (!ivPart || !tagPart || !encryptedPart) throw new Error("Invalid encrypted token bundle");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function latestSession() {
  let row;
  try {
    row = database.prepare("SELECT * FROM sessions ORDER BY updated_at DESC LIMIT 1").get();
  } catch {
    fatal("The local session database is not initialized. Connect a character in the dashboard first.");
  }
  if (!row) fatal("No connected EVE character was found. Connect one in the dashboard first.");
  try {
    return {
      id: row.id,
      characterId: Number(row.character_id),
      characterName: String(row.character_name),
      scopes: JSON.parse(String(row.scopes_json)),
      tokens: JSON.parse(decrypt(String(row.token_bundle))),
      updatedAt: Number(row.updated_at),
    };
  } catch {
    fatal("The latest EVE session cannot be decrypted. Reconnect after confirming AUTH_SECRET.");
  }
}

const session = latestSession();

function tokenScopes(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return Array.isArray(payload.scp) ? payload.scp.map(String) : [];
  } catch {
    return [];
  }
}

async function accessToken() {
  if (session.tokens.expiresAt > Date.now() + 60_000) return session.tokens.accessToken;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: session.tokens.refreshToken,
      client_id: clientId,
    }),
  });
  if (!response.ok) fail("EVE SSO token refresh failed. Reconnect the character in the dashboard.", { status: response.status });
  const refreshed = await response.json();
  session.tokens = {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || session.tokens.refreshToken,
    expiresAt: Date.now() + Number(refreshed.expires_in) * 1_000,
  };
  session.scopes = tokenScopes(refreshed.access_token);
  session.updatedAt = Date.now();
  database.prepare("UPDATE sessions SET scopes_json = ?, token_bundle = ?, updated_at = ? WHERE id = ?").run(
    JSON.stringify(session.scopes),
    encrypt(JSON.stringify(session.tokens)),
    session.updatedAt,
    session.id,
  );
  return session.tokens.accessToken;
}

function assertScope(scope) {
  const scopes = tokenScopes(session.tokens.accessToken);
  if (!scopes.includes(scope)) {
    fail(`The connected character token does not include ${scope}. Reconnect the character after enabling that scope in the EVE application.`);
  }
}

function appendQuery(url, query = {}) {
  for (const [name, raw] of Object.entries(query)) {
    if (raw === undefined) continue;
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) url.searchParams.append(name, String(value));
  }
}

async function esiResponse(route, { method = "GET", body, query, authenticated = false, allowFailure = false } = {}) {
  const url = new URL(route, ESI_BASE);
  appendQuery(url, query);
  const headers = new Headers({
    Accept: "application/json",
    "Accept-Language": "en",
    "User-Agent": userAgent,
    "X-Compatibility-Date": compatibilityDate,
  });
  if (authenticated) headers.set("Authorization", `Bearer ${await accessToken()}`);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    if (allowFailure) return null;
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    fail(`ESI request failed: ${method} ${route}`, {
      status: response.status,
      detail,
      retryAfter: response.headers.get("Retry-After"),
    });
  }
  return response;
}

async function esi(route, options) {
  const response = await esiResponse(route, options);
  if (!response) return null;
  if (response.status === 204 || response.headers.get("Content-Length") === "0") return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function paginated(route) {
  const firstResponse = await esiResponse(route, { authenticated: true, query: { page: 1 } });
  const first = await firstResponse.json();
  const pageCount = Math.min(Number(firstResponse.headers.get("X-Pages") || "1"), 50);
  const pages = [first];
  for (let start = 2; start <= pageCount; start += 4) {
    const batch = [];
    for (let page = start; page < Math.min(start + 4, pageCount + 1); page += 1) {
      batch.push(esi(route, { authenticated: true, query: { page } }));
    }
    pages.push(...(await Promise.all(batch)));
  }
  return pages.flat();
}

async function resolveNames(ids) {
  const unique = [...new Set(ids.map(Number).filter(Number.isSafeInteger))];
  const resolved = new Map();
  for (let start = 0; start < unique.length; start += 1_000) {
    const entities = await esi("/universe/names", {
      method: "POST",
      body: unique.slice(start, start + 1_000),
    });
    for (const entity of entities || []) resolved.set(Number(entity.id), { name: entity.name, category: entity.category });
  }
  return resolved;
}

function rootLocation(asset, assetsById) {
  let current = asset;
  const visited = new Set([Number(asset.item_id)]);
  while (assetsById.has(Number(current.location_id)) && !visited.has(Number(current.location_id))) {
    visited.add(Number(current.location_id));
    current = assetsById.get(Number(current.location_id));
  }
  return { id: Number(current.location_id), type: current.location_type };
}

async function customAssetNames(assets) {
  const singletonIds = assets.filter((asset) => asset.is_singleton).map((asset) => Number(asset.item_id));
  const names = new Map();
  for (let start = 0; start < singletonIds.length; start += 1_000) {
    const rows = await esi(`/characters/${session.characterId}/assets/names`, {
      method: "POST",
      body: singletonIds.slice(start, start + 1_000),
      authenticated: true,
    });
    for (const row of rows || []) names.set(Number(row.item_id), row.name);
  }
  return names;
}

function matchScore(candidate, query) {
  const value = candidate.toLowerCase().trim();
  const wanted = query.toLowerCase().trim();
  if (!value || !wanted) return Number.POSITIVE_INFINITY;
  if (value === wanted) return 0;
  if (value.startsWith(wanted)) return 1;
  if (value.includes(wanted)) return 2;
  const words = wanted.split(/\s+/).filter(Boolean);
  return words.every((word) => value.includes(word)) ? 3 : Number.POSITIVE_INFINITY;
}

async function locationDetails(roots) {
  const unique = [...new Map(roots.map((root) => [root.id, root])).values()];
  const normal = unique.filter((root) => root.id < 1_000_000_000_000);
  const names = normal.length ? await resolveNames(normal.map((root) => root.id)) : new Map();
  const details = new Map();
  for (const root of normal) {
    const entity = names.get(root.id);
    details.set(root.id, {
      id: root.id,
      name: entity?.name || `Location ${root.id}`,
      kind: entity?.category || root.type,
      canSetDestination: Boolean(entity) && ["solar_system", "station"].includes(entity.category),
    });
  }
  for (const root of unique.filter((item) => item.id >= 1_000_000_000_000)) {
    try {
      const structure = await esi(`/universe/structures/${root.id}`, { authenticated: true, allowFailure: true });
      if (!structure) throw new Error("Structure name unavailable");
      details.set(root.id, { id: root.id, name: structure.name, kind: "structure", canSetDestination: true });
    } catch {
      details.set(root.id, { id: root.id, name: `Private structure ${root.id}`, kind: "structure", canSetDestination: true });
    }
  }
  return details;
}

async function status() {
  const [location, ship, online, wallet] = await Promise.all([
    esi(`/characters/${session.characterId}/location`, { authenticated: true }),
    esi(`/characters/${session.characterId}/ship`, { authenticated: true }),
    esi(`/characters/${session.characterId}/online`, { authenticated: true }),
    esi(`/characters/${session.characterId}/wallet`, { authenticated: true }),
  ]);
  const ids = [location.solar_system_id, location.station_id, ship.ship_type_id].filter(Boolean);
  const names = await resolveNames(ids);
  let locationName = names.get(Number(location.station_id))?.name || names.get(Number(location.solar_system_id))?.name;
  if (location.structure_id) {
    const structure = await esi(`/universe/structures/${location.structure_id}`, { authenticated: true });
    locationName = structure.name;
  }
  output({
    ok: true,
    character: { id: session.characterId, name: session.characterName },
    online: Boolean(online.online),
    location: {
      name: locationName || "Unknown location",
      solarSystem: names.get(Number(location.solar_system_id))?.name || null,
      solarSystemId: Number(location.solar_system_id),
      stationId: location.station_id ? Number(location.station_id) : null,
      structureId: location.structure_id ? Number(location.structure_id) : null,
    },
    ship: { name: ship.ship_name, type: names.get(Number(ship.ship_type_id))?.name || null, typeId: Number(ship.ship_type_id) },
    wallet: Number(wallet),
  });
}

async function findAssets(query) {
  if (query.trim().length < 2) fail("Asset searches need at least two characters.");
  assertScope("esi-assets.read_assets.v1");
  const assets = await paginated(`/characters/${session.characterId}/assets`);
  const [types, customNames] = await Promise.all([
    resolveNames(assets.map((asset) => Number(asset.type_id))),
    customAssetNames(assets),
  ]);
  const assetsById = new Map(assets.map((asset) => [Number(asset.item_id), asset]));
  const matches = [];
  for (const asset of assets) {
    const typeName = types.get(Number(asset.type_id))?.name || `Type ${asset.type_id}`;
    const customName = customNames.get(Number(asset.item_id));
    const score = Math.min(matchScore(typeName, query), customName ? matchScore(customName, query) : Number.POSITIVE_INFINITY);
    if (Number.isFinite(score)) matches.push({ asset, typeName, customName, score, root: rootLocation(asset, assetsById) });
  }
  if (!matches.length) {
    output({ ok: true, query, matches: [], message: `No personal assets matched “${query}”.` });
    return;
  }
  const locations = await locationDetails(matches.map((match) => match.root));
  const grouped = new Map();
  for (const match of matches) {
    const isNamedSingleton = Boolean(match.customName) && match.customName !== match.typeName;
    const key = isNamedSingleton
      ? `item:${match.asset.item_id}`
      : `type:${match.asset.type_id}:root:${match.root.id}:flag:${match.asset.location_flag}`;
    const existing = grouped.get(key) || {
      score: match.score,
      itemId: isNamedSingleton ? Number(match.asset.item_id) : null,
      typeId: Number(match.asset.type_id),
      typeName: match.typeName,
      customName: isNamedSingleton ? match.customName : null,
      quantity: 0,
      locationFlag: match.asset.location_flag,
      location: locations.get(match.root.id) || { id: match.root.id, name: `Location ${match.root.id}`, kind: match.root.type, canSetDestination: false },
    };
    existing.quantity += Number(match.asset.quantity);
    grouped.set(key, existing);
  }
  const results = [...grouped.values()]
    .sort((a, b) => a.score - b.score || a.typeName.localeCompare(b.typeName) || b.quantity - a.quantity)
    .slice(0, 30)
    .map((result) => ({
      itemId: result.itemId,
      typeId: result.typeId,
      typeName: result.typeName,
      customName: result.customName,
      quantity: result.quantity,
      locationFlag: result.locationFlag,
      location: result.location,
      actions: {
        openMarket: `npm.cmd run eve -- market ${result.typeId}`,
        openInfo: `npm.cmd run eve -- info ${result.itemId || result.typeId}`,
        setDestination: result.location.canSetDestination
          ? `npm.cmd run eve -- waypoint ${result.location.id} --confirm ${result.location.id}`
          : null,
      },
    }));
  output({ ok: true, query, character: session.characterName, matchCount: grouped.size, matches: results });
}

async function searchUniverse(query) {
  if (query.trim().length < 3) fail("Universe searches need at least three characters.");
  assertScope("esi-search.search_structures.v1");
  const categories = ["solar_system", "station", "structure", "character", "corporation", "alliance", "inventory_type", "region", "constellation"];
  const found = await esi(`/characters/${session.characterId}/search`, {
    authenticated: true,
    query: { categories, search: query.trim(), strict: false },
  });
  const entries = Object.entries(found || {}).flatMap(([category, ids]) => ids.map((id) => ({ category, id: Number(id) })));
  const normalEntries = entries.filter((entry) => entry.category !== "structure");
  const names = normalEntries.length ? await resolveNames(normalEntries.map((entry) => entry.id)) : new Map();
  const categoryPriority = new Map([
    ["solar_system", 0],
    ["station", 1],
    ["structure", 2],
    ["inventory_type", 3],
    ["region", 4],
    ["constellation", 5],
    ["character", 6],
    ["corporation", 7],
    ["alliance", 8],
  ]);
  const rankedEntries = [...entries].sort((left, right) => {
    const leftScore = matchScore(names.get(left.id)?.name || "", query);
    const rightScore = matchScore(names.get(right.id)?.name || "", query);
    if (leftScore !== rightScore) return leftScore - rightScore;
    return (categoryPriority.get(left.category) ?? 99) - (categoryPriority.get(right.category) ?? 99);
  });
  const results = [];
  for (const entry of rankedEntries.slice(0, 50)) {
    let name = names.get(entry.id)?.name;
    if (entry.category === "structure") {
      try {
        const structure = await esi(`/universe/structures/${entry.id}`, { authenticated: true, allowFailure: true });
        name = structure?.name;
      } catch {
        name = `Accessible structure ${entry.id}`;
      }
    }
    const canSetDestination = ["solar_system", "station", "structure"].includes(entry.category);
    const isMarketType = entry.category === "inventory_type";
    results.push({
      id: entry.id,
      name: name || `${entry.category} ${entry.id}`,
      category: entry.category,
      actions: {
        openInfo: `npm.cmd run eve -- info ${entry.id}`,
        openMarket: isMarketType ? `npm.cmd run eve -- market ${entry.id}` : null,
        setDestination: canSetDestination ? `npm.cmd run eve -- waypoint ${entry.id} --confirm ${entry.id}` : null,
      },
    });
  }
  output({ ok: true, query, resultCount: entries.length, results });
}

async function uiAction(kind, id) {
  if (!Number.isSafeInteger(id) || id <= 0) fail(`${kind} requires a positive numeric ID.`);
  assertScope("esi-ui.open_window.v1");
  const route = kind === "market"
    ? "/ui/openwindow/marketdetails"
    : kind === "info"
      ? "/ui/openwindow/information"
      : "/ui/openwindow/contract";
  const parameter = kind === "market" ? "type_id" : kind === "info" ? "target_id" : "contract_id";
  await esi(route, { method: "POST", authenticated: true, query: { [parameter]: id } });
  output({ ok: true, action: kind, id, message: `EVE accepted the ${kind} window command. The game client must be running and logged into ${session.characterName}.` });
}

async function waypoint(destinationId) {
  if (!Number.isSafeInteger(destinationId) || destinationId <= 0) fail("waypoint requires a positive destination ID.");
  const confirmIndex = args.indexOf("--confirm");
  const confirmed = confirmIndex >= 0 ? Number(args[confirmIndex + 1]) : NaN;
  if (confirmed !== destinationId) {
    fail("Waypoint confirmation is missing or does not match the destination. Resolve and show the destination first, then repeat with --confirm <destination_id>.");
  }
  assertScope("esi-ui.write_waypoint.v1");
  const replace = args.includes("--replace");
  const beginning = args.includes("--beginning");
  await esi("/ui/autopilot/waypoint", {
    method: "POST",
    authenticated: true,
    query: {
      destination_id: destinationId,
      clear_other_waypoints: replace,
      add_to_beginning: beginning,
    },
  });
  output({
    ok: true,
    action: "waypoint",
    destinationId,
    replacedExistingRoute: replace,
    addedToBeginning: beginning,
    message: `EVE accepted the waypoint command for ${session.characterName}.`,
  });
}

function flagValues(flag) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === flag && args[index + 1] !== undefined) values.push(args[index + 1]);
  }
  return values;
}

function queryFlags() {
  const query = {};
  for (const pair of flagValues("--query")) {
    const separator = pair.indexOf("=");
    if (separator <= 0) fail(`Invalid --query value: ${pair}. Use key=value.`);
    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    if (query[name] === undefined) query[name] = value;
    else query[name] = Array.isArray(query[name]) ? [...query[name], value] : [query[name], value];
  }
  return query;
}

function safeEsiPath(value) {
  if (!value?.startsWith("/") || value.includes("://") || value.startsWith("//")) {
    fail("The ESI path must be a relative path beginning with a single slash.");
  }
  return value;
}

async function genericRead() {
  const route = safeEsiPath(args[0]);
  const result = await esi(route, { authenticated: true, query: queryFlags() });
  output({ ok: true, method: "GET", route, result });
}

async function genericWrite() {
  const method = String(args[0] || "").toUpperCase();
  if (!["POST", "PUT", "DELETE"].includes(method)) fail("write supports POST, PUT, or DELETE.");
  const route = safeEsiPath(args[1]);
  const confirmationIndex = args.indexOf("--confirm-write");
  const confirmation = confirmationIndex >= 0 ? args[confirmationIndex + 1] : "";
  const expected = `${method}:${route}`;
  if (confirmation !== expected) {
    fail(`Consequential ESI writes require the exact guard --confirm-write ${expected}. Resolve the target and obtain clear user intent first.`);
  }
  const bodyIndex = args.indexOf("--body");
  let body;
  if (bodyIndex >= 0) {
    try {
      body = JSON.parse(args[bodyIndex + 1]);
    } catch {
      fail("--body must contain valid JSON.");
    }
  }
  const result = await esi(route, { method, authenticated: true, query: queryFlags(), body });
  output({ ok: true, method, route, result, message: "EVE accepted the confirmed write request." });
}

try {
  if (command === "status") await status();
  else if (["find", "where"].includes(command)) await findAssets(args.join(" ").trim());
  else if (["search", "resolve"].includes(command)) await searchUniverse(args.join(" ").trim());
  else if (["market", "info", "contract"].includes(command)) await uiAction(command, Number(args[0]));
  else if (command === "waypoint") await waypoint(Number(args[0]));
  else if (["get", "read"].includes(command)) await genericRead();
  else if (command === "write") await genericWrite();
  else fail(`Unknown command: ${command}`, { hint: "Run npm.cmd run eve -- help" });
} catch (error) {
  if (error instanceof BridgeFailure) {
    output({ ok: false, error: error.message, ...(error.details ? { details: error.details } : {}) });
    process.exitCode = error.exitCode;
  } else {
    throw error;
  }
} finally {
  database.close();
}
