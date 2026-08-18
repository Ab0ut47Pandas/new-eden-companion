[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$PackageRoot,
  [Parameter(Mandatory = $true)][int]$ServerPid,
  [Parameter(Mandatory = $true)][string]$Repository,
  [Parameter(Mandatory = $true)][string]$CurrentVersion,
  [Parameter(Mandatory = $true)][string]$ExpectedVersion,
  [Parameter(Mandatory = $true)][string]$ReadyPath
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$logPath = Join-Path $env:TEMP "New-Eden-Companion-update.log"
$tempRoot = $null
$stagingPath = $null
$backupPath = $null
$launcherPid = $null

function Write-UpdateLog([string]$Message) {
  $line = "[$(Get-Date -Format o)] $Message"
  Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
  Write-Host $Message
}

function Convert-StableVersion([string]$Value) {
  $normalized = $Value.Trim() -replace "^[vV]", ""
  if ($normalized -notmatch "^\d+\.\d+\.\d+$") {
    throw "Unsupported release version: $Value"
  }
  return [version]$normalized
}

function Copy-DirectoryContents([string]$Source, [string]$Destination) {
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  Get-ChildItem -LiteralPath $Source -Force | Copy-Item -Destination $Destination -Recurse -Force
}

function Move-WithRetry([string]$Source, [string]$Destination) {
  $lastError = $null
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    try {
      Move-Item -LiteralPath $Source -Destination $Destination -Force
      return
    } catch {
      $lastError = $_
      Start-Sleep -Milliseconds 750
    }
  }
  throw $lastError
}

function Find-ExpandedPackage([string]$ExtractRoot) {
  if (Test-Path -LiteralPath (Join-Path $ExtractRoot "server.js")) {
    return $ExtractRoot
  }
  foreach ($directory in Get-ChildItem -LiteralPath $ExtractRoot -Directory) {
    if (Test-Path -LiteralPath (Join-Path $directory.FullName "server.js")) {
      return $directory.FullName
    }
  }
  throw "The downloaded ZIP did not contain a New Eden Companion package root."
}

function Get-WindowsPowerShell {
  $windowsRoot = if ($env:SystemRoot) { $env:SystemRoot } else { "C:\Windows" }
  $bundledPowerShell = Join-Path $windowsRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
  if (Test-Path -LiteralPath $bundledPowerShell) {
    return $bundledPowerShell
  }
  return "powershell.exe"
}

function Start-Companion([string]$Root) {
  $launcherScript = Join-Path $Root "scripts\start-portable.ps1"
  if (-not (Test-Path -LiteralPath $launcherScript)) {
    throw "The portable launcher script is missing after the update."
  }

  $powershell = Get-WindowsPowerShell
  $arguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -File `"$launcherScript`""
  Write-UpdateLog "Starting New Eden Companion from $launcherScript."
  $process = Start-Process -FilePath $powershell -ArgumentList $arguments -WorkingDirectory $Root -WindowStyle Normal -PassThru
  Start-Sleep -Milliseconds 500
  if (-not $process -or $process.HasExited) {
    throw "The New Eden Companion launcher exited immediately."
  }
  Write-UpdateLog "Launcher process started (PID $($process.Id))."
  return $process.Id
}

function Stop-Port3000 {
  try {
    $listeners = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    foreach ($listener in @($listeners)) {
      if ($listener.OwningProcess) {
        Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
      }
    }
  } catch {}
}

function Wait-ForExpectedServer([string]$Version) {
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    try {
      $result = Invoke-RestMethod -Uri "http://localhost:3000/api/update?local=1" -TimeoutSec 2
      if ($result.currentVersion -eq $Version) { return $true }
    } catch {}
    Start-Sleep -Seconds 1
  }
  return $false
}

try {
  Set-Location -LiteralPath $env:TEMP
  $PackageRoot = [System.IO.Path]::GetFullPath($PackageRoot).TrimEnd('\')
  if (-not (Test-Path -LiteralPath $PackageRoot -PathType Container)) {
    throw "The installed package folder no longer exists: $PackageRoot"
  }

  $parentRoot = Split-Path -Parent $PackageRoot
  $packageLeaf = Split-Path -Leaf $PackageRoot
  if (-not $parentRoot -or -not $packageLeaf) {
    throw "Refusing to update an unsafe package path: $PackageRoot"
  }
  if (-not (Test-Path -LiteralPath (Join-Path $PackageRoot "scripts\start-portable.ps1"))) {
    throw "The current portable launcher is missing: $PackageRoot"
  }

  Write-UpdateLog "Preparing New Eden Companion $CurrentVersion -> $ExpectedVersion."
  [System.IO.File]::WriteAllText($ReadyPath, "ready`n", [System.Text.UTF8Encoding]::new($false))
  Write-UpdateLog "Updater startup handshake written."

  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    if (-not (Get-Process -Id $ServerPid -ErrorAction SilentlyContinue)) { break }
    Start-Sleep -Milliseconds 500
  }
  if (Get-Process -Id $ServerPid -ErrorAction SilentlyContinue) {
    Write-UpdateLog "The old server did not stop on its own; stopping it now."
    Stop-Process -Id $ServerPid -Force
  }
  Start-Sleep -Seconds 2

  $headers = @{
    Accept = "application/vnd.github+json"
    "User-Agent" = "New-Eden-Companion-Updater"
    "X-GitHub-Api-Version" = "2022-11-28"
  }
  Write-UpdateLog "Checking the latest stable GitHub release."
  $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repository/releases/latest" -Headers $headers
  if ($release.draft -or $release.prerelease) {
    throw "GitHub returned a draft or prerelease instead of a stable release."
  }

  $latestVersion = ($release.tag_name -replace "^[vV]", "")
  [void](Convert-StableVersion $latestVersion)
  if ($latestVersion -ne $ExpectedVersion) {
    throw "The latest release changed from $ExpectedVersion to $latestVersion. Check for updates again."
  }
  if ((Convert-StableVersion $latestVersion) -le (Convert-StableVersion $CurrentVersion)) {
    throw "No newer stable release is available."
  }

  $zipName = "New-Eden-Companion-$latestVersion-Windows-x64.zip"
  $hashName = "$zipName.sha256"
  $zipAsset = @($release.assets) | Where-Object { $_.name -eq $zipName } | Select-Object -First 1
  $hashAsset = @($release.assets) | Where-Object { $_.name -eq $hashName } | Select-Object -First 1
  if (-not $zipAsset -or -not $hashAsset) {
    throw "Release $latestVersion is missing $zipName or its SHA-256 file."
  }

  $tempRoot = Join-Path $env:TEMP ("new-eden-companion-update-" + [guid]::NewGuid().ToString("N"))
  $downloadRoot = Join-Path $tempRoot "download"
  $extractRoot = Join-Path $tempRoot "extract"
  New-Item -ItemType Directory -Force -Path $downloadRoot, $extractRoot | Out-Null
  $zipPath = Join-Path $downloadRoot $zipName
  $hashPath = Join-Path $downloadRoot $hashName

  Write-UpdateLog "Downloading $zipName."
  Invoke-WebRequest -Uri $zipAsset.browser_download_url -Headers $headers -OutFile $zipPath -UseBasicParsing
  Invoke-WebRequest -Uri $hashAsset.browser_download_url -Headers $headers -OutFile $hashPath -UseBasicParsing

  $expectedHash = ((Get-Content -Raw -LiteralPath $hashPath).Trim() -split "\s+")[0].ToUpperInvariant()
  $actualHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToUpperInvariant()
  if ($expectedHash -ne $actualHash) {
    throw "The downloaded update failed SHA-256 verification."
  }
  Write-UpdateLog "SHA-256 verified."

  Expand-Archive -LiteralPath $zipPath -DestinationPath $extractRoot -Force
  $newPackageRoot = Find-ExpandedPackage $extractRoot
  foreach ($requiredPath in @("server.js", "runtime\node.exe", "scripts\start-portable.ps1", "scripts\update-portable.ps1", "Start New Eden Companion.cmd", "package.json")) {
    if (-not (Test-Path -LiteralPath (Join-Path $newPackageRoot $requiredPath))) {
      throw "The downloaded update is missing $requiredPath."
    }
  }

  $newPackageJson = Get-Content -Raw -LiteralPath (Join-Path $newPackageRoot "package.json") | ConvertFrom-Json
  if ($newPackageJson.version -ne $ExpectedVersion) {
    throw "The downloaded package reports version $($newPackageJson.version), expected $ExpectedVersion."
  }

  $suffix = [guid]::NewGuid().ToString("N")
  $stagingPath = Join-Path $parentRoot ".$packageLeaf.update-$suffix"
  $backupPath = Join-Path $parentRoot ".$packageLeaf.backup-$suffix"
  Write-UpdateLog "Staging the verified package next to the current install."
  Copy-DirectoryContents $newPackageRoot $stagingPath

  $envPath = Join-Path $PackageRoot ".env.local"
  if (Test-Path -LiteralPath $envPath) {
    Copy-Item -LiteralPath $envPath -Destination (Join-Path $stagingPath ".env.local") -Force
  }
  $dataPath = Join-Path $PackageRoot "data"
  if (Test-Path -LiteralPath $dataPath) {
    Copy-Item -LiteralPath $dataPath -Destination $stagingPath -Recurse -Force
  }

  Write-UpdateLog "Swapping the old package for the verified update."
  Move-WithRetry $PackageRoot $backupPath
  try {
    Move-WithRetry $stagingPath $PackageRoot
    $stagingPath = $null
  } catch {
    Move-WithRetry $backupPath $PackageRoot
    $backupPath = $null
    throw
  }

  $launcherPid = Start-Companion $PackageRoot
  if (-not (Wait-ForExpectedServer $ExpectedVersion)) {
    throw "The updated server did not become healthy within one minute."
  }

  Write-UpdateLog "Update to $ExpectedVersion completed successfully."
  if ($backupPath -and (Test-Path -LiteralPath $backupPath)) {
    Remove-Item -LiteralPath $backupPath -Recurse -Force
    $backupPath = $null
  }
  exit 0
} catch {
  $failure = $_.Exception.Message
  Write-UpdateLog "UPDATE FAILED: $failure"

  if ($launcherPid) {
    try { Stop-Process -Id $launcherPid -Force -ErrorAction SilentlyContinue } catch {}
    $launcherPid = $null
  }

  if ($backupPath -and (Test-Path -LiteralPath $backupPath)) {
    Stop-Port3000
    Start-Sleep -Seconds 1
    if (Test-Path -LiteralPath $PackageRoot) {
      try { Remove-Item -LiteralPath $PackageRoot -Recurse -Force } catch {}
    }
    try {
      Move-WithRetry $backupPath $PackageRoot
      $backupPath = $null
      Write-UpdateLog "The previous package was restored."
    } catch {
      Write-UpdateLog "Rollback also failed: $($_.Exception.Message)"
    }
  }

  if (Test-Path -LiteralPath (Join-Path $PackageRoot "scripts\start-portable.ps1")) {
    try {
      [void](Start-Companion $PackageRoot)
    } catch {
      Write-UpdateLog "Could not relaunch the previous package: $($_.Exception.Message)"
    }
  }

  Write-Host ""
  Write-Host "The update failed. Your previous copy was kept when rollback was possible." -ForegroundColor Red
  Write-Host "Log: $logPath" -ForegroundColor Yellow
  Write-Host $failure
  Start-Sleep -Seconds 10
  exit 1
} finally {
  if ($stagingPath -and (Test-Path -LiteralPath $stagingPath)) {
    try { Remove-Item -LiteralPath $stagingPath -Recurse -Force } catch {}
  }
  if ($tempRoot -and (Test-Path -LiteralPath $tempRoot)) {
    try { Remove-Item -LiteralPath $tempRoot -Recurse -Force } catch {}
  }
}
