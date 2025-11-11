// Matter.js physics engine wrapper

import type { BoardConfig, BallState, DeterministicPath } from "@/utils/types";
import type { Logger } from "@/utils/logger";
import {
  advanceBallMatter,
  updateMatterEngine,
  initBallMatter,
  initMatterEngine,
  cleanupMatterEngine,
  removeBallMatter,
} from "./matter-physics";

/**
 * Initialize Matter.js engine (call once per board)
 */
export function initPhysics(cfg: BoardConfig): void {
  initMatterEngine(cfg);
}

/**
 * Cleanup Matter.js engine (call when board unmounts)
 */
export function cleanupPhysics(): void {
  cleanupMatterEngine();
}

/**
 * Update Matter.js engine (call once per frame)
 */
export function updatePhysics(dt: number): void {
  updateMatterEngine(dt);
}

/**
 * Advance ball physics by one fixed timestep using Matter.js
 */
export function advanceBall(
  cfg: BoardConfig,
  ball: BallState,
  path: DeterministicPath,
  dt: number,
  logger: Logger
): void {
  advanceBallMatter(cfg, ball, path, dt, logger);
}

/**
 * Initialize ball state with Matter.js body
 */
export function initBall(
  cfg: BoardConfig,
  targetSlot: number,
  id: number = 0,
  path: DeterministicPath
): BallState {
  const { ballState } = initBallMatter(cfg, targetSlot, id, path);
  return ballState;
}

/**
 * Remove ball from Matter.js world
 */
export function removeBall(ballId: number): void {
  removeBallMatter(ballId);
}
