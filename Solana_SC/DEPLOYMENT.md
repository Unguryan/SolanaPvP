# Solana PvP Program Deployment Guide

This guide covers deploying the PvP smart contract to both devnet and mainnet.

## Prerequisites

- Complete setup as per `SETUP.md`
- Devnet wallet with SOL (for testing)
- Mainnet wallet with SOL (for production)
- Switchboard VRF accounts configured

## Devnet Deployment

### Step 1: Prepare Devnet Environment

```powershell
# Set cluster to devnet
solana config set --url devnet

# Verify wallet
solana address
solana balance

# Request airdrop if needed
.\airdrop-devnet.ps1
```

### Step 2: Deploy Program

```powershell
# Deploy to devnet
.\deploy-devnet.ps1
```

This script will:

1. Build the program
2. Deploy to devnet
3. Run tests
4. Display program ID

### Step 3: Update Program ID

After deployment, update the program ID in:

1. **`programs/pvp_program/src/lib.rs`:**

   ```rust
   declare_id!("YOUR_ACTUAL_PROGRAM_ID_HERE");
   ```

2. **`Anchor.toml`:**

   ```toml
   [programs.devnet]
   pvp_program = "YOUR_ACTUAL_PROGRAM_ID_HERE"
   ```

3. **Rebuild and upgrade:**
   ```powershell
   anchor build
   anchor upgrade --provider.cluster devnet
   ```

### Step 4: Initialize Global Config

```powershell
# Run migration script
anchor run migrate
```

This will:

- Initialize the global config
- Set admin pubkey
- Display configuration details

## Mainnet Deployment

⚠️ **WARNING: Mainnet deployment is permanent and costs real SOL!**

### Step 1: Prepare Mainnet Environment

```powershell
# Set cluster to mainnet
solana config set --url mainnet-beta
solana config set --keypair ~/.config/solana/mainnet-wallet.json

# Verify wallet and balance
solana address
solana balance

# Ensure sufficient SOL (at least 5 SOL recommended)
```

### Step 2: Set Up Switchboard VRF

1. **Visit Switchboard Console:**

   - Devnet: https://devnet.console.switchboard.xyz/
   - Mainnet: https://console.switchboard.xyz/

2. **Create VRF Account:**

   - Select appropriate oracle queue
   - Set authority to your program's lobby PDA
   - Fund with sufficient SOL for VRF requests

3. **Update environment variables:**
   ```powershell
   # Update env.mainnet with actual addresses
   $env:SWITCHBOARD_ORACLE_QUEUE = "YOUR_ORACLE_QUEUE_ADDRESS"
   $env:SWITCHBOARD_PERMISSION_ACCOUNT = "YOUR_PERMISSION_ACCOUNT_ADDRESS"
   ```

### Step 3: Deploy to Mainnet

```powershell
# Deploy to mainnet (with safety checks)
.\deploy-mainnet.ps1
```

### Step 4: Post-Deployment

1. **Update program ID** in all configuration files
2. **Rebuild and upgrade** the program
3. **Initialize global config** with production admin
4. **Test thoroughly** with small amounts
5. **Update frontend** with new program ID

## Program ID Management

### Finding Your Program ID

```powershell
# After deployment
solana program show YOUR_PROGRAM_ID

# Or check Anchor.toml
Get-Content Anchor.toml | Select-String "pvp_program"
```

### Updating Program ID

1. **Update lib.rs:**

   ```rust
   declare_id!("YOUR_NEW_PROGRAM_ID");
   ```

2. **Update Anchor.toml:**

   ```toml
   [programs.devnet]
   pvp_program = "YOUR_NEW_PROGRAM_ID"

   [programs.mainnet]
   pvp_program = "YOUR_NEW_PROGRAM_ID"
   ```

3. **Rebuild and upgrade:**
   ```powershell
   anchor build
   anchor upgrade --provider.cluster devnet
   anchor upgrade --provider.cluster mainnet-beta
   ```

## Switchboard VRF Setup

### Devnet VRF Setup

1. **Visit Switchboard Devnet Console:**

   - URL: https://devnet.console.switchboard.xyz/
   - Connect your devnet wallet

2. **Create VRF Account:**

   - Click "Create VRF Account"
   - Select devnet oracle queue
   - Set authority to your program's lobby PDA
   - Fund with 0.1 SOL (sufficient for testing)

3. **Get Account Addresses:**
   - Copy VRF account address
   - Copy oracle queue address
   - Copy permission account address

### Mainnet VRF Setup

1. **Visit Switchboard Mainnet Console:**

   - URL: https://console.switchboard.xyz/
   - Connect your mainnet wallet

2. **Create VRF Account:**

   - Select mainnet oracle queue
   - Set authority to your program's lobby PDA
   - Fund with 1-2 SOL (for production usage)

3. **Update Configuration:**
   - Update `env.mainnet` with addresses
   - Update frontend configuration
   - Update backend configuration

## Testing Deployment

### Basic Functionality Test

```powershell
# Run comprehensive tests
.\test.ps1

# Test specific functionality
anchor test --provider.cluster devnet --skip-local-validator
```

### Manual Testing

1. **Create a lobby:**

   ```typescript
   // Use your frontend or test script
   const lobbyId = new anchor.BN(1);
   const teamSize = 1;
   const stakeLamports = new anchor.BN(100_000_000); // 0.1 SOL
   const side = 0; // team1

   await program.methods
     .createLobby(lobbyId, teamSize, stakeLamports, side)
     .accounts({...})
     .rpc();
   ```

2. **Join lobby:**

   ```typescript
   await program.methods
     .joinSide(1) // team2
     .accounts({...})
     .rpc();
   ```

3. **Test refund:**
   ```typescript
   await program.methods
     .refund()
     .accounts({...})
     .rpc();
   ```

## Monitoring and Maintenance

### Health Checks

```powershell
# Check program status
solana program show YOUR_PROGRAM_ID

# Check account balances
solana balance YOUR_WALLET_ADDRESS

# Check recent transactions
solana transaction-history YOUR_WALLET_ADDRESS --limit 10
```

### Logs and Debugging

```powershell
# View program logs
solana logs YOUR_PROGRAM_ID

# Monitor specific account
solana logs YOUR_LOBBY_PDA_ADDRESS
```

### Upgrading Program

```powershell
# Build new version
anchor build

# Upgrade on devnet
anchor upgrade --provider.cluster devnet

# Upgrade on mainnet (careful!)
anchor upgrade --provider.cluster mainnet-beta
```

## Security Considerations

### Pre-Mainnet Checklist

- [ ] Program tested thoroughly on devnet
- [ ] All error conditions tested
- [ ] Switchboard VRF properly configured
- [ ] Admin wallet secured
- [ ] Upgrade authority managed
- [ ] Frontend integration tested
- [ ] Backend integration tested
- [ ] Documentation updated

### Upgrade Authority

```powershell
# Set upgrade authority (optional)
solana program set-upgrade-authority YOUR_PROGRAM_ID --new-upgrade-authority YOUR_UPGRADE_AUTHORITY

# Or disable upgrades (permanent)
solana program set-upgrade-authority YOUR_PROGRAM_ID --final
```

## Cost Estimation

### Devnet Costs

- Program deployment: ~0.1 SOL (free airdrop)
- VRF requests: ~0.01 SOL each
- Account creation: ~0.002 SOL each

### Mainnet Costs

- Program deployment: ~2-5 SOL
- VRF requests: ~0.1-0.5 SOL each
- Account creation: ~0.002 SOL each
- Transaction fees: ~0.000005 SOL each

## Troubleshooting

### Common Deployment Issues

1. **"Insufficient funds"**

   - Check wallet balance
   - Request airdrop (devnet only)
   - Fund wallet (mainnet)

2. **"Program already exists"**

   - Use different program ID
   - Or upgrade existing program

3. **"Invalid program ID"**

   - Check program ID format
   - Ensure it's a valid Solana address

4. **"VRF account not found"**
   - Create VRF account first
   - Check account addresses
   - Verify authority settings

### Getting Help

- **Solana Discord:** https://discord.gg/solana
- **Anchor Discord:** https://discord.gg/8HwmBtt2ss
- **Switchboard Discord:** https://discord.gg/switchboardxyz
- **GitHub Issues:** Create issue in project repository

## Next Steps

After successful deployment:

1. **Update frontend** with program ID
2. **Update backend** configuration
3. **Test integration** end-to-end
4. **Monitor performance** and usage
5. **Plan for scaling** and optimization
