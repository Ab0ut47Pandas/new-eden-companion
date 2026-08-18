import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

if (process.platform !== "win32") {
  console.log("Portable launcher stale-instance test is Windows-only.");
  process.exit(0);
}

const repoRoot = process.cwd();
const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
const expectedVersion = String(packageJson.version);
const zipPath = path.join(repoRoot, "dist", `New-Eden-Companion-${expectedVersion}-Windows-x64.zip`);
if (!existsSync(zipPath)) throw new Error(`Missing portable package: ${zipPath}`);

const windowsRoot = process.env.SystemRoot ?? "C:\\Windows";
const powershell = path.join(windowsRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
const tempRoot = mkdtempSync(path.join(tmpdir(), "nec-stale-launcher-test-"));
const extractRoot = path.join(tempRoot, "extract");
const fakeServerPath = path.join(tempRoot, "stale-server.mjs");
let staleServer = null;
let launcher = null;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function versionOnPort() {
  try {
    const response = await fetch("http://127.0.0.1:3000/api/update?local=1", { signal: AbortSignal.timeout(1500) });
    if (!response.ok) return null;
    const body = await response.json();
    return typeof body.currentVersion === "string" ? body.currentVersion : null;
  } catch {
    return null;
  }
}

async function waitForVersion(version, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await versionOnPort()) === version) return;
    await delay(250);
  }
  throw new Error(`Timed out waiting for New Eden Companion ${version} on port 3000; last version was ${await versionOnPort() ?? "none"}.`);
}

function stopPort3000() {
  spawnSync(
    powershell,
    [
      "-NoLogo",
      "-NoProfile",
      "-Command",
      "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }",
    ],
    { stdio: "ignore" },
  );
}

try {
  if (await versionOnPort()) throw new Error("Port 3000 already has a New Eden Companion instance before the test starts.");

  const expand = spawnSync(
    powershell,
    ["-NoLogo", "-NoProfile", "-Command", `Expand-Archive -LiteralPath '${zipPath.replaceAll("'", "''")}' -DestinationPath '${extractRoot.replaceAll("'", "''")}' -Force`],
    { stdio: "inherit" },
  );
  if (expand.status !== 0) throw new Error("Could not extract the portable package for stale-instance testing.");

  const packageRoot = path.join(extractRoot, `New-Eden-Companion-${expectedVersion}-Windows-x64`);
  const launcherScript = path.join(packageRoot, "scripts", "start-portable.ps1");
  if (!existsSync(launcherScript)) throw new Error(`Portable launcher missing after extraction: ${launcherScript}`);

  writeFileSync(
    path.join(packageRoot, ".env.local"),
    [
      "EVE_CLIENT_ID=stale-instance-smoke-test",
      "EVE_REDIRECT_URI=http://localhost:3000/api/auth/callback",
      `AUTH_SECRET=${"a".repeat(64)}`,
      "ESI_CONTACT=ci@example.invalid",
      "ESI_COMPATIBILITY_DATE=2026-08-12",
      "",
    ].join("\n"),
    "utf8",
  );

  writeFileSync(
    fakeServerPath,
    `import http from "node:http";\nconst server = http.createServer((req, res) => {\n  if (req.url?.startsWith("/api/update")) {\n    res.writeHead(200, { "content-type": "application/json" });\n    res.end(JSON.stringify({ currentVersion: "0.1.9", canAutoUpdate: true, reason: null }));\n    return;\n  }\n  res.writeHead(200, { "content-type": "text/html" });\n  res.end("<html><body>New Eden Companion stale test</body></html>");\n});\nserver.listen(3000, "127.0.0.1");\n`,
    "utf8",
  );

  staleServer = spawn(process.execPath, [fakeServerPath], { stdio: "ignore", windowsHide: true });
  if (!staleServer.pid) throw new Error("Could not start fake stale New Eden Companion server.");
  await waitForVersion("0.1.9", 10_000);

  launcher = spawn(
    powershell,
    ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", launcherScript, "-NoBrowser"],
    { cwd: packageRoot, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  if (!launcher.pid) throw new Error("Could not start the packaged launcher.");

  let stdout = "";
  let stderr = "";
  launcher.stdout?.on("data", (chunk) => { stdout += chunk.toString(); });
  launcher.stderr?.on("data", (chunk) => { stderr += chunk.toString(); });

  await waitForVersion(expectedVersion, 75_000);
  await delay(500);
  if (staleServer.exitCode === null && !staleServer.killed) {
    throw new Error(`The stale 0.1.9 process was not terminated.\nLauncher stdout:\n${stdout}\nLauncher stderr:\n${stderr}`);
  }

  console.log(`Portable launcher replaced stale 0.1.9 with ${expectedVersion} successfully.`);
} finally {
  stopPort3000();
  try { launcher?.kill(); } catch {}
  try { staleServer?.kill(); } catch {}
  await delay(500);
  rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
}
