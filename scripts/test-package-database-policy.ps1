$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "package-database-policy.ps1")

function Assert-Throws([scriptblock]$Action, [string]$ExpectedText) {
  try {
    & $Action
  } catch {
    $message = $_.Exception.Message
    if ($message -notlike "*$ExpectedText*") {
      throw "Expected error containing '$ExpectedText' but got: $message"
    }
    return
  }
  throw "Expected an exception containing '$ExpectedText', but no exception was thrown."
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("nec-package-policy-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempRoot | Out-Null

try {
  $projectRoot = Join-Path $tempRoot "project"
  $packageRoot = Join-Path $tempRoot "package"
  New-Item -ItemType Directory -Force -Path $projectRoot, $packageRoot | Out-Null

  Assert-Throws { Assert-PackageDatabasePolicy $packageRoot } "missing its required static EVE database"
  Assert-Throws { Copy-StaticDatabaseForPackage $projectRoot $packageRoot | Out-Null } "required static EVE database is missing"

  $sourceStaticDirectory = Join-Path $projectRoot "static"
  New-Item -ItemType Directory -Force -Path $sourceStaticDirectory | Out-Null
  [System.IO.File]::WriteAllText((Join-Path $sourceStaticDirectory "eve-static.db"), "static-db-fixture")

  $copied = Copy-StaticDatabaseForPackage $projectRoot $packageRoot
  if (-not (Test-Path -LiteralPath $copied -PathType Leaf)) {
    throw "Static database was not copied into the package."
  }
  if ((Get-Content -Raw -LiteralPath $copied) -ne "static-db-fixture") {
    throw "Copied static database contents did not match the source fixture."
  }
  Assert-PackageDatabasePolicy $packageRoot

  $dataDirectory = Join-Path $packageRoot "data"
  New-Item -ItemType Directory -Force -Path $dataDirectory | Out-Null
  [System.IO.File]::WriteAllText((Join-Path $dataDirectory "eve-companion.db"), "private")
  Assert-Throws { Assert-PackageDatabasePolicy $packageRoot } "private or unexpected runtime data"
  Remove-Item -LiteralPath $dataDirectory -Recurse -Force

  [System.IO.File]::WriteAllText((Join-Path $packageRoot "static\other.sqlite"), "unexpected")
  Assert-Throws { Assert-PackageDatabasePolicy $packageRoot } "private or unexpected runtime data"
  Remove-Item -LiteralPath (Join-Path $packageRoot "static\other.sqlite") -Force

  [System.IO.File]::WriteAllText((Join-Path $packageRoot ".env.local"), "SECRET=fixture")
  Assert-Throws { Assert-PackageDatabasePolicy $packageRoot } "private or unexpected runtime data"
  Remove-Item -LiteralPath (Join-Path $packageRoot ".env.local") -Force

  Assert-PackageDatabasePolicy $packageRoot
  Write-Host "Package database policy smoke test passed."
} finally {
  if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
  }
}
