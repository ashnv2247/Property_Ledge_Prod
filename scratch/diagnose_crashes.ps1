Write-Output "=== APPLICATION EVENT LOG (CRASHES / ERRORS LAST 48 HOURS) ==="
$cutoff = (Get-Date).AddHours(-48)

$events = Get-WinEvent -FilterHashtable @{
    LogName = 'Application'
    Level = @(1, 2) # Error, Critical
    StartTime = $cutoff
} -ErrorAction SilentlyContinue | Where-Object {
    $_.ProviderName -match '(?i)(Application Error|Application Hang|Windows Error Reporting|Electron|Antigravity|Chrome)' -or
    $_.Message -match '(?i)(Antigravity|electron|chrome\.exe|node\.exe|playwright)'
}

if ($events) {
    $events | Select-Object TimeCreated, Id, ProviderName, @{Name="Summary"; Expression={ ($_.Message -split "`n")[0] }} | Format-Table -AutoSize
    
    Write-Output "`n=== DETAILED ERROR MESSAGES ==="
    foreach ($e in $events | Select-Object -First 10) {
        Write-Output "----------------------------------------------------"
        Write-Output "Time: $($e.TimeCreated) | EventId: $($e.Id) | Source: $($e.ProviderName)"
        Write-Output $e.Message
    }
} else {
    Write-Output "No application crash/hang events found matching Antigravity/Chrome/Electron/Node in the last 48 hours."
}

Write-Output "`n=== RECENT WINDOWS ERROR REPORTING ARCHIVE ==="
$werPath = "$env:LOCALAPPDATA\CrashDumps"
if (Test-Path $werPath) {
    Get-ChildItem -Path $werPath -File | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
} else {
    Write-Output "No CrashDumps folder at $werPath."
}
