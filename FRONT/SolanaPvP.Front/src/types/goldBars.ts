// Gold Bars game types
import { GameType } from "./game";

export interface GoldBarsTile {
  index: number;
  type: "gold" | "bomb" | "empty";
  selected: boolean;
  revealed: boolean;
}

export interface GoldBarsGameState {
  status: "waiting" | "loading" | "playing" | "revealing" | "finished";
  timeRemaining: number;
  tiles: GoldBarsTile[];
  players: GoldBarsGamePlayer[];
  currentPlayerTurn?: string;
  winner?: string;
}

export interface GoldBarsGamePlayer {
  id: string;
  username: string;
  pubkey?: string;
  targetScore: number; // From backend - how many gold bars player should open
  currentScore: number; // Current number of gold bars opened
  selections: number[];
  isReady: boolean;
  isScoreRevealed?: boolean;
  openedTileCount?: number; // Counter for opened tiles
  reachedAllGoldBars?: boolean; // True when currentScore === targetScore === totalGoldBars
}

export interface GoldBarsGameResult {
  winner: string;
  scores: Record<string, number>; // Number of gold bars opened by each player
  winAmount: number;
  duration: number;
  isTeamBattle?: boolean;
  teamScores?: Record<string, number>;
  isCurrentPlayerWinner?: boolean;
  gameType: GameType.GoldBars;
}

