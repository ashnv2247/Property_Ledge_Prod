Write-Output "=== SEARCHING ANTIGRAVITY LOGS & CRASH REPORTS ==="

$paths = @(
    "$env:APPDATA\Antigravity IDE",
    "$env:APPDATA\antigravity-ide",
    "$env:LOCALAPPDATA\Programs\Antigravity IDE",
    "$env:USERPROFILE\.gemini\antigravity-ide"
)

foreach ($p in $paths) {
    if (Test-Path $p) {
        Write-Output "--- Path: $p ---"
        Get-ChildItem -Path $p -Recurse -File -ErrorAction SilentlyContinue | Where-Object { 
            $_.Extension -in @('.log', '.dmp') -or $_.Name -match '(?i)(crash|error|renderer|gpu)'
        } | Select-Object FullName, Length, LastWriteTime | Sort-Object LastWriteTime -Descending | Select-Object -First 20 | Format-Table -AutoSize
    }
}
