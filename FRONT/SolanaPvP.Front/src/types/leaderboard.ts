// Leaderboard related types
export enum LeaderboardType {
  WinRate = 0,
  Earnings = 1,
}

export enum LeaderboardPeriod {
  AllTime = 0,
  Monthly = 1,
}

export interface LeaderboardEntry {
  rank: number;
  pubkey: string;
  username?: string;
  // Backend fields (from C# LeaderboardEntry)
  wins?: number;
  losses?: number;
  totalMatches: number;
  winRate: number;
  totalEarningsLamports?: number;
  monthlyEarningsLamports?: number;
  // Legacy / derived fields (for compatibility)
  wonMatches?: number;
  totalEarnings?: number;
  monthlyEarnings?: number;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  pageSize: number;
  type: LeaderboardType;
  period: LeaderboardPeriod;
}
