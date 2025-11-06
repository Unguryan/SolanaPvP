import { FeedItem, MatchLobby } from "@/store/arenaStore";

export const mockFeed: FeedItem[] = [
  {
    id: "1",
    matchPda: "mock1",
    username: "gm001",
    solAmount: 3.6,
    timestamp: Date.now() - 12000,
    gameType: "PickHigher",
    gameMode: "3x9",
    matchType: "OneVOne",
    winnerSide: 0,
  },
  {
    id: "2",
    matchPda: "mock2",
    username: "solplayer",
    solAmount: 5.2,
    timestamp: Date.now() - 8000,
    gameType: "PickHigher",
    gameMode: "5x16",
    matchType: "OneVOne",
    winnerSide: 1,
  },
  {
    id: "3",
    matchPda: "mock3",
    username: "crypto_king",
    solAmount: 2.1,
    timestamp: Date.now() - 15000,
    gameType: "PickHigher",
    gameMode: "1x3",
    matchType: "OneVOne",
    winnerSide: 0,
  },
  {
    id: "4",
    matchPda: "mock4",
    username: "blockchain_boss",
    solAmount: 7.8,
    timestamp: Date.now() - 20000,
    gameType: "PickHigher",
    gameMode: "3x9",
    matchType: "TwoVTwo",
    winnerSide: 0,
  },
  {
    id: "5",
    matchPda: "mock5",
    username: "defi_master",
    solAmount: 4.3,
    timestamp: Date.now() - 25000,
    gameType: "PickHigher",
    gameMode: "5x16",
    matchType: "OneVOne",
    winnerSide: 1,
  },
  {
    id: "6",
    matchPda: "mock6",
    username: "nft_hunter",
    solAmount: 1.9,
    timestamp: Date.now() - 30000,
    gameType: "PickHigher",
    gameMode: "1x3",
    matchType: "OneVOne",
    winnerSide: 0,
  },
  {
    id: "7",
    matchPda: "mock7",
    username: "web3_warrior",
    solAmount: 6.7,
    timestamp: Date.now() - 35000,
    gameType: "PickHigher",
    gameMode: "3x9",
    matchType: "FiveVFive",
    winnerSide: 1,
  },
  {
    id: "8",
    matchPda: "mock8",
    username: "solana_sniper",
    solAmount: 3.2,
    timestamp: Date.now() - 40000,
    gameType: "PickHigher",
    gameMode: "5x16",
    matchType: "OneVOne",
    winnerSide: 0,
  },
  {
    id: "9",
    matchPda: "mock9",
    username: "metaverse_mogul",
    solAmount: 8.1,
    timestamp: Date.now() - 45000,
    gameType: "PickHigher",
    gameMode: "1x3",
    matchType: "TwoVTwo",
    winnerSide: 1,
  },
  {
    id: "10",
    matchPda: "mock10",
    username: "dao_destroyer",
    solAmount: 2.8,
    timestamp: Date.now() - 50000,
    gameType: "PickHigher",
    gameMode: "3x9",
    matchType: "OneVOne",
    winnerSide: 0,
  },
  {
    id: "11",
    matchPda: "mock11",
    username: "yield_farmer",
    solAmount: 5.5,
    timestamp: Date.now() - 55000,
    gameType: "PickHigher",
    gameMode: "5x16",
    matchType: "OneVOne",
    winnerSide: 1,
  },
  {
    id: "12",
    matchPda: "mock12",
    username: "liquidity_lord",
    solAmount: 4.7,
    timestamp: Date.now() - 60000,
    gameType: "PickHigher",
    gameMode: "1x3",
    matchType: "OneVOne",
    winnerSide: 0,
  },
];

export const mockMatches: MatchLobby[] = [
  {
    id: "a",
    creator: "11111111111111111111111111111111",
    stake: 2.0,
    playersReady: 3,
    playersMax: 18,
    endsAt: Date.now() + 124000,
    gameMode: "Pick3from9",
  },
  {
    id: "b",
    creator: "11111111111111111111111111111111",
    stake: 4.5,
    playersReady: 7,
    playersMax: 7,
    endsAt: Date.now() + 12000,
    gameMode: "Pick5from16",
  },
  {
    id: "c",
    creator: "11111111111111111111111111111111",
    stake: 6.1,
    playersReady: 6,
    playersMax: 5,
    endsAt: Date.now() + 23000,
    gameMode: "Pick1from3",
  },
  {
    id: "d",
    creator: "11111111111111111111111111111111",
    stake: 1.5,
    playersReady: 1,
    playersMax: 10,
    endsAt: Date.now() + 180000,
    gameMode: "Pick3from9",
  },
  {
    id: "e",
    creator: "11111111111111111111111111111111",
    stake: 8.2,
    playersReady: 4,
    playersMax: 4,
    endsAt: Date.now() + 45000,
    gameMode: "Pick5from16",
  },
  {
    id: "f",
    creator: "11111111111111111111111111111111",
    stake: 3.3,
    playersReady: 2,
    playersMax: 8,
    endsAt: Date.now() + 90000,
    gameMode: "Pick1from3",
  },
  {
    id: "g",
    creator: "11111111111111111111111111111111",
    stake: 5.7,
    playersReady: 9,
    playersMax: 12,
    endsAt: Date.now() + 15000,
    gameMode: "Pick3from9",
  },
  {
    id: "h",
    creator: "11111111111111111111111111111111",
    stake: 2.9,
    playersReady: 0,
    playersMax: 6,
    endsAt: Date.now() + 300000,
    gameMode: "Pick5from16",
  },
];

// Helper functions
export const generateRandomFeedItem = (): FeedItem => {
  const usernames = [
    "gm001",
    "solplayer",
    "crypto_king",
    "blockchain_boss",
    "defi_master",
    "nft_hunter",
    "web3_warrior",
    "solana_sniper",
    "metaverse_mogul",
    "dao_destroyer",
    "yield_farmer",
    "liquidity_lord",
    "ape_strong",
    "diamond_hands",
    "hodl_king",
    "moon_boi",
    "wen_lambo",
    "to_the_moon",
  ];

  const gameModes = ["1x3", "3x9", "5x16"];
  const teamSizes = ["OneVOne", "TwoVTwo", "FiveVFive"];

  return {
    id: Math.random().toString(36).substr(2, 9),
    matchPda: `mock_${Math.random().toString(36).substr(2, 9)}`,
    username: usernames[Math.floor(Math.random() * usernames.length)],
    solAmount: Math.round((Math.random() * 10 + 0.5) * 100) / 100,
    timestamp: Date.now() - Math.random() * 60000,
    gameType: "PickHigher",
    gameMode: gameModes[Math.floor(Math.random() * gameModes.length)],
    matchType: teamSizes[Math.floor(Math.random() * teamSizes.length)],
    winnerSide: Math.floor(Math.random() * 2),
  };
};

export const generateRandomMatch = (): MatchLobby => {
  const gameModes = ["Pick3from9", "Pick5from16", "Pick1from3"];
  const gameMode = gameModes[Math.floor(Math.random() * gameModes.length)];

  let playersMax: number;
  switch (gameMode) {
    case "Pick3from9":
      playersMax = Math.floor(Math.random() * 15) + 5; // 5-20
      break;
    case "Pick5from16":
      playersMax = Math.floor(Math.random() * 8) + 3; // 3-11
      break;
    case "Pick1from3":
      playersMax = Math.floor(Math.random() * 6) + 2; // 2-8
      break;
    default:
      playersMax = 5;
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    creator: "11111111111111111111111111111111",
    stake: Math.round((Math.random() * 8 + 1) * 100) / 100,
    playersReady: Math.floor(Math.random() * (playersMax + 1)),
    playersMax,
    endsAt: Date.now() + Math.random() * 300000 + 10000, // 10s to 5min
    gameMode,
  };
};
