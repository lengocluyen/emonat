$ErrorActionPreference = 'Stop'

$mainPath = Join-Path $PSScriptRoot '..\main.js'
$outPath  = Join-Path $PSScriptRoot '..\\src\\App.js'

$lines = Get-Content $mainPath
$match = $lines | Select-String -SimpleMatch 'const html = htm.bind(React.createElement);' | Select-Object -First 1
if (-not $match) {
  throw "Cannot find 'const html = htm.bind(React.createElement);' in $mainPath"
}

$startIndex = $match.LineNumber - 1

# Drop the final mount line (createRoot(...).render(...))
if ($lines[-1] -match 'createRoot\(document\.getElementById\("root"\)\)\.render') {
  $lines = $lines[0..($lines.Length-2)]
}

$body = ($lines[$startIndex..($lines.Length-1)] -join "`r`n")

$import = @(
  'import {',
  '  React,',
  '  useCallback,',
  '  useEffect,',
  '  useMemo,',
  '  useRef,',
  '  useState,',
  '  createContext,',
  '  useContext,',
  '  htm,',
  '  ReactFlow,',
  '  Background,',
  '  Controls,',
  '  Handle,',
  '  MiniMap,',
  '  Position,',
  '  addEdge,',
  '  applyEdgeChanges,',
  '  applyNodeChanges,',
  '  MarkerType,',
  '  dagre,',
  '} from "./vendor.js";',
  '',
  ''
) -join "`r`n"

$out = $import + $body + "`r`n`r`nexport { App };`r`nexport default App;`r`n"

Set-Content -Encoding UTF8 -NoNewline -Path $outPath -Value $out
Write-Host "Wrote $outPath"
