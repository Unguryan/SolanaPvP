// Game related types
export enum GameType {
  PickHigher = "PickHigher",
  // Future: Plinko = "Plinko", Dice = "Dice", CoinFlip = "CoinFlip", Minesweeper = "Minesweeper", WheelSpin = "WheelSpin"
}

export enum MatchMode {
  Team = "Team",           // x2 multiplier
  DeathMatch = "DeathMatch" // x10 multiplier
}

export type TeamSize = "1v1" | "2v2" | "5v5" | "1v10" | "2v20" | "4v40";

// GameMode is now flexible string: "1x3", "3x9", "5x16"
export type GameMode = string;

export interface GameTile {
  index: number;
  value: number;
  selected: boolean;
  revealed: boolean;
  isBonus?: boolean; // x2, x3 multiplier
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
