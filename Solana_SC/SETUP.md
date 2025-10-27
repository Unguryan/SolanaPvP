# Solana PvP Smart Contract Setup Guide

This guide will help you set up the complete development environment for the Solana PvP smart contract on Windows.

## Prerequisites

- Windows 10/11
- PowerShell 7+ (recommended)
- Administrator privileges (for some installations)

## Step 1: Install Rust

1. **Download and install Rust:**

   ```powershell
   # Download rustup installer
   Invoke-WebRequest -Uri 'https://win.rustup.rs/x86_64' -OutFile 'rustup-init.exe'

   # Run installer
   .\rustup-init.exe -y

   # Clean up
   Remove-Item 'rustup-init.exe'
   ```

2. **Restart your terminal** to refresh PATH variables.

3. **Verify installation:**
   ```powershell
   cargo --version
   rustc --version
   ```

## Step 2: Install Solana CLI

### Option A: Direct Download (Recommended)

1. **Download Solana CLI:**

   ```powershell
   # Create solana directory
   New-Item -ItemType Directory -Path "$env:USERPROFILE\.local\share\solana" -Force

   # Download latest release
   $url = "https://github.com/solana-labs/solana/releases/latest/download/solana-install-init-x86_64-pc-windows-msvc.exe"
   Invoke-WebRequest -Uri $url -OutFile "solana-install.exe"

   # Install (you may need to run as administrator)
   .\solana-install.exe v1.18.4

   # Clean up
   Remove-Item "solana-install.exe"
   ```

2. **Add to PATH:**
   ```powershell
   # Add to user PATH
   $userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
   $solanaPath = "$env:USERPROFILE\.local\share\solana\install\active_release\bin"
   [Environment]::SetEnvironmentVariable("PATH", "$userPath;$solanaPath", "User")
   ```

### Option B: Using Chocolatey

```powershell
# Install Chocolatey if not already installed
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Solana CLI
choco install solana-cli
```

3. **Verify installation:**
   ```powershell
   solana --version
   solana config get
   ```

## Step 3: Install Anchor Framework

1. **Install Anchor Version Manager (avm):**

   ```powershell
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   ```

2. **Install latest Anchor version:**

   ```powershell
   avm install latest
   avm use latest
   ```

3. **Verify installation:**
   ```powershell
   anchor --version
   ```

## Step 4: Install Node.js (if not already installed)

1. **Download from official website:**

   - Visit: https://nodejs.org/
   - Download LTS version for Windows
   - Run installer with default settings

2. **Verify installation:**
   ```powershell
   node --version
   npm --version
   ```

## Step 5: Set Up Solana Wallets

### Create Devnet Wallet

```powershell
# Set cluster to devnet
solana config set --url devnet

# Generate new keypair
solana-keygen new --outfile ~/.config/solana/id.json

# Set as default
solana config set --keypair ~/.config/solana/id.json

# Get wallet address
solana address

# Request airdrop (2 SOL)
solana airdrop 2
```

### Create Mainnet Wallet (Optional)

```powershell
# Generate mainnet keypair
solana-keygen new --outfile ~/.config/solana/mainnet-wallet.json

# Switch to mainnet
solana config set --url mainnet-beta
solana config set --keypair ~/.config/solana/mainnet-wallet.json
```

## Step 6: Verify Installation

Run this verification script:

```powershell
# Check all tools
Write-Host "Checking installations..." -ForegroundColor Green

# Rust
try { $rustVersion = cargo --version; Write-Host "✅ Rust: $rustVersion" -ForegroundColor Green }
catch { Write-Host "❌ Rust not found" -ForegroundColor Red }

# Solana
try { $solanaVersion = solana --version; Write-Host "✅ Solana: $solanaVersion" -ForegroundColor Green }
catch { Write-Host "❌ Solana CLI not found" -ForegroundColor Red }

# Anchor
try { $anchorVersion = anchor --version; Write-Host "✅ Anchor: $anchorVersion" -ForegroundColor Green }
catch { Write-Host "❌ Anchor not found" -ForegroundColor Red }

# Node.js
try { $nodeVersion = node --version; Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green }
catch { Write-Host "❌ Node.js not found" -ForegroundColor Red }

# Wallet
try { $walletAddress = solana address; Write-Host "✅ Wallet: $walletAddress" -ForegroundColor Green }
catch { Write-Host "❌ Wallet not configured" -ForegroundColor Red }
```

## Step 7: Project Setup

1. **Navigate to project directory:**

   ```powershell
   cd F:\VS\SolanaPvP\Solana_SC
   ```

2. **Install dependencies:**

   ```powershell
   npm install
   ```

3. **Build the program:**

   ```powershell
   .\build.ps1
   ```

4. **Run tests:**
   ```powershell
   .\test.ps1
   ```

## Troubleshooting

### Common Issues

1. **"cargo not found"**

   - Restart your terminal
   - Check PATH: `$env:PATH -split ';' | Where-Object { $_ -like '*cargo*' }`

2. **"solana not found"**

   - Manually add to PATH or reinstall
   - Check installation directory: `$env:USERPROFILE\.local\share\solana\install\active_release\bin`

3. **"anchor not found"**

   - Reinstall avm: `cargo install --git https://github.com/coral-xyz/anchor avm --locked --force`
   - Restart terminal after installation

4. **Permission errors**

   - Run PowerShell as Administrator
   - Check antivirus software blocking installations

5. **Build errors**
   - Update Rust: `rustup update`
   - Clean build: `anchor clean && anchor build`

### Getting Help

- **Rust:** https://doc.rust-lang.org/book/
- **Solana:** https://docs.solana.com/
- **Anchor:** https://www.anchor-lang.com/docs
- **Switchboard:** https://docs.switchboard.xyz/

## Next Steps

Once setup is complete, you can:

1. **Deploy to devnet:** `.\deploy-devnet.ps1`
2. **Run tests:** `.\test.ps1`
3. **Request airdrop:** `.\airdrop-devnet.ps1`
4. **Read deployment guide:** `DEPLOYMENT.md`

## Environment Variables

The following environment variables are used:

- `ANCHOR_PROVIDER_URL`: Solana RPC endpoint
- `ANCHOR_WALLET`: Path to wallet keypair
- `ANCHOR_PROGRAM_ID`: Program ID (set after deployment)
- `SWITCHBOARD_PROGRAM_ID`: Switchboard program ID
- `SWITCHBOARD_ORACLE_QUEUE`: Oracle queue address
- `SWITCHBOARD_PERMISSION_ACCOUNT`: Permission account address

These are configured in `env.devnet` and `env.mainnet` files.
