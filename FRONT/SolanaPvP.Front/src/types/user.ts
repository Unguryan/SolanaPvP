// User related types
export interface UserProfile {
  pubkey: string;
  username?: string;
  lastUsernameChange?: string;
  canChangeUsername: boolean;
  totalMatches: number;
  wonMatches: number;
  totalEarningsLamports: number;
  recentMatches: MatchSummary[];
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

export interface ChangeUsernameRequest {
  username: string;
}

export interface UsernameAvailabilityResponse {
  username: string;
  isAvailable: boolean;
}
