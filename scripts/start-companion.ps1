[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$minimumNode = [Version]"22.13.0"
$localUrl = "http://localhost:3000"
$envPath = Join-Path $projectRoot ".env.local"
$exampleEnvPath = Join-Path $projectRoot ".env.example"

function Write-Stage([string]$Message) {
  Write-Host ""
  Write-Host "== $Message ==" -ForegroundColor Cyan
}

function Get-EnvValue([string]$Path, [string]$Name) {
  if (-not (Test-Path -LiteralPath $Path)) { return "" }
  $line = Get-Content -LiteralPath $Path | Where-Object { $_ -match "^$([regex]::Escape($Name))=" } | Select-Object -First 1
  if (-not $line) { return "" }
  return ($line -replace "^[^=]+=", "").Trim().Trim('"').Trim("'")
}

function Set-EnvValue([string]$Path, [string]$Name, [string]$Value) {
  $lines = if (Test-Path -LiteralPath $Path) { @(Get-Content -LiteralPath $Path) } else { @() }
  $updated = $false
  for ($index = 0; $index -lt $lines.Count; $index++) {
    if ($lines[$index] -match "^$([regex]::Escape($Name))=") {
      $lines[$index] = "$Name=$Value"
      $updated = $true
      break
    }
  }
  if (-not $updated) { $lines += "$Name=$Value" }
  [System.IO.File]::WriteAllLines($Path, $lines, [System.Text.UTF8Encoding]::new($false))
}

function Test-CompanionPage {
  try {
    $response = Invoke-WebRequest -Uri $localUrl -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200 -and $response.Content -match "New Eden"
  } catch {
    return $false
  }
}

Set-Location -LiteralPath $projectRoot
Write-Host "New Eden Companion" -ForegroundColor Green
Write-Host "Keep this window open while you use the companion. Press Ctrl+C to stop it." -ForegroundColor DarkGray

Write-Stage "Checking this computer"
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $nodeCommand -or -not $npmCommand) {
  Write-Host "Node.js is not installed yet." -ForegroundColor Yellow
  Write-Host "Install the LTS version from https://nodejs.org/en/download, then double-click this launcher again."
  Start-Process "https://nodejs.org/en/download"
  exit 1
}

$nodeVersionText = (& node -p "process.versions.node").Trim()
try { $nodeVersion = [Version]$nodeVersionText } catch { throw "Node.js reported an unreadable version: $nodeVersionText" }
if ($nodeVersion -lt $minimumNode) {
  Write-Host "Node.js $nodeVersionText is installed, but version $minimumNode or newer is required." -ForegroundColor Yellow
  Write-Host "Update Node.js at https://nodejs.org/en/download, then run this launcher again."
  Start-Process "https://nodejs.org/en/download"
  exit 1
}
Write-Host "Node.js $nodeVersionText is ready."

Write-Stage "Preparing private settings"
if (-not (Test-Path -LiteralPath $envPath)) {
  if (-not (Test-Path -LiteralPath $exampleEnvPath)) { throw ".env.example is missing from the download." }
  Copy-Item -LiteralPath $exampleEnvPath -Destination $envPath
}

$authSecret = Get-EnvValue $envPath "AUTH_SECRET"
if ($authSecret.Length -lt 32) {
  $secretBytes = [byte[]]::new(32)
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($secretBytes)
  $authSecret = [Convert]::ToHexString($secretBytes).ToLowerInvariant()
  Set-EnvValue $envPath "AUTH_SECRET" $authSecret
  Write-Host "Created a private encryption key for this computer."
} else {
  Write-Host "Private encryption is already configured."
}

$clientId = Get-EnvValue $envPath "EVE_CLIENT_ID"
if (-not $clientId) {
  Write-Host ""
  Write-Host "Real character data is optional." -ForegroundColor Yellow
  Write-Host "Paste an EVE PKCE application Client ID below, or press Enter to explore the demo first."
  Write-Host "The beginner guide explains how to create one: docs\GETTING_STARTED.md" -ForegroundColor DarkGray
  $clientId = (Read-Host "EVE Client ID").Trim()
  if ($clientId) {
    Set-EnvValue $envPath "EVE_CLIENT_ID" $clientId
    Write-Host "Saved the public Client ID locally. No EVE password or token was requested."
  } else {
    Write-Host "Starting in demo mode. Double-click this launcher again whenever you want to connect EVE."
  }
}

Write-Stage "Preparing the app"
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "node_modules"))) {
  Write-Host "Installing the app for the first time. This can take a few minutes..."
  & npm.cmd ci
  if ($LASTEXITCODE -ne 0) { throw "The app download failed. Check your internet connection and try again." }
} else {
  Write-Host "App files are already installed."
}

$buildMarker = Join-Path $projectRoot ".next\BUILD_ID"
$needsBuild = -not (Test-Path -LiteralPath $buildMarker)
if (-not $needsBuild) {
  $buildTime = (Get-Item -LiteralPath $buildMarker).LastWriteTimeUtc
  $inputs = @(
    Get-ChildItem -LiteralPath (Join-Path $projectRoot "src") -Recurse -File
    Get-ChildItem -LiteralPath (Join-Path $projectRoot "public") -Recurse -File
    Get-Item -LiteralPath (Join-Path $projectRoot "package.json")
    Get-Item -LiteralPath (Join-Path $projectRoot "package-lock.json")
    Get-Item -LiteralPath (Join-Path $projectRoot "next.config.ts")
  )
  $needsBuild = $null -ne ($inputs | Where-Object { $_.LastWriteTimeUtc -gt $buildTime } | Select-Object -First 1)
}

if ($needsBuild) {
  Write-Host "Building this version for the first time..."
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw "The app could not be built. See the error above, then try again." }
} else {
  Write-Host "The current version is ready."
}

if (Test-CompanionPage) {
  Write-Host "The companion is already running. Opening it now."
  Start-Process $localUrl
  exit 0
}

$portInUse = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($portInUse) {
  throw "Port 3000 is already being used by another app. Close that app, then run New Eden Companion again."
}

Write-Stage "Launching"
Write-Host "Your browser will open automatically. Keep this window open."
$browserJob = Start-Job -ArgumentList $localUrl -ScriptBlock {
  param($Url)
  for ($attempt = 0; $attempt -lt 45; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        Start-Process $Url
        return
      }
    } catch {}
    Start-Sleep -Seconds 1
  }
}

try {
  & npm.cmd run start
  exit $LASTEXITCODE
} finally {
  Remove-Job -Job $browserJob -Force -ErrorAction SilentlyContinue
}
