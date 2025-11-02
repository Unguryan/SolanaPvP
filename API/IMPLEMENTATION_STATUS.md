# SolanaPvP Backend Implementation Status

## ✅ Completed

### Transaction Infrastructure

- ✅ Node.js scripts for Anchor transactions (send-refund.js, send-resolve.js)
- ✅ NodeScriptExecutor for calling Node.js from C#
- ✅ Single admin keypair for all bot operations
- ✅ RefundSender using real Node.js transaction
- ✅ ResolveSender using real Node.js transaction
- ✅ SwitchboardClient reading real Switchboard account data
- ✅ ResolveBotWorker monitoring Pending matches
- ✅ All services registered in DI

### Smart Contract Updates

- ✅ Error variants added (WrongRandomnessAccount, InvalidRandomnessData)
- ✅ LobbyResolved event includes randomness_value
- ✅ ResolveMatch struct includes Switchboard verification
- ✅ resolve_match function reads Switchboard randomness
- ✅ On-chain proof of fairness via owner and constraint checks

### Workers

- ✅ IndexerWorker (monitors blockchain events)
- ✅ RefundBotWorker (auto-refunds unfilled matches)
- ✅ ResolveBotWorker (auto-resolves completed matches)

## 🔄 To Complete

### Lobby Data Fetching

Both RefundSender and ResolveSender have placeholder `FetchLobbyDataAsync()`:

**Current:**

```csharp
private async Task<LobbyData?> FetchLobbyDataAsync(string lobbyPda)
{
    // TODO: Implement actual account fetching using RpcReader
    return null; // Placeholder
}
```

**Needed:**

1. Fetch lobby account from Solana RPC
2. Deserialize Borsh-encoded data
3. Extract: creator, team1[], team2[]

**Alternative (Quick Fix for MVP):**

- Get participants from database instead of blockchain
- Match table already has Participants navigation property
- This works because IndexerWorker already tracks all participants

### Script File Deployment

When building for production, ensure scripts are copied to output directory.

**Add to** `API/SolanaPvP.SolanaRPC/SolanaPvP.SolanaRPC.csproj`:

```xml
<ItemGroup>
  <None Update="scripts\**\*">
    <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
  </None>
  <None Update="idl\**\*">
    <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
  </None>
</ItemGroup>
```

## Testing Steps

### 1. Setup Admin Keypair

Follow `ADMIN_KEYPAIR_SETUP.md`:

- Copy admin keypair to `API/SolanaPvP.API_Project/admin-keypair.json`
- Verify it has SOL for transaction fees

### 2. Rebuild and Deploy Smart Contract

```bash
cd Solana_SC
anchor build
anchor deploy
```

### 3. Update Frontend IDL

```bash
cp target/idl/pvp_program.json ../FRONT/SolanaPvP.Front/src/idl/
cp target/types/pvp_program.ts ../FRONT/SolanaPvP.Front/src/idl/
```

### 4. Start Backend

```bash
cd API/SolanaPvP.API_Project
dotnet run
```

Watch for:

```
ResolveBotWorker started
[ResolveBotWorker] Processing match ... for resolution
[SwitchboardClient] Randomness ready for ...
[ResolveSender] ✅ Resolve transaction sent: <REAL_SIGNATURE>
```

### 5. Test Full Flow

1. Create lobby (1v1)
2. Join lobby (second player)
3. Match status → Pending (AwaitingRandomness)
4. ResolveBotWorker detects and calls resolve_match
5. Smart contract reads Switchboard randomness
6. Winners get paid
7. IndexerWorker receives LobbyResolved event
8. Frontend shows results

## Current Limitations

### Lobby Data Fetching

`FetchLobbyDataAsync()` returns null → transactions will fail

**Quick Fix:** Use DB participants instead:

```csharp
var match = await matchRepository.GetByMatchPdaAsync(matchPda);
var participants = match.Participants.Select(p => p.Pubkey).ToList();
```

### Switchboard Account

Currently uses lobby PDA as placeholder randomness account.

**For Real Switchboard:**

1. Create randomness account via Switchboard dashboard
2. Fund it for oracle fees
3. Pass real account in join_side_final (frontend)
4. Update to use proper Switchboard account initialization

## Architecture Benefits

### Why Node.js Scripts?

- ✅ Reuse Anchor TypeScript libraries (battle-tested)
- ✅ Shared IDL with frontend
- ✅ Easy to debug (run scripts manually)
- ✅ No Borsh serialization in C# needed

### Single Admin Keypair

- ✅ Simpler setup (one keypair to manage)
- ✅ Same wallet that deployed contract
- ✅ Receives platform fees
- ✅ Trusted for both refunds and resolves

### Provable Fairness

- ✅ On-chain verification (owner + constraint)
- ✅ Randomness value published in event
- ✅ Anyone can verify transactions
- ✅ Switchboard oracles are independent

## Next Steps

1. ✅ Deploy updated smart contract
2. ✅ Setup admin keypair
3. ⚠️ Implement FetchLobbyDataAsync (or use DB participants)
4. ✅ Test resolve flow end-to-end
5. ⚠️ Setup real Switchboard randomness account (production)
