// Headless simulation for testing

import type { BoardConfig, BallState, SimulationOptions } from '@/utils/types';
import { computeDeterministicPath } from './path';
import { advanceBall, initBall } from './physics';
import { slotIndexFromX } from './geometry';
import { makeLogger } from '@/utils/logger';

export interface SimulationResult {
  landedSlot: number;
  steps: number;
  logs: any[];
  finalX: number;
  finalY: number;
  targetSlot: number;
}

/**
 * Simulate ball drop to landing (headless, no rendering)
 */
export function simulateToLanding(
  cfg: BoardConfig,
  targetSlot: number,
  sim: SimulationOptions,
  seed?: number
): SimulationResult {
  const path = computeDeterministicPath(cfg, targetSlot, seed);
  const ball = initBall(cfg, targetSlot, 0);
  const logger = makeLogger({ bufferSize: 10000 });

  logger.info('INIT', `Starting simulation for target slot ${targetSlot}`, {
    targetSlot,
    rows: cfg.rows,
    slotCount: cfg.slotCount,
    seed,
  }, ball.id);

  let steps = 0;
  while (!ball.hasLanded && steps < sim.maxSteps) {
    advanceBall(cfg, ball, path, sim.fixedDt, logger);
    steps++;
  }

  if (!ball.hasLanded) {
    logger.warn('CFG', `Simulation stopped at maxSteps ${sim.maxSteps}`, {
      steps,
      x: ball.p.x,
      y: ball.p.y,
    }, ball.id);
  }

  const landedSlot = slotIndexFromX(cfg, ball.p.x);
  const logs = logger.getLogs();

  return {
    landedSlot,
    steps,
    logs,
    finalX: ball.p.x,
    finalY: ball.p.y,
    targetSlot,
  };
}

