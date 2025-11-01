#!/bin/bash
# Generate IDL by parsing source code (doesn't need proc-macro2)

set -e

echo "🔨 Building program..."
anchor build

echo "📝 Generating IDL from source code..."
# Parse IDL from Rust source without using proc-macro2 
anchor idl parse programs/pvp_program/src/lib.rs -o target/idl/pvp_program.json

echo "📦 Copying to frontend..."
mkdir -p ../FRONT/SolanaPvP.Front/src/services/solana/idl
cp target/idl/pvp_program.json ../FRONT/SolanaPvP.Front/src/services/solana/idl/

echo "✅ Done!"

