$all = Get-CimInstance Win32_Process
$procMap = @{}
foreach ($p in $all) {
    $procMap[[int]$p.ProcessId] = $p
}

Write-Output "=== NODE & ELECTRON PROCESSES ==="
$nodeProcs = $all | Where-Object { $_.Name -match '(?i)(node|electron|antigravity)' }
$nodeResults = foreach ($n in $nodeProcs) {
    $pidVal = [int]$n.ProcessId
    $ppidVal = [int]$n.ParentProcessId
    $parent = $procMap[$ppidVal]
    $parentName = if ($parent) { "$($parent.Name) ($ppidVal)" } else { "Unknown ($ppidVal)" }
    $wsMB = [math]::Round($n.WorkingSetSize / 1MB, 2)
    $cmd = if ($n.CommandLine) { 
        $c = $n.CommandLine -replace '(?i)(token|key|secret|password|auth)=([^& "]+)', '$1=REDACTED'
        if ($c.Length -gt 150) { $c.Substring(0, 147) + '...' } else { $c }
    } else { '' }

    [PSCustomObject]@{
        Name = $n.Name
        PID = $pidVal
        PPID = $ppidVal
        Parent = $parentName
        WS_MB = $wsMB
        Created = if ($n.CreationDate) { $n.CreationDate.ToString('yyyy-MM-dd HH:mm:ss') } else { '' }
        Command = $cmd
    }
}
$nodeResults | Format-Table -Property Name, PID, PPID, WS_MB, Parent, Created -AutoSize
$nodeResults | Format-List -Property PID, Command

Write-Output "`n=== LISTENING TCP PORTS (Web & Dev Server Ports) ==="
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in @(3000, 3001, 3002, 3003, 8080, 8081, 9222, 9223, 54321, 54322, 5432) -or ($_.LocalPort -ge 3000 -and $_.LocalPort -le 3010) } | Select-Object LocalAddress, LocalPort, OwningProcess, @{Name="ProcessName";Expression={ (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName }} | Format-Table -AutoSize
