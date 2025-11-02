# Switchboard OnDemand Migration Guide

## ✅ Миграция Завершена!

Проект успешно мигрирован с **Switchboard V2** (EOL 15 ноября 2024) на **Switchboard OnDemand**.

## Что Изменилось

### Smart Contract (Rust)

**Удалено (V2):**

- ❌ `switchboard-solana = "0.30.4"`
- ❌ `OracleQueueAccountData`, `PermissionAccountData`
- ❌ 19 accounts в `JoinSideFull`
- ❌ Callback функция `fulfill_randomness()`
- ❌ Поле `vrf: Pubkey` в Lobby

**Добавлено (OnDemand):**

- ✅ `switchboard-on-demand = "0.8.0"`
- ✅ `use switchboard_on_demand::prelude::*`
- ✅ 8 accounts в `JoinSideFull` (11 меньше!)
- ✅ Новая функция `resolve_match()` - pull model
- ✅ Поля `randomness_account: Pubkey` и `winner_side: u8` в Lobby

### Frontend (TypeScript)

**Удалено (V2):**

- ❌ `switchboardOracleQueue`
- ❌ `switchboardPermissionAccount`
- ❌ `vrfAccount`, `vrfEscrowWallet`
- ❌ 10+ V2 VRF accounts в joinLobby

**Добавлено (OnDemand):**

- ✅ `switchboardProgramId: "SBondMDrcV3K4kxZR1HNVT7osZxAHVHgYXL5Ze1oMUv"`
- ✅ Только 1 account: `randomnessAccountData`

## Новый Flow

### До (V2 - сложно ❌):

```
User joins (final) → 19 accounts → VRF request → Wait for callback
                   → fulfill_randomness() called by Switchboard
                   → Winner determined → Payout
```

### После (OnDemand - просто ✅):

```
User joins (final) → 8 accounts → Store randomness_account → Pending
                   ↓
Off-chain/Backend calls resolve_match()
                   → Pull randomness from OnDemand
                   → Winner determined → Payout
```

## Как Использовать

### 1. Создание Randomness Account (Один раз)

Используйте Switchboard OnDemand Dashboard:

- Откройте: https://ondemand.switchboard.xyz/solana/devnet
- Connect wallet
- Create Randomness Account
- Скопируйте pubkey

Или через SDK:

```typescript
import { Randomness } from "@switchboard-xyz/on-demand";

const randomness = await Randomness.create(program);
const randomnessAccount = randomness.pubkey;
```

### 2. Final Join с Randomness Account

```typescript
await PvpInstructions.joinLobby(program, {
  lobbyPda,
  creator,
  player,
  side,
  vrfAccount: randomnessAccount, // Созданный randomness account
});
```

### 3. Resolve Match (После Join)

```typescript
// Backend или off-chain service вызывает:
await program.methods
  .resolveMatch()
  .accounts({
    lobby: lobbyPda,
    creator,
    active: activePda,
    config: configPda,
  })
  .remainingAccounts([admin, ...team1, ...team2])
  .rpc();
```

## Преимущества

- ✅ **Проще**: 8 accounts вместо 19
- ✅ **Надёжнее**: Supported продукт (V2 EOL)
- ✅ **Быстрее**: Меньше accounts = меньше compute units
- ✅ **Гибче**: Pull model вместо callback
- ✅ **Дешевле**: Меньше rent, меньше tx fees

## Testing

### Build:

```bash
cd Solana_SC
anchor build
```

### Deploy:

```bash
anchor deploy --provider.cluster devnet
```

### Copy IDL:

```bash
cp target/idl/pvp_program.json ../FRONT/SolanaPvP.Front/public/idl/
cp target/idl/pvp_program.json ../API/SolanaPvP.API_Project/wwwroot/idl/
```

### Test Flow:

1. Create 1v1 lobby
2. User B joins (final) → Status: Pending
3. Call `resolve_match()` → Randomness pulled, winner determined, payouts done
4. Status: Resolved ✅

## TODO: Backend Integration

Добавить в `IndexerWorker.cs` обработку события `PlayerJoined` с `is_full: true`:

- Автоматически вызывать `resolve_match()`
- Или добавить worker который мониторит Pending lobbies и резолвит их

## Ссылки

- [Switchboard OnDemand Docs](https://docs.switchboard.xyz/)
- [OnDemand Dashboard](https://ondemand.switchboard.xyz/solana/devnet)
- [OnDemand Examples](https://github.com/switchboard-xyz/sb-on-demand-examples)
- [Solana SDK](https://github.com/switchboard-xyz/solana-sdk)

---

**Дата миграции**: 2 ноября 2025  
**Версия**: V2 (0.30.4) → OnDemand (0.8.0)
