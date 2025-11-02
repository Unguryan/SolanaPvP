// Generate Solana keypair for resolve bot
// Run: node generate-bot-keypair.js

const fs = require('fs');
const crypto = require('crypto');

// Generate random 32 bytes for private key
const privateKey = crypto.randomBytes(32);

// For Solana, keypair is 64 bytes: [private_key(32), public_key(32)]
// We'll use a simplified version - in production use @solana/web3.js

console.log('⚠️  This is a simplified keypair generator');
console.log('📝 For production, use: solana-keygen new --outfile resolve-bot-keypair.json');
console.log('');

// Create a 64-byte array (mock - real version needs ed25519 derivation)
const keypair = new Uint8Array(64);
crypto.randomFillSync(keypair);

const keypairArray = Array.from(keypair);

// Save to file
const filename = 'resolve-bot-keypair.json';
fs.writeFileSync(filename, JSON.stringify(keypairArray));

console.log(`✅ Mock keypair generated: ${filename}`);
console.log('');
console.log('🚨 IMPORTANT: Use real Solana CLI for production:');
console.log('   solana-keygen new --outfile resolve-bot-keypair.json');
console.log('   solana airdrop 1 <PUBKEY> --url devnet');
console.log('');
console.log('📍 Place the keypair file in: API/SolanaPvP.API_Project/');

