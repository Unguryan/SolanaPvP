export type LeaderboardEntry = {
  id: string;
  rank: number;
  username: string;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalPnL: number;
  gamesPlayed: number;
  avatar?: string;
};

export const mockLeaderboard: LeaderboardEntry[] = [
  {
    id: "1",
    rank: 1,
    username: "crypto_king",
    totalWins: 127,
    totalLosses: 23,
    winRate: 0.847,
    totalPnL: 245.7,
    gamesPlayed: 150,
  },
  {
    id: "2",
    rank: 2,
    username: "blockchain_boss",
    totalWins: 98,
    totalLosses: 32,
    winRate: 0.754,
    totalPnL: 189.3,
    gamesPlayed: 130,
  },
  {
    id: "3",
    rank: 3,
    username: "defi_master",
    totalWins: 89,
    totalLosses: 41,
    winRate: 0.685,
    totalPnL: 156.8,
    gamesPlayed: 130,
  },
  {
    id: "4",
    rank: 4,
    username: "solana_sniper",
    totalWins: 76,
    totalLosses: 34,
    winRate: 0.691,
    totalPnL: 134.2,
    gamesPlayed: 110,
  },
  {
    id: "5",
    rank: 5,
    username: "web3_warrior",
    totalWins: 72,
    totalLosses: 38,
    winRate: 0.655,
    totalPnL: 98.7,
    gamesPlayed: 110,
  },
  {
    id: "6",
    rank: 6,
    username: "metaverse_mogul",
    totalWins: 68,
    totalLosses: 42,
    winRate: 0.618,
    totalPnL: 87.3,
    gamesPlayed: 110,
  },
  {
    id: "7",
    rank: 7,
    username: "nft_hunter",
    totalWins: 65,
    totalLosses: 45,
    winRate: 0.591,
    totalPnL: 76.9,
    gamesPlayed: 110,
  },
  {
    id: "8",
    rank: 8,
    username: "dao_destroyer",
    totalWins: 61,
    totalLosses: 49,
    winRate: 0.555,
    totalPnL: 65.4,
    gamesPlayed: 110,
  },
  {
    id: "9",
    rank: 9,
    username: "yield_farmer",
    totalWins: 58,
    totalLosses: 52,
    winRate: 0.527,
    totalPnL: 54.1,
    gamesPlayed: 110,
  },
  {
    id: "10",
    rank: 10,
    username: "liquidity_lord",
    totalWins: 55,
    totalLosses: 55,
    winRate: 0.5,
    totalPnL: 42.8,
    gamesPlayed: 110,
  },
  {
    id: "11",
    rank: 11,
    username: "ape_strong",
    totalWins: 52,
    totalLosses: 58,
    winRate: 0.473,
    totalPnL: 31.5,
    gamesPlayed: 110,
  },
  {
    id: "12",
    rank: 12,
    username: "diamond_hands",
    totalWins: 49,
    totalLosses: 61,
    winRate: 0.445,
    totalPnL: 20.2,
    gamesPlayed: 110,
  },
  {
    id: "13",
    rank: 13,
    username: "hodl_king",
    totalWins: 46,
    totalLosses: 64,
    winRate: 0.418,
    totalPnL: 8.9,
    gamesPlayed: 110,
  },
  {
    id: "14",
    rank: 14,
    username: "moon_boi",
    totalWins: 43,
    totalLosses: 67,
    winRate: 0.391,
    totalPnL: -2.4,
    gamesPlayed: 110,
  },
  {
    id: "15",
    rank: 15,
    username: "wen_lambo",
    totalWins: 40,
    totalLosses: 70,
    winRate: 0.364,
    totalPnL: -13.7,
    gamesPlayed: 110,
  },
];

export const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return `#${rank}`;
  }
};

export const getRankColor = (rank: number) => {
  switch (rank) {
    case 1:
      return "text-yellow-400";
    case 2:
      return "text-gray-300";
    case 3:
      return "text-orange-400";
    default:
      return "text-txt-muted";
  }
};

export const getWinRateColor = (winRate: number) => {
  if (winRate >= 0.7) return "text-sol-mint";
  if (winRate >= 0.5) return "text-yellow-400";
  return "text-red-400";
};

export const getPnLColor = (pnl: number) => {
  if (pnl > 0) return "text-sol-mint";
  if (pnl < 0) return "text-red-400";
  return "text-txt-muted";
};
