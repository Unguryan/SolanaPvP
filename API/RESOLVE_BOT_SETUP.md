# Resolve Bot Setup Guide

## Overview

The **ResolveBotWorker** automatically resolves matches by calling the `resolve_match` instruction with Switchboard randomness. This is required for matches to complete and payout winners.

## Prerequisites

1. Solana CLI installed
2. Updated smart contract deployed with randomness support
3. Bot wallet with SOL for transaction fees

## Setup Steps

### 1. Create Bot Keypair

Using Solana CLI (RECOMMENDED):

```bash
# Generate new keypair
solana-keygen new --outfile resolve-bot-keypair.json

# Get the public key
solana-keygen pubkey resolve-bot-keypair.json

# Fund with devnet SOL
solana airdrop 2 <BOT_PUBKEY> --url devnet
```

### 2. Place Keypair File

Move the keypair to the API project directory:

```
API/SolanaPvP.API_Project/resolve-bot-keypair.json
```

### 3. Update appsettings.json

The configuration should already include:

```json
{
  "Solana": {
    "ResolveBotKeypairPath": "resolve-bot-keypair.json"
  }
}
```

### 4. Deploy Updated Smart Contract

```bash
cd Solana_SC
anchor build
anchor deploy
```

### 5. Update Frontend IDL

After deploying:

```bash
cp target/idl/pvp_program.json ../FRONT/SolanaPvP.Front/src/idl/
cp target/types/pvp_program.ts ../FRONT/SolanaPvP.Front/src/idl/
```

### 6. Restart Backend

The ResolveBotWorker will automatically start and monitor for Pending matches.

## How It Works

### Automatic Flow:

1. **Match fills** → Status becomes `Pending` (AwaitingRandomness in DB)
2. **ResolveBotWorker** (runs every 5 seconds):
   - Queries matches with status `AwaitingRandomness`
   - For each match:
     - Checks if Switchboard randomness is ready
     - If ready: sends `resolve_match` transaction
     - Transaction is signed by resolve bot
3. **On-chain execution**:
   - Smart contract verifies randomness account owner is Switchboard
   - Reads randomness value from Switchboard account
   - Determines winner: `winner_side = randomness % 2`
   - Pays out winners (minus 1% platform fee)
   - Emits `LobbyResolved` event
4. **IndexerWorker**:
   - Receives `LobbyResolved` event
   - Updates match status to `Resolved`
   - Updates participant stats
   - Broadcasts to frontend via SignalR

### Logs to Watch:

```
[ResolveBotWorker] Processing match ... for resolution
[ResolveSender] Bot account loaded: <PUBKEY>
[SwitchboardClient] Randomness ready for <ACCOUNT>
[ResolveSender] Resolving match ... with randomness ...
[IndexerWorker] Match resolved: ...
```

## Security & Fairness

### On-Chain Verification (Automatic):

The smart contract enforces:

```rust
#[account(
    owner = SWITCHBOARD_PROGRAM_ID,  // Only Switchboard can write
    constraint = randomness_account == lobby.randomness_account  // Can't swap accounts
)]
```

This means:

- ✅ Randomness comes from Switchboard oracles
- ✅ Cannot be faked or manipulated
- ✅ Account is locked in during join (before randomness generated)
- ✅ All checks happen on-chain (trustless)

### Transparency:

Every resolved match emits:

```rust
emit!(LobbyResolved {
    lobby,
    winner_side,
    randomness_value,  // 👈 Public for anyone to verify!
    total_pot,
    platform_fee,
    payout_per_winner,
});
```

Anyone can verify:

- View transaction on Solscan
- See randomness value in event
- Verify: `randomness_value % 2 = winner_side`
- Check Switchboard account ownership

## Troubleshooting

### Bot Not Resolving Matches

**Check 1: Bot has SOL**

```bash
solana balance <BOT_PUBKEY> --url devnet
```

Should have at least 1 SOL for fees.

**Check 2: Keypair loaded**
Look for log: `[ResolveSender] Bot account loaded: <PUBKEY>`

If you see: `Running in MOCK mode` → keypair file not found or invalid

**Check 3: Matches are Pending**

```sql
SELECT MatchPda, Status FROM Matches WHERE Status = 1;  -- 1 = AwaitingRandomness
```

**Check 4: Randomness account exists**

```bash
solana account <RANDOMNESS_ACCOUNT> --url devnet
```

Should be owned by: `BeFxPRDreo8uLivyGgqDE87iGaU3o1Tw9hZw46NxYaej`

### Mock Mode (For Testing)

If keypair file doesn't exist, the system runs in mock mode:

- Generates fake transaction signatures
- Logs: `Running in MOCK mode`
- Matches won't actually resolve on-chain
- Useful for testing worker logic without real transactions

## Current Status

### ✅ Implemented:

- ResolveBotWorker (monitors Pending matches)
- SwitchboardClient (checks randomness readiness - REAL data)
- ResolveSender structure (loads keypair)
- Smart contract with Switchboard verification

### 🔄 To Complete:

- Full ResolveSender transaction building (needs Anchor instruction encoding)
- Switchboard account initialization (may need Switchboard SDK)

### For MVP Testing:

- Use lobby PDA as randomness account placeholder
- SwitchboardClient will check if account exists and is owned by Switchboard
- Once real Switchboard account is used, everything will work end-to-end

## Next Steps

1. Create and fund bot keypair
2. Deploy updated smart contract
3. Start backend - ResolveBotWorker will activate
4. Test: Create lobby → Join → Bot auto-resolves → Payout

For full production readiness, implement the actual transaction building in ResolveSender using Anchor IDL.
