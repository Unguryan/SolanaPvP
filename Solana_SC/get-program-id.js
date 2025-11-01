const fs = require('fs');
const { Keypair } = require('@solana/web3.js');

const keypairPath = 'target/deploy/pvp_program-keypair.json';
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));

console.log('Program ID:', keypair.publicKey.toString());
