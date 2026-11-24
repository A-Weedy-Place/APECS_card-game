$ErrorActionPreference = 'Stop'

$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if (!(Test-Path -LiteralPath (Join-Path $root '.env.worker.local') -PathType Leaf)) {
    throw 'The local scoring worker credential file is missing.'
}
New-Item -ItemType Directory -Path (Join-Path $root 'data') -Force | Out-Null

$taskName = 'APECS Game Scoring Overflow'
$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$scriptHost = Join-Path $env:SystemRoot 'System32\wscript.exe'
if (!(Test-Path -LiteralPath $scriptHost -PathType Leaf)) {
    throw 'Windows Script Host is required for the windowless scoring task.'
}
$arguments = '//B //NoLogo "{0}"' -f (Join-Path $PSScriptRoot 'run-model-overflow.vbs')
$action = New-ScheduledTaskAction -Execute $scriptHost -Argument $arguments -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
$retryTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) -RepetitionInterval (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($trigger, $retryTrigger) -Principal $principal `
    -Settings $settings -Description 'Helps the Vercel worker by processing waiting En-ROADS scoring jobs.' -Force | Out-Null
Start-ScheduledTask -TaskName $taskName
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State
