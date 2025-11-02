// Send resolve_match transaction to Solana blockchain
// Usage: node send-resolve.js <lobbyPda> <creator> <randomnessAccount> <participantsJson> <admin> <keypairPath> <rpcUrl> <programId>

import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Keypair } from '@solana/web3.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const [lobbyPda, creator, randomnessAccount, participantsJson, admin, keypairPath, rpcUrl, programId] = process.argv.slice(2);

if (!lobbyPda || !creator || !randomnessAccount || !participantsJson || !admin || !keypairPath || !rpcUrl || !programId) {
  console.error('ERROR: Missing required arguments');
  console.error('Usage: node send-resolve.js <lobbyPda> <creator> <randomnessAccount> <participantsJson> <admin> <keypairPath> <rpcUrl> <programId>');
  process.exit(1);
}

try {
  // Load IDL
  const idlPath = join(__dirname, '../idl/pvp_program.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

  // Load admin keypair
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const adminKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

  // Setup Anchor provider
  const connection = new anchor.web3.Connection(rpcUrl, { commitment: 'confirmed' });
  const wallet = new anchor.Wallet(adminKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new anchor.Program(idl, new PublicKey(programId), provider);

  // Parse participants
  const participants = JSON.parse(participantsJson);

  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId
  );

  const [activePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('active'), new PublicKey(creator).toBuffer()],
    program.programId
  );

  // Build and send resolve transaction
  const tx = await program.methods
    .resolveMatch()
    .accounts({
      lobby: new PublicKey(lobbyPda),
      creator: new PublicKey(creator),
      active: activePda,
      config: configPda,
      randomnessAccountData: new PublicKey(randomnessAccount),
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .remainingAccounts([
      // Admin first (receives platform fee)
      {
        pubkey: new PublicKey(admin),
        isSigner: false,
        isWritable: true,
      },
      // Then all participants (team1 + team2)
      ...participants.map(p => ({
        pubkey: new PublicKey(p),
        isSigner: false,
        isWritable: true,
      }))
    ])
    .rpc();

  // Output signature to stdout (C# will read this)
  console.log(tx);
} catch (error) {
  console.error('ERROR:', error.message || error);
  process.exit(1);
}

