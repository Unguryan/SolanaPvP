// Game related types
import { GameModeType, MatchType } from "./match";

export interface GameConfig {
  mode: GameModeType;
  matchType: MatchType;
  timeLimit: number; // seconds
  maxSelections: number;
  gridSize: { rows: number; cols: number };
}

export interface GameSelection {
  index: number;
  value: number;
  selected: boolean;
}

export interface GameState {
  config: GameConfig;
  selections: GameSelection[];
  timeRemaining: number;
  isActive: boolean;
  isCompleted: boolean;
  targetScore: number;
  opponentScore?: number;
  isWinner?: boolean;
}

export interface GameResult {
  matchId: number;
  playerScore: number;
  opponentScore: number;
  isWinner: boolean;
  earnings: number;
  gameMode: GameModeType;
  matchType: MatchType;
}
