# Build Script
Write-Host "📦 Building PvP Program..." -ForegroundColor Green

# Check if Rust is installed
if (!(Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Rust not found! Please install Rust first." -ForegroundColor Red
    Write-Host "Visit: https://rustup.rs/" -ForegroundColor Yellow
    exit 1
}

# Check if Anchor is installed
if (!(Get-Command anchor -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Anchor not found! Installing Anchor..." -ForegroundColor Yellow
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    avm install latest
    avm use latest
}

Write-Host "🔨 Building program..." -ForegroundColor Yellow
anchor build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
