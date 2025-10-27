# Deploy to Mainnet Script
Write-Host "🚀 Deploying PvP Program to Mainnet..." -ForegroundColor Green

# Set environment to mainnet
$env:ANCHOR_PROVIDER_URL = "https://api.mainnet-beta.solana.com"
$env:ANCHOR_WALLET = "~/.config/solana/mainnet-wallet.json"

Write-Host "⚠️ WARNING: This will deploy to MAINNET!" -ForegroundColor Red
Write-Host "Make sure you have:" -ForegroundColor Yellow
Write-Host "  - Funded mainnet wallet" -ForegroundColor Yellow
Write-Host "  - Set up Switchboard VRF accounts" -ForegroundColor Yellow
Write-Host "  - Updated program ID in lib.rs" -ForegroundColor Yellow

$confirmation = Read-Host "Continue? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Building program..." -ForegroundColor Yellow
anchor build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Deploying to mainnet..." -ForegroundColor Yellow
anchor deploy --provider.cluster mainnet-beta

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Mainnet deployment complete!" -ForegroundColor Green
Write-Host "Program ID: PvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvP" -ForegroundColor Cyan
