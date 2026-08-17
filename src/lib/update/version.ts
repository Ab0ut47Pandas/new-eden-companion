export function normalizeStableVersion(value: string): string | null {
  const normalized = value.trim().replace(/^v/i, "");
  return /^\d+\.\d+\.\d+$/.test(normalized) ? normalized : null;
}

export function compareStableVersions(left: string, right: string): number {
  const leftVersion = normalizeStableVersion(left);
  const rightVersion = normalizeStableVersion(right);
  if (!leftVersion || !rightVersion) throw new Error("Only stable x.y.z versions can be compared.");

  const leftParts = leftVersion.split(".").map(Number);
  const rightParts = rightVersion.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] > rightParts[index]) return 1;
    if (leftParts[index] < rightParts[index]) return -1;
  }
  return 0;
}
