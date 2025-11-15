// Miner game types
import { GameType } from "./game";

export interface MinerTile {
  index: number;
  type: "prize" | "bomb" | "empty";
  selected: boolean;
  revealed: boolean;
}

export interface MinerGameState {
  status: "waiting" | "loading" | "playing" | "revealing" | "finished";
  timeRemaining: number;
  tiles: MinerTile[];
  players: MinerGamePlayer[];
  currentPlayerTurn?: string;
  winner?: string;
}

export interface MinerGamePlayer {
  id: string;
  username: string;
  pubkey?: string;
  targetScore: number;
  currentScore: number;
  selections: number[];
  isReady: boolean;
  isScoreRevealed?: boolean;
  willWin?: boolean; // Result from backend (true = will find prize/Alive, false = will hit bomb/Bombed)
  isAlive?: boolean; // Is player alive (based on willWin from backend)
  openedTileCount?: number; // Counter for opened tiles (to determine when player finds result)
}

export interface MinerGameResult {
  winner: string;
  scores: Record<string, number>;
  winAmount: number;
  duration: number;
  isTeamBattle?: boolean;
  teamScores?: Record<string, number>;
  isCurrentPlayerWinner?: boolean;
  gameType: GameType.Miner;
  playerResults: Record<string, boolean>; // true = Alive, false = Bombed
}

