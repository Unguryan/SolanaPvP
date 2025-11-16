export type UserProfile = {
  id: string;
  username: string;
  avatar?: string;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalPnL: number;
  gamesPlayed: number;
  currentRank: number;
  bestRank: number;
  longestWinStreak: number;
  currentWinStreak: number;
  favoriteGameMode: string;
  joinDate: number;
  lastActive: number;
  totalStaked: number;
  totalEarned: number;
};

export type MatchHistory = {
  id: string;
  gameMode: string;
  stake: number;
  result: "win" | "loss";
  pnl: number;
  playersCount: number;
  timestamp: number;
  duration: number; // in seconds
};

export const mockUserProfile: UserProfile = {
  id: "user_123",
  username: "crypto_king",
  totalWins: 127,
  totalLosses: 23,
  winRate: 0.847,
  totalPnL: 245.7,
  gamesPlayed: 150,
  currentRank: 1,
  bestRank: 1,
  longestWinStreak: 12,
  currentWinStreak: 3,
  favoriteGameMode: "PickHigher3v9",
  joinDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
  lastActive: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
  totalStaked: 1250.5,
  totalEarned: 1496.2,
};

export const mockMatchHistory: MatchHistory[] = [
  {
    id: "match_1",
    gameMode: "PickHigher3v9",
    stake: 5.0,
    result: "win",
    pnl: 8.5,
    playersCount: 12,
    timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    duration: 180,
  },
  {
    id: "match_2",
    gameMode: "PickHigher5v16",
    stake: 3.2,
    result: "win",
    pnl: 4.8,
    playersCount: 8,
    timestamp: Date.now() - 4 * 60 * 60 * 1000, // 4 hours ago
    duration: 240,
  },
  {
    id: "match_3",
    gameMode: "PickHigher1v3",
    stake: 2.1,
    result: "loss",
    pnl: -2.1,
    playersCount: 6,
    timestamp: Date.now() - 6 * 60 * 60 * 1000, // 6 hours ago
    duration: 90,
  },
  {
    id: "match_4",
    gameMode: "PickHigher3v9",
    stake: 7.5,
    result: "win",
    pnl: 12.3,
    playersCount: 15,
    timestamp: Date.now() - 8 * 60 * 60 * 1000, // 8 hours ago
    duration: 200,
  },
  {
    id: "match_5",
    gameMode: "PickHigher5v16",
    stake: 4.0,
    result: "win",
    pnl: 6.2,
    playersCount: 10,
    timestamp: Date.now() - 12 * 60 * 60 * 1000, // 12 hours ago
    duration: 220,
  },
  {
    id: "match_6",
    gameMode: "PickHigher1v3",
    stake: 1.8,
    result: "loss",
    pnl: -1.8,
    playersCount: 4,
    timestamp: Date.now() - 18 * 60 * 60 * 1000, // 18 hours ago
    duration: 75,
  },
  {
    id: "match_7",
    gameMode: "PickHigher3v9",
    stake: 6.3,
    result: "win",
    pnl: 9.7,
    playersCount: 18,
    timestamp: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
    duration: 195,
  },
  {
    id: "match_8",
    gameMode: "PickHigher5v16",
    stake: 2.5,
    result: "win",
    pnl: 3.8,
    playersCount: 7,
    timestamp: Date.now() - 30 * 60 * 60 * 1000, // 30 hours ago
    duration: 210,
  },
  {
    id: "match_9",
    gameMode: "PickHigher1v3",
    stake: 3.7,
    result: "loss",
    pnl: -3.7,
    playersCount: 5,
    timestamp: Date.now() - 36 * 60 * 60 * 1000, // 36 hours ago
    duration: 85,
  },
  {
    id: "match_10",
    gameMode: "PickHigher3v9",
    stake: 4.2,
    result: "win",
    pnl: 7.1,
    playersCount: 14,
    timestamp: Date.now() - 42 * 60 * 60 * 1000, // 42 hours ago
    duration: 185,
  },
];

export const getGameModeIcon = (gameMode: string) => {
  switch (gameMode) {
    case "PickHigher3v9":
      return "🎴";
    case "PickHigher5v16":
      return "🏆";
    case "PickHigher1v3":
      return "🎯";
    default:
      return "🎮";
  }
};

export const getResultColor = (result: "win" | "loss") => {
  return result === "win" ? "text-sol-mint" : "text-red-400";
};

export const getResultIcon = (result: "win" | "loss") => {
  return result === "win" ? "🏆" : "💥";
};

export const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const formatTimeAgo = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }
};
