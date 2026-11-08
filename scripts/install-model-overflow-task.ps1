$ErrorActionPreference = 'Stop'

$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if (!(Test-Path -LiteralPath (Join-Path $root '.env.worker.local') -PathType Leaf)) {
    throw 'The local scoring worker credential file is missing.'
}
New-Item -ItemType Directory -Path (Join-Path $root 'data') -Force | Out-Null

$taskName = 'APECS Game Scoring Overflow'
$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$node = (Get-Command node.exe).Source.Replace("'", "''")
$powershell = (Get-Command powershell.exe).Source
$arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -Command "& ''{0}'' --import tsx scripts/model-worker.ts --overflow *>> ''data/model-worker-overflow.log''; exit $LASTEXITCODE"' -f $node
$action = New-ScheduledTaskAction -Execute $powershell -Argument $arguments -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal `
    -Settings $settings -Description 'Helps the Vercel worker by processing waiting En-ROADS scoring jobs.' -Force | Out-Null
Start-ScheduledTask -TaskName $taskName
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State
