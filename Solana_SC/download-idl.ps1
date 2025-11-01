# PowerShell script to download IDL from on-chain
param(
    [string]$ProgramId = "F2LhVGUa9yLbYVYujYMPyckqWmsokHE9wym7ceGHWUMZ",
    [string]$Network = "devnet",
    [switch]$CopyToFrontend = $true
)

Write-Host "📥 Downloading IDL from on-chain..." -ForegroundColor Green
Write-Host "   Program ID: $ProgramId" -ForegroundColor Cyan
Write-Host "   Network: $Network" -ForegroundColor Cyan

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$outputPath = Join-Path $scriptPath "target\idl\pvp_program.json"
$frontendPath = Join-Path $scriptPath "..\FRONT\SolanaPvP.Front\src\services\solana\idl\pvp_program.json"

# Determine RPC URL
$rpcUrl = if ($Network -eq "mainnet-beta") {
    "https://api.mainnet-beta.solana.com"
} else {
    "https://api.devnet.solana.com"
}

Write-Host "   RPC: $rpcUrl" -ForegroundColor Cyan

# Create output directory if it doesn't exist
$outputDir = Split-Path -Parent $outputPath
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    Write-Host "   Created directory: $outputDir" -ForegroundColor Yellow
}

# Run Node.js script
$nodeScript = Join-Path $scriptPath "download-idl.js"
$copyFlag = if ($CopyToFrontend) { "true" } else { "false" }

node $nodeScript $ProgramId $Network $outputPath $copyFlag

if ($LASTEXITCODE -eq 0) {
    Write-Host "✨ Done!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to download IDL" -ForegroundColor Red
    exit $LASTEXITCODE
}

