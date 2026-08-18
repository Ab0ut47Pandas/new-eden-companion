import { spawn, type ChildProcess } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import { CURRENT_VERSION, getUpdateStatus, portableUpdateSupport, UPDATE_REPOSITORY } from "@/lib/update/release";

export const dynamic = "force-dynamic";

let updateStarting = false;

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

interface UpdaterStartResult {
  ready: boolean;
  detail: string | null;
}

interface UpdaterProcessState {
  spawnError: string | null;
  earlyExit: { code: number | null; signal: NodeJS.Signals | null } | null;
}

function startupFailure(state: UpdaterProcessState): string | null {
  if (state.spawnError) return `PowerShell could not start: ${state.spawnError}`;
  if (!state.earlyExit) return null;
  const suffix = state.earlyExit.signal
    ? ` (signal ${state.earlyExit.signal})`
    : ` (exit code ${state.earlyExit.code ?? "unknown"})`;
  return `PowerShell exited before writing the updater handshake${suffix}.`;
}

async function waitForUpdaterStart(child: ChildProcess, readyPath: string, timeoutMilliseconds: number): Promise<UpdaterStartResult> {
  const state: UpdaterProcessState = { spawnError: null, earlyExit: null };

  child.once("error", (error) => {
    state.spawnError = error.message;
  });
  child.once("exit", (code, signal) => {
    state.earlyExit = { code, signal };
  });

  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    if (existsSync(readyPath)) return { ready: true, detail: null };
    const failure = startupFailure(state);
    if (failure) return { ready: false, detail: failure };
    await delay(100);
  }

  if (existsSync(readyPath)) return { ready: true, detail: null };
  const failure = startupFailure(state);
  if (failure) return { ready: false, detail: failure };
  return {
    ready: false,
    detail: `PowerShell updater PID ${child.pid ?? "unknown"} stayed alive but did not write the startup handshake within ${Math.round(timeoutMilliseconds / 1000)} seconds.`,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("local") === "1") {
    const portable = portableUpdateSupport();
    return NextResponse.json({
      currentVersion: CURRENT_VERSION,
      canAutoUpdate: portable.supported,
      reason: portable.reason,
    });
  }

  try {
    return NextResponse.json(await getUpdateStatus());
  } catch (error) {
    const message = error instanceof Error ? error.message : "The update check failed.";
    return NextResponse.json({ error: message, currentVersion: CURRENT_VERSION }, { status: 502 });
  }
}

export async function POST() {
  if (updateStarting) {
    return NextResponse.json({ error: "An update is already starting." }, { status: 409 });
  }

  try {
    const status = await getUpdateStatus();
    if (!status.updateAvailable) {
      return NextResponse.json({ error: "This copy is already up to date.", ...status }, { status: 409 });
    }
    if (!status.canAutoUpdate) {
      return NextResponse.json({ error: status.reason ?? "Automatic updating is unavailable for this copy.", ...status }, { status: 409 });
    }

    const packageRoot = process.cwd();
    const updaterSource = path.join(packageRoot, "scripts", "update-portable.ps1");
    if (!existsSync(updaterSource)) {
      return NextResponse.json({ error: "The portable updater script is missing." }, { status: 500 });
    }

    const updaterRoot = mkdtempSync(path.join(tmpdir(), "new-eden-companion-updater-"));
    const readyPath = path.join(updaterRoot, "updater.ready");
    const logPath = path.join(tmpdir(), "New-Eden-Companion-update.log");

    appendFileSync(
      logPath,
      `[${new Date().toISOString()}] API: preparing updater ${status.currentVersion} -> ${status.latestVersion}.\n`,
      "utf8",
    );

    const windowsRoot = process.env.SystemRoot ?? "C:\\Windows";
    const bundledPowerShell = path.join(windowsRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    const powershell = existsSync(bundledPowerShell) ? bundledPowerShell : "powershell.exe";

    appendFileSync(
      logPath,
      `[${new Date().toISOString()}] API: launching ${powershell} with ${updaterSource}.\n`,
      "utf8",
    );

    updateStarting = true;
    const child = spawn(powershell, [
      "-NoLogo",
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      updaterSource,
      "-PackageRoot",
      packageRoot,
      "-ServerPid",
      String(process.pid),
      "-Repository",
      UPDATE_REPOSITORY,
      "-CurrentVersion",
      status.currentVersion,
      "-ExpectedVersion",
      status.latestVersion,
      "-ReadyPath",
      readyPath,
    ], {
      cwd: packageRoot,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });

    if (!child.pid) {
      updateStarting = false;
      appendFileSync(logPath, `[${new Date().toISOString()}] API: Windows did not return an updater PID.\n`, "utf8");
      return NextResponse.json({ error: `Windows did not start the updater process. Log: ${logPath}` }, { status: 500 });
    }

    const startup = await waitForUpdaterStart(child, readyPath, 30_000);
    if (!startup.ready) {
      updateStarting = false;
      try { child.kill(); } catch {}
      appendFileSync(
        logPath,
        `[${new Date().toISOString()}] API: updater startup failed. ${startup.detail ?? "No diagnostic was returned."}\n`,
        "utf8",
      );
      return NextResponse.json({
        error: `The updater did not confirm that it started, so New Eden Companion was left running. ${startup.detail ?? ""} Log: ${logPath}`.trim(),
      }, { status: 500 });
    }

    child.unref();
    appendFileSync(logPath, `[${new Date().toISOString()}] API: updater startup handshake received. Shutting down the old server.\n`, "utf8");

    const shutdownTimer = setTimeout(() => process.exit(0), 1_500);
    shutdownTimer.unref();

    return NextResponse.json({
      started: true,
      currentVersion: status.currentVersion,
      targetVersion: status.latestVersion,
      logPath,
    }, { status: 202 });
  } catch (error) {
    updateStarting = false;
    const message = error instanceof Error ? error.message : "The update could not be started.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
