# New Eden Companion

Local EVE Online dashboard and planning tool built on ESI.

Current features:

- Character status, wallet, assets, orders, contracts, skills, clones, fittings, industry, and mining data
- Ship ranking against trained skills
- Role and activity-specific fit templates
- Preflight checks for fit, ammunition, drones, paste, cargo, and activity restrictions
- Asset and universe search
- Route planning and confirmed EVE waypoint writes
- Nearby kill activity
- Training plans
- Demo mode with no EVE login

This is an early build. Recommendations are rule-based and include the source values used by each rule.

## Run on Windows

Requirements: Windows 10/11 and Node.js 22.13 or newer.

1. Install [Node.js LTS](https://nodejs.org/en/download).
2. Download and extract the project folder.
3. Double-click `Start New Eden Companion.cmd`.
4. Press Enter at the Client ID prompt to run the demo.

Keep the launcher window open. Closing it stops the local server.

The first run installs dependencies and creates a production build. Later starts reuse that build until project files change.

See [Getting Started](docs/GETTING_STARTED.md) to connect an EVE character. See [Troubleshooting](docs/TROUBLESHOOTING.md) if the launcher stops with an error.

## EVE connection

Live data uses EVE SSO with Authorization Code and PKCE. Create an application at the [EVE Developers portal](https://developers.eveonline.com/applications) and register this callback:

```text
http://localhost:3000/api/auth/callback
```

Run the launcher again and paste the application's Client ID. Do not enter an EVE password or application secret into the launcher.

Two scope profiles are available:

- `recommended`: personal character data used by the dashboard, plus EVE information windows and waypoint writes
- `full`: the complete scope catalog in `src/lib/auth/scopes.ts`

The recommended profile does not request mail, corporation management, contacts, calendar, fleet control, or fitting writes.

## Data storage

- `.env.local` contains the Client ID and local encryption key.
- `data/eve-companion.db` contains encrypted refresh tokens and local sessions.
- Both paths are ignored by Git.
- Logout removes the active local session.

Do not share `.env.local` or the `data` directory.

## ESI limits

ESI is cached. It does not provide the game client screen, local chat, directional scan, hidden ships, or immediate inventory updates. Preflight results must be checked against the fitting and cargo windows before undocking.

## Manual start

```text
npm install
copy .env.example .env.local
npm run build
npm run start
```

On macOS or Linux, use `cp .env.example .env.local`. Generate `AUTH_SECRET` with:

```text
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The app runs at `http://localhost:3000`.

## Development

```text
npm run test
npm run typecheck
npm run lint
npm run build
```

Main directories:

- `src/app/api/auth` - EVE login, callback, and logout
- `src/lib/auth` - scopes, JWT validation, token refresh, encryption, and sessions
- `src/lib/esi` - ESI client and response types
- `src/lib/dashboard` - live data assembly and recommendation rules
- `src/lib/preflight` - preflight rules
- `src/lib/ships` - ship catalog, ranking, roles, tasks, and fits
- `scripts/eve-bridge.mjs` - local ESI command bridge
- `scripts/start-companion.ps1` - Windows launcher

Contributions are handled through pull requests. See [CONTRIBUTING.md](CONTRIBUTING.md). The MIT license covers this project's original source code; CCP-owned names, data, images, and trademarks remain CCP property.

## Support

New Eden Companion is free and does not reserve features for contributors. Optional support through [Cash App](https://cash.app/$47pandas) is used toward project maintenance and hosting costs.

## CCP notice

New Eden Companion is an independent third-party application and is not affiliated with or endorsed by CCP Games.

EVE Online and the EVE logo are registered trademarks of CCP hf. All rights are reserved worldwide.
