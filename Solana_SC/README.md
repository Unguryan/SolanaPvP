# Solana PvP Smart Contracts

A complete Solana smart contract implementation for Player vs Player (PvP) games using Anchor framework and Switchboard VRF for fair randomness.

## 🎮 Features

- **Fair PvP Matches**: 1v1, 2v2, and 5v5 team-based matches
- **Switchboard VRF Integration**: Provably fair randomness for winner determination
- **Automatic Payouts**: Winners receive their share instantly after VRF resolution
- **Refund System**: Unjoined matches can be refunded after 2 minutes
- **Platform Fees**: 1% fee goes to admin for platform maintenance
- **Multi-Network Support**: Devnet and Mainnet configurations

## 🏗️ Architecture

```
Solana_SC/
├── programs/
│   └── pvp_program/           # Main Anchor program
│       ├── src/
│       │   └── lib.rs         # Smart contract code
│       ├── Cargo.toml         # Program dependencies
│       └── Xargo.toml         # Cross-compilation config
├── tests/
│   └── pvp_program.ts         # TypeScript integration tests
├── migrations/
│   └── deploy.ts              # Deployment script
├── Anchor.toml                # Anchor configuration
├── Cargo.toml                 # Workspace configuration
├── package.json               # Testing dependencies
├── env.devnet                 # Devnet environment variables
├── env.mainnet                # Mainnet environment variables
├── *.ps1                      # PowerShell deployment scripts
└── *.md                       # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Windows 10/11
- PowerShell 7+
- Rust toolchain
- Solana CLI
- Anchor framework
- Node.js

### Installation

1. **Follow the setup guide:**

   ```powershell
   # Read the comprehensive setup guide
   Get-Content SETUP.md
   ```

2. **Install dependencies:**

   ```powershell
   npm install
   ```

3. **Build the program:**

   ```powershell
   .\build.ps1
   ```

4. **Deploy to devnet:**

   ```powershell
   .\deploy-devnet.ps1
   ```

5. **Run tests:**
   ```powershell
   .\test.ps1
   ```

## 📖 Documentation

- **[SETUP.md](SETUP.md)** - Complete Windows setup guide
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment instructions for devnet/mainnet
- **[USAGE.md](USAGE.md)** - Program usage and integration guide

## 🎯 Program Instructions

### 1. Initialize Global Config

```typescript
await program.methods
  .initConfig(adminPublicKey)
  .accounts({
    config: configPda,
    payer: adminPublicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 2. Create Lobby

```typescript
await program.methods
  .createLobby(
    new BN(lobbyId), // Unique lobby ID
    1, // Team size (1, 2, or 5)
    new BN(stakeAmount), // Stake in lamports
    0 // Side (0 = team1, 1 = team2)
  )
  .accounts({
    lobby: lobbyPda,
    active: activePda,
    creator: creatorPublicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 3. Join Lobby

```typescript
await program.methods
  .joinSide(side) // 0 = team1, 1 = team2
  .accounts({
    lobby: lobbyPda,
    creator: creatorPublicKey,
    player: playerPublicKey,
    active: activePda,
    config: configPda,
    // Switchboard VRF accounts (required for last join)
    switchboardProgram: switchboardProgramId,
    vrf: vrfAccount,
    oracleQueue: oracleQueueAccount,
    // ... other VRF accounts
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 4. Refund Lobby

```typescript
await program.methods
  .refund()
  .accounts({
    lobby: lobbyPda,
    requester: requesterPublicKey,
    active: activePda,
    config: configPda,
    systemProgram: SystemProgram.programId,
  })
  .remainingAccounts([
    // All participants: team1..., team2...
    { pubkey: team1Player1, isSigner: false, isWritable: true },
    { pubkey: team2Player1, isSigner: false, isWritable: true },
  ])
  .rpc();
```

## 🔧 Configuration

### Environment Variables

**Devnet (env.devnet):**

```env
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=~/.config/solana/id.json
ANCHOR_PROGRAM_ID=PvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvP
SWITCHBOARD_PROGRAM_ID=SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f
SWITCHBOARD_ORACLE_QUEUE=GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR
SWITCHBOARD_PERMISSION_ACCOUNT=HxYjP2fF8QRnD7eAmf9gxCDXmh3aeuC6hpjWnFZxhV1o
```

**Mainnet (env.mainnet):**

```env
ANCHOR_PROVIDER_URL=https://api.mainnet-beta.solana.com
ANCHOR_WALLET=~/.config/solana/mainnet-wallet.json
ANCHOR_PROGRAM_ID=PvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvP
# ... same Switchboard addresses
```

### Anchor.toml

```toml
[programs.devnet]
pvp_program = "YOUR_PROGRAM_ID_HERE"

[programs.mainnet]
pvp_program = "YOUR_PROGRAM_ID_HERE"

[provider]
cluster = "Devnet"
wallet = "~/.config/solana/id.json"
```

## 🧪 Testing

### Run All Tests

```powershell
.\test.ps1
```

### Run Specific Tests

```powershell
anchor test --provider.cluster devnet
```

### Test Coverage

- ✅ Initialize global config
- ✅ Create lobby with creator joining
- ✅ Player joins lobby
- ✅ Refund lobby after timeout
- ✅ Error handling for all instructions
- ✅ PDA derivation validation
- ✅ Account state transitions

## 🚀 Deployment

### Devnet Deployment

```powershell
.\deploy-devnet.ps1
```

### Mainnet Deployment

```powershell
.\deploy-mainnet.ps1
```

### Manual Deployment

```powershell
# Build
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet-beta
```

## 🔐 Security Features

- **PDA Authority**: Lobby PDAs control VRF authority
- **Signer Validation**: All critical operations require proper signers
- **State Validation**: Comprehensive state checks prevent invalid operations
- **Refund Protection**: 2-minute lock prevents immediate refunds
- **Finalization Guards**: Prevents double-settlement attacks

## 📊 Program State

### Lobby States

- **Open**: Collecting players
- **Pending**: VRF requested, waiting for callback
- **Resolved**: Paid out to winners
- **Refunded**: Refunded to participants

### Account Layouts

- **GlobalConfig**: 8 + 1 + 32 = 41 bytes
- **ActiveLobby**: 8 + 1 + 32 + 32 = 73 bytes
- **Lobby**: 8 + 1 + 8 + 32 + 1 + 1 + 8 + 8 + 1 + 32 + 4 + 4 + (32 \* 10) = 400 bytes

## 🔄 Switchboard VRF Integration

### VRF Account Setup

1. Visit [Switchboard Console](https://console.switchboard.xyz/)
2. Create VRF account with lobby PDA as authority
3. Fund with sufficient SOL for VRF requests
4. Update environment variables with addresses

### VRF Callback

The program automatically receives VRF callbacks and:

1. Validates VRF account and authority
2. Determines winner using VRF result
3. Calculates payouts and platform fee
4. Transfers SOL to winners and admin
5. Updates lobby status to Resolved

## 🛠️ Development

### Adding New Features

1. Update program code in `programs/pvp_program/src/lib.rs`
2. Add tests in `tests/pvp_program.ts`
3. Update documentation
4. Test on devnet before mainnet

### Code Style

- Follow Rust conventions
- Use descriptive variable names
- Add comprehensive error messages
- Include inline documentation

## 📈 Performance

### Gas Costs (Estimated)

- **Create Lobby**: ~0.002 SOL
- **Join Lobby**: ~0.002 SOL
- **Refund Lobby**: ~0.001 SOL
- **VRF Request**: ~0.1-0.5 SOL
- **VRF Callback**: ~0.001 SOL

### Optimization Tips

- Batch operations when possible
- Use efficient PDA derivation
- Minimize account reads/writes
- Optimize remaining accounts usage

## 🐛 Troubleshooting

### Common Issues

1. **"Program not found"**

   - Check program ID in Anchor.toml
   - Verify deployment was successful

2. **"Insufficient funds"**

   - Check wallet balance
   - Request airdrop (devnet only)

3. **"VRF account not found"**

   - Create VRF account first
   - Check account addresses

4. **"Invalid signer"**
   - Ensure correct keypair is used
   - Check PDA derivation

### Debug Commands

```powershell
# Check program status
solana program show YOUR_PROGRAM_ID

# View program logs
solana logs YOUR_PROGRAM_ID

# Check account data
solana account YOUR_ACCOUNT_ADDRESS
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Discord**: [Solana Discord](https://discord.gg/solana)
- **GitHub Issues**: Create an issue in the repository
- **Documentation**: Check the comprehensive guides in this directory

## 🔗 Related Projects

- **Frontend Integration**: See `../FRONT/SolanaPvP.Front/`
- **Backend API**: See `../API/`
- **Switchboard VRF**: [Switchboard Documentation](https://docs.switchboard.xyz/)

---

**Happy coding! 🚀**
