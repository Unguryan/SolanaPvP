# Troubleshooting Guide

This guide helps you resolve common issues when working with the Solana PvP smart contract.

## 🔧 Common Issues

### 1. Build Errors

#### "cargo not found"

**Problem**: Rust/Cargo is not installed or not in PATH.

**Solution**:

```powershell
# Install Rust
Invoke-WebRequest -Uri 'https://win.rustup.rs/x86_64' -OutFile 'rustup-init.exe'
.\rustup-init.exe -y
Remove-Item 'rustup-init.exe'

# Restart terminal and verify
cargo --version
```

#### "anchor not found"

**Problem**: Anchor framework is not installed.

**Solution**:

```powershell
# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Verify installation
anchor --version
```

#### "solana not found"

**Problem**: Solana CLI is not installed or not in PATH.

**Solution**:

```powershell
# Download and install Solana CLI
$url = "https://github.com/solana-labs/solana/releases/latest/download/solana-install-init-x86_64-pc-windows-msvc.exe"
Invoke-WebRequest -Uri $url -OutFile "solana-install.exe"
.\solana-install.exe v1.18.4
Remove-Item "solana-install.exe"

# Add to PATH manually if needed
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$solanaPath = "$env:USERPROFILE\.local\share\solana\install\active_release\bin"
[Environment]::SetEnvironmentVariable("PATH", "$userPath;$solanaPath", "User")
```

#### Compilation Errors

**Problem**: Rust compilation fails with errors.

**Solutions**:

```powershell
# Update Rust
rustup update

# Clean and rebuild
anchor clean
anchor build

# Check for syntax errors in lib.rs
cargo check

# Update dependencies
cargo update
```

### 2. Deployment Issues

#### "Insufficient funds"

**Problem**: Wallet doesn't have enough SOL for deployment.

**Solution**:

```powershell
# Check balance
solana balance

# Request airdrop (devnet only)
solana airdrop 2

# For mainnet, fund wallet manually
```

#### "Program already exists"

**Problem**: Program ID is already in use.

**Solution**:

```powershell
# Use different program ID in lib.rs
declare_id!("NEW_UNIQUE_PROGRAM_ID_HERE");

# Or upgrade existing program
anchor upgrade --provider.cluster devnet
```

#### "Invalid program ID"

**Problem**: Program ID format is incorrect.

**Solution**:

```powershell
# Check program ID format (should be 32-44 characters)
solana address --keypair ~/.config/solana/id.json

# Update program ID in lib.rs and Anchor.toml
# Rebuild and redeploy
```

#### "Transaction failed"

**Problem**: Transaction execution fails.

**Solutions**:

```powershell
# Check transaction details
solana confirm TRANSACTION_SIGNATURE

# Check account state
solana account ACCOUNT_ADDRESS

# Retry with higher priority fee
solana config set --priority-fee 1
```

### 3. Runtime Errors

#### "Account not found"

**Problem**: Account doesn't exist on-chain.

**Solutions**:

```powershell
# Check if account exists
solana account ACCOUNT_ADDRESS

# Verify PDA derivation
# Check program ID and seeds

# Create account if needed
```

#### "Invalid signer"

**Problem**: Wrong keypair or missing signature.

**Solutions**:

```powershell
# Check current keypair
solana address

# Switch keypair
solana config set --keypair PATH_TO_KEYPAIR

# Verify keypair has permission
```

#### "Insufficient lamports"

**Problem**: Account doesn't have enough SOL.

**Solutions**:

```powershell
# Check account balance
solana balance ACCOUNT_ADDRESS

# Transfer SOL to account
solana transfer ACCOUNT_ADDRESS 1

# Request airdrop (devnet only)
solana airdrop 2 ACCOUNT_ADDRESS
```

### 4. VRF Issues

#### "VRF account not found"

**Problem**: Switchboard VRF account doesn't exist.

**Solution**:

1. Visit [Switchboard Console](https://console.switchboard.xyz/)
2. Create VRF account
3. Set authority to lobby PDA
4. Fund with SOL
5. Update environment variables

#### "VRF authority mismatch"

**Problem**: VRF account authority is not set to lobby PDA.

**Solution**:

```typescript
// Verify PDA derivation
const [lobbyPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("lobby"),
    creator.toBuffer(),
    new BN(lobbyId).toArrayLike(Buffer, "le", 8),
  ],
  programId
);

// Set VRF authority to lobby PDA
// This must be done when creating VRF account
```

#### "VRF callback failed"

**Problem**: VRF callback execution fails.

**Solutions**:

```powershell
# Check VRF account state
solana account VRF_ACCOUNT_ADDRESS

# Verify callback authority
# Check remaining accounts
# Ensure proper account ordering
```

### 5. Frontend Issues

#### "Program not initialized"

**Problem**: Frontend can't connect to program.

**Solutions**:

```typescript
// Check wallet connection
const { connected, publicKey } = useWallet();

// Verify program ID
const programId = getProgramId();
console.log("Program ID:", programId.toString());

// Check network configuration
const config = getSolanaConfig();
console.log("Network:", config.cluster);
```

#### "Transaction rejected"

**Problem**: User rejects transaction or wallet error.

**Solutions**:

```typescript
// Add error handling
try {
  const tx = await createLobby(params);
} catch (error) {
  if (error.message.includes("User rejected")) {
    // Handle user rejection
  } else {
    // Handle other errors
  }
}

// Check wallet permissions
// Ensure sufficient SOL
// Verify transaction parameters
```

#### "Account fetch failed"

**Problem**: Can't fetch account data.

**Solutions**:

```typescript
// Check account address
console.log("Account address:", accountAddress.toString());

// Verify account exists
const accountInfo = await connection.getAccountInfo(accountAddress);
if (!accountInfo) {
  console.error("Account does not exist");
}

// Check program ID
// Verify account type
```

### 6. Network Issues

#### "RPC connection failed"

**Problem**: Can't connect to Solana RPC.

**Solutions**:

```powershell
# Check RPC endpoint
solana config get

# Switch to different RPC
solana config set --url https://api.devnet.solana.com

# Check network status
# Try different RPC provider
```

#### "WebSocket connection failed"

**Problem**: Can't establish WebSocket connection.

**Solutions**:

```typescript
// Check WebSocket URL
const config = getSolanaConfig();
console.log("WebSocket URL:", config.wsUrl);

// Verify network connectivity
// Check firewall settings
// Try different WebSocket endpoint
```

#### "Transaction timeout"

**Problem**: Transaction takes too long to confirm.

**Solutions**:

```powershell
# Increase timeout
solana config set --commitment confirmed

# Use higher priority fee
solana config set --priority-fee 1

# Check network congestion
# Retry transaction
```

## 🔍 Debugging Tools

### 1. Solana CLI Commands

```powershell
# Check program status
solana program show PROGRAM_ID

# View program logs
solana logs PROGRAM_ID

# Check account data
solana account ACCOUNT_ADDRESS

# View transaction details
solana confirm TRANSACTION_SIGNATURE

# Check cluster info
solana cluster-version

# View recent transactions
solana transaction-history WALLET_ADDRESS --limit 10
```

### 2. Anchor Commands

```powershell
# Build program
anchor build

# Deploy program
anchor deploy --provider.cluster devnet

# Run tests
anchor test --provider.cluster devnet

# Clean build artifacts
anchor clean

# Show program info
anchor idl parse programs/pvp_program/src/lib.rs
```

### 3. Browser DevTools

```javascript
// Check wallet connection
console.log("Wallet connected:", window.solana?.isConnected);

// Check program instance
console.log("Program:", program);

// Check account data
console.log("Account data:", accountData);

// Monitor events
program.addEventListener("LobbyCreated", console.log);
```

## 📊 Monitoring

### 1. Program Logs

```powershell
# Monitor program logs in real-time
solana logs PROGRAM_ID --follow

# Filter by specific events
solana logs PROGRAM_ID | findstr "LobbyCreated"
```

### 2. Account Monitoring

```typescript
// Monitor account changes
const subscriptionId = connection.onAccountChange(
  accountAddress,
  (accountInfo) => {
    console.log("Account updated:", accountInfo);
  }
);

// Remove subscription
connection.removeAccountChangeListener(subscriptionId);
```

### 3. Transaction Monitoring

```typescript
// Monitor transaction status
const signature = await sendTransaction(transaction);
const status = await connection.getSignatureStatus(signature);
console.log("Transaction status:", status);

// Wait for confirmation
await connection.confirmTransaction(signature);
```

## 🛠️ Performance Optimization

### 1. Reduce Transaction Size

```typescript
// Batch multiple instructions
const transaction = new Transaction();
transaction.add(instruction1);
transaction.add(instruction2);
transaction.add(instruction3);

// Use efficient account ordering
// Minimize account reads/writes
```

### 2. Optimize RPC Calls

```typescript
// Use batch requests
const accounts = await connection.getMultipleAccountsInfo(addresses);

// Cache account data
const accountCache = new Map();

// Use appropriate commitment level
const commitment = "confirmed"; // vs 'finalized'
```

### 3. Error Handling

```typescript
// Implement retry logic
async function retryOperation(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## 📞 Getting Help

### 1. Check Logs

```powershell
# Program logs
solana logs PROGRAM_ID

# Application logs
# Check browser console
# Check server logs
```

### 2. Verify Configuration

```powershell
# Check Solana config
solana config get

# Check Anchor config
Get-Content Anchor.toml

# Check environment variables
Get-Content env.devnet
```

### 3. Test Components

```powershell
# Test program build
anchor build

# Test program deployment
anchor deploy --provider.cluster devnet

# Test program execution
anchor test --provider.cluster devnet
```

### 4. Community Support

- **Solana Discord**: https://discord.gg/solana
- **Anchor Discord**: https://discord.gg/8HwmBtt2ss
- **Switchboard Discord**: https://discord.gg/switchboardxyz
- **GitHub Issues**: Create issue in repository

### 5. Documentation

- **Solana Docs**: https://docs.solana.com/
- **Anchor Docs**: https://www.anchor-lang.com/docs
- **Switchboard Docs**: https://docs.switchboard.xyz/
- **Project README**: README.md

## 🚨 Emergency Procedures

### 1. Program Upgrade

```powershell
# Build new version
anchor build

# Upgrade program
anchor upgrade --provider.cluster devnet

# Verify upgrade
solana program show PROGRAM_ID
```

### 2. Emergency Refund

```typescript
// Refund all open lobbies
const openLobbies = await getOpenLobbies();
for (const lobby of openLobbies) {
  try {
    await refundLobby(lobby);
  } catch (error) {
    console.error("Failed to refund lobby:", lobby.id, error);
  }
}
```

### 3. Pause Program

```rust
// Add pause functionality to program
pub fn pause_program(ctx: Context<PauseProgram>) -> Result<()> {
    // Only admin can pause
    require!(ctx.accounts.admin.key() == ctx.accounts.config.admin, PvpError::Unauthorized);

    // Set pause flag
    ctx.accounts.config.paused = true;
    Ok(())
}
```

## 📋 Checklist

Before reporting an issue, check:

- [ ] Rust and Cargo are installed and up to date
- [ ] Solana CLI is installed and configured
- [ ] Anchor framework is installed
- [ ] Wallet is connected and has sufficient SOL
- [ ] Program ID is correct
- [ ] Network configuration is correct
- [ ] Account addresses are valid
- [ ] Transaction parameters are correct
- [ ] Error logs are reviewed
- [ ] Documentation is consulted

## 🔄 Recovery Procedures

### 1. Reset Environment

```powershell
# Clean build artifacts
anchor clean

# Reset Solana config
solana config set --url devnet
solana config set --keypair ~/.config/solana/id.json

# Rebuild and redeploy
anchor build
anchor deploy --provider.cluster devnet
```

### 2. Restore from Backup

```powershell
# Restore keypairs
# Restore configuration files
# Restore program state (if possible)
```

### 3. Emergency Contacts

- **Technical Lead**: [Contact Info]
- **DevOps Team**: [Contact Info]
- **Security Team**: [Contact Info]

Remember: Always test on devnet before mainnet, and keep backups of important data!
