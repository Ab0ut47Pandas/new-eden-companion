# Contributing

Bug fixes, ESI updates, ship data, fit templates, preflight rules, and clearer documentation are welcome.

## Before opening a pull request

1. Create a branch from `main`.
2. Keep the change focused.
3. Run:

   ```text
   npm run test
   npm run typecheck
   npm run lint
   npm run build
   ```

4. Explain what changed and how it was checked.

## Fits and rules

Include the hull, role, activity, expected skill level, and any restrictions that affect the recommendation. For Abyssal fits, include tier and weather. Verify fits in EVE's fitting simulator before submitting them.

Do not describe a fit as safe or guaranteed. State the assumptions and failure conditions.

## Private data

Never attach `.env.local`, the `data` directory, EVE tokens, character mail, private corporation data, or logs containing personal information. Use made-up names and IDs in tests and screenshots.
