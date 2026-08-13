export function displayedSecurity(value: number): number {
  return Math.round(value * 10) / 10;
}

export function securityBand(value: number): "high" | "low" | "null" {
  const displayed = displayedSecurity(value);
  if (displayed >= 0.5) return "high";
  if (displayed > 0) return "low";
  return "null";
}

