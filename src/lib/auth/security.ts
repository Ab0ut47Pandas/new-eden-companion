export interface SafeAuthErrorSummary {
  errorType: string;
}

/**
 * Authentication failures can contain authorization codes, PKCE verifiers,
 * access tokens, refresh tokens, cookie values, or upstream response details.
 * Logs therefore retain only the broad JavaScript error type and never the
 * arbitrary message/value supplied by a thrown object.
 */
export function safeAuthErrorSummary(error: unknown): SafeAuthErrorSummary {
  if (error instanceof Error) return { errorType: error.name || "Error" };
  if (error === null) return { errorType: "null" };
  return { errorType: typeof error };
}
