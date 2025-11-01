# Copy IDL and TypeScript types to frontend
Write-Host "📦 Copying IDL and types to frontend..." -ForegroundColor Green

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetIdl = Join-Path $scriptPath "target\idl\pvp_program.json"
$targetTypes = Join-Path $scriptPath "target\types\pvp_program.ts"
$frontendIdl = Join-Path $scriptPath "..\FRONT\SolanaPvP.Front\src\services\solana\idl\pvp_program.json"
$frontendTypes = Join-Path $scriptPath "..\FRONT\SolanaPvP.Front\src\services\solana\types\pvp_program.ts"

# Create directories if they don't exist
$frontendIdlDir = Split-Path -Parent $frontendIdl
$frontendTypesDir = Split-Path -Parent $frontendTypes

if (-not (Test-Path $frontendIdlDir)) {
    New-Item -ItemType Directory -Path $frontendIdlDir -Force | Out-Null
    Write-Host "Created directory: $frontendIdlDir" -ForegroundColor Yellow
}

if (-not (Test-Path $frontendTypesDir)) {
    New-Item -ItemType Directory -Path $frontendTypesDir -Force | Out-Null
    Write-Host "Created directory: $frontendTypesDir" -ForegroundColor Yellow
}

# Check if IDL exists
if (Test-Path $targetIdl) {
    Copy-Item $targetIdl $frontendIdl -Force
    Write-Host "✅ Copied IDL to frontend" -ForegroundColor Green
} else {
    Write-Host "⚠️  IDL not found at: $targetIdl" -ForegroundColor Yellow
    Write-Host "   Run 'anchor build' first to generate IDL" -ForegroundColor Yellow
}

# Check if types exist
if (Test-Path $targetTypes) {
    Copy-Item $targetTypes $frontendTypes -Force
    Write-Host "✅ Copied TypeScript types to frontend" -ForegroundColor Green
} else {
    Write-Host "⚠️  TypeScript types not found at: $targetTypes" -ForegroundColor Yellow
    Write-Host "   Run 'anchor build' first to generate types" -ForegroundColor Yellow
}

Write-Host "✨ Done!" -ForegroundColor Green
