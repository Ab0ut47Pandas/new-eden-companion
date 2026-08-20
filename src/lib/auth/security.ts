export interface SafeAuthErrorSummary {
  errorType: string;
}

/**
 * Authentication failures can contain authorization codes, PKCE verifiers,
 * access tokens, refresh tokens, cookie values, or upstream response details.
 * Logs therefore retain only a fixed broad JavaScript error category and never
 * attacker/library-controlled Error names, messages, or thrown values.
 */
export function safeAuthErrorSummary(error: unknown): SafeAuthErrorSummary {
  if (error instanceof Error) return { errorType: "Error" };
  if (error === null) return { errorType: "null" };
  return { errorType: typeof error };
}
