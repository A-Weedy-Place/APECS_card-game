$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$node = (Get-Command node.exe).Source
$worker = Start-Process -FilePath $node -ArgumentList @('--import', 'tsx', 'scripts/model-worker.ts', '--overflow') `
    -WorkingDirectory $root -WindowStyle Hidden -PassThru -Wait `
    -RedirectStandardOutput (Join-Path $root 'data/model-worker-overflow-current.log') `
    -RedirectStandardError (Join-Path $root 'data/model-worker-overflow-current-errors.log')
exit $worker.ExitCode
