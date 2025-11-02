# Admin Keypair Setup for ResolveBotWorker & RefundBotWorker

## Overview

Both RefundBot and ResolveBot use the **same admin keypair** (the wallet that deployed the smart contract). This keypair is used to sign refund and resolve transactions.

## Locate Your Admin Keypair

### Option 1: Copy from WSL to Windows

If your keypair is in WSL:

```bash
# In WSL terminal
cp ~/.config/solana/id.json /mnt/f/VS/SolanaPvP/API/SolanaPvP.API_Project/admin-keypair.json
```

### Option 2: Access WSL Files from Windows

Windows path to WSL files:

```
\\wsl$\Ubuntu\home\<username>\.config\solana\id.json
```

Copy this file to:

```
F:\VS\SolanaPvP\API\SolanaPvP.API_Project\admin-keypair.json
```

### Option 3: Export from Solana CLI

```bash
# In WSL
solana-keygen recover -o /mnt/f/VS/SolanaPvP/API/SolanaPvP.API_Project/admin-keypair.json
```

## Verify Keypair

After copying, verify it's correct:

```bash
# Get public key from keypair
solana-keygen pubkey F:\VS\SolanaPvP\API\SolanaPvP.API_Project\admin-keypair.json
```

Should match your deployed program's authority / update authority.

## Configuration

The `appsettings.json` is already configured:

```json
{
  "Solana": {
    "AdminKeypairPath": "admin-keypair.json"
  }
}
```

This path is relative to the API project directory.

## Security Notes

⚠️ **IMPORTANT:**

- Never commit the admin keypair to git
- Add `admin-keypair.json` to `.gitignore`
- This wallet controls the program and receives platform fees
- Keep it secure!

## Testing

After placing the keypair:

1. Start the backend:

```bash
cd API/SolanaPvP.API_Project
dotnet run
```

2. Watch for logs:

```
[RefundSender] Refund transaction sent: <REAL_SIGNATURE>
[ResolveSender] Resolve transaction sent: <REAL_SIGNATURE>
```

If you see real transaction signatures (not mock), it's working!

## Troubleshooting

### "Script not found" error

Make sure Node.js dependencies are installed:

```bash
cd API/SolanaPvP.SolanaRPC/scripts
npm install
```

### "node: command not found"

Install Node.js on your system and ensure it's in PATH.

### "Failed to fetch lobby data"

This is expected for MVP - lobby data fetching is TODO.
The scripts are ready, but need:

1. Proper Borsh deserialization of Lobby account
2. Or: Pass participants from DB instead of blockchain

For now, the infrastructure is in place and will work once lobby data fetching is implemented.
