/**
 * Admin Force Refund Script
 * 
 * This script allows admins to manually force refund matches that are stuck
 * in Pending status after VRF resolve attempts have failed.
 * 
 * Usage:
 *   npm run force-refund <matchPda>
 * 
 * Example:
 *   npm run force-refund 4fkF3eR4UVunpoGxop2LNcxPjDmfrsEzbp1W8eeGy3x2
 * 
 * Prerequisites:
 *   - Admin keypair must be configured in admin-keypair.json
 *   - Match must be in a valid state for force refund
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  Connection,
  SystemProgram,
} from "@solana/web3.js";
import fs from "fs";
import path from "path";

const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = "F2LhVGUa9yLbYVYujYMPyckqWmsokHE9wym7ceGHWUMZ";

async function main() {
  // Get match PDA from command line arguments
  const matchPda = process.argv[2];
  
  if (!matchPda) {
    console.error("❌ Error: Match PDA is required");
    console.log("Usage: npm run force-refund <matchPda>");
    process.exit(1);
  }

  console.log("🔧 [ForceRefund] Starting force refund for match:", matchPda);

  // Load admin keypair
  const adminKeypairPath = path.join(__dirname, "..", "admin-keypair.json");
  if (!fs.existsSync(adminKeypairPath)) {
    console.error("❌ Admin keypair not found at:", adminKeypairPath);
    console.log("Please create admin-keypair.json with admin private key");
    process.exit(1);
  }

  const adminKeypairData = JSON.parse(fs.readFileSync(adminKeypairPath, "utf-8"));
  const adminKeypair = Keypair.fromSecretKey(new Uint8Array(adminKeypairData));
  console.log("✅ Admin keypair loaded:", adminKeypair.publicKey.toString());

  // Setup connection and provider
  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = new Wallet(adminKeypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // Load IDL
  const idlPath = path.join(__dirname, "..", "idl", "pvp_program.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new Program(idl, PROGRAM_ID, provider) as Program;

  try {
    // Fetch lobby account
    const lobbyPubkey = new PublicKey(matchPda);
    const lobbyAccount = await program.account.lobby.fetch(lobbyPubkey);
    
    console.log("📊 Lobby info:");
    console.log("  Creator:", lobbyAccount.creator.toString());
    console.log("  Status:", Object.keys(lobbyAccount.status)[0]);
    console.log("  Team 1:", lobbyAccount.team1.length, "players");
    console.log("  Team 2:", lobbyAccount.team2.length, "players");

    // Derive PDAs
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    const [activePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("active"), lobbyAccount.creator.toBuffer()],
      program.programId
    );

    // Prepare remaining accounts (all participants)
    const allParticipants = [...lobbyAccount.team1, ...lobbyAccount.team2];
    const remainingAccounts = allParticipants.map((pubkey) => ({
      pubkey,
      isSigner: false,
      isWritable: true,
    }));

    console.log("🔄 Sending force refund transaction...");

    // Send force_refund instruction
    const tx = await program.methods
      .forceRefund()
      .accounts({
        lobby: lobbyPubkey,
        creator: lobbyAccount.creator,
        requester: adminKeypair.publicKey,
        active: activePda,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .rpc();

    console.log("✅ Force refund successful!");
    console.log("Transaction signature:", tx);
    console.log(`View on Solana Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

  } catch (error: any) {
    console.error("❌ Force refund failed:");
    console.error(error);
    
    if (error.logs) {
      console.error("\nProgram logs:");
      error.logs.forEach((log: string) => console.error(log));
    }
    
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

