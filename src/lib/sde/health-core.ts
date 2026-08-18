export function staticDatabaseAgeSeconds(now: Date, createdAt: string | null, fileMtimeMs: number): number {
  const createdAtMs = createdAt ? Date.parse(createdAt) : Number.NaN;
  const referenceMs = Number.isFinite(createdAtMs) ? createdAtMs : fileMtimeMs;
  return Math.max(0, Math.floor((now.getTime() - referenceMs) / 1000));
}
