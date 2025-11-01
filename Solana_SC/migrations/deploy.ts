import * as anchor from "@coral-xyz/anchor";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { createHash } from "crypto";

async function main() {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider();
  const programId = new PublicKey(
    "F2LhVGUa9yLbYVYujYMPyckqWmsokHE9wym7ceGHWUMZ"
  );

  console.log("Initializing PvP Program Config...");
  console.log("Program ID:", programId.toString());
  console.log("Provider URL:", provider.connection.rpcEndpoint);

  // Get wallet from provider
  const wallet = (provider as any).wallet;
  const adminPubkey = wallet.publicKey;

  console.log("Admin pubkey:", adminPubkey.toString());

  // Derive config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );

  console.log("Config PDA:", configPda.toString());

  // Check if config already exists
  try {
    const configAccount = await provider.connection.getAccountInfo(configPda);
    if (configAccount) {
      console.log("⚠️  Config already initialized!");
      return;
    }
  } catch (error) {
    // Config doesn't exist, continue
  }

  // Try to fetch IDL and create program
  let program: any;
  try {
    const idl = await anchor.Program.fetchIdl(programId, provider);
    if (idl) {
      // Program constructor: Program(idl, programId, provider)
      program = new (anchor.Program as any)(idl, programId, provider);
    } else {
      throw new Error("Could not fetch IDL");
    }
  } catch (error: any) {
    console.error(
      "Could not fetch IDL from chain. Using manual instruction creation..."
    );
    // Anchor discriminator format: SHA256("global:method_name") first 8 bytes
    // Standard Anchor uses "global" as namespace for all instructions
    const discriminatorSeed = "global:init_config";
    const hash = createHash("sha256").update(discriminatorSeed).digest();
    const discriminator = hash.slice(0, 8);

    // Create instruction data: discriminator (8 bytes) + admin Pubkey (32 bytes)
    const data = Buffer.alloc(8 + 32);
    discriminator.copy(data, 0);
    adminPubkey.toBuffer().copy(data, 8);

    // Create instruction with correct account order matching InitConfig struct:
    // 1. config (PDA, writable)
    // 2. payer (signer, writable)
    // 3. system_program (readonly)
    const instruction = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: adminPubkey, isSigner: true, isWritable: true },
        {
          pubkey: anchor.web3.SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      data,
    });

    // Store instruction for later use
    program = {
      programId,
      provider,
      manualInstruction: instruction,
      methods: {
        initConfig: (admin: PublicKey) => ({
          accounts: (accounts: any) => ({
            instruction: async () => instruction,
          }),
        }),
      },
    } as any;
  }

  // Initialize global config
  try {
    console.log("Initializing global config...");

    const instruction = await (program.methods as any)
      .initConfig(adminPubkey)
      .accounts({
        config: configPda,
        payer: adminPubkey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();

    // Create and send transaction
    const tx = new anchor.web3.Transaction().add(instruction);
    const signer = wallet.payer || wallet;
    const signature = await anchor.web3.sendAndConfirmTransaction(
      provider.connection,
      tx,
      [signer]
    );

    console.log("✅ Global config initialized!");
    console.log("Transaction signature:", signature);
    console.log("Admin pubkey:", adminPubkey.toString());
    console.log("Config PDA:", configPda.toString());
  } catch (error: any) {
    if (
      error.message?.includes("already in use") ||
      error.message?.includes("AccountInUse")
    ) {
      console.log("⚠️  Config already exists (this is OK)");
    } else {
      console.error("❌ Error initializing config:", error);
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
