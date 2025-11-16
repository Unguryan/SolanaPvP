// Match related types
export enum MatchStatus {
  Open = "Open",
  Pending = "Pending",
  InProgress = "InProgress",
  Resolved = "Resolved",
  Refunded = "Refunded",
}

export interface MatchParticipant {
  id: number;
  pubkey: string;
  side: number;
  position: number;
  targetScore: number;
  isWinner: boolean;
  username?: string;
}

export interface GameData {
  id: number;
  matchId: number;
  gameMode: string;
  side0TotalScore: number;
  side1TotalScore: number;
  playerScoresJson?: string; // JSON with player scores/results: {"pubkey": score} for PickHigher/Plinko, {"pubkey": true/false} for Miner
}

export interface Match {
  id: number;
  matchPda: string;
  creator: string; // Creator's public key
  gameType: string; // NEW: "PickHigher", "Plinko", etc.
  gameMode: string; // CHANGED: now string ("PickHigher1v3", "PickHigher3v9", "PickHigher5v16", "Plinko3Balls", "Miner1v9", etc.)
  matchMode: string; // NEW: "Team" or "DeathMatch"
  teamSize: string; // RENAMED: from matchType ("OneVOne", "TwoVTwo", etc.)
  status: MatchStatus;
  stakeLamports: number;
  winnerSide?: number;
  isPrivate: boolean;
  invitationId?: number;
  createdAt: string;
  pendingAt?: string;
  gameStartTime?: string;
  payoutTx?: string;
  participants: MatchParticipant[];
  gameData?: GameData;
}

export interface MatchView {
  id: number;
  matchPda: string;
  creator: string; // Creator's public key
  gameType: string; // NEW: "PickHigher", etc.
  gameMode: string; // CHANGED: now string
  matchMode: string; // NEW: "Team" or "DeathMatch"
  teamSize: string; // RENAMED: from matchType
  status: MatchStatus;
  stakeLamports: number;
  winnerSide?: number;
  isPrivate: boolean;
  createdAt: string;
  participantCount: number;
  maxParticipants: number;
}

export interface MatchFilter {
  status?: MatchStatus;
  gameType?: string; // NEW: filter by game type
  gameMode?: string; // CHANGED: now string
  matchMode?: string; // NEW: Team or DeathMatch
  teamSize?: string; // RENAMED: from matchType
  isPrivate?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
