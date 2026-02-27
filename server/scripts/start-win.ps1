param(
  [int]$Port = 5173
)

$ErrorActionPreference = 'Stop'

$serverRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pidPath = Join-Path $serverRoot '.emonat-server.pid'
$logOut = Join-Path $serverRoot 'server.log'
$logErr = Join-Path $serverRoot 'server.err.log'

# If already running (pid file), don't start another.
if (Test-Path $pidPath) {
  $existingPid = (Get-Content $pidPath -ErrorAction SilentlyContinue | Select-Object -First 1)
  if ($existingPid -match '^[0-9]+$') {
    $p = Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue
    if ($p) {
      Write-Host "Server already running (PID $existingPid)."
      exit 0
    }
  }
}

# If something else is listening on the port, stop it (best-effort).
$listen = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listen) {
  $pids = $listen | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pid in $pids) {
    Write-Host "Stopping process PID $pid on port $Port"
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
  }
}

# Start detached
$nodeExe = (Get-Command node -ErrorAction Stop).Source
$proc = Start-Process -FilePath $nodeExe `
  -ArgumentList @('index.js') `
  -WorkingDirectory $serverRoot `
  -WindowStyle Minimized `
  -RedirectStandardOutput $logOut `
  -RedirectStandardError $logErr `
  -PassThru

Set-Content -Path $pidPath -Value $proc.Id
Write-Host "Started server (PID $($proc.Id)) on http://localhost:$Port"
