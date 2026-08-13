# Setup

## Demo

1. Install [Node.js LTS](https://nodejs.org/en/download).
2. Extract the complete project folder.
3. Double-click `Start New Eden Companion.cmd`.
4. Press Enter at the EVE Client ID prompt.
5. Leave the launcher window open.

The browser opens at `http://localhost:3000`. Demo records are marked as demo data and do not call authenticated ESI endpoints.

## Connect a character

1. Stop the launcher with `Ctrl+C` or close its window.
2. Open the [EVE Developers applications page](https://developers.eveonline.com/applications).
3. Create an application using **Authentication & API Access** and PKCE. Do not select **ESI UI** as the application type.
4. Register this callback exactly:

   ```text
   http://localhost:3000/api/auth/callback
   ```

5. Enable the required scopes. The two scope lists are in `src/lib/auth/scopes.ts`.
6. Save the application and copy its Client ID.
7. Run `Start New Eden Companion.cmd` again and paste the Client ID.
8. In the app, open **Data access** and connect the default or full profile.
9. Approve the character and scopes on the EVE SSO page.

The launcher stores the Client ID in `.env.local` and generates `AUTH_SECRET`. It does not ask for an EVE password, access token, refresh token, or application secret.

## Scope profiles

Use the default profile unless a specific feature requires more access.

The default profile covers:

- Character location, online state, and current ship
- Assets, wallet, personal orders, and contracts
- Skills, queue, clones, implants, and fittings
- Personal industry, mining, and killmail history
- Information and market windows
- Waypoint writes

The full profile also requests mail, corporation, contacts, calendar, fleet, fitting-write, and other supported scopes.

## First check

After connecting:

1. Open **Command** and confirm the character, ship, system, wallet, and training queue.
2. Open **Ships** and select a role or task.
3. Open **Preflight** before undocking.
4. Verify modules, ammunition, drones, cargo, and damage in the EVE client. ESI values may be cached.

## Stop, restart, and update

- Stop: close the launcher window or press `Ctrl+C`.
- Restart: run `Start New Eden Companion.cmd`.
- Update: replace the project files but keep `.env.local` and `data`.
- Remove the active local session: select **Disconnect** in the app.

Do not send `.env.local` or `data/eve-companion.db` to anyone.
