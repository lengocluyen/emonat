$ErrorActionPreference = 'Stop'

$mainPath = Join-Path $PSScriptRoot '..\main.js'
$content = @(
  'import { mount } from "./src/bootstrap.js";',
  '',
  'mount();',
  ''
) -join "`r`n"

Set-Content -Encoding UTF8 -NoNewline -Path $mainPath -Value $content
Write-Host "Wrote $mainPath"
