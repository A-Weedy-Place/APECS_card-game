Option Explicit
Dim shell, files, root, powershell, command, result
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
root = files.GetParentFolderName(files.GetParentFolderName(WScript.ScriptFullName))
powershell = shell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"
shell.CurrentDirectory = root
command = Quote(powershell) & " -NoProfile -NonInteractive -WindowStyle Hidden -File " & Quote(root & "\scripts\run-model-overflow.ps1")
' A windowless parent keeps Task Scheduler tracking the worker without a terminal.
result = shell.Run(command, 0, True)
WScript.Quit result

Function Quote(value)
    Quote = Chr(34) & value & Chr(34)
End Function
