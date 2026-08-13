import "server-only";

import { config } from "@/lib/config";

const ESI_BASE_URL = "https://esi.evetech.net";

export class EsiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly route: string,
  ) {
    super(message);
  }
}

interface EsiOptions {
  token?: string;
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  revalidate?: number;
}

function requestUrl(route: string, query?: EsiOptions["query"]): URL {
  const url = new URL(route, ESI_BASE_URL);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
}

async function esiResponse(route: string, options: EsiOptions = {}): Promise<Response> {
  const headers = new Headers({
    Accept: "application/json",
    "Accept-Language": "en",
    "User-Agent": `NewEdenCompanion/0.1 (${config.esiContact})`,
    "X-Compatibility-Date": config.compatibilityDate,
  });
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  const response = await fetch(requestUrl(route, options.query), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: options.token ? "no-store" : undefined,
    next: options.token ? undefined : { revalidate: options.revalidate ?? 3_600 },
  });
  if (!response.ok) {
    const retry = response.headers.get("Retry-After");
    const detail = await response.text().catch(() => "");
    throw new EsiError(
      `ESI ${route} failed (${response.status})${retry ? `; retry in ${retry}s` : ""}${detail ? `: ${detail.slice(0, 160)}` : ""}`,
      response.status,
      route,
    );
  }
  return response;
}

export async function esi<T>(route: string, options: EsiOptions = {}): Promise<T> {
  const response = await esiResponse(route, options);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function esiPaginated<T>(
  route: string,
  token: string,
  maxPages = 50,
): Promise<T[]> {
  const first = await esiResponse(route, { token, query: { page: 1 } });
  const firstPage = (await first.json()) as T[];
  const pages = Math.min(Number(first.headers.get("X-Pages") ?? "1"), maxPages);
  if (pages <= 1) return firstPage;

  const results: T[][] = [firstPage];
  for (let start = 2; start <= pages; start += 4) {
    const batch = Array.from({ length: Math.min(4, pages - start + 1) }, (_, index) =>
      esi<T[]>(route, { token, query: { page: start + index } }),
    );
    results.push(...(await Promise.all(batch)));
  }
  return results.flat();
}

export async function resolveNames(ids: number[]): Promise<Map<number, string>> {
  const unique = [...new Set(ids)].filter(Number.isSafeInteger);
  const names = new Map<number, string>();
  for (let start = 0; start < unique.length; start += 1_000) {
    const chunk = unique.slice(start, start + 1_000);
    const entities = await esi<Array<{ id: number; name: string }>>("/universe/names", {
      method: "POST",
      body: chunk,
      revalidate: 86_400,
    });
    for (const entity of entities) names.set(entity.id, entity.name);
  }
  return names;
}
