// Create Switchboard OnDemand randomness account
// Usage: node create-randomness-account.js <queuePubkey> <keypairPath> <rpcUrl>

import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Randomness, Queue, SB_ON_DEMAND_PID } from '@switchboard-xyz/on-demand';
import fs from 'fs';

async function main() {
  try {
    // Parse command line arguments
    const [queuePubkeyStr, keypairPath, rpcUrl] = process.argv.slice(2);

    if (!queuePubkeyStr || !keypairPath || !rpcUrl) {
      console.error('ERROR: Missing required arguments');
      console.error('Usage: node create-randomness-account.js <queuePubkey> <keypairPath> <rpcUrl>');
      process.exit(1);
    }

    // Load payer keypair
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    const payerKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

    // Setup connection and provider
    const connection = new Connection(rpcUrl, { commitment: 'confirmed' });
    const wallet = new anchor.Wallet(payerKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });

    console.error('[CreateRandomness] Creating randomness account...');
    console.error('[CreateRandomness] Payer:', payerKeypair.publicKey.toString());
    console.error('[CreateRandomness] Queue:', queuePubkeyStr);

    // Load Switchboard program
    const sbProgramId = SB_ON_DEMAND_PID;
    const sbProgram = await anchor.Program.at(sbProgramId, provider);
    
    // Load queue
    const queuePubkey = new PublicKey(queuePubkeyStr);
    const queueAccount = new Queue(sbProgram, queuePubkey);

    // Generate keypair for randomness account
    const rngKp = Keypair.generate();

    // Create randomness account using Switchboard OnDemand SDK (with queue)
    const [randomness, createIx] = await Randomness.create(sbProgram, rngKp, queuePubkey);
    
    console.error('[CreateRandomness] Randomness account created:', randomness.pubkey.toString());

    // Output pubkey to stdout (C# will read this)
    console.log(randomness.pubkey.toString());
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error.message || error);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

main();

