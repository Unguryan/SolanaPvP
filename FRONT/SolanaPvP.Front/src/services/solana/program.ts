import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

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

// Connection utilities
export async function requestAirdrop(
  connection: Connection,
  publicKey: PublicKey,
  amount: number = 2
): Promise<string> {
  const signature = await connection.requestAirdrop(
    publicKey,
    amount * anchor.web3.LAMPORTS_PER_SOL
  );

  await connection.confirmTransaction(signature);
  return signature;
}

export async function getAccountInfo(
  connection: Connection,
  publicKey: PublicKey
) {
  return connection.getAccountInfo(publicKey);
}

export async function getBalance(
  connection: Connection,
  publicKey: PublicKey
): Promise<number> {
  return connection.getBalance(publicKey);
}

// Transaction utilities
export async function sendAndConfirmTransaction(
  connection: Connection,
  transaction: anchor.web3.Transaction,
  signers: Keypair[] = []
): Promise<string> {
  const signature = await connection.sendTransaction(transaction, signers);
  await connection.confirmTransaction(signature);
  return signature;
}

export async function sendTransaction(
  connection: Connection,
  transaction: anchor.web3.Transaction,
  signers: Keypair[] = []
): Promise<string> {
  return connection.sendTransaction(transaction, signers);
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
