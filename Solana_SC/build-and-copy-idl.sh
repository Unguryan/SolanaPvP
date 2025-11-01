#!/bin/bash
# Build Anchor program and copy IDL to frontend

echo "🔨 Building Anchor program..."
IDL_GENERATED=false
mkdir -p target/idl

# Method 1: Try standard anchor build (may fail due to proc_macro2 issue)
echo "Attempting standard build..."
if anchor build 2>&1 | tee /tmp/anchor_build.log; then
    if [ -f "target/idl/pvp_program.json" ]; then
        IDL_GENERATED=true
        echo "✅ Build succeeded and IDL generated"
    fi
fi

# Method 2: If IDL not generated, try building program first, then extract IDL
if [ "$IDL_GENERATED" = false ]; then
    echo "📝 Standard build didn't generate IDL, trying alternative methods..."
    
    # Try building just the program binary first (without IDL generation)
    echo "Building program binary only..."
    cd programs/pvp_program
    cargo build-sbf 2>&1 | grep -v "error\|warning" || true
    cd ../..
    
    # Method 2a: Try anchor idl extract (extract from built program)
    if command -v anchor &> /dev/null; then
        echo "Trying 'anchor idl extract'..."
        if anchor idl extract --filepath target/idl/pvp_program.json --program target/deploy/pvp_program.so 2>/dev/null; then
            if [ -f "target/idl/pvp_program.json" ]; then
                IDL_GENERATED=true
                echo "✅ IDL extracted from program binary"
            fi
        fi
    fi
    
    # Method 2b: Try anchor idl parse (parse from source)
    if [ "$IDL_GENERATED" = false ]; then
        echo "Trying 'anchor idl parse'..."
        if anchor idl parse programs/pvp_program/src/lib.rs --out target/idl/pvp_program.json 2>/dev/null; then
            if [ -f "target/idl/pvp_program.json" ]; then
                IDL_GENERATED=true
                echo "✅ IDL parsed from source"
            fi
        fi
    fi
    
    # Method 2c: Try using anchor idl build command
    if [ "$IDL_GENERATED" = false ]; then
        echo "Trying 'anchor idl build'..."
        if anchor idl build --filepath target/idl/pvp_program.json 2>/dev/null; then
            if [ -f "target/idl/pvp_program.json" ]; then
                IDL_GENERATED=true
                echo "✅ IDL built successfully"
            fi
        fi
    fi
fi

# Method 3: If still not generated, try downloading from on-chain
if [ "$IDL_GENERATED" = false ]; then
    echo ""
    echo "📥 Attempting to download IDL from on-chain..."
    if [ -f "download-idl.js" ]; then
        if node download-idl.js 2>/dev/null; then
            if [ -f "target/idl/pvp_program.json" ]; then
                IDL_GENERATED=true
                echo "✅ IDL downloaded from on-chain"
            fi
        fi
    else
        echo "   download-idl.js not found, skipping on-chain download"
    fi
fi

# Final check
if [ "$IDL_GENERATED" = false ]; then
    echo ""
    echo "❌ Failed to generate IDL using all available methods"
    echo ""
    echo "💡 Possible solutions:"
    echo "   1. Update Anchor to 0.31.1+ (fixes proc_macro2 compatibility):"
    echo "      avm install 0.31.1 && avm use 0.31.1"
    echo "      Then update Anchor.toml and Cargo.toml dependencies"
    echo ""
    echo "   2. Download IDL from on-chain manually:"
    echo "      node download-idl.js"
    echo ""
    echo "   3. Use Rust 1.75.0 (older, but compatible):"
    echo "      rustup override set 1.75.0"
    echo ""
    exit 1
fi

set -e  # Now enable strict error checking

echo ""
echo "📦 Copying IDL and types to frontend..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_IDL="$SCRIPT_DIR/target/idl/pvp_program.json"
TARGET_TYPES="$SCRIPT_DIR/target/types/pvp_program.ts"
FRONTEND_IDL="$SCRIPT_DIR/../FRONT/SolanaPvP.Front/src/services/solana/idl/pvp_program.json"
FRONTEND_TYPES="$SCRIPT_DIR/../FRONT/SolanaPvP.Front/src/services/solana/types/pvp_program.ts"

# Create directories if they don't exist
mkdir -p "$(dirname "$FRONTEND_IDL")"
mkdir -p "$(dirname "$FRONTEND_TYPES")"

# Check if IDL exists
if [ -f "$TARGET_IDL" ]; then
    cp "$TARGET_IDL" "$FRONTEND_IDL"
    echo "✅ Copied IDL to frontend"
else
    echo "⚠️  IDL not found at: $TARGET_IDL"
    echo "   Make sure 'anchor build' completed successfully"
    exit 1
fi

# Check if types exist
if [ -f "$TARGET_TYPES" ]; then
    cp "$TARGET_TYPES" "$FRONTEND_TYPES"
    echo "✅ Copied TypeScript types to frontend"
else
    echo "⚠️  TypeScript types not found at: $TARGET_TYPES"
    echo "   This is optional, continuing..."
fi

echo ""
echo "✨ Done!"

