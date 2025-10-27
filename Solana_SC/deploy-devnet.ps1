# Deploy to Devnet Script
Write-Host "🚀 Deploying PvP Program to Devnet..." -ForegroundColor Green

# Set environment to devnet
$env:ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com"
$env:ANCHOR_WALLET = "~/.config/solana/id.json"

Write-Host "📦 Building program..." -ForegroundColor Yellow
anchor build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Deploying to devnet..." -ForegroundColor Yellow
anchor deploy --provider.cluster devnet

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "🧪 Running tests..." -ForegroundColor Yellow
anchor test --provider.cluster devnet

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Tests failed, but deployment succeeded" -ForegroundColor Yellow
}

Write-Host "✅ Devnet deployment complete!" -ForegroundColor Green
Write-Host "Program ID: PvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvP" -ForegroundColor Cyan
