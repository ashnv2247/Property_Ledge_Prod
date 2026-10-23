$all = Get-CimInstance Win32_Process
$procMap = @{}
foreach ($p in $all) {
    $procMap[[int]$p.ProcessId] = $p
}

function Get-ProcRole($cmd) {
    if ([string]::IsNullOrEmpty($cmd)) { return 'main/unknown' }
    if ($cmd -match '--type=renderer') { return 'renderer' }
    if ($cmd -match '--type=gpu-process') { return 'gpu-process' }
    if ($cmd -match '--type=utility') { return 'utility' }
    if ($cmd -match '--type=crashpad-handler') { return 'crashpad-handler' }
    if ($cmd -match '--type=watcher') { return 'watcher' }
    if ($cmd -match '--type=zygote') { return 'zygote' }
    return 'main-browser'
}

function Redact-Cmd($cmd) {
    if ([string]::IsNullOrEmpty($cmd)) { return '' }
    $r = $cmd -replace '(?i)(token|key|secret|password|auth)=([^& "]+)', '$1=REDACTED'
    if ($r.Length -gt 160) { return ($r.Substring(0, 157) + '...') }
    return $r
}

$browsers = $all | Where-Object { $_.Name -in @('chrome.exe', 'msedge.exe') }

$results = foreach ($b in $browsers) {
    $pidVal = [int]$b.ProcessId
    $ppidVal = [int]$b.ParentProcessId
    $parent = $procMap[$ppidVal]
    $parentName = if ($parent) { "$($parent.Name) ($ppidVal)" } else { "Unknown ($ppidVal)" }
    $role = Get-ProcRole $b.CommandLine
    $wsMB = [math]::Round($b.WorkingSetSize / 1MB, 2)

    [PSCustomObject]@{
        Name = $b.Name
        PID = $pidVal
        PPID = $ppidVal
        Parent = $parentName
        Role = $role
        WS_MB = $wsMB
        Created = if ($b.CreationDate) { $b.CreationDate.ToString('yyyy-MM-dd HH:mm:ss') } else { '' }
        CmdSnippet = Redact-Cmd $b.CommandLine
    }
}

Write-Output "=== BROWSER PROCESS INVENTORY SUMMARY ==="
$results | Group-Object Name | ForEach-Object {
    $totalMem = [math]::Round(($_.Group | Measure-Object -Property WS_MB -Sum).Sum, 2)
    Write-Output "$($_.Name): $($_.Count) processes, Total WorkingSet: $totalMem MB"
}

Write-Output "`n=== BREAKDOWN BY ROLE ==="
$results | Group-Object Name, Role | ForEach-Object {
    $totalMem = [math]::Round(($_.Group | Measure-Object -Property WS_MB -Sum).Sum, 2)
    $nameRole = $_.Name
    Write-Output "[$nameRole]: $($_.Count) processes, Total WorkingSet: $totalMem MB"
}

Write-Output "`n=== ALL BROWSER PROCESSES (Sorted by WS_MB Descending) ==="
$results | Sort-Object WS_MB -Descending | Format-Table -Property Name, PID, PPID, Role, WS_MB, Parent, Created -AutoSize

Write-Output "`n=== MAIN PROCESSES COMMAND LINES ==="
$results | Where-Object { $_.Role -eq 'main-browser' } | Format-List -Property Name, PID, PPID, Parent, Created, CmdSnippet
