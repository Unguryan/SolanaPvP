# 🔧 Build and Deploy Instructions

## Prerequisites

You need Anchor CLI installed. If not installed, run:

```bash
# Install Anchor CLI (latest)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

Or on Windows with Solana installed:

```bash
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
```

## Build the Program

```bash
cd Solana_SC
anchor build
```

This will:

- Compile the Rust program
- Generate IDL files in `target/idl/`
- Generate TypeScript types in `target/types/`

## Update Frontend IDL

After building, copy the new IDL to frontend:

### Windows (PowerShell):

```powershell
.\copy-idl-to-frontend.ps1
```

### Linux/Mac:

```bash
./copy-idl-manual.sh
```

Or manually:

```bash
cp target/idl/pvp_program.json ../FRONT/SolanaPvP.Front/src/idl/
cp target/types/pvp_program.ts ../FRONT/SolanaPvP.Front/src/idl/
```

## Deploy to Devnet

```bash
anchor deploy --provider.cluster devnet
```

## Upgrade Existing Program

```bash
anchor upgrade --provider.cluster devnet target/deploy/pvp_program.so --program-id F2LhVGUa9yLbYVYujYMPyckqWmsokHE9wym7ceGHWUMZ
```

## What Changed

This build includes new events:

- ✅ `LobbyCreated` - emitted when lobby is created
- ✅ `PlayerJoined` - emitted when player joins
- ✅ `LobbyResolved` - emitted when match is resolved
- ✅ `LobbyRefunded` - emitted when lobby is refunded

These events will be picked up by the `IndexerWorker` on the backend!
