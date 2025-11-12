// Pure geometry functions for pin and slot layout

import type { BoardConfig, Pin } from "@/utils/types";

/**
 * Build all pins for the board
 */
export function buildPins(cfg: BoardConfig): Pin[] {
  const pins: Pin[] = [];

  for (let row = 0; row < cfg.rows; row++) {
    const pinsInRow = row + 2;
    const rowY = rowYPosition(cfg, row);

    for (let col = 0; col < pinsInRow; col++) {
      const pinX = pinXPosition(cfg, row, col);
      pins.push({
        row,
        col,
        x: pinX,
        y: rowY,
        r: cfg.pinRadius,
      });
    }
  }

  return pins;
}

/**
 * Get Y position of a row
 */
export function rowYPosition(cfg: BoardConfig, row: number): number {
  return cfg.topMargin + (row + 1) * cfg.rowSpacingY;
}

/**
 * Get X position of a pin in a row
 */
export function pinXPosition(
  cfg: BoardConfig,
  row: number,
  col: number
): number {
  const startX = pinStartX(cfg, row);
  return startX + col * cfg.pinSpacingX;
}

/**
 * Get starting X position for pins in a row (leftmost pin)
 */
export function pinStartX(cfg: BoardConfig, row: number): number {
  const pinsInRow = row + 2;
  const centerX = cfg.width / 2;
  return centerX - ((pinsInRow - 1) * cfg.pinSpacingX) / 2;
}

/**
 * Get center X of a slot
 * Слоты расположены МЕЖДУ пинами последнего ряда
 */
export function slotCenterX(cfg: BoardConfig, slotIndex: number): number {
  // Последний ряд имеет rows + 1 пинов (например, rows=5 → 6 пинов)
  const lastRow = cfg.rows - 1;
  const pinsInLastRow = lastRow + 2; // rows + 1 пинов в последнем ряду

  // Позиции пинов последнего ряда
  const lastRowStartX = pinStartX(cfg, lastRow);

  // Слоты находятся между пинами: между pin[0] и pin[1], pin[1] и pin[2], и т.д.
  // Всего слотов = pinsInLastRow - 1 = rows (НЕ rows + 1!)
  // Например: 6 пинов → 5 слотов
  if (slotIndex < 0 || slotIndex >= pinsInLastRow - 1) {
    // Fallback для безопасности
    const slotWidth = cfg.width / cfg.slotCount;
    return (slotIndex + 0.5) * slotWidth;
  }

  // Позиция слота = между двумя соседними пинами
  const leftPinX = lastRowStartX + slotIndex * cfg.pinSpacingX;
  const rightPinX = lastRowStartX + (slotIndex + 1) * cfg.pinSpacingX;
  return (leftPinX + rightPinX) / 2;
}

/**
 * Get slot Y position (top of slot area)
 */
export function slotY(cfg: BoardConfig): number {
  return cfg.height - cfg.slotHeight;
}

/**
 * Get slot width - ширина слота между пинами
 */
export function slotWidth(cfg: BoardConfig): number {
  // Ширина слота = расстояние между пинами последнего ряда
  return cfg.pinSpacingX;
}

/**
 * Get slot index from X position
 * Определяем слот по позиции между пинами последнего ряда
 */
export function slotIndexFromX(cfg: BoardConfig, x: number): number {
  const lastRow = cfg.rows - 1;
  const lastRowStartX = pinStartX(cfg, lastRow);

  // Вычисляем, между какими пинами находится x
  const relativeX = x - lastRowStartX;
  const slotIndex = Math.floor(relativeX / cfg.pinSpacingX);

  // Ограничиваем диапазоном [0, slotCount - 1]
  return Math.max(0, Math.min(cfg.slotCount - 1, slotIndex));
}

/**
 * Create default board config
 * slotCount = rows (слоты между пинами последнего ряда)
 * Последний ряд имеет rows + 1 пинов, между ними rows слотов
 */
export function createDefaultConfig(
  rows: number,
  slotCount: number,
  width: number = 800,
  height: number = 600
): BoardConfig {
  const topMargin = 48;
  const slotHeight = 64;
  const pinRadius = 8;
  const ballRadius = 12;
  const gravity = 50; // Увеличена гравитация для более быстрого движения
  const rowSpacingY = (height - slotHeight - topMargin - 40) / (rows + 1);

  // Последний ряд имеет rows + 1 пинов
  // pinSpacingX должен быть таким, чтобы пины равномерно распределялись по ширине
  // Используем slotCount + 1 для вычисления spacing (так как пинов на 1 больше, чем слотов)
  const pinSpacingX = width / (slotCount + 1);

  return {
    rows,
    slotCount,
    width,
    height,
    slotHeight,
    topMargin,
    pinRadius,
    ballRadius,
    gravity,
    rowSpacingY,
    pinSpacingX,
  };
}
