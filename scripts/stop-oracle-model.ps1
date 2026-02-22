$processes = Get-Process | Where-Object { $_.ProcessName -eq "llama-server" }

if (!$processes) {
  Write-Output "No llama-server process found."
  exit 0
}

$processes | Stop-Process -Force
Write-Output "Stopped llama-server process(es): $($processes.Id -join ', ')"
