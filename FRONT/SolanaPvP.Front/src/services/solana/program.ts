import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { getSolanaConfig } from "./config";
import { PdaUtils } from "./accounts";

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

    // Create program instance
    // Note: In a real implementation, you'd load the IDL and create the program
    // For now, we'll create a mock program structure
    this.program = {
      programId,
      provider: this.provider,
      rpc: {} as any,
      account: {} as any,
      instruction: {} as any,
      transaction: {} as any,
      methods: {} as any,
      coder: {} as any,
      simulate: {} as any,
      view: {} as any,
      events: {} as any,
      filters: {} as any,
      address: programId,
      idl: {} as any,
      _idl: {} as any,
      _events: {} as any,
      _programId: programId,
      _provider: this.provider,
    } as any;

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
