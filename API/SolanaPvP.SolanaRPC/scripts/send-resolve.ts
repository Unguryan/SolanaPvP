// Send resolve_match transaction - TypeScript version (same as frontend!)
// Usage: ts-node send-resolve.ts <lobbyPda> <creator> <randomnessAccount> <participantsJson> <admin> <keypairPath> <rpcUrl> <programId>

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";
import type { PvpProgram } from "../idl/pvp_program.js";
import idlJson from "../idl/pvp_program.json" with { type: "json" };

async function main() {
  try {
    // Parse command line arguments
    const [
      lobbyPda,
      creator,
      randomnessAccount,
      participantsJson,
      admin,
      keypairPath,
      rpcUrl,
      programId,
    ] = process.argv.slice(2);

    if (
      !lobbyPda ||
      !creator ||
      !randomnessAccount ||
      !participantsJson ||
      !admin ||
      !keypairPath ||
      !rpcUrl ||
      !programId
    ) {
      console.error("ERROR: Missing required arguments");
      console.error(
        "Usage: ts-node send-resolve.ts <lobbyPda> <creator> <randomnessAccount> <participantsJson> <admin> <keypairPath> <rpcUrl> <programId>"
      );
      process.exit(1);
    }

    console.error("[Resolve] Starting resolve transaction...");
    console.error("[Resolve] Lobby:", lobbyPda);
    console.error("[Resolve] Creator:", creator);
    console.error("[Resolve] Randomness:", randomnessAccount);

    // Load admin keypair
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
    const adminKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

    // Setup Anchor provider (SAME AS FRONTEND!)
    const connection = new anchor.web3.Connection(rpcUrl, {
      commitment: "confirmed",
    });
    const wallet = new anchor.Wallet(adminKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });

    // Create program instance (SAME AS FRONTEND!)
    const program = new anchor.Program<PvpProgram>(idlJson as any, provider);

    console.error("[Resolve] Program loaded successfully");
    console.error("[Resolve] Program ID:", programId);

    // Parse participants (Base64-encoded to avoid command-line escaping issues)
    const participantsJsonDecoded = Buffer.from(participantsJson, "base64").toString("utf8");
    const participants = JSON.parse(participantsJsonDecoded);
    console.error("[Resolve] Participants:", participants.length);

    // Derive PDAs (SAME AS FRONTEND!)
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    const [activePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("active"), new PublicKey(creator).toBuffer()],
      program.programId
    );

    console.error("[Resolve] PDAs derived - Config:", configPda.toString());
    console.error("[Resolve] Active:", activePda.toString());

    // Build transaction (SAME PATTERN AS FRONTEND REFUND!)
    const tx = await program.methods
      .resolveMatch()
      .accountsStrict({
        lobby: new PublicKey(lobbyPda),
        creator: new PublicKey(creator),
        active: activePda,
        config: configPda,
        randomnessAccountData: new PublicKey(randomnessAccount),
        systemProgram: SystemProgram.programId,
      } as any)
      .remainingAccounts([
        // Admin first (receives platform fee)
        {
          pubkey: new PublicKey(admin),
          isSigner: false,
          isWritable: true,
        },
        // Then all participants (team1 + team2)
        ...participants.map((p: string) => ({
          pubkey: new PublicKey(p),
          isSigner: false,
          isWritable: true,
        })),
      ])
      .rpc({
        skipPreflight: false,
        commitment: "confirmed",
      });

    console.error("[Resolve] ✅ Transaction sent successfully!");
    console.error("[Resolve] Signature:", tx);

    // Output signature to stdout (C# will read this)
    console.log(tx);
    process.exit(0);
  } catch (error: any) {
    console.error("ERROR:", error.message || error);
    if (error.stack) {
      console.error("Stack:", error.stack);
    }
    if (error.logs) {
      console.error("Transaction logs:", error.logs);
    }
    process.exit(1);
  }
}

main();
