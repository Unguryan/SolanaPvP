import { useMemo } from "react";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { IDL, PvpProgram } from "@/idl/pvp_program";
import { getSolanaConfig } from "@/services/solana/config";
import idlJson from "@/idl/pvp_program.json";

// Get program ID from config or IDL
const config = getSolanaConfig();
const PROGRAM_ID = new PublicKey(config.programId);
const RPC_URL = config.rpcUrl;

// Verify program ID matches between IDL and config
if ((idlJson as any).address && (idlJson as any).address !== config.programId) {
  console.warn("⚠️ Program ID mismatch: IDL vs config", {
    idl: (idlJson as any).address,
    cfg: config.programId,
  });
}

/**
 * Typed hook for PvP Program with full type safety
 * Returns a typed Program<PvpProgram> instance or null
 */
export function usePvpProgram(): Program<PvpProgram> | null {
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) return null;

    // Connection with commitment and wsEndpoint in config object
    // Using "confirmed" for reliability on devnet
    const connection = new Connection(RPC_URL, {
      commitment: "confirmed",
      wsEndpoint: config.wsUrl,
    });

    // Provider config - sync commitment levels to avoid blockhash issues
    const provider = new AnchorProvider(connection, wallet, {
      preflightCommitment: "confirmed", // Sync with connection commitment
      commitment: "confirmed",
      skipPreflight: false, // Keep preflight for better error messages
    });

    // Create typed program instance - NO MORE 'as any'!
    // Program constructor accepts (IDL, provider) or (IDL, programId, provider)
    // Using 2-arg form - programId is taken from IDL.address automatically
    return new Program<PvpProgram>(IDL, provider);
  }, [wallet]); // RPC_URL, config, PROGRAM_ID are module-level constants - no need in deps
}

// Export constants for use in other files
export { PROGRAM_ID, RPC_URL, SystemProgram };

// Export types for convenience
export type { PvpProgram };
