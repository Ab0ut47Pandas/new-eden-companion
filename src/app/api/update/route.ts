import { spawn } from "node:child_process";
import { appendFileSync, closeSync, copyFileSync, existsSync, mkdtempSync, openSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import { CURRENT_VERSION, getUpdateStatus, portableUpdateSupport, UPDATE_REPOSITORY } from "@/lib/update/release";

export const dynamic = "force-dynamic";

let updateStarting = false;

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForFile(filePath: string, timeoutMilliseconds: number) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    if (existsSync(filePath)) return true;
    await delay(100);
  }
  return existsSync(filePath);
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
    const updaterCopy = path.join(updaterRoot, "update-portable.ps1");
    const readyPath = path.join(updaterRoot, "updater.ready");
    const logPath = path.join(tmpdir(), "New-Eden-Companion-update.log");
    copyFileSync(updaterSource, updaterCopy);

    appendFileSync(
      logPath,
      `[${new Date().toISOString()}] API: preparing updater ${status.currentVersion} -> ${status.latestVersion}.\n`,
      "utf8",
    );

    const windowsRoot = process.env.SystemRoot ?? "C:\\Windows";
    const bundledPowerShell = path.join(windowsRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    const powershell = existsSync(bundledPowerShell) ? bundledPowerShell : "powershell.exe";

    updateStarting = true;
    const logHandle = openSync(logPath, "a");
    const child = spawn(powershell, [
      "-NoLogo",
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      updaterCopy,
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
      cwd: updaterRoot,
      detached: true,
      stdio: ["ignore", logHandle, logHandle],
      windowsHide: true,
    });
    closeSync(logHandle);

    let spawnError: Error | null = null;
    child.once("error", (error) => {
      spawnError = error;
    });
    child.unref();

    if (!child.pid) {
      updateStarting = false;
      appendFileSync(logPath, `[${new Date().toISOString()}] API: Windows did not return an updater PID.\n`, "utf8");
      return NextResponse.json({ error: `Windows did not start the updater process. Log: ${logPath}` }, { status: 500 });
    }

    const updaterReady = await waitForFile(readyPath, 7_000);
    if (!updaterReady) {
      updateStarting = false;
      try { child.kill(); } catch {}
      const detail = spawnError ? ` ${spawnError.message}` : "";
      appendFileSync(
        logPath,
        `[${new Date().toISOString()}] API: updater startup handshake timed out.${detail}\n`,
        "utf8",
      );
      return NextResponse.json({
        error: `The updater did not confirm that it started, so New Eden Companion was left running.${detail} Log: ${logPath}`,
      }, { status: 500 });
    }

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
