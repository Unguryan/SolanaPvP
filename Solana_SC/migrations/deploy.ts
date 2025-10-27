import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PvpProgram } from "../target/types/pvp_program";
import { PublicKey, Keypair } from "@solana/web3.js";

async function main() {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.PvpProgram as Program<PvpProgram>;
  const provider = anchor.getProvider();

  console.log("Deploying PvP Program...");
  console.log("Program ID:", program.programId.toString());
  console.log("Provider URL:", provider.connection.rpcEndpoint);

  // Generate admin keypair for testing
  const admin = Keypair.generate();

  // Airdrop SOL to admin
  console.log("Requesting airdrop for admin...");
  const signature = await provider.connection.requestAirdrop(
    admin.publicKey,
    2 * anchor.web3.LAMPORTS_PER_SOL
  );
  await provider.connection.confirmTransaction(signature);
  console.log("Airdrop confirmed");

  // Derive config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  console.log("Config PDA:", configPda.toString());

  // Initialize global config
  try {
    const tx = await program.methods
      .initConfig(admin.publicKey)
      .accounts({
        config: configPda,
        payer: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    console.log("Global config initialized!");
    console.log("Transaction signature:", tx);
    console.log("Admin pubkey:", admin.publicKey.toString());
  } catch (error) {
    console.error("Error initializing config:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
