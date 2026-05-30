$port = 3001
$pids = netstat -ano | Select-String ":$port " | ForEach-Object {
    ($_.Line.Trim() -split '\s+')[-1]
} | Sort-Object -Unique | Where-Object { $_ -match '^\d+$' }

foreach ($p in $pids) {
    try {
        Stop-Process -Id ([int]$p) -Force
        Write-Host "Killed PID $p"
    } catch {
        Write-Host "Could not kill PID $p"
    }
}
Write-Host "Done"
