# Legacy updater health-check compatibility

New Eden Companion 0.1.9 performs its post-update health check against `http://localhost:3000/api/update?local=1` before deciding whether to keep a newly installed package or roll back.

Portable releases that must be reachable from 0.1.9 therefore bind the local server to `localhost`, not only `127.0.0.1`. The Windows release smoke test reproduces the legacy PowerShell `Invoke-RestMethod` health check after first starting a stale 0.1.9-compatible listener on IPv4.

Do not remove this compatibility test until all supported upgrade paths no longer include 0.1.9.
