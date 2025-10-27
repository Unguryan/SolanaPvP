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

// Account Data Types
export interface LobbyAccount {
  bump: number;
  lobbyId: BN;
  creator: PublicKey;
  status: LobbyStatus;
  teamSize: number;
  stakeLamports: BN;
  createdAt: BN;
  finalized: boolean;
  vrf: PublicKey;
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

export enum LobbyStatus {
  Open = "Open",
  Pending = "Pending",
  Resolved = "Resolved",
  Refunded = "Refunded",
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

export function isLobbyOpen(account: LobbyAccount): boolean {
  return account.status === LobbyStatus.Open && !account.finalized;
}

export function isLobbyFull(account: LobbyAccount): boolean {
  return (
    account.team1.length === account.teamSize &&
    account.team2.length === account.teamSize
  );
}

export function canJoinLobby(account: LobbyAccount, side: 0 | 1): boolean {
  if (!isLobbyOpen(account)) return false;

  const team = side === 0 ? account.team1 : account.team2;
  return team.length < account.teamSize;
}

export function getLobbyParticipants(account: LobbyAccount): PublicKey[] {
  return [...account.team1, ...account.team2];
}

export function getLobbyTotalStake(account: LobbyAccount): BN {
  const totalPlayers = account.team1.length + account.team2.length;
  return account.stakeLamports.mul(new BN(totalPlayers));
}

export function getLobbyPot(account: LobbyAccount): BN {
  const totalStake = getLobbyTotalStake(account);
  const fee = totalStake.mul(new BN(PLATFORM_FEE_BPS)).div(new BN(10000));
  return totalStake.sub(fee);
}

export function getWinnerPayout(account: LobbyAccount, winnerSide: 0 | 1): BN {
  const pot = getLobbyPot(account);
  const winners = winnerSide === 0 ? account.team1 : account.team2;
  return pot.div(new BN(winners.length));
}

export function getPlatformFee(account: LobbyAccount): BN {
  const totalStake = getLobbyTotalStake(account);
  return totalStake.mul(new BN(PLATFORM_FEE_BPS)).div(new BN(10000));
}
