[CmdletBinding()]
param(
  [string]$NodeVersion = "",
  [string]$OutputDirectory = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$packageJsonPath = Join-Path $projectRoot "package.json"
$packageJson = Get-Content -Raw -LiteralPath $packageJsonPath | ConvertFrom-Json
$appVersion = $packageJson.version

if (-not $NodeVersion) {
  $NodeVersion = (& node -p "process.versions.node").Trim()
}
if ($NodeVersion -notmatch "^\d+\.\d+\.\d+$") {
  throw "Node.js reported an unreadable version: $NodeVersion"
}

$distRoot = if ($OutputDirectory) {
  [System.IO.Path]::GetFullPath($OutputDirectory)
} else {
  Join-Path $projectRoot "dist"
}
$packageName = "New-Eden-Companion-$appVersion-Windows-x64"
$packageRoot = Join-Path $distRoot $packageName
$zipPath = Join-Path $distRoot "$packageName.zip"

function Assert-ChildPath([string]$Parent, [string]$Child) {
  $parentPath = [System.IO.Path]::GetFullPath($Parent).TrimEnd('\') + '\'
  $childPath = [System.IO.Path]::GetFullPath($Child)
  if (-not $childPath.StartsWith($parentPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify a path outside $Parent`: $Child"
  }
}

function Copy-DirectoryContents([string]$Source, [string]$Destination) {
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  Get-ChildItem -LiteralPath $Source -Force | Copy-Item -Destination $Destination -Recurse -Force
}

Set-Location -LiteralPath $projectRoot
Write-Host "Building New Eden Companion $appVersion..." -ForegroundColor Cyan
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "The production build failed." }

$standaloneRoot = Join-Path $projectRoot ".next\standalone"
if (-not (Test-Path -LiteralPath (Join-Path $standaloneRoot "server.js"))) {
  throw "Next.js did not produce the standalone server."
}

New-Item -ItemType Directory -Force -Path $distRoot | Out-Null
Assert-ChildPath $distRoot $packageRoot
Assert-ChildPath $distRoot $zipPath
if (Test-Path -LiteralPath $packageRoot) { Remove-Item -LiteralPath $packageRoot -Recurse -Force }
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
New-Item -ItemType Directory -Force -Path $packageRoot | Out-Null

Copy-DirectoryContents $standaloneRoot $packageRoot
Copy-DirectoryContents (Join-Path $projectRoot ".next\static") (Join-Path $packageRoot ".next\static")
Copy-DirectoryContents (Join-Path $projectRoot "public") (Join-Path $packageRoot "public")

# Next.js output tracing can copy runtime files that happen to exist while the
# build runs. A release must never inherit a developer's private environment or
# session database.
foreach ($relativePrivatePath in @(".env.local", "data")) {
  $privatePath = Join-Path $packageRoot $relativePrivatePath
  Assert-ChildPath $packageRoot $privatePath
  if (Test-Path -LiteralPath $privatePath) {
    Remove-Item -LiteralPath $privatePath -Recurse -Force
  }
}

New-Item -ItemType Directory -Force -Path (Join-Path $packageRoot "scripts") | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot "scripts\start-portable.ps1") -Destination (Join-Path $packageRoot "scripts\start-portable.ps1")
Copy-Item -LiteralPath (Join-Path $projectRoot "Start New Eden Companion.cmd") -Destination $packageRoot
Copy-Item -LiteralPath (Join-Path $projectRoot ".env.example") -Destination $packageRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "LICENSE") -Destination $packageRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "README.md") -Destination $packageRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "docs\GETTING_STARTED.md") -Destination (Join-Path $packageRoot "GETTING STARTED.md")
Copy-Item -LiteralPath (Join-Path $projectRoot "docs\TROUBLESHOOTING.md") -Destination (Join-Path $packageRoot "TROUBLESHOOTING.md")

$privateArtifacts = Get-ChildItem -LiteralPath $packageRoot -Force -Recurse -File | Where-Object {
  $_.Name -eq ".env.local" -or $_.Extension -in @(".db", ".sqlite", ".sqlite3")
}
if ($privateArtifacts) {
  throw "Refusing to package private runtime data: $($privateArtifacts.FullName -join ', ')"
}

$startHere = @"
NEW EDEN COMPANION

1. Double-click "Start New Eden Companion.cmd".
2. Press Enter at the Client ID prompt to explore the demo, or paste your EVE PKCE Client ID.
3. Keep the launcher window open while using the companion.

Node.js does not need to be installed. This package includes its own runtime.
See "GETTING STARTED.md" to connect an EVE character.
"@
[System.IO.File]::WriteAllText((Join-Path $packageRoot "START HERE.txt"), $startHere, [System.Text.UTF8Encoding]::new($false))

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("new-eden-companion-package-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempRoot | Out-Null
try {
  $nodeArchiveName = "node-v$NodeVersion-win-x64.zip"
  $nodeBaseUrl = "https://nodejs.org/dist/v$NodeVersion"
  $nodeArchivePath = Join-Path $tempRoot $nodeArchiveName
  $checksumsPath = Join-Path $tempRoot "SHASUMS256.txt"

  Write-Host "Downloading and verifying Node.js $NodeVersion..." -ForegroundColor Cyan
  Invoke-WebRequest -Uri "$nodeBaseUrl/$nodeArchiveName" -OutFile $nodeArchivePath
  Invoke-WebRequest -Uri "$nodeBaseUrl/SHASUMS256.txt" -OutFile $checksumsPath
  $checksumLine = Get-Content -LiteralPath $checksumsPath | Where-Object { $_ -match "\s$([regex]::Escape($nodeArchiveName))$" } | Select-Object -First 1
  if (-not $checksumLine) { throw "Node.js did not publish a checksum for $nodeArchiveName." }
  $expectedHash = ($checksumLine -split "\s+")[0].ToUpperInvariant()
  $actualHash = (Get-FileHash -LiteralPath $nodeArchivePath -Algorithm SHA256).Hash.ToUpperInvariant()
  if ($actualHash -ne $expectedHash) { throw "The Node.js download failed its SHA-256 verification." }

  Expand-Archive -LiteralPath $nodeArchivePath -DestinationPath $tempRoot
  $nodeSourceRoot = Join-Path $tempRoot "node-v$NodeVersion-win-x64"
  $runtimeRoot = Join-Path $packageRoot "runtime"
  New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
  Copy-Item -LiteralPath (Join-Path $nodeSourceRoot "node.exe") -Destination $runtimeRoot
  Copy-Item -LiteralPath (Join-Path $nodeSourceRoot "LICENSE") -Destination (Join-Path $runtimeRoot "NODE-LICENSE.txt")
} finally {
  Assert-ChildPath ([System.IO.Path]::GetTempPath()) $tempRoot
  if (Test-Path -LiteralPath $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
}

Write-Host "Creating $zipPath..." -ForegroundColor Cyan
Compress-Archive -LiteralPath $packageRoot -DestinationPath $zipPath -CompressionLevel Optimal
$zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
[System.IO.File]::WriteAllText("$zipPath.sha256", "$zipHash  $([System.IO.Path]::GetFileName($zipPath))`n", [System.Text.UTF8Encoding]::new($false))

Write-Host "Windows package ready:" -ForegroundColor Green
Write-Host $zipPath
Write-Host "SHA-256: $zipHash"
