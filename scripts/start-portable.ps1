[CmdletBinding()]
param(
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$packageRoot = Split-Path -Parent $PSScriptRoot
$localUrl = "http://localhost:3000"
$nodePath = Join-Path $packageRoot "runtime\node.exe"
$serverPath = Join-Path $packageRoot "server.js"
$envPath = Join-Path $packageRoot ".env.local"
$exampleEnvPath = Join-Path $packageRoot ".env.example"
$packageJsonPath = Join-Path $packageRoot "package.json"

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

function New-AuthSecret {
  $secretBytes = [byte[]]::new(32)
  $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $random.GetBytes($secretBytes)
  } finally {
    $random.Dispose()
  }
  return -join ($secretBytes | ForEach-Object { $_.ToString("x2") })
}

function Get-Port3000Listeners {
  try {
    return @(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)
  } catch {
    return @()
  }
}

function Wait-ForPort3000Clear([int]$TimeoutMilliseconds = 10000) {
  $deadline = [DateTime]::UtcNow.AddMilliseconds($TimeoutMilliseconds)
  while ([DateTime]::UtcNow -lt $deadline) {
    if ((Get-Port3000Listeners).Count -eq 0) { return $true }
    Start-Sleep -Milliseconds 250
  }
  return (Get-Port3000Listeners).Count -eq 0
}

function Get-RunningCompanionVersion {
  try {
    $result = Invoke-RestMethod -Uri "$localUrl/api/update?local=1" -TimeoutSec 2
    $version = [string]$result.currentVersion
    if ($version -match '^\d+\.\d+\.\d+$') { return $version }
  } catch {}
  return $null
}

function Test-CompanionPage {
  try {
    $response = Invoke-WebRequest -Uri $localUrl -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200 -and $response.Content -match "New Eden"
  } catch {
    return $false
  }
}

function Stop-VerifiedCompanionListener([string]$RunningVersion, [string]$ExpectedVersion) {
  $listeners = @(Get-Port3000Listeners)
  if ($listeners.Count -eq 0) { return }

  Write-Host "New Eden Companion $RunningVersion is still using port 3000." -ForegroundColor Yellow
  Write-Host "This package is $ExpectedVersion, so the stale companion process will be stopped before launching the new copy." -ForegroundColor Yellow

  $pids = @($listeners | ForEach-Object { $_.OwningProcess } | Where-Object { $_ -and $_ -ne $PID } | Sort-Object -Unique)
  if ($pids.Count -eq 0) {
    throw "A stale New Eden Companion listener was detected, but Windows did not expose a stoppable process ID."
  }

  foreach ($listenerPid in $pids) {
    Stop-Process -Id $listenerPid -Force -ErrorAction Stop
  }

  if (-not (Wait-ForPort3000Clear 10000)) {
    throw "The older New Eden Companion instance did not release port 3000 after it was stopped."
  }
}

Set-Location -LiteralPath $packageRoot
Write-Host "New Eden Companion" -ForegroundColor Green
Write-Host "Keep this window open while you use the companion. Press Ctrl+C to stop it." -ForegroundColor DarkGray

Write-Stage "Checking the package"
if (-not (Test-Path -LiteralPath $nodePath)) { throw "The bundled Node.js runtime is missing. Download the Windows package again." }
if (-not (Test-Path -LiteralPath $serverPath)) { throw "The companion server is missing. Download the Windows package again." }
if (-not (Test-Path -LiteralPath $packageJsonPath)) { throw "package.json is missing from the portable package." }
$packageJson = Get-Content -Raw -LiteralPath $packageJsonPath | ConvertFrom-Json
$packageVersion = [string]$packageJson.version
if ($packageVersion -notmatch '^\d+\.\d+\.\d+$') { throw "The portable package reports an invalid version: $packageVersion" }
Write-Host "The self-contained Windows runtime is ready (version $packageVersion)."

Write-Stage "Preparing private settings"
if (-not (Test-Path -LiteralPath $envPath)) {
  if (-not (Test-Path -LiteralPath $exampleEnvPath)) { throw ".env.example is missing from the package." }
  Copy-Item -LiteralPath $exampleEnvPath -Destination $envPath
}

$authSecret = Get-EnvValue $envPath "AUTH_SECRET"
if ($authSecret.Length -lt 32) {
  $authSecret = New-AuthSecret
  Set-EnvValue $envPath "AUTH_SECRET" $authSecret
  Write-Host "Created a private encryption key for this copy."
} else {
  Write-Host "Private encryption is already configured."
}

$clientId = Get-EnvValue $envPath "EVE_CLIENT_ID"
if (-not $clientId) {
  Write-Host ""
  Write-Host "Real character data is optional." -ForegroundColor Yellow
  Write-Host "Paste an EVE PKCE application Client ID below, or press Enter to explore the demo first."
  Write-Host "The included Getting Started guide explains how to create one." -ForegroundColor DarkGray
  $clientId = (Read-Host "EVE Client ID").Trim()
  if ($clientId) {
    Set-EnvValue $envPath "EVE_CLIENT_ID" $clientId
    Write-Host "Saved the public Client ID locally. No EVE password or token was requested."
  } else {
    Write-Host "Starting in demo mode. Run this launcher again whenever you want to connect EVE."
  }
}

$runningVersion = Get-RunningCompanionVersion
if ($runningVersion) {
  if ($runningVersion -eq $packageVersion) {
    Write-Host "New Eden Companion $packageVersion is already running."
    if (-not $NoBrowser) { Start-Process $localUrl }
    exit 0
  }
  Stop-VerifiedCompanionListener $runningVersion $packageVersion
} elseif (Test-CompanionPage) {
  throw "Another New Eden Companion instance is already using port 3000, but its version could not be verified. Close that copy and try again."
}

$portInUse = @(Get-Port3000Listeners)
if ($portInUse.Count -gt 0) {
  throw "Port 3000 is already being used by another app. Close that app, then run New Eden Companion again."
}

Write-Stage "Launching"
if ($NoBrowser) {
  Write-Host "Launching without opening a browser."
  $browserJob = $null
} else {
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
}

$env:HOSTNAME = "127.0.0.1"
$env:PORT = "3000"
$env:NODE_ENV = "production"

try {
  & $nodePath "--env-file-if-exists=$envPath" $serverPath
  exit $LASTEXITCODE
} finally {
  if ($browserJob) {
    Remove-Job -Job $browserJob -Force -ErrorAction SilentlyContinue
  }
}
