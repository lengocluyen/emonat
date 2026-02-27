param(
  [int]$Port = 5173
)

$ErrorActionPreference = 'Stop'

$serverRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pidPath = Join-Path $serverRoot '.emonat-server.pid'

$stopped = $false

if (Test-Path $pidPath) {
  $serverPid = (Get-Content $pidPath -ErrorAction SilentlyContinue | Select-Object -First 1)
  if ($serverPid -match '^[0-9]+$') {
    $p = Get-Process -Id ([int]$serverPid) -ErrorAction SilentlyContinue
    if ($p) {
      Stop-Process -Id ([int]$serverPid) -Force -ErrorAction SilentlyContinue
      Write-Host "Stopped server PID $serverPid"
      $stopped = $true
    }
  }
  Remove-Item $pidPath -ErrorAction SilentlyContinue
}

# Best-effort: if something is still listening, stop it.
$listen = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listen) {
  $pids = $listen | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procPid in $pids) {
    Stop-Process -Id $procPid -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped process PID $procPid on port $Port"
    $stopped = $true
  }
}

if (-not $stopped) {
  Write-Host "Nothing to stop on port $Port"
}
