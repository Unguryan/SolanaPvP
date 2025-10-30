// User related types
export interface UserProfile {
  pubkey: string;
  username: string;
  wins: number;
  losses: number;
  totalEarningsLamports: number;
  matchesPlayed: number;
  firstSeen: string;
  lastSeen: string;
  lastUsernameChange?: string;
  canChangeUsername: boolean;
  recentMatches: MatchSummary[];
}

export interface UserStatistics {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  pnlDay: number;
  pnlMonth: number;
  pnlAllTime: number;
}

export enum StatisticsPeriod {
  Day = "Day",
  Month = "Month",
  AllTime = "AllTime",
}

export interface MatchSummary {
  id: number;
  matchPda: string;
  gameMode: string;
  matchType: string;
  status: string;
  stakeLamports: number;
  isWinner: boolean;
  earningsLamports: number;
  createdAt: string;
}

export interface RegisterUserRequest {
  pubkey: string;
}

export interface ChangeUsernameRequest {
  username: string;
}

export interface UsernameAvailabilityResponse {
  username: string;
  isAvailable: boolean;
}
