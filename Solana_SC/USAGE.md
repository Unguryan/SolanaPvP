# Solana PvP Program Usage Guide

This guide explains how to interact with the PvP smart contract programmatically.

## Program Overview

The PvP program implements a fair, on-chain PvP game system with the following features:

- **Team-based matches**: 1v1, 2v2, or 5v5
- **Fair randomness**: Uses Switchboard VRF for winner determination
- **Automatic payouts**: Winners receive their share instantly
- **Refund system**: Unjoined matches can be refunded after 2 minutes
- **Platform fees**: 1% fee goes to admin

## Program Instructions

### 1. Initialize Global Config

Sets up the global configuration with admin address.

```typescript
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";

// Derive config PDA
const [configPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  program.programId
);

// Initialize config
const tx = await program.methods
  .initConfig(adminPublicKey)
  .accounts({
    config: configPda,
    payer: adminPublicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([adminKeypair])
  .rpc();
```

### 2. Create Lobby

Creates a new lobby and automatically joins the creator.

```typescript
// Derive PDAs
const [lobbyPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("lobby"),
    creatorPublicKey.toBuffer(),
    new anchor.BN(lobbyId).toArrayLike(Buffer, "le", 8),
  ],
  program.programId
);

const [activePda] = PublicKey.findProgramAddressSync(
  [Buffer.from("active"), creatorPublicKey.toBuffer()],
  program.programId
);

// Create lobby
const tx = await program.methods
  .createLobby(
    new anchor.BN(lobbyId), // Unique lobby ID
    1, // Team size (1, 2, or 5)
    new anchor.BN(stakeAmount), // Stake in lamports (min 0.05 SOL)
    0 // Side (0 = team1, 1 = team2)
  )
  .accounts({
    lobby: lobbyPda,
    active: activePda,
    creator: creatorPublicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([creatorKeypair])
  .rpc();
```

### 3. Join Lobby

Join an existing lobby on a specific side.

```typescript
// Join lobby (requires Switchboard VRF accounts for last join)
const tx = await program.methods
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
    queueAuthority: queueAuthorityAccount,
    permissionAccount: permissionAccount,
    escrowWallet: escrowWallet,
    payerWallet: payerWallet,
    payerAuthority: payerAuthority,
    recentBlockhashes: recentBlockhashesSysvar,
    switchboardState: switchboardState,
    tokenProgram: tokenProgramId,
    associatedTokenProgram: associatedTokenProgramId,
    systemProgram: SystemProgram.programId,
  })
  .signers([playerKeypair, payerAuthorityKeypair])
  .rpc();
```

### 4. Refund Lobby

Refund all participants if lobby hasn't filled and 2 minutes have passed.

```typescript
// Refund lobby
const tx = await program.methods
  .refund()
  .accounts({
    lobby: lobbyPda,
    requester: requesterPublicKey,
    active: activePda,
    config: configPda,
    systemProgram: SystemProgram.programId,
  })
  .remainingAccounts([
    // All participants in order: team1..., team2...
    { pubkey: team1Player1, isSigner: false, isWritable: true },
    { pubkey: team1Player2, isSigner: false, isWritable: true },
    { pubkey: team2Player1, isSigner: false, isWritable: true },
    // ... etc
  ])
  .signers([requesterKeypair])
  .rpc();
```

### 5. Fulfill Randomness (VRF Callback)

This is called automatically by Switchboard VRF when randomness is ready.

```typescript
// This is called by Switchboard, not directly by users
const tx = await program.methods
  .fulfillRandomness()
  .accounts({
    lobby: lobbyPda,
    active: activePda,
    config: configPda,
    vrf: vrfAccount,
    switchboardProgram: switchboardProgramId,
    systemProgram: SystemProgram.programId,
  })
  .remainingAccounts([
    // Admin + all participants: [admin, team1..., team2...]
    { pubkey: adminPublicKey, isSigner: false, isWritable: true },
    { pubkey: team1Player1, isSigner: false, isWritable: true },
    { pubkey: team2Player1, isSigner: false, isWritable: true },
    // ... etc
  ])
  .rpc();
```

## Account Structures

### GlobalConfig

```typescript
interface GlobalConfig {
  bump: number;
  admin: PublicKey; // Fee collector
}
```

### Lobby

```typescript
interface Lobby {
  bump: number;
  lobbyId: anchor.BN;
  creator: PublicKey;
  status: LobbyStatus;
  teamSize: number; // 1, 2, or 5
  stakeLamports: anchor.BN;
  createdAt: anchor.BN;
  finalized: boolean;
  vrf: PublicKey; // Switchboard VRF account
  team1: PublicKey[];
  team2: PublicKey[];
}

enum LobbyStatus {
  Open, // Collecting players
  Pending, // VRF requested, waiting for callback
  Resolved, // Paid out to winners
  Refunded, // Refunded to participants
}
```

### ActiveLobby

```typescript
interface ActiveLobby {
  bump: number;
  creator: PublicKey;
  lobby: PublicKey;
}
```

## PDA Derivation

### Config PDA

```typescript
const [configPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  program.programId
);
```

### Lobby PDA

```typescript
const [lobbyPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("lobby"),
    creatorPublicKey.toBuffer(),
    new anchor.BN(lobbyId).toArrayLike(Buffer, "le", 8),
  ],
  program.programId
);
```

### Active Lobby PDA

```typescript
const [activePda] = PublicKey.findProgramAddressSync(
  [Buffer.from("active"), creatorPublicKey.toBuffer()],
  program.programId
);
```

## Error Handling

The program defines custom errors:

```typescript
enum PvpError {
  InvalidSide = "Invalid side (must be 0 or 1)",
  LobbyNotOpen = "Lobby is not open",
  LobbyNotOpenForJoin = "Lobby already pending/resolved/refunded",
  SideFull = "Side is full",
  AlreadyJoined = "Player already joined",
  NotEnoughPlayers = "Not enough players",
  Unauthorized = "Unauthorized",
  StakeTooSmall = "Stake is below minimum",
  TooSoonToRefund = "Too soon to refund",
  AlreadyFinalized = "Already finalized",
  BadRemainingAccounts = "Bad remaining accounts length",
  InvalidTeamSize = "Invalid team size (allowed: 1, 2, 5)",
  RemainingAccountsMismatch = "Remaining accounts mismatch with team lists",
  WrongSwitchboardProgram = "Wrong Switchboard program id",
  WrongVrfAccount = "VRF account does not match lobby",
  WrongVrfAuthority = "VRF authority mismatch",
  NotPending = "Lobby not pending",
}
```

## Switchboard VRF Integration

### Setting Up VRF Account

1. **Visit Switchboard Console:**

   - Devnet: https://devnet.console.switchboard.xyz/
   - Mainnet: https://console.switchboard.xyz/

2. **Create VRF Account:**

   - Set authority to your lobby PDA
   - Fund with sufficient SOL
   - Note the account addresses

3. **Configure in your app:**
   ```typescript
   const switchboardProgramId = new PublicKey(
     "SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f"
   );
   const oracleQueue = new PublicKey("YOUR_ORACLE_QUEUE_ADDRESS");
   const vrfAccount = new PublicKey("YOUR_VRF_ACCOUNT_ADDRESS");
   ```

### VRF Callback Authority

The VRF authority must be set to the lobby PDA:

```typescript
const vrfAuthority = lobbyPda;
```

This ensures only the specific lobby can receive the VRF callback.

## Example Integration

### Complete Lobby Creation and Joining

```typescript
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

async function createAndJoinLobby() {
  // Setup
  const program = anchor.workspace.PvpProgram;
  const provider = anchor.getProvider();

  // Generate keypairs
  const creator = Keypair.generate();
  const player = Keypair.generate();

  // Airdrop SOL
  await provider.connection.requestAirdrop(
    creator.publicKey,
    2 * anchor.web3.LAMPORTS_PER_SOL
  );
  await provider.connection.requestAirdrop(
    player.publicKey,
    2 * anchor.web3.LAMPORTS_PER_SOL
  );

  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const lobbyId = 1;
  const [lobbyPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("lobby"),
      creator.publicKey.toBuffer(),
      new anchor.BN(lobbyId).toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );

  const [activePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("active"), creator.publicKey.toBuffer()],
    program.programId
  );

  // Create lobby
  const createTx = await program.methods
    .createLobby(
      new anchor.BN(lobbyId),
      1, // team size
      new anchor.BN(100_000_000), // 0.1 SOL
      0 // team1
    )
    .accounts({
      lobby: lobbyPda,
      active: activePda,
      creator: creator.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([creator])
    .rpc();

  console.log("Lobby created:", createTx);

  // Join lobby (simplified - in practice you need VRF accounts)
  const joinTx = await program.methods
    .joinSide(1) // team2
    .accounts({
      lobby: lobbyPda,
      creator: creator.publicKey,
      player: player.publicKey,
      active: activePda,
      config: configPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([player])
    .rpc();

  console.log("Player joined:", joinTx);

  // Check lobby state
  const lobbyAccount = await program.account.lobby.fetch(lobbyPda);
  console.log("Lobby status:", lobbyAccount.status);
  console.log(
    "Team 1:",
    lobbyAccount.team1.map((p) => p.toString())
  );
  console.log(
    "Team 2:",
    lobbyAccount.team2.map((p) => p.toString())
  );
}
```

## Best Practices

### 1. Error Handling

```typescript
try {
  const tx = await program.methods
    .createLobby(...)
    .rpc();
} catch (error) {
  if (error.code === 6000) {
    console.error("Invalid team size");
  } else if (error.code === 6001) {
    console.error("Stake too small");
  }
  // Handle other errors...
}
```

### 2. Transaction Confirmation

```typescript
const tx = await program.methods
  .createLobby(...)
  .rpc();

// Wait for confirmation
const confirmation = await provider.connection.confirmTransaction(tx);
if (confirmation.value.err) {
  throw new Error("Transaction failed");
}
```

### 3. Account Validation

```typescript
// Always validate accounts before use
const lobbyAccount = await program.account.lobby.fetchNullable(lobbyPda);
if (!lobbyAccount) {
  throw new Error("Lobby not found");
}

if (lobbyAccount.status.open !== true) {
  throw new Error("Lobby is not open");
}
```

### 4. Gas Estimation

```typescript
// Estimate transaction size
const tx = await program.methods
  .createLobby(...)
  .accounts({...})
  .transaction();

const { value: fee } = await provider.connection.getFeeForMessage(
  await tx.compileMessage()
);
console.log("Estimated fee:", fee);
```

## Testing

### Unit Tests

```typescript
describe("PvP Program", () => {
  it("Creates lobby successfully", async () => {
    // Test implementation
  });

  it("Handles invalid team size", async () => {
    // Test error cases
  });
});
```

### Integration Tests

```typescript
it("Complete lobby flow", async () => {
  // Create lobby
  // Join players
  // Trigger VRF
  // Verify payouts
});
```

## Monitoring

### Event Listening

```typescript
// Listen for program events
program.addEventListener("LobbyCreated", (event) => {
  console.log("New lobby created:", event);
});

program.addEventListener("PlayerJoined", (event) => {
  console.log("Player joined:", event);
});
```

### Account Monitoring

```typescript
// Monitor lobby account changes
const subscriptionId = program.account.lobby.subscribe(lobbyPda, (account) => {
  console.log("Lobby updated:", account);
});
```

This completes the usage guide. For more specific examples, see the test files in the `tests/` directory.
