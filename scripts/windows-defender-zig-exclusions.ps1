# Adds Microsoft Defender folder and process exclusions for Zig / agent-native builds.
# Must run elevated. If not admin, re-launches this script with UAC.
# From openpencil/:  bun run agent:defender-exclusions
# Or:  powershell -ExecutionPolicy Bypass -File scripts/windows-defender-zig-exclusions.ps1

$ErrorActionPreference = 'Stop'

function Test-IsAdministrator {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdministrator)) {
  Write-Host 'Administrator rights are required. Re-launching with UAC...' -ForegroundColor Yellow
  $here = $MyInvocation.MyCommand.Path
  $psi = Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $here
  ) -PassThru -Wait
  if ($null -eq $psi) { exit 1 }
  exit $psi.ExitCode
}

if (-not (Get-Command Get-MpPreference -ErrorAction SilentlyContinue)) {
  Write-Warning 'Microsoft Defender cmdlets not found (Get-MpPreference). This script needs Windows with Defender.'
  exit 1
}

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$dirPaths = @(
  'C:\zig',
  (Join-Path 'C:\zig' 'zig-project-cache'),
  (Join-Path 'C:\zig' 'zig-global-cache'),
  (Join-Path $root '.zig-0.15.2'),
  (Join-Path $root '.zig-openpencil-project-cache'),
  (Join-Path $root '.zig-openpencil-global-cache'),
  (Join-Path $root 'packages' 'agent-native'),
  (Join-Path $root '.zig-0.15.2' 'zig-x86_64-windows-0.15.2' 'zig-build-project-cache'),
  (Join-Path $root '.zig-0.15.2' 'zig-x86_64-windows-0.15.2' 'zig-build-global-cache'),
  (Join-Path $root '.zig-0.15.2' 'zig-build-project-cache'),
  (Join-Path $root '.zig-0.15.2' 'zig-build-global-cache'),
  (Join-Path $env:USERPROFILE '.openpencil-zig-project-cache'),
  (Join-Path $env:USERPROFILE '.openpencil-zig-global-cache'),
  (Join-Path $env:TEMP 'openpencil-zig-project-cache'),
  (Join-Path $env:TEMP 'openpencil-zig-global-cache')
)

$extraFromEnv = @()
if ($env:BUILDDEV_ZIG_CACHE_ROOT) {
  $br = $env:BUILDDEV_ZIG_CACHE_ROOT.Trim().TrimEnd('\')
  $extraFromEnv = @(
    (Join-Path $br 'zig-project-cache'),
    (Join-Path $br 'zig-global-cache')
  )
}

$zigExeCandidates = @(
  (Join-Path $root '.zig-0.15.2' 'zig-x86_64-windows-0.15.2' 'zig.exe'),
  (Join-Path $root '.zig-0.15.2' 'zig.exe')
)

$existingPaths = [System.Collections.Generic.HashSet[string]]::new(
  [StringComparer]::OrdinalIgnoreCase
)
foreach ($x in @((Get-MpPreference).ExclusionPath)) {
  if ($x) { [void]$existingPaths.Add([System.IO.Path]::GetFullPath($x)) }
}

function Resolve-ExclusionPath([string]$path) {
  if (Test-Path -LiteralPath $path) {
    return (Resolve-Path -LiteralPath $path).Path
  }
  return [System.IO.Path]::GetFullPath($path)
}

foreach ($p in ($dirPaths + $extraFromEnv)) {
  try {
    $norm = Resolve-ExclusionPath $p
    if ($existingPaths.Contains($norm)) {
      Write-Host "Already excluded (folder): $norm"
      continue
    }
    Add-MpPreference -ExclusionPath $norm
    [void]$existingPaths.Add($norm)
    Write-Host "Added folder exclusion: $norm" -ForegroundColor Green
  } catch {
    Write-Warning "Folder exclusion failed for ${p}: $_"
  }
}

$existingProc = [System.Collections.Generic.HashSet[string]]::new(
  [StringComparer]::OrdinalIgnoreCase
)
foreach ($x in @((Get-MpPreference).ExclusionProcess)) {
  if ($x) { [void]$existingProc.Add([System.IO.Path]::GetFullPath($x)) }
}

foreach ($z in $zigExeCandidates) {
  if (-not (Test-Path -LiteralPath $z)) { continue }
  try {
    Unblock-File -LiteralPath $z -ErrorAction SilentlyContinue
  } catch {}
  $norm = (Resolve-Path -LiteralPath $z).Path
  if ($existingProc.Contains($norm)) {
    Write-Host "Already excluded (process): $norm"
    continue
  }
  try {
    Add-MpPreference -ExclusionProcess $norm
    [void]$existingProc.Add($norm)
    Write-Host "Added process exclusion: $norm" -ForegroundColor Green
  } catch {
    Write-Warning "Process exclusion failed for ${z}: $_"
  }
}

if (Test-Path -LiteralPath 'C:\zig') {
  try {
    Get-ChildItem -LiteralPath 'C:\zig' -Recurse -File -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue
    Write-Host 'Unblocked downloads mark (Zone.Identifier) under C:\zig if present.' -ForegroundColor DarkGray
  } catch {}
}

Write-Host ''
Write-Host 'Done. Run: bun run agent:build:clean then bun run agent:build' -ForegroundColor Cyan
Write-Host 'If AccessDenied remains: Windows Security > Ransomware protection > Controlled folder access.' -ForegroundColor DarkGray
