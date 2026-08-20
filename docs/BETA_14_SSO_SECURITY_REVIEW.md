# BETA-14 — EVE SSO / token security review

Reviewed 2026-08-20 against current CCP EVE Developer SSO documentation.

## Verified design

- NEC uses the Authorization Code flow with PKCE (`S256`) and a random state value.
- OAuth state and PKCE verifier are short-lived, HTTP-only cookies scoped to the callback route and are cleared after a successful callback.
- The long-lived browser cookie contains only a random NEC session identifier; EVE access and refresh tokens are not placed in browser-readable state or response bodies.
- Session/token storage is server-only. Token bundles are encrypted with AES-256-GCM before being written to the private mutable SQLite database. `AUTH_SECRET` must be at least 32 characters before token storage is allowed.
- Authenticated ESI requests attach the access token only as a server-side `Authorization: Bearer` header and use `no-store` caching.
- Access tokens are signature-verified with the SSO-advertised JWKS and checked for accepted issuer and both expected audience values before NEC trusts their character/scopes.
- Refresh responses replace the stored refresh token when CCP returns a rotated token.
- Logout deletes the server-side session record and removes the browser session cookie.

## BETA-14 hardening

- Removed the unused `unsafeTokenPreview` export so application code has no convenience path for decoding an unverified access token.
- Auth callback logging no longer emits arbitrary thrown errors/messages. Only the JavaScript error type is logged, so an upstream/library error cannot accidentally print authorization codes, PKCE verifiers, access tokens, refresh tokens, or session IDs.
- Added regression coverage proving representative credentials do not appear in callback logs or the browser redirect response on an authentication failure.

## Browser/server boundary

Browser-visible authentication failures are deliberately generic (`denied`, `invalid-state`, `callback-failed`). The authorization code, PKCE verifier, access token, refresh token, token response, and encrypted token bundle are not returned in browser responses.

The login route may return configuration issue text, but the current configuration checker reports only missing/length requirements (`EVE_CLIENT_ID is missing`, `AUTH_SECRET must be at least 32 characters`) and never configuration values.

## Remaining constraints

- A process with access to the running server environment and private mutable database can necessarily access/decrypt session credentials; protecting the host/user account and `AUTH_SECRET` remains part of the local security boundary.
- HTTPS-only cookies are enabled when `NODE_ENV=production`. Local development intentionally supports loopback HTTP.
- This review does not claim EVE SSO scopes expose live client state; permissions remain limited to the scopes and ESI endpoints CCP provides.

## CCP primary source checked

Current EVE Developer Documentation: Single Sign-On — authorization code/PKCE flow, state verification, access/refresh-token handling, scope boundaries, and JWT signature/issuer/audience validation.
