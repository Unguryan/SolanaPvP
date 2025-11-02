// Solana Network Configuration
export interface SolanaConfig {
  cluster: "devnet" | "mainnet-beta";
  rpcUrl: string;
  wsUrl: string;
  programId: string;
  // Switchboard OnDemand (V2 reached EOL Nov 2024)
  switchboardProgramId: string;
}

// Devnet Configuration
export const DEVNET_CONFIG: SolanaConfig = {
  cluster: "devnet",
  rpcUrl: "https://api.devnet.solana.com",
  wsUrl: "wss://api.devnet.solana.com",
  programId: "F2LhVGUa9yLbYVYujYMPyckqWmsokHE9wym7ceGHWUMZ",
  // Switchboard OnDemand Program ID (same for devnet & mainnet)
  switchboardProgramId: "SBondMDrcV3K4kxZR1HNVT7osZxAHVHgYXL5Ze1oMUv",
};

// Mainnet Configuration
export const MAINNET_CONFIG: SolanaConfig = {
  cluster: "mainnet-beta",
  rpcUrl: "https://api.mainnet-beta.solana.com",
  wsUrl: "wss://api.mainnet-beta.solana.com",
  programId: "HL92RAc8cw6T2wjQeKVDjy9GcZVNvzaTe31v3p7kuKkR",
  // Switchboard OnDemand Program ID (same for devnet & mainnet)
  switchboardProgramId: "SBondMDrcV3K4kxZR1HNVT7osZxAHVHgYXL5Ze1oMUv",
};

// Get current configuration based on environment
export function getSolanaConfig(): SolanaConfig {
  // Priority:
  // 1. VITE_NETWORK env variable (set in build)
  // 2. DEV mode (npm run dev)
  const network = import.meta.env.VITE_NETWORK;
  const isDevMode = import.meta.env.DEV;

  // If VITE_NETWORK is explicitly set, use it
  if (network === "devnet" || network === "mainnet") {
    return network === "devnet" ? DEVNET_CONFIG : MAINNET_CONFIG;
  }

  // Otherwise, use DEV mode: dev mode = devnet, production = mainnet
  return isDevMode ? DEVNET_CONFIG : MAINNET_CONFIG;
}

// Network switching utility
export function switchNetwork(
  network: "devnet" | "mainnet-beta"
): SolanaConfig {
  return network === "devnet" ? DEVNET_CONFIG : MAINNET_CONFIG;
}

// Network detection utilities
export function isDevnet(): boolean {
  const config = getSolanaConfig();
  return config.cluster === "devnet";
}

export function isMainnet(): boolean {
  const config = getSolanaConfig();
  return config.cluster === "mainnet-beta";
}

export function getNetworkName(): string {
  return isDevnet() ? "Devnet" : "Mainnet";
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
