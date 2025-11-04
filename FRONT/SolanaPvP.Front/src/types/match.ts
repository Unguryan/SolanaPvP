// Match related types
export enum GameModeType {
  PickThreeFromNine = "PickThreeFromNine",
  PickFiveFromSixteen = "PickFiveFromSixteen",
  PickOneFromThree = "PickOneFromThree",
}

export enum MatchType {
  Solo = "Solo",
  Duo = "Duo",
  Team = "Team",
}

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
  side0TotalScore: number;
  side1TotalScore: number;
}

export interface Match {
  id: number;
  matchPda: string;
  gameMode: GameModeType;
  matchType: MatchType;
  status: MatchStatus;
  stakeLamports: number;
  winnerSide?: number;
  isPrivate: boolean;
  invitationId?: number;
  createdAt: string;
  pendingAt?: string;
  gameStartTime?: string;
  participants: MatchParticipant[];
  gameData?: GameData;
}

export interface MatchView {
  id: number;
  matchPda: string;
  gameMode: GameModeType;
  matchType: MatchType;
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
  gameMode?: GameModeType;
  matchType?: MatchType;
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
