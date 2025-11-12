// Deterministic path computation for target slot

import type { BoardConfig, DeterministicPath } from "@/utils/types";
import { pinXPosition } from "./geometry";
import { createRNG } from "@/utils/rng";

/**
 * Compute balanced distribution of Right turns across rows
 * Uses Bresenham-like error accumulation to spread evenly
 */
function balancedDecisions(rows: number, rights: number): (-1 | 1)[] {
  const decisions: (-1 | 1)[] = new Array(rows).fill(-1); // Start with all Left
  let rightsPlaced = 0;
  let error = 0;

  // Distribute rights evenly using error accumulation
  for (let i = 0; i < rows && rightsPlaced < rights; i++) {
    error += rights;
    if (error >= rows) {
      decisions[i] = 1; // Right
      rightsPlaced++;
      error -= rows;
    }
  }

  // If we still need more rights, fill from the end
  for (let i = rows - 1; i >= 0 && rightsPlaced < rights; i--) {
    if (decisions[i] === -1) {
      decisions[i] = 1;
      rightsPlaced++;
    }
  }

  return decisions;
}

/**
 * Compute deterministic path to reach target slot
 */
export function computeDeterministicPath(
  cfg: BoardConfig,
  targetSlot: number,
  seed?: number
): DeterministicPath {
  // Validate inputs
  if (targetSlot < 0 || targetSlot >= cfg.slotCount) {
    throw new Error(
      `Invalid targetSlot: ${targetSlot}, must be in [0, ${cfg.slotCount - 1}]`
    );
  }

  // Classic Plinko mapping: slotCount = rows (слоты между пинами последнего ряда)
  // Starting from center, each Right turn moves +1 slot, Left moves -1
  const centerSlot = (cfg.slotCount - 1) / 2;
  const neededOffset = targetSlot - centerSlot;

  // Calculate how many Right turns we need
  // rights - lefts = neededOffset
  // rights + lefts = rows
  // Solving: rights = (rows + neededOffset) / 2
  let rightsNeeded = Math.round((cfg.rows + neededOffset) / 2);
  rightsNeeded = Math.max(0, Math.min(cfg.rows, rightsNeeded));

  // Build balanced decisions
  const decisions = balancedDecisions(cfg.rows, rightsNeeded);

  // Optional: shuffle deterministically if seed provided (for visual variety)
  let finalDecisions = decisions;
  if (seed !== undefined) {
    const rng = createRNG(seed);
    finalDecisions = rng.shuffle([...decisions]);
  }

  // For center slot: alternate direction (left-right vs right-left) for variety
  // This ensures balls don't always take the same path to center
  const isCenterSlot = targetSlot === centerSlot;
  if (isCenterSlot && cfg.rows > 0) {
    // Use seed (ballId) to determine direction alternation for each ball
    // This ensures each ball takes a different path to center
    const directionSeed = seed !== undefined ? Math.floor(seed) : 0;
    const shouldStartRight = directionSeed % 2 === 0;

    // If we need to alternate, flip the first decision
    if (shouldStartRight && finalDecisions[0] === -1) {
      // Find a Right decision to swap with
      for (let i = 1; i < finalDecisions.length; i++) {
        if (finalDecisions[i] === 1) {
          [finalDecisions[0], finalDecisions[i]] = [
            finalDecisions[i],
            finalDecisions[0],
          ];
          break;
        }
      }
    } else if (!shouldStartRight && finalDecisions[0] === 1) {
      // Find a Left decision to swap with
      for (let i = 1; i < finalDecisions.length; i++) {
        if (finalDecisions[i] === -1) {
          [finalDecisions[0], finalDecisions[i]] = [
            finalDecisions[i],
            finalDecisions[0],
          ];
          break;
        }
      }
    }
  }

  // Compute target HOLE (дырка между пинами) X positions for each row
  // ВАЖНО: шарик должен попадать только в СОСЕДНИЕ дырки между рядами!
  // Считаем по дыркам/слотам, а не по пинам!
  const targetPinsX: number[] = [];

  // Логика Plinko по дыркам:
  // - В ряду row: pinsInRow пинов → holesInRow = pinsInRow - 1 дырок
  // - Дырка с индексом holeIndex находится между пином holeIndex и пином holeIndex+1
  // - После прохождения через дырку holeIndex в ряду row, шарик попадает на пин holeIndex+1 в ряду row+1
  // - После столкновения с пином holeIndex+1 в ряду row+1, decision[row] определяет дырку в ряду row+1:
  //   * decision[row] = -1 (Left): попадаем в дырку holeIndex в ряду row+1 (левая соседняя)
  //   * decision[row] = 1 (Right): попадаем в дырку holeIndex+1 в ряду row+1 (правая соседняя)

  // ВАЖНО: Вычисляем дырки ОТ ПОСЛЕДНЕЙ К ПЕРВОЙ, чтобы гарантировать соседство!
  // Начинаем с последнего ряда, где дырка должна соответствовать целевому слоту
  const lastRow = cfg.rows - 1;
  const lastRowPins = lastRow + 2;
  const lastRowHoles = lastRowPins - 1;

  // Последняя дырка = целевой слот
  let currentHoleIndex = targetSlot; // Индекс дырки в последнем ряду
  currentHoleIndex = Math.max(0, Math.min(lastRowHoles - 1, currentHoleIndex));

  // Вычисляем позицию последней дырки
  const leftPinX = pinXPosition(cfg, lastRow, currentHoleIndex);
  const rightPinX = pinXPosition(cfg, lastRow, currentHoleIndex + 1);
  const lastHoleCenterX = (leftPinX + rightPinX) / 2;

  // Сохраняем дырки в обратном порядке (от последней к первой)
  const holes: number[] = [];
  holes[lastRow] = lastHoleCenterX;

  // Идем назад от последнего ряда к первому
  for (let row = lastRow - 1; row >= 0; row--) {
    const pinsInRow = row + 2;
    const holesInRow = pinsInRow - 1;

    // decision[row] определяет, из какой дырки в ряду row мы попали в дырку currentHoleIndex в ряду row+1
    // Если decision[row] = 1 (Right): мы пришли из дырки currentHoleIndex - 1 в ряду row
    // Если decision[row] = -1 (Left): мы пришли из дырки currentHoleIndex в ряду row

    const decision = finalDecisions[row];
    if (decision === 1) {
      // Right: мы пришли из левой дырки
      currentHoleIndex = Math.max(0, currentHoleIndex - 1);
    }
    // Left (-1): мы пришли из той же позиции дырки

    // Clamp to valid range
    currentHoleIndex = Math.max(0, Math.min(holesInRow - 1, currentHoleIndex));

    // Вычисляем центр дырки
    const leftPinX = pinXPosition(cfg, row, currentHoleIndex);
    const rightPinX = pinXPosition(cfg, row, currentHoleIndex + 1);
    const holeCenterX = (leftPinX + rightPinX) / 2;

    holes[row] = holeCenterX;
  }

  // Заполняем targetPinsX в правильном порядке
  for (let row = 0; row < cfg.rows; row++) {
    targetPinsX.push(holes[row]);
  }

  return {
    decisions: finalDecisions,
    targetPinsX,
  };
}

/**
 * Get target X for a specific row based on path
 */
export function getTargetXForRow(path: DeterministicPath, row: number): number {
  if (row < 0 || row >= path.targetPinsX.length) {
    throw new Error(`Invalid row index: ${row}`);
  }
  return path.targetPinsX[row];
}
