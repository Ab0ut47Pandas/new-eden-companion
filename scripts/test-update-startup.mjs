import { spawn } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

if (process.platform !== "win32") {
  console.log("Updater startup smoke test is Windows-only.");
  process.exit(0);
}

const packageRoot = process.cwd();
const updaterSource = path.join(packageRoot, "scripts", "update-portable.ps1");
const windowsRoot = process.env.SystemRoot ?? "C:\\Windows";
const powershell = path.join(windowsRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
const readyPath = path.join(tmpdir(), `new-eden-companion-updater-smoke-${process.pid}.ready`);
const logPath = path.join(tmpdir(), `new-eden-companion-updater-smoke-${process.pid}.log`);

rmSync(readyPath, { force: true });
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
    if (earlyExit) throw new Error(`Updater exited before handshake: ${JSON.stringify(earlyExit)}`);
    await delay(100);
  }
  throw new Error(`Updater did not write the startup handshake within ${timeoutMilliseconds / 1000} seconds.`);
}

let sleeper = null;
let updater = null;
try {
  sleeper = spawn(powershell, ["-NoLogo", "-NoProfile", "-Command", "Start-Sleep -Seconds 60"], {
    stdio: "ignore",
    windowsHide: true,
  });
  if (!sleeper.pid) throw new Error("Could not start the dummy server process.");

  const logHandle = openSync(logPath, "a");
  updater = spawn(powershell, [
    "-NoLogo",
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    updaterSource,
    "-PackageRoot",
    packageRoot,
    "-ServerPid",
    String(sleeper.pid),
    "-Repository",
    "Ab0ut47Pandas/new-eden-companion",
    "-CurrentVersion",
    "0.0.0",
    "-ExpectedVersion",
    "0.0.1",
    "-ReadyPath",
    readyPath,
  ], {
    cwd: packageRoot,
    detached: true,
    stdio: ["ignore", logHandle, logHandle],
    windowsHide: true,
  });
  closeSync(logHandle);
  if (!updater.pid) throw new Error("Windows did not return an updater PID.");

  const startedAt = Date.now();
  await waitForReady(updater, 30_000);
  console.log(`Updater handshake succeeded in ${Date.now() - startedAt} ms (PID ${updater.pid}).`);
} catch (error) {
  if (existsSync(logPath)) {
    console.error("Updater log:\n" + readFileSync(logPath, "utf8"));
  }
  throw error;
} finally {
  try { updater?.kill(); } catch {}
  try { sleeper?.kill(); } catch {}
  rmSync(readyPath, { force: true });
  rmSync(logPath, { force: true });
}
