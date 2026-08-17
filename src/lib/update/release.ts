import "server-only";

import { existsSync } from "node:fs";
import path from "node:path";

import packageJson from "../../../package.json";
import { compareStableVersions, normalizeStableVersion } from "@/lib/update/version";

export const UPDATE_REPOSITORY = "Ab0ut47Pandas/new-eden-companion";
export const CURRENT_VERSION = packageJson.version;

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  assets: GitHubReleaseAsset[];
}

export interface UpdateStatus {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  canAutoUpdate: boolean;
  releaseUrl: string;
  packageAssetName: string | null;
  checksumAssetName: string | null;
  reason: string | null;
}

export function portableUpdateSupport(): { supported: boolean; reason: string | null } {
  if (process.platform !== "win32") {
    return { supported: false, reason: "One-click updates are currently available for the portable Windows build." };
  }

  const packageRoot = process.cwd();
  const required = [
    path.join(packageRoot, "runtime", "node.exe"),
    path.join(packageRoot, "scripts", "update-portable.ps1"),
    path.join(packageRoot, "Start New Eden Companion.cmd"),
  ];
  if (required.some((file) => !existsSync(file))) {
    return { supported: false, reason: "This copy is not running from the self-contained portable Windows package." };
  }

  return { supported: true, reason: null };
}

export async function getUpdateStatus(): Promise<UpdateStatus> {
  const response = await fetch(`https://api.github.com/repos/${UPDATE_REPOSITORY}/releases/latest`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "New-Eden-Companion-Updater",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub release check failed with HTTP ${response.status}.`);
  }

  const release = await response.json() as GitHubRelease;
  const latestVersion = normalizeStableVersion(release.tag_name);
  const currentVersion = normalizeStableVersion(CURRENT_VERSION);
  if (!latestVersion || !currentVersion || release.draft || release.prerelease) {
    throw new Error("The latest GitHub release does not contain a stable x.y.z version.");
  }

  const expectedPackageName = `New-Eden-Companion-${latestVersion}-Windows-x64.zip`;
  const packageAsset = release.assets.find((asset) => asset.name === expectedPackageName) ?? null;
  const checksumAsset = release.assets.find((asset) => asset.name === `${expectedPackageName}.sha256`) ?? null;
  const updateAvailable = compareStableVersions(latestVersion, currentVersion) > 0;
  const portable = portableUpdateSupport();

  let reason = portable.reason;
  if (updateAvailable && (!packageAsset || !checksumAsset)) {
    reason = "The latest release is missing the Windows package or its SHA-256 file, so automatic installation is disabled.";
  }

  return {
    currentVersion,
    latestVersion,
    updateAvailable,
    canAutoUpdate: updateAvailable && portable.supported && Boolean(packageAsset && checksumAsset),
    releaseUrl: release.html_url,
    packageAssetName: packageAsset?.name ?? null,
    checksumAssetName: checksumAsset?.name ?? null,
    reason,
  };
}
