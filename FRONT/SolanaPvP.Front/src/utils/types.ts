// Shared types for deterministic Plinko physics

export type Vec2 = { x: number; y: number };

export interface Pin {
  row: number;
  col: number;
  x: number;
  y: number;
  r: number;
}

export interface BoardConfig {
  rows: number; // e.g., 9, 11, 13
  slotCount: number; // MUST be rows + 1 for classic plinko; allow custom but keep mapping consistent
  width: number; // canvas width in px
  height: number; // canvas height in px
  slotHeight: number; // visual slot area height
  topMargin: number; // pixels from top before first row
  pinRadius: number;
  ballRadius: number;
  gravity: number; // px/s^2
  rowSpacingY: number; // computed or explicit; vertical spacing between rows
  pinSpacingX: number; // computed from width & slotCount
}

export interface DeterministicPath {
  decisions: (-1 | 1)[]; // length = rows; -1 = Left, 1 = Right
  targetPinsX: number[]; // length = rows; exact X of the pin corridor target per row
}

export interface BallState {
  id: number;
  p: Vec2; // position
  v: Vec2; // velocity
  radius: number;
  nextRow: number; // the upcoming row index we expect to cross
  ignoreCollisionsUntilY: number; // gate to avoid multi-hits in same row
  lastCollidedRow: number; // de-bounce per row
  lastCollidedPinCol: number; // последний столбец пина, с которым столкнулись
  hasLanded: boolean;
  targetSlot: number; // desired final slot index
}

export interface SimulationOptions {
  fixedDt: number; // e.g., 1/120
  maxSteps: number; // safety cap
  seeded?: boolean; // if true, use deterministic RNG
  seed?: number; // RNG seed
}

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

export type LogChannel =
  | "PHYS"
  | "ROW"
  | "HIT"
  | "STEER"
  | "MAG"
  | "LAND"
  | "INIT"
  | "CFG";

export interface LogEntry {
  level: LogLevel;
  channel: LogChannel;
  message: string;
  data?: any;
  timestamp: number;
  step?: number;
  ballId?: number;
}
