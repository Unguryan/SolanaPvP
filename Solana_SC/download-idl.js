// Script to download IDL from on-chain and save to file
const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

async function downloadIdl() {
  // Configuration
  const programId = process.argv[2] || "F2LhVGUa9yLbYVYujYMPyckqWmsokHE9wym7ceGHWUMZ"; // devnet default
  const network = process.argv[3] || "devnet";
  const outputPath = process.argv[4] || path.join(__dirname, "target", "idl", "pvp_program.json");

  // RPC URLs
  const rpcUrls = {
    devnet: "https://api.devnet.solana.com",
    "mainnet-beta": "https://api.mainnet-beta.solana.com",
  };

  const rpcUrl = rpcUrls[network] || rpcUrls.devnet;

  console.log("📥 Downloading IDL from on-chain...");
  console.log(`   Program ID: ${programId}`);
  console.log(`   Network: ${network}`);
  console.log(`   RPC: ${rpcUrl}`);
  console.log(`   Output: ${outputPath}`);

  try {
    // Create connection
    const connection = new Connection(rpcUrl, "confirmed");

    // Create a minimal provider (we only need connection to fetch IDL)
    const provider = new anchor.AnchorProvider(
      connection,
      {
        publicKey: PublicKey.default,
        signTransaction: async () => {
          throw new Error("Not needed for fetching IDL");
        },
        signAllTransactions: async () => {
          throw new Error("Not needed for fetching IDL");
        },
      },
      { commitment: "confirmed" }
    );

    // Fetch IDL
    const programPubkey = new PublicKey(programId);
    const idl = await anchor.Program.fetchIdl(programPubkey, provider);

    if (!idl) {
      throw new Error(`IDL not found for program ${programId} on ${network}`);
    }

    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`   Created directory: ${outputDir}`);
    }

    // Save IDL to file
    fs.writeFileSync(outputPath, JSON.stringify(idl, null, 2));
    console.log("✅ IDL downloaded successfully!");
    console.log(`   Saved to: ${outputPath}`);

    // Also copy to frontend if requested
    const copyToFrontend = process.argv[5] !== "false";
    if (copyToFrontend) {
      const frontendPath = path.join(
        __dirname,
        "..",
        "FRONT",
        "SolanaPvP.Front",
        "src",
        "services",
        "solana",
        "idl",
        "pvp_program.json"
      );
      const frontendDir = path.dirname(frontendPath);
      if (!fs.existsSync(frontendDir)) {
        fs.mkdirSync(frontendDir, { recursive: true });
      }
      fs.copyFileSync(outputPath, frontendPath);
      console.log(`✅ Copied to frontend: ${frontendPath}`);
    }
  } catch (error) {
    console.error("❌ Error downloading IDL:", error.message);
    process.exit(1);
  }
}

downloadIdl();

