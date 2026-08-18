import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

if (process.platform !== "win32") {
  console.log("Updater startup smoke test is Windows-only.");
  process.exit(0);
}

const packageRoot = process.cwd();
const windowsRoot = process.env.SystemRoot ?? "C:\\Windows";
const powershell = path.join(windowsRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
const smokeRoot = mkdtempSync(path.join(tmpdir(), "new-eden-companion-updater-smoke-"));
const updaterCopy = path.join(smokeRoot, "update-portable.ps1");
const bootstrapCopy = path.join(smokeRoot, "update-bootstrap.mjs");
const bootstrapNode = path.join(smokeRoot, "node.exe");
const configPath = path.join(smokeRoot, "bootstrap.json");
const readyPath = path.join(smokeRoot, "updater.ready");
const logPath = path.join(tmpdir(), "New-Eden-Companion-update.log");

copyFileSync(path.join(packageRoot, "scripts", "update-portable.ps1"), updaterCopy);
copyFileSync(path.join(packageRoot, "scripts", "update-bootstrap.mjs"), bootstrapCopy);
copyFileSync(process.execPath, bootstrapNode);
rmSync(logPath, { force: true });

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForReady(child, timeoutMilliseconds) {
  let spawnError = null;
  let earlyExit = null;
  child.once("error", (error) => { spawnError = error; });
  child.once("exit", (code, signal) => { earlyExit = { code, signal }; });

  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    if (existsSync(readyPath)) return;
    if (spawnError) throw spawnError;
    if (earlyExit) throw new Error(`Updater bootstrap exited before handshake: ${JSON.stringify(earlyExit)}`);
    await delay(100);
  }
  throw new Error(`Updater bootstrap did not produce the PowerShell handshake within ${timeoutMilliseconds / 1000} seconds.`);
}

let sleeper = null;
let bootstrap = null;
try {
  sleeper = spawn(powershell, ["-NoLogo", "-NoProfile", "-Command", "Start-Sleep -Seconds 60"], {
    stdio: "ignore",
    windowsHide: true,
  });
  if (!sleeper.pid) throw new Error("Could not start the dummy server process.");

  const updaterArgs = [
    "-PackageRoot", packageRoot,
    "-ServerPid", String(sleeper.pid),
    "-Repository", "Ab0ut47Pandas/new-eden-companion",
    "-CurrentVersion", "0.0.0",
    "-ExpectedVersion", "0.0.1",
    "-ReadyPath", readyPath,
  ];
  writeFileSync(configPath, JSON.stringify({
    powershell,
    updaterScript: updaterCopy,
    updaterArgs,
    workingDirectory: smokeRoot,
    logPath,
  }), "utf8");

  bootstrap = spawn(bootstrapNode, [bootstrapCopy, configPath], {
    cwd: smokeRoot,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  if (!bootstrap.pid) throw new Error("Windows did not return a Node updater bootstrap PID.");

  const startedAt = Date.now();
  await waitForReady(bootstrap, 30_000);
  console.log(`Updater handshake succeeded in ${Date.now() - startedAt} ms (bootstrap PID ${bootstrap.pid}).`);
} catch (error) {
  if (existsSync(logPath)) {
    console.error("Updater log:\n" + readFileSync(logPath, "utf8"));
  }
  throw error;
} finally {
  try { bootstrap?.kill(); } catch {}
  try { sleeper?.kill(); } catch {}
  await delay(500);
  try { rmSync(smokeRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 }); } catch {}
  rmSync(logPath, { force: true });
}
