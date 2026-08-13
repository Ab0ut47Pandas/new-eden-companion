export const config = {
  eveClientId: process.env.EVE_CLIENT_ID?.trim() ?? "",
  eveRedirectUri:
    process.env.EVE_REDIRECT_URI?.trim() ??
    "http://localhost:3000/api/auth/callback",
  authSecret: process.env.AUTH_SECRET?.trim() ?? "",
  esiContact: process.env.ESI_CONTACT?.trim() ?? "local-user",
  compatibilityDate:
    process.env.ESI_COMPATIBILITY_DATE?.trim() ?? "2026-08-12",
};

export function getConfigurationIssues(): string[] {
  const issues: string[] = [];
  if (!config.eveClientId) issues.push("EVE_CLIENT_ID is missing");
  if (config.authSecret.length < 32) {
    issues.push("AUTH_SECRET must be at least 32 characters");
  }
  return issues;
}

export function assertConfigured(): void {
  const issues = getConfigurationIssues();
  if (issues.length) throw new Error(issues.join(". "));
}
