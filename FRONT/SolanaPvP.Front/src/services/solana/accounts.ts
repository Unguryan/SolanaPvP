import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { getSolanaConfig, SEEDS } from "./config";

// Constants
const MIN_STAKE_LAMPORTS = 50_000_000; // 0.05 SOL
const PLATFORM_FEE_BPS = 100; // 1%

// PDA Derivation Utilities
export class PdaUtils {
  private static programId: PublicKey;

  static setProgramId(programId: string) {
    this.programId = new PublicKey(programId);
  }

  static getProgramId(): PublicKey {
    if (!this.programId) {
      const config = getSolanaConfig();
      this.programId = new PublicKey(config.programId);
    }
    return this.programId;
  }

  // Derive config PDA
  static getConfigPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEEDS.CONFIG)],
      this.getProgramId()
    );
  }

  // Derive lobby PDA
  static getLobbyPda(
    creator: PublicKey,
    lobbyId: number | BN
  ): [PublicKey, number] {
    const lobbyIdBuffer =
      typeof lobbyId === "number"
        ? new BN(lobbyId).toArrayLike(Buffer, "le", 8)
        : lobbyId.toArrayLike(Buffer, "le", 8);

    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEEDS.LOBBY), creator.toBuffer(), lobbyIdBuffer],
      this.getProgramId()
    );
  }

  // Derive active lobby PDA
  static getActiveLobbyPda(creator: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEEDS.ACTIVE), creator.toBuffer()],
      this.getProgramId()
    );
  }
}

// Account Data Types - matching IDL types in camelCase
export interface LobbyAccount {
  bump: number;
  lobbyId: BN;
  creator: PublicKey;
  status: LobbyStatus;
  teamSize: number;
  stakeLamports: BN;
  createdAt: BN;
  finalized: boolean;
  vrfSeed: number[];
  vrfRequest: PublicKey;
  winnerSide: number;
  team1: PublicKey[];
  team2: PublicKey[];
}

export interface GlobalConfigAccount {
  bump: number;
  admin: PublicKey;
}

export interface ActiveLobbyAccount {
  bump: number;
  creator: PublicKey;
  lobby: PublicKey;
}

// Lobby Status enum - matching IDL
export enum LobbyStatus {
  Open = "open",
  Pending = "pending",
  Resolved = "resolved",
  Refunded = "refunded",
}

// Helper to normalize status from Anchor (returns object like {open: {}})
export function normalizeLobbyStatus(status: any): LobbyStatus {
  if (typeof status === "string") return status as LobbyStatus;

  if (status.open !== undefined) return LobbyStatus.Open;
  if (status.pending !== undefined) return LobbyStatus.Pending;
  if (status.resolved !== undefined) return LobbyStatus.Resolved;
  if (status.refunded !== undefined) return LobbyStatus.Refunded;

  return LobbyStatus.Open; // fallback
}

// Account validation utilities
export function validateLobbyAccount(account: LobbyAccount): boolean {
  return (
    account.teamSize > 0 &&
    account.teamSize <= 5 &&
    account.stakeLamports.gte(new BN(MIN_STAKE_LAMPORTS)) &&
    account.team1.length <= account.teamSize &&
    account.team2.length <= account.teamSize
  );
}

// Account serialization utilities
export function serializeLobbyAccount(account: LobbyAccount): string {
  return JSON.stringify({
    bump: account.bump,
    lobbyId: account.lobbyId.toString(),
    creator: account.creator.toString(),
    status: account.status,
    teamSize: account.teamSize,
    stakeLamports: account.stakeLamports.toString(),
    createdAt: account.createdAt.toString(),
    finalized: account.finalized,
    vrfSeed: account.vrfSeed,
    vrfRequest: account.vrfRequest.toString(),
    winnerSide: account.winnerSide,
    team1: account.team1.map((pk) => pk.toString()),
    team2: account.team2.map((pk) => pk.toString()),
  });
}

export function deserializeLobbyAccount(data: string): LobbyAccount {
  const parsed = JSON.parse(data);
  return {
    bump: parsed.bump,
    lobbyId: new BN(parsed.lobbyId),
    creator: new PublicKey(parsed.creator),
    status: parsed.status as LobbyStatus,
    teamSize: parsed.teamSize,
    stakeLamports: new BN(parsed.stakeLamports),
    createdAt: new BN(parsed.createdAt),
    finalized: parsed.finalized,
    vrfSeed: parsed.vrfSeed || Array(32).fill(0),
    vrfRequest: new PublicKey(parsed.vrfRequest || "11111111111111111111111111111111"),
    winnerSide: parsed.winnerSide,
    team1: parsed.team1.map((pk: string) => new PublicKey(pk)),
    team2: parsed.team2.map((pk: string) => new PublicKey(pk)),
  };
}

// Helper functions for lobby status
export function isLobbyOpen(lobby: LobbyAccount): boolean {
  return lobby.status === LobbyStatus.Open;
}

export function isLobbyPending(lobby: LobbyAccount): boolean {
  return lobby.status === LobbyStatus.Pending;
}

export function isLobbyResolved(lobby: LobbyAccount): boolean {
  return lobby.status === LobbyStatus.Resolved;
}

export function isLobbyRefunded(lobby: LobbyAccount): boolean {
  return lobby.status === LobbyStatus.Refunded;
}

// Helper functions for lobby teams
export function getLobbyTeamCount(lobby: LobbyAccount): {
  team1: number;
  team2: number;
  total: number;
} {
  return {
    team1: lobby.team1.length,
    team2: lobby.team2.length,
    total: lobby.team1.length + lobby.team2.length,
  };
}

export function isLobbyFull(lobby: LobbyAccount): boolean {
  const { total } = getLobbyTeamCount(lobby);
  return total >= lobby.teamSize * 2;
}

export function isTeamFull(lobby: LobbyAccount, side: 0 | 1): boolean {
  const team = side === 0 ? lobby.team1 : lobby.team2;
  return team.length >= lobby.teamSize;
}

export function isPlayerInLobby(
  lobby: LobbyAccount,
  player: PublicKey
): boolean {
  return (
    lobby.team1.some((pk) => pk.equals(player)) ||
    lobby.team2.some((pk) => pk.equals(player))
  );
}

// Helper function for stake calculations
export function calculateTotalStake(lobby: LobbyAccount): BN {
  const { total } = getLobbyTeamCount(lobby);
  return lobby.stakeLamports.muln(total);
}

export function calculatePlatformFee(totalStake: BN): BN {
  return totalStake.muln(PLATFORM_FEE_BPS).divn(10000);
}

export function calculateWinnerPayout(totalStake: BN): BN {
  const fee = calculatePlatformFee(totalStake);
  return totalStake.sub(fee);
}
