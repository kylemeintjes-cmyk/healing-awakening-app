$ErrorActionPreference = "Stop"

$serverExe = "C:\Users\kylem\llama.cpp\build\bin\Release\llama-server.exe"
$modelPath = "C:\Users\kylem\.lmstudio\models\KOracle\kyle_oracle_merged.Q8_0.gguf"
$serverHost = "127.0.0.1"
$port = 1234
$ctx = 2048
$apiBase = "http://$serverHost`:$port/v1"
$logDir = Join-Path $PSScriptRoot "..\logs"
$stdoutLog = Join-Path $logDir "llama-server.out.log"
$stderrLog = Join-Path $logDir "llama-server.err.log"

if (!(Test-Path $serverExe)) {
  throw "llama-server.exe not found at $serverExe"
}

if (!(Test-Path $modelPath)) {
  throw "GGUF model not found at $modelPath"
}

if (!(Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

try {
  $modelsResponse = Invoke-RestMethod -Uri "$apiBase/models" -TimeoutSec 2
  if ($modelsResponse) {
    Write-Output "llama-server already running at $apiBase"
    exit 0
  }
} catch {
  # Server is not up yet.
}

$args = @(
  "-m", $modelPath,
  "--host", $serverHost,
  "--port", "$port",
  "-c", "$ctx",
  "-np", "1",
  "--no-warmup"
)

Start-Process `
  -FilePath $serverExe `
  -ArgumentList $args `
  -WorkingDirectory (Split-Path $serverExe -Parent) `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog

$up = $false
for ($i = 0; $i -lt 120; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $modelsResponse = Invoke-RestMethod -Uri "$apiBase/models" -TimeoutSec 2
    if ($modelsResponse) {
      $up = $true
      break
    }
  } catch {
    # keep waiting
  }
}

if (-not $up) {
  throw "llama-server did not become ready in time. Check $stderrLog"
}

Write-Output "llama-server started at $apiBase"
Write-Output "stdout: $stdoutLog"
Write-Output "stderr: $stderrLog"
