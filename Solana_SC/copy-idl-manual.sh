#!/bin/bash
# Simple script to manually copy IDL file to frontend (bypassing build)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_IDL="$SCRIPT_DIR/target/idl/pvp_program.json"
FRONTEND_IDL="$SCRIPT_DIR/../FRONT/SolanaPvP.Front/src/services/solana/idl/pvp_program.json"

echo "📦 Copying IDL to frontend..."

# Create directories if they don't exist
mkdir -p "$(dirname "$FRONTEND_IDL")"

# Check if IDL exists
if [ -f "$TARGET_IDL" ]; then
    cp "$TARGET_IDL" "$FRONTEND_IDL"
    echo "✅ Copied IDL to frontend: $FRONTEND_IDL"
    echo "✨ Done!"
else
    echo "❌ IDL not found at: $TARGET_IDL"
    echo "   Make sure the IDL file exists in target/idl/"
    exit 1
fi

