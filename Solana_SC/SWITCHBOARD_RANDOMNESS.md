# Switchboard OnDemand Randomness Integration

## Overview

This implementation uses **Switchboard OnDemand** for provably fair random winner determination. The randomness cannot be manipulated by anyone, including the platform operators.

## How It Works

### Flow:

1. **Lobby Created** - Player creates a lobby (status: Open)
2. **Players Join** - Players join teams
3. **Final Join** - Last player joins via `join_side_final`:
   - Lobby saves `randomness_account` pubkey
   - Status changes to `Pending`
   - Log: "Lobby full! Moved to Pending. Call resolve_match to determine winner."
4. **ResolveBotWorker** detects Pending match
5. **Worker calls** `resolve_match` instruction
6. **On-chain verification** happens automatically:
   - Checks randomness account owner is Switchboard
   - Checks randomness account matches saved account
   - Reads randomness value from Switchboard
7. **Winner determined** from Switchboard randomness: `winner = randomness % 2`
8. **Payouts** sent to winners
9. **Event emitted** with randomness value for transparency

## Proof of Fairness

### On-Chain Verification (Automatic)

The smart contract enforces these constraints in `ResolveMatch` struct:

```rust
#[account(
    mut,
    owner = SWITCHBOARD_PROGRAM_ID,  // ✅ Only Switchboard can write to this account
    constraint = randomness_account_data.key() == lobby.randomness_account  // ✅ Must be exact account from join
)]
pub randomness_account_data: AccountInfo<'info>,
```

**What this proves:**

1. **Owner Check** - `owner = SWITCHBOARD_PROGRAM_ID`

   - Only Switchboard program can write data to this account
   - Platform operators cannot modify or fake the randomness
   - Enforced by Solana runtime, not our code

2. **Account Constraint** - `randomness_account_data.key() == lobby.randomness_account`

   - The randomness account was saved during `join_side_final` (when lobby filled)
   - Cannot be swapped with a different account
   - Prevents "attack scenario": create multiple randomness accounts, pick favorable one

3. **Cryptographic Signature** - Switchboard oracles sign the data
   - Data is cryptographically verified by Switchboard program
   - Anyone can verify the signature matches Switchboard authority

### Transparency

The system is fully transparent:

```rust
emit!(LobbyResolved {
    lobby: lobby.key(),
    winner_side,
    randomness_value,  // ✅ Published on-chain!
    total_pot: pot,
    platform_fee: fee_final,
    payout_per_winner: payout_each,
});
```

**Anyone can verify:**

- Transaction is public on Solana explorer
- Event contains the exact randomness value used
- Anyone can replay: `randomness_value % 2 = winner_side`
- Switchboard account is public - anyone can read the randomness
- Full transaction logs show: "Switchboard randomness: 12345..." message

## Attack Scenarios (All Prevented)

### ❌ Scenario 1: Platform Fakes Randomness

**Attack:** Platform operator tries to provide fake randomness

**Prevention:**

```rust
owner = SWITCHBOARD_PROGRAM_ID  // Account must be owned by Switchboard
```

Transaction will fail if randomness account is not owned by Switchboard program.

### ❌ Scenario 2: Platform Swaps Randomness Account

**Attack:** Create multiple randomness accounts, pick the one that favors house/friend

**Prevention:**

```rust
constraint = randomness_account_data.key() == lobby.randomness_account
```

Must use the EXACT account that was saved during join_side_final. Cannot be changed.

### ❌ Scenario 3: Platform Front-Runs Result

**Attack:** See randomness value, front-run with favorable account before resolve

**Prevention:**

- Account is saved during join (before randomness is generated)
- Constraint verifies it's the same account
- Timeline: Join → Randomness Generated → Resolve (no opportunity to swap)

### ❌ Scenario 4: Collusion with Switchboard

**Attack:** Collude with Switchboard oracle to get favorable numbers

**Prevention:**

- Switchboard uses multiple independent oracles
- Slashing mechanism for dishonest oracles
- Economic incentives align against manipulation
- All randomness requests are public and auditable

## Verification Steps for Users

Anyone can verify fairness:

1. **Check Transaction on Solscan/Solana Explorer**

   - View the `resolve_match` transaction
   - See the randomness account used
   - Read the LobbyResolved event

2. **Verify Randomness Account Owner**

   ```
   solana account <randomness_account>
   ```

   Should show owner: `BeFxPRDreo8uLivyGgqDE87iGaU3o1Tw9hZw46NxYaej` (Switchboard)

3. **Verify Winner Calculation**

   - LobbyResolved event shows: `randomness_value: 12345...`
   - Calculate: `12345... % 2 = winner_side`
   - Match against emitted `winner_side`

4. **Verify Timeline**
   - Check join_side_final transaction (when randomness account was saved)
   - Check resolve_match transaction (when randomness was read)
   - Confirm same randomness account used in both

## Current Implementation Status

### ✅ Completed:

- Rust smart contract with Switchboard verification
- Error handling for wrong randomness accounts
- Event emission with randomness value
- ResolveBotWorker to trigger resolution
- Service interfaces and mock implementations

### 🔄 For Production:

- Implement actual Switchboard OnDemand randomness request in SwitchboardClient
- Implement actual resolve_match transaction builder in ResolveSender
- Test with real Switchboard randomness accounts on devnet
- Deploy updated program
- Update frontend IDL

## Switchboard Account Setup (MVP)

For initial testing, use lobby PDA as randomness account placeholder.

For production:

1. Create Switchboard randomness account via Switchboard dashboard
2. Fund it with SOL for oracle fees
3. Pass actual Switchboard account in `join_side_final`
4. Worker waits for Switchboard to fill randomness
5. Worker calls `resolve_match` when ready

## Summary

**Bottom Line:** The randomness comes from Switchboard OnDemand, verified on-chain through:

- Ownership verification
- Account constraint checking
- Cryptographic signatures

**No one can manipulate the outcome**, including platform operators. The blockchain itself verifies the randomness is legitimate.
