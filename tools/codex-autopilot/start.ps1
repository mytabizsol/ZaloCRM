# MYTA CRM Codex Autopilot launcher. Suitable for Windows Task Scheduler.
$ErrorActionPreference='Stop'
$homeDir='D:\Apps\ZaloCRM-autopilot'
$runner='D:\Apps\ZaloCRM\tools\codex-autopilot\runner.mjs'
$nodeExe='C:\Program Files\nodejs\node.exe'
New-Item -ItemType Directory -Force $homeDir | Out-Null
if (Test-Path (Join-Path $homeDir 'STOP')) { exit 0 }
$stateFile=Join-Path $homeDir 'state.json'
if (Test-Path $stateFile) {
 try {
  $s=Get-Content $stateFile -Raw | ConvertFrom-Json
  if ($s.status -in @('blocked','fatal','stopped')) { exit 0 }
 } catch { }
}
$running=Get-CimInstance Win32_Process -Filter "name = 'node.exe'" -ErrorAction SilentlyContinue |
 Where-Object { $_.CommandLine -like '*codex-autopilot*runner.mjs*' }
if ($running) { exit 0 }
if (-not (Test-Path $nodeExe)) { throw "Node.js executable unavailable" }
Start-Process -FilePath $nodeExe -ArgumentList @($runner) -WorkingDirectory 'D:\Apps\ZaloCRM' -WindowStyle Hidden
