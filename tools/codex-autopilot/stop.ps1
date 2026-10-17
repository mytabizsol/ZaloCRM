# Stop future Codex invocations and (optionally) terminate current task.
$homeDir='D:\Apps\ZaloCRM-autopilot'
New-Item -ItemType Directory -Force $homeDir | Out-Null
New-Item -ItemType File -Force (Join-Path $homeDir 'STOP') | Out-Null
Write-Output 'STOP flag set. Current Codex worker may finish; use -Force to terminate process tree.'
if ($args -contains '-Force') {
 $r=Get-CimInstance Win32_Process -Filter "name = 'node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like '*codex-autopilot*runner.mjs*' }
 foreach($p in $r){& taskkill.exe /PID $p.ProcessId /T /F}
}
