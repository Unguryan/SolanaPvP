# Test Script
Write-Host "🧪 Running PvP Program Tests..." -ForegroundColor Green

# Set environment to devnet for testing
$env:ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com"
$env:ANCHOR_WALLET = "~/.config/solana/id.json"

Write-Host "🔨 Building program first..." -ForegroundColor Yellow
anchor build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "🧪 Running tests..." -ForegroundColor Yellow
anchor test --provider.cluster devnet

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Tests failed!" -ForegroundColor Red
    exit 1
}
