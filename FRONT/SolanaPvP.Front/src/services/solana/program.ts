import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { getSolanaConfig } from "./config";
import { PdaUtils } from "./accounts";

// Function to load IDL - will be available after anchor build and copy
async function loadIdl(): Promise<anchor.Idl | null> {
  // IDL will be loaded from on-chain if not available locally
  // Local IDL file is optional and may not exist during development
  // This allows the build to succeed even without the IDL file
  try {
    // @ts-expect-error - IDL file may not exist, will fall back to on-chain fetch
    const idlModule = await import("./idl/pvp_program.json");
    return (idlModule.default || idlModule) as anchor.Idl;
  } catch {
    console.warn("IDL not found locally. Will try to fetch from on-chain.");
    return null;
  }
}

// Program instance management
class ProgramManager {
  private static instance: ProgramManager;
  private program: anchor.Program | null = null;
  private connection: Connection | null = null;
  private provider: anchor.AnchorProvider | null = null;

  private constructor() {}

  static getInstance(): ProgramManager {
    if (!ProgramManager.instance) {
      ProgramManager.instance = new ProgramManager();
    }
    return ProgramManager.instance;
  }

  // Initialize program with wallet
  async initializeProgram(wallet: anchor.Wallet): Promise<anchor.Program> {
    const config = getSolanaConfig();

    // Create connection
    this.connection = new Connection(config.rpcUrl, {
      commitment: "confirmed",
      wsEndpoint: config.wsUrl,
    });

    // Create provider
    this.provider = new anchor.AnchorProvider(this.connection, wallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
      skipPreflight: false,
    });

    // Set provider
    anchor.setProvider(this.provider);

    // Load program
    const programId = new PublicKey(config.programId);
    PdaUtils.setProgramId(config.programId);

    // Create program instance with IDL
    // Try to use local IDL first, then fetch from on-chain
    let loadedIdl: anchor.Idl | null = await loadIdl();

    if (!loadedIdl) {
      // Try to fetch IDL from on-chain
      try {
        if (!this.provider) {
          throw new Error("Provider not initialized");
        }
        loadedIdl = await anchor.Program.fetchIdl(programId, this.provider);
        if (!loadedIdl) {
          throw new Error("Could not fetch IDL from on-chain");
        }
      } catch (error) {
        console.error(
          "Failed to load IDL. Program may not be deployed yet.",
          error
        );
        throw new Error(
          "Program IDL not found. Please ensure the program is deployed and IDL is available. " +
            "Run 'anchor build' and copy IDL to frontend, or deploy the program first."
        );
      }
    }

    if (!this.provider) {
      throw new Error("Provider not initialized");
    }

    // Ensure loadedIdl is not null after all checks
    if (!loadedIdl) {
      throw new Error("IDL is required but was not loaded");
    }

    // Create program instance
    // TypeScript sometimes has issues with Program constructor type inference
    // Workaround: use type assertion for the constructor call
    this.program = new (anchor.Program as any)(
      loadedIdl,
      programId,
      this.provider
    ) as anchor.Program;

    return this.program!;
  }

  // Get current program instance
  getProgram(): anchor.Program | null {
    return this.program!;
  }

  // Get current connection
  getConnection(): Connection | null {
    return this.connection;
  }

  // Get current provider
  getProvider(): anchor.AnchorProvider | null {
    return this.provider;
  }

  // Check if program is initialized
  isInitialized(): boolean {
    return (
      this.program !== null &&
      this.connection !== null &&
      this.provider !== null
    );
  }

  // Reset program (useful for wallet changes)
  reset(): void {
    this.program = null;
    this.connection = null;
    this.provider = null;
  }
}

// Export singleton instance
export const programManager = ProgramManager.getInstance();

// Utility functions
export async function initializeProgram(
  wallet: anchor.Wallet
): Promise<anchor.Program> {
  return programManager.initializeProgram(wallet);
}

export function getProgram(): anchor.Program | null {
  return programManager.getProgram();
}

export function getConnection(): Connection | null {
  return programManager.getConnection();
}

export function getProvider(): anchor.AnchorProvider | null {
  return programManager.getProvider();
}

export function isProgramInitialized(): boolean {
  return programManager.isInitialized();
}

// Program ID getter
export function getProgramId(): PublicKey {
  const config = getSolanaConfig();
  return new PublicKey(config.programId);
}

// Connection utilities
export async function getAccountInfo(publicKey: PublicKey) {
  const connection = getConnection();
  if (!connection) throw new Error("Program not initialized");

  return connection.getAccountInfo(publicKey);
}

export async function getBalance(publicKey: PublicKey) {
  const connection = getConnection();
  if (!connection) throw new Error("Program not initialized");

  return connection.getBalance(publicKey);
}

export async function requestAirdrop(publicKey: PublicKey, amount: number = 2) {
  const connection = getConnection();
  if (!connection) throw new Error("Program not initialized");

  const signature = await connection.requestAirdrop(
    publicKey,
    amount * anchor.web3.LAMPORTS_PER_SOL
  );

  await connection.confirmTransaction(signature);
  return signature;
}

// Transaction utilities
export async function sendAndConfirmTransaction(
  transaction: anchor.web3.Transaction,
  signers: Keypair[] = []
) {
  const provider = getProvider();
  if (!provider) throw new Error("Program not initialized");

  const connection = getConnection();
  if (!connection) throw new Error("Connection not initialized");

  const signature = await connection.sendTransaction(transaction, signers);
  await connection.confirmTransaction(signature);
  return signature;
}

export async function sendTransaction(
  transaction: anchor.web3.Transaction,
  signers: Keypair[] = []
) {
  const provider = getProvider();
  if (!provider) throw new Error("Program not initialized");

  const connection = getConnection();
  if (!connection) throw new Error("Connection not initialized");

  return connection.sendTransaction(transaction, signers);
}

// Error handling utilities
export function parseAnchorError(error: any): string {
  if (error.code) {
    // Anchor error codes
    const errorMessages: { [key: number]: string } = {
      6000: "Invalid side (must be 0 or 1)",
      6001: "Lobby is not open",
      6002: "Lobby already pending/resolved/refunded",
      6003: "Side is full",
      6004: "Player already joined",
      6005: "Not enough players",
      6006: "Unauthorized",
      6007: "Stake is below minimum",
      6008: "Too soon to refund",
      6009: "Already finalized",
      6010: "Bad remaining accounts length",
      6011: "Invalid team size (allowed: 1, 2, 5)",
      6012: "Remaining accounts mismatch with team lists",
      6013: "Wrong Switchboard program id",
      6014: "VRF account does not match lobby",
      6015: "VRF authority mismatch",
      6016: "Lobby not pending",
    };

    return errorMessages[error.code] || `Unknown error: ${error.code}`;
  }

  if (error.message) {
    return error.message;
  }

  return "Unknown error occurred";
}

// Network utilities
export function isDevnet(): boolean {
  const config = getSolanaConfig();
  return config.cluster === "devnet";
}

export function isMainnet(): boolean {
  const config = getSolanaConfig();
  return config.cluster === "mainnet-beta";
}

// Wallet utilities
export function createWalletFromKeypair(keypair: Keypair): any {
  return {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: any) => {
      tx.sign(keypair);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      txs.forEach((tx) => tx.sign(keypair));
      return txs;
    },
  };
}
