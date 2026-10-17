$d='D:\Apps\ZaloCRM-autopilot'
if (Test-Path "$d\state.json") {
 Get-Content "$d\state.json" -Raw
} else { Write-Output 'No state yet' }
if (Test-Path "$d\autopilot.log") {
 Get-Content "$d\autopilot.log" -Tail 12
}
$procs=Get-CimInstance Win32_Process -Filter "name = 'node.exe'" -ErrorAction SilentlyContinue |
 Where-Object { $_.CommandLine -like '*codex-autopilot*runner.mjs*' }
Write-Output ('Running PID(s): '+ (($procs.ProcessId) -join ', '))
