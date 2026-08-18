Set-StrictMode -Version Latest

function Get-NormalizedFullPath([string]$Path) {
  return [System.IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
}

function Copy-StaticDatabaseForPackage([string]$ProjectRoot, [string]$PackageRoot) {
  $source = Join-Path $ProjectRoot "static\eve-static.db"
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "The required static EVE database is missing: $source. Build or download the validated SDE database before packaging."
  }

  $destinationDirectory = Join-Path $PackageRoot "static"
  $destination = Join-Path $destinationDirectory "eve-static.db"
  New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
  Copy-Item -LiteralPath $source -Destination $destination -Force
  return $destination
}

function Assert-PackageDatabasePolicy([string]$PackageRoot) {
  $root = Get-NormalizedFullPath $PackageRoot
  $allowedStaticDatabase = Get-NormalizedFullPath (Join-Path $root "static\eve-static.db")

  if (-not (Test-Path -LiteralPath $allowedStaticDatabase -PathType Leaf)) {
    throw "The packaged application is missing its required static EVE database: $allowedStaticDatabase"
  }

  $forbiddenArtifacts = Get-ChildItem -LiteralPath $root -Force -Recurse -File | Where-Object {
    if ($_.Name -eq ".env.local") { return $true }
    if ($_.Extension -notin @(".db", ".sqlite", ".sqlite3")) { return $false }
    $candidate = Get-NormalizedFullPath $_.FullName
    return -not [System.StringComparer]::OrdinalIgnoreCase.Equals($candidate, $allowedStaticDatabase)
  }

  if ($forbiddenArtifacts) {
    throw "Refusing to package private or unexpected runtime data: $($forbiddenArtifacts.FullName -join ', ')"
  }
}
