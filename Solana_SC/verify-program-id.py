#!/usr/bin/env python3
# Verify Program ID from keypair file

import json
import base58
from nacl.signing import SigningKey

try:
    with open('target/deploy/pvp_program-keypair.json', 'r') as f:
        keypair_data = json.load(f)
    
    # Convert to bytes
    secret_key = bytes(keypair_data[:32])
    
    # Create signing key
    signing_key = SigningKey(secret_key)
    public_key = signing_key.verify_key
    
    # Convert to base58 (Solana format)
    public_key_bytes = bytes(public_key)
    program_id = base58.b58encode(public_key_bytes).decode('utf-8')
    
    print(f"✅ Program ID from keypair: {program_id}")
    
    # Check if it matches declare_id
    with open('programs/pvp_program/src/lib.rs', 'r') as f:
        content = f.read()
        if program_id in content:
            print(f"✅ Program ID matches declare_id! in lib.rs")
        else:
            print(f"⚠️  Program ID does NOT match declare_id! in lib.rs")
            print(f"   Please update declare_id! to: {program_id}")
            
except FileNotFoundError:
    print("❌ Keypair file not found. Run 'anchor build' first!")
except Exception as e:
    print(f"❌ Error: {e}")
