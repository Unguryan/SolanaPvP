// Solana Network Configuration
export interface SolanaConfig {
  cluster: "devnet" | "mainnet-beta";
  rpcUrl: string;
  wsUrl: string;
  programId: string;
  switchboardProgramId: string;
  switchboardOracleQueue: string;
  switchboardPermissionAccount: string;
}

// Devnet Configuration
export const DEVNET_CONFIG: SolanaConfig = {
  cluster: "devnet",
  rpcUrl: "https://api.devnet.solana.com",
  wsUrl: "wss://api.devnet.solana.com",
  programId: "PvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvP", // Update after deployment
  switchboardProgramId: "SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f",
  switchboardOracleQueue: "GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR", // Update with actual address
  switchboardPermissionAccount: "HxYjP2fF8QRnD7eAmf9gxCDXmh3aeuC6hpjWnFZxhV1o", // Update with actual address
};

// Mainnet Configuration
export const MAINNET_CONFIG: SolanaConfig = {
  cluster: "mainnet-beta",
  rpcUrl: "https://api.mainnet-beta.solana.com",
  wsUrl: "wss://api.mainnet-beta.solana.com",
  programId: "PvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvPvP", // Update after deployment
  switchboardProgramId: "SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f",
  switchboardOracleQueue: "GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR", // Update with actual address
  switchboardPermissionAccount: "HxYjP2fF8QRnD7eAmf9gxCDXmh3aeuC6hpjWnFZxhV1o", // Update with actual address
};

// Get current configuration based on environment
export function getSolanaConfig(): SolanaConfig {
  const isDev =
    import.meta.env.DEV || import.meta.env.VITE_NETWORK === "devnet";
  return isDev ? DEVNET_CONFIG : MAINNET_CONFIG;
}

// Network switching utility
export function switchNetwork(
  network: "devnet" | "mainnet-beta"
): SolanaConfig {
  return network === "devnet" ? DEVNET_CONFIG : MAINNET_CONFIG;
}

// Constants
export const MIN_STAKE_LAMPORTS = 50_000_000; // 0.05 SOL
export const PLATFORM_FEE_BPS = 100; // 1%
export const REFUND_LOCK_SECONDS = 120; // 2 minutes
export const ALLOWED_TEAM_SIZES = [1, 2, 5] as const;

// PDA Seeds
export const SEEDS = {
  CONFIG: "config",
  LOBBY: "lobby",
  ACTIVE: "active",
} as const;
