import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import { CURRENT_VERSION, getUpdateStatus, portableUpdateSupport, UPDATE_REPOSITORY } from "@/lib/update/release";

export const dynamic = "force-dynamic";

let updateStarting = false;

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
    copyFileSync(updaterSource, updaterCopy);

    const windowsRoot = process.env.SystemRoot ?? "C:\\Windows";
    const bundledPowerShell = path.join(windowsRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    const powershell = existsSync(bundledPowerShell) ? bundledPowerShell : "powershell.exe";

    updateStarting = true;
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
    ], {
      cwd: updaterRoot,
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });
    child.unref();

    if (!child.pid) {
      updateStarting = false;
      return NextResponse.json({ error: "Windows did not start the updater process." }, { status: 500 });
    }

    const shutdownTimer = setTimeout(() => process.exit(0), 1_500);
    shutdownTimer.unref();

    return NextResponse.json({
      started: true,
      currentVersion: status.currentVersion,
      targetVersion: status.latestVersion,
    }, { status: 202 });
  } catch (error) {
    updateStarting = false;
    const message = error instanceof Error ? error.message : "The update could not be started.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
