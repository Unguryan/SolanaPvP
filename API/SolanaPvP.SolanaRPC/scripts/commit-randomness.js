// Commit randomness request for Switchboard OnDemand account
// Usage: node commit-randomness.js <randomnessAccount> <queuePubkey> <keypairPath> <rpcUrl>

import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Randomness, Queue, SB_ON_DEMAND_PID } from '@switchboard-xyz/on-demand';
import fs from 'fs';

async function main() {
  try {
    // Parse command line arguments
    const [randomnessAccountStr, queuePubkeyStr, keypairPath, rpcUrl] = process.argv.slice(2);

    if (!randomnessAccountStr || !queuePubkeyStr || !keypairPath || !rpcUrl) {
      console.error('ERROR: Missing required arguments');
      console.error('Usage: node commit-randomness.js <randomnessAccount> <queuePubkey> <keypairPath> <rpcUrl>');
      process.exit(1);
    }

    // Load payer keypair
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    const payerKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

    // Setup connection and provider
    const connection = new Connection(rpcUrl, { commitment: 'confirmed' });
    const wallet = new anchor.Wallet(payerKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });

    const randomnessAccount = new PublicKey(randomnessAccountStr);
    const queuePubkey = new PublicKey(queuePubkeyStr);

    console.error('[CommitRandomness] Committing randomness...');
    console.error('[CommitRandomness] Account:', randomnessAccount.toString());
    console.error('[CommitRandomness] Queue:', queuePubkey.toString());
    console.error('[CommitRandomness] Payer:', payerKeypair.publicKey.toString());

    // Load Switchboard program
    const sbProgramId = SB_ON_DEMAND_PID;
    const sbProgram = await anchor.Program.at(sbProgramId, provider);

    // Load randomness account
    const randomness = new Randomness(sbProgram, randomnessAccount);

    // Load queue
    const queueAccount = new Queue(sbProgram, queuePubkey);

    // Commit randomness using commitIx (returns instruction)
    const commitIx = await randomness.commitIx(queueAccount);
    
    // Build and send transaction
    const tx = new anchor.web3.Transaction().add(commitIx);
    const commitTxSignature = await provider.sendAndConfirm(tx);
    
    console.error('[CommitRandomness] Randomness committed!');
    console.error('[CommitRandomness] Transaction:', commitTxSignature);

    // Output transaction signature to stdout
    console.log(commitTxSignature);
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

