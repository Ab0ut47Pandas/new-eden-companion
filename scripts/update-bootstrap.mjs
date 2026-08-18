import { spawn } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";

const configPath = process.argv[2];
if (!configPath) process.exit(2);

function log(logPath, message) {
  appendFileSync(logPath, `[${new Date().toISOString()}] BOOTSTRAP: ${message}\n`, "utf8");
}

let config;
try {
  config = JSON.parse(readFileSync(configPath, "utf8"));
} catch (error) {
  process.stderr.write(`Updater bootstrap could not read its config: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(2);
}

const { powershell, updaterScript, updaterArgs, workingDirectory, logPath } = config;

try {
  log(logPath, `Node bootstrap started with PID ${process.pid}.`);
  log(logPath, `Launching PowerShell normally from ${powershell}.`);

  const child = spawn(powershell, [
    "-NoLogo",
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    updaterScript,
    ...updaterArgs,
  ], {
    cwd: workingDirectory,
    detached: false,
    stdio: "ignore",
    windowsHide: true,
  });

  child.once("error", (error) => {
    log(logPath, `PowerShell launch error: ${error.message}`);
    process.exit(1);
  });
  child.once("exit", (code, signal) => {
    log(logPath, signal
      ? `PowerShell exited with signal ${signal}.`
      : `PowerShell exited with code ${code ?? "unknown"}.`);
    process.exit(code === 0 ? 0 : 1);
  });
} catch (error) {
  log(logPath, `Bootstrap failure: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
