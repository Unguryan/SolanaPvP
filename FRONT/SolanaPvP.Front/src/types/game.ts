// Game related types
export enum GameType {
  PickHigher = "PickHigher",
  Plinko = "Plinko",
  Miner = "Miner",
  // Future: Dice = "Dice", CoinFlip = "CoinFlip", WheelSpin = "WheelSpin"
}

export enum MatchMode {
  Team = "Team",           // x2 multiplier
  DeathMatch = "DeathMatch" // x10 multiplier
}

export type TeamSize = "1v1" | "2v2" | "5v5" | "1v10" | "2v20" | "4v40";

// GameMode is now flexible string: "PickHigher1v3", "PickHigher3v9", "PickHigher5v16", "Plinko3Balls", "Miner1v9", etc.
export type GameMode = string;

export interface GameTile {
  index: number;
  value: number;
  selected: boolean;
  revealed: boolean;
  isBonus?: boolean; // x2, x3 multiplier
}

export interface MinerTile {
  index: number;
  type: "prize" | "bomb" | "empty";
  selected: boolean;
  revealed: boolean;
}

export interface GamePlayer {
  id: string;
  username: string;
  pubkey?: string; // Player's public key (for identifying real player vs AI)
  targetScore: number;
  currentScore: number;
  selections: number[];
  isReady: boolean;
  isWinner?: boolean;
  isScoreRevealed?: boolean;
  // Miner-specific fields
  willWin?: boolean; // Result from backend (true = will find prize/Alive, false = will hit bomb/Bombed)
  isAlive?: boolean; // Is player alive (based on willWin from backend)
  openedTileCount?: number; // Counter for opened tiles (to determine when player finds result)
}

export interface GameState {
  status: "waiting" | "loading" | "playing" | "revealing" | "finished";
  timeRemaining: number;
  tiles: GameTile[];
  players: GamePlayer[];
  currentPlayerTurn?: string;
  winner?: string;
}

export interface GameResult {
  winner: string;
  scores: Record<string, number>;
  winAmount: number;
  duration: number;
  isTeamBattle?: boolean;
  teamScores?: Record<string, number>; // Team A: 1500, Team B: 1200
  isCurrentPlayerWinner?: boolean; // NEW: explicit flag from backend
  gameType?: GameType; // NEW: game type for display customization
  playerResults?: Record<string, boolean>; // NEW: for Miner - true = Win, false = Bombed
}

export interface GameTeam {
  id: string;
  name: string;
  players: GamePlayer[];
  totalScore: number;
}

export interface Player {
  username: string;
  targetScore: number; // Total score to achieve
  currentScore: number; // Current accumulated score
  selections: number[]; // Selected indices
  isReady: boolean;
  // Miner-specific fields (optional)
  willWin?: boolean; // Result from backend (true = will find prize/Alive, false = will hit bomb/Bombed)
  isAlive?: boolean; // Is player alive (based on willWin from backend)
  openedTileCount?: number; // Counter for opened tiles (to determine when player finds result)
  pubkey?: string; // Player's public key (for identifying real player vs AI)
}

export interface UniversalGameBoardProps {
  gameType?: GameType;              // NEW: PickHigher, Plinko, etc.
  gameMode: string;                 // CHANGED: flexible string ("PickThreeFromNine", etc. - internal format)
  matchMode?: MatchMode;            // NEW: Team or DeathMatch
  teamSize?: "Solo" | "Duo" | "Team"; // Keep old format for internal compatibility
  stakeSol: number;
  players: Player[];
  currentPlayer?: string;           // Username of current user
  currentPlayerPubkey?: string;     // NEW: Pubkey for winner determination
  matchFromBackend?: any;           // NEW: Full match data for winner determination
  timeLimit?: number;               // Seconds
  onGameComplete?: (results: GameResult) => void;
  isDemoMode?: boolean;
}
