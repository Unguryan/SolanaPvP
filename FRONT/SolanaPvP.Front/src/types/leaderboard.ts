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
  winRate: number;
  totalMatches: number;
  wonMatches: number;
  totalEarnings: number;
  monthlyEarnings: number;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  type: LeaderboardType;
  period: LeaderboardPeriod;
}
