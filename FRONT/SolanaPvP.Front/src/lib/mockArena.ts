import { FeedItem, MatchLobby } from "@/store/arenaStore";

export const mockFeed: FeedItem[] = [
  {
    id: "1",
    username: "gm001",
    solAmount: 3.6,
    timestamp: Date.now() - 12000,
    gameMode: "Pick3from9",
  },
  {
    id: "2",
    username: "solplayer",
    solAmount: 5.2,
    timestamp: Date.now() - 8000,
    gameMode: "Pick5from16",
  },
  {
    id: "3",
    username: "crypto_king",
    solAmount: 2.1,
    timestamp: Date.now() - 15000,
    gameMode: "Pick1from3",
  },
  {
    id: "4",
    username: "blockchain_boss",
    solAmount: 7.8,
    timestamp: Date.now() - 20000,
    gameMode: "Pick3from9",
  },
  {
    id: "5",
    username: "defi_master",
    solAmount: 4.3,
    timestamp: Date.now() - 25000,
    gameMode: "Pick5from16",
  },
  {
    id: "6",
    username: "nft_hunter",
    solAmount: 1.9,
    timestamp: Date.now() - 30000,
    gameMode: "Pick1from3",
  },
  {
    id: "7",
    username: "web3_warrior",
    solAmount: 6.7,
    timestamp: Date.now() - 35000,
    gameMode: "Pick3from9",
  },
  {
    id: "8",
    username: "solana_sniper",
    solAmount: 3.2,
    timestamp: Date.now() - 40000,
    gameMode: "Pick5from16",
  },
  {
    id: "9",
    username: "metaverse_mogul",
    solAmount: 8.1,
    timestamp: Date.now() - 45000,
    gameMode: "Pick1from3",
  },
  {
    id: "10",
    username: "dao_destroyer",
    solAmount: 2.8,
    timestamp: Date.now() - 50000,
    gameMode: "Pick3from9",
  },
  {
    id: "11",
    username: "yield_farmer",
    solAmount: 5.5,
    timestamp: Date.now() - 55000,
    gameMode: "Pick5from16",
  },
  {
    id: "12",
    username: "liquidity_lord",
    solAmount: 4.7,
    timestamp: Date.now() - 60000,
    gameMode: "Pick1from3",
  },
];

export const mockMatches: MatchLobby[] = [
  {
    id: "a",
    stake: 2.0,
    playersReady: 3,
    playersMax: 18,
    endsAt: Date.now() + 124000,
    gameMode: "Pick3from9",
  },
  {
    id: "b",
    stake: 4.5,
    playersReady: 7,
    playersMax: 7,
    endsAt: Date.now() + 12000,
    gameMode: "Pick5from16",
  },
  {
    id: "c",
    stake: 6.1,
    playersReady: 6,
    playersMax: 5,
    endsAt: Date.now() + 23000,
    gameMode: "Pick1from3",
  },
  {
    id: "d",
    stake: 1.5,
    playersReady: 1,
    playersMax: 10,
    endsAt: Date.now() + 180000,
    gameMode: "Pick3from9",
  },
  {
    id: "e",
    stake: 8.2,
    playersReady: 4,
    playersMax: 4,
    endsAt: Date.now() + 45000,
    gameMode: "Pick5from16",
  },
  {
    id: "f",
    stake: 3.3,
    playersReady: 2,
    playersMax: 8,
    endsAt: Date.now() + 90000,
    gameMode: "Pick1from3",
  },
  {
    id: "g",
    stake: 5.7,
    playersReady: 9,
    playersMax: 12,
    endsAt: Date.now() + 15000,
    gameMode: "Pick3from9",
  },
  {
    id: "h",
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

  const gameModes = ["Pick3from9", "Pick5from16", "Pick1from3"];

  return {
    id: Math.random().toString(36).substr(2, 9),
    username: usernames[Math.floor(Math.random() * usernames.length)],
    solAmount: Math.round((Math.random() * 10 + 0.5) * 100) / 100,
    timestamp: Date.now() - Math.random() * 60000,
    gameMode: gameModes[Math.floor(Math.random() * gameModes.length)],
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
    stake: Math.round((Math.random() * 8 + 1) * 100) / 100,
    playersReady: Math.floor(Math.random() * (playersMax + 1)),
    playersMax,
    endsAt: Date.now() + Math.random() * 300000 + 10000, // 10s to 5min
    gameMode,
  };
};
