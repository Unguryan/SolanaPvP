# Airdrop Devnet SOL Script
Write-Host "💰 Requesting Devnet SOL Airdrop..." -ForegroundColor Green

# Check if Solana CLI is available
if (!(Get-Command solana -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Solana CLI not found! Please install Solana CLI first." -ForegroundColor Red
    Write-Host "Visit: https://docs.solana.com/cli/install-solana-cli-tools" -ForegroundColor Yellow
    exit 1
}

# Set cluster to devnet
solana config set --url devnet

# Get wallet address - update this to your desired address
$walletAddress = "4P3eFwhmBt6H8VbMWsnCHv8MZFmKqmKbtmtfA7eupvE8"
Write-Host "Wallet address: $walletAddress" -ForegroundColor Cyan

# Request airdrop
Write-Host "Requesting 2 SOL airdrop..." -ForegroundColor Yellow
solana airdrop 2 $walletAddress

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Airdrop successful!" -ForegroundColor Green
    
    # Check balance
    $balance = solana balance
    Write-Host "Current balance: $balance SOL" -ForegroundColor Cyan
}
else {
    Write-Host "❌ Airdrop failed!" -ForegroundColor Red
    exit 1
}
