// Game related types
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
  gameMode: "PickThreeFromNine" | "PickFiveFromSixteen" | "PickOneFromThree";
  matchType: "Solo" | "Duo" | "Team";
  stakeSol: number;
  players: Player[];
  currentPlayer?: string; // Username of current user
  timeLimit?: number; // Seconds
  onGameComplete?: (results: GameResult) => void;
  isDemoMode?: boolean;
}
