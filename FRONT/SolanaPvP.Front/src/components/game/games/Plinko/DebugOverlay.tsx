// Debug overlay for visualizing target paths, corridors, velocities

import React from 'react';
import type { BoardConfig, BallState, DeterministicPath } from '@/utils/types';
import { rowYPosition, slotCenterX } from '@/engine/geometry';

interface DebugOverlayProps {
  cfg: BoardConfig;
  balls: BallState[];
  paths: Map<number, DeterministicPath>;
  showTargetPath: boolean;
  showCorridors: boolean;
  showVelocities: boolean;
  showMagnetZone: boolean;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({
  cfg,
  balls,
  paths,
  showTargetPath,
  showCorridors,
  showVelocities,
  showMagnetZone,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = cfg.width;
    canvas.height = cfg.height;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw magnet zone
    if (showMagnetZone) {
      const magnetZoneStartY = rowYPosition(cfg, Math.max(0, cfg.rows - 2));
      ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
      ctx.fillRect(0, magnetZoneStartY, cfg.width, cfg.height - magnetZoneStartY);
    }

    // Draw target paths and corridors for each ball
    balls.forEach((ball) => {
      if (ball.hasLanded) return;

      const path = paths.get(ball.id);
      if (!path) return;

      ctx.save();

      // Draw target path (line from current position to target slot)
      if (showTargetPath) {
        const targetSlotX = slotCenterX(cfg, ball.targetSlot);
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(ball.p.x, ball.p.y);
        ctx.lineTo(targetSlotX, cfg.height - cfg.slotHeight / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw corridors (target pin X positions) - показываем для всех рядов
      if (showCorridors) {
        // Показываем целевые дырки для всех рядов, начиная с текущего
        for (let row = ball.nextRow; row < cfg.rows; row++) {
          const targetX = path.targetPinsX[row];
          if (targetX === undefined) continue;
          
          const rowY = rowYPosition(cfg, row);
          
          // Разная прозрачность для пройденных и будущих рядов
          const alpha = row === ball.nextRow ? 0.8 : 0.4;
          
          ctx.strokeStyle = `rgba(255, 165, 0, ${alpha})`;
          ctx.lineWidth = row === ball.nextRow ? 3 : 2;
          ctx.beginPath();
          ctx.moveTo(targetX - 25, rowY - 15);
          ctx.lineTo(targetX - 25, rowY + 15);
          ctx.moveTo(targetX + 25, rowY - 15);
          ctx.lineTo(targetX + 25, rowY + 15);
          ctx.stroke();

          // Draw target point
          ctx.fillStyle = `rgba(255, 165, 0, ${alpha})`;
          ctx.beginPath();
          ctx.arc(targetX, rowY, row === ball.nextRow ? 6 : 4, 0, Math.PI * 2);
          ctx.fill();
          
          // Номер ряда
          ctx.fillStyle = `rgba(255, 165, 0, ${alpha})`;
          ctx.font = '10px monospace';
          ctx.fillText(`R${row}`, targetX - 15, rowY - 20);
        }
      }

      // Draw velocity vector
      if (showVelocities) {
        const scale = 0.1;
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ball.p.x, ball.p.y);
        ctx.lineTo(ball.p.x + ball.v.x * scale, ball.p.y + ball.v.y * scale);
        ctx.stroke();

        // Draw velocity text
        ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
        ctx.font = '10px monospace';
        ctx.fillText(
          `vx:${ball.v.x.toFixed(0)} vy:${ball.v.y.toFixed(0)}`,
          ball.p.x + 15,
          ball.p.y - 10
        );
      }

      ctx.restore();
    });
  }, [cfg, balls, paths, showTargetPath, showCorridors, showVelocities, showMagnetZone]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
};

