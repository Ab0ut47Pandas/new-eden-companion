# Common Problems

## The launcher says Node.js is missing or too old

Install the current [Node.js LTS release](https://nodejs.org/en/download), then close and reopen the launcher. Restart Windows if the installer completed but the launcher still cannot find Node.js.

## Windows warns me about the launcher

The launcher is a local script, not a signed installer. Run it only from the project repository or a trusted release. Its source is in `Start New Eden Companion.cmd` and `scripts/start-companion.ps1`.

## The first launch looks stuck

Installing and building can take several minutes. Keep the window open while new lines are appearing. If it fails, the last message normally identifies an internet, Node.js, or build problem.

## Port 3000 is already being used

Another local development app is using the companion's address. Close that app or its terminal and launch New Eden Companion again. If the companion was already running, use the browser tab that is open at `http://localhost:3000`.

## I see the demo after adding a Client ID

Close the launcher completely and start it again. Environment settings are read only when the server starts. Then open **Data access** and select a connection profile.

## EVE says the callback or redirect is invalid

Open your application in the [EVE Developers portal](https://developers.eveonline.com/applications) and make sure this is registered exactly:

```text
http://localhost:3000/api/auth/callback
```

`https`, a missing port, a trailing slash, or a different path will not match.

## EVE says a requested scope is invalid or unavailable

The permissions enabled on the EVE developer application must include the access profile selected in New Eden Companion. Enable the recommended scopes listed in `src/lib/auth/scopes.ts`, save the application, and try again. Full access requires the full catalog in that file.

## Some cards say data is unavailable

Possible causes: the scope was not authorized, the character lacks the required corporation role, ESI is unavailable, or cached data has not refreshed. Reconnect only if the missing category is needed.

## My ship or cargo is not current

ESI is cache-driven rather than a live feed from the game client. Refresh after waiting for the category's cache, and confirm critical ammunition, drones, modules, and repair supplies in EVE before undocking.

## The local session can no longer be decrypted

The `AUTH_SECRET` in `.env.local` changed or the file was replaced. Disconnect/reconnect the character to create a session under the new key. Existing encrypted sessions cannot be recovered without the old key.

## I want to completely remove my local character data

Use **Disconnect** first. Stop the app, then delete the `data` folder. This permanently removes the local database unless it was backed up.
