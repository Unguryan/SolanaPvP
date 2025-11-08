// 4x4 Tile Grid component - Optimized for performance
import React from "react";
import { GameTile } from "@/types/game";

interface TileGridProps {
  tiles: GameTile[];
  onTileClick: (index: number) => void;
  disabled?: boolean;
  currentPlayer?: string;
  playerSelections?: number[];
}

export const TileGrid: React.FC<TileGridProps> = ({
  tiles,
  onTileClick,
  disabled = false,
  playerSelections = [],
}) => {
  const handleTileClick = (index: number) => {
    if (disabled || tiles[index].selected || tiles[index].revealed) return;
    onTileClick(index);
  };

  const getValueShadow = (value: number) => {
    // Многослойные неоновые тени с градиентом
    if (value >= 901) {
      // Оранжевый неон: яркий оранжевый -> темный оранжевый -> красный
      return "0 0 10px rgba(254, 215, 170, 1), 0 0 20px rgba(251, 146, 60, 0.9), 0 0 30px rgba(249, 115, 22, 0.7), 0 0 40px rgba(234, 88, 12, 0.5)";
    }
    if (value >= 600) {
      // Неон cyan: светлый cyan -> mint -> темный cyan
      return "0 0 10px rgba(167, 243, 208, 1), 0 0 20px rgba(20, 241, 149, 0.9), 0 0 30px rgba(0, 217, 255, 0.7), 0 0 40px rgba(6, 182, 212, 0.5)";
    }
    if (value >= 401) {
      // Зеленый неон: светлый зеленый -> яркий зеленый -> темный зеленый
      return "0 0 10px rgba(187, 247, 208, 1), 0 0 20px rgba(74, 222, 128, 0.9), 0 0 30px rgba(34, 197, 94, 0.7), 0 0 40px rgba(22, 163, 74, 0.5)";
    }
    if (value >= 201) {
      // Синий неон: светлый синий -> яркий синий -> темный синий
      return "0 0 10px rgba(191, 219, 254, 1), 0 0 20px rgba(96, 165, 250, 0.9), 0 0 30px rgba(59, 130, 246, 0.7), 0 0 40px rgba(37, 99, 235, 0.5)";
    }
    // Серый: простое свечение
    return "0 0 10px rgba(209, 213, 219, 0.8), 0 0 20px rgba(156, 163, 175, 0.6), 0 0 30px rgba(107, 114, 128, 0.4)";
  };

  return (
    <div className="grid grid-cols-4 gap-2 md:gap-3 p-2 max-w-xl lg:max-w-2xl xl:max-w-3xl mx-auto">
      {tiles.map((tile) => {
        // Проверяем выбрал ли ТЕКУЩИЙ игрок эту плитку
        const isSelectedByCurrentPlayer = playerSelections.includes(tile.index);
        const isFlipped = tile.revealed || isSelectedByCurrentPlayer;
        const valueShadow = getValueShadow(tile.value);

        return (
          <div
            key={tile.index}
            className="relative w-full aspect-square"
            style={{ perspective: "800px" }}
          >
            <div
              className={`relative w-full h-full transition-all duration-300 ${
                disabled ? "cursor-not-allowed" : "cursor-pointer"
              }`}
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                willChange: "transform",
              }}
              onClick={() => handleTileClick(tile.index)}
            >
              {/* Tile Back (closed) */}
              <div
                className="absolute inset-0 rounded-lg border-2 border-purple-500/30 shadow-lg"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  background: "linear-gradient(135deg, rgba(153,69,255,0.2) 0%, rgba(20,241,149,0.2) 100%)",
                }}
              >
                {/* Pattern */}
                <div
                  className="absolute inset-0 rounded-lg opacity-20"
                  style={{
                    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)`,
                    backgroundSize: "8px 8px",
                  }}
                />
                {/* Icon - Target for Tiles */}
                <div className="absolute inset-0 flex items-center justify-center text-3xl md:text-4xl opacity-60">
                  🎯
                </div>
                {/* Hover effect - simple opacity change */}
                {!disabled && !isFlipped && (
                  <div className="absolute inset-0 bg-purple-500/0 hover:bg-purple-500/20 transition-colors duration-200 rounded-lg" />
                )}
              </div>

              {/* Tile Front (revealed) */}
              <div
                className="absolute inset-0 rounded-lg border-2 shadow-lg"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  background: tile.isBonus
                    ? "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #dc2626 100%)" // Золото с огнём
                    : tile.value >= 901
                    ? "linear-gradient(135deg, #fb923c 0%, #f97316 30%, #dc2626 60%, #7c2d12 100%)" // Огненный градиент
                    : tile.value >= 600
                    ? "linear-gradient(135deg, #14F195 0%, #00D9FF 40%, #0891b2 70%, #0e7490 100%)" // Неоновый cyan с глубиной
                    : tile.value >= 401
                    ? "linear-gradient(135deg, #fef08a 0%, #d9f99d 12%, #bef264 25%, #86efac 38%, #4ade80 50%, #22c55e 63%, #16a34a 75%, #15803d 88%, #14532d 100%)" // Жёлто-лаймово-изумрудный
                    : tile.value >= 201
                    ? "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 12%, #a5b4fc 25%, #93c5fd 35%, #60a5fa 47%, #3b82f6 58%, #2563eb 70%, #1d4ed8 82%, #1e3a8a 100%)" // Индиго-небесно-синий
                    : "linear-gradient(135deg, #d1d5db 0%, #9ca3af 40%, #6b7280 70%, #374151 100%)", // Металлический серый
                  borderColor: tile.isBonus
                    ? "#fbbf24"
                    : tile.value >= 901
                    ? "#fb923c"
                    : tile.value >= 600
                    ? "#14F195"
                    : tile.value >= 401
                    ? "#4ade80"
                    : tile.value >= 201
                    ? "#60a5fa"
                    : "#9ca3af",
                }}
              >
                {/* Value */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div 
                    className="text-2xl md:text-4xl font-extrabold text-white"
                    style={{ textShadow: valueShadow }}
                  >
                    {tile.value}
                  </div>
                </div>

                {/* Shine effect */}
                <div
                  className="absolute inset-0 rounded-lg opacity-20"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)",
                  }}
                />
              </div>
            </div>

            {/* Selected indicator ring - ЯРКОЕ ВЫДЕЛЕНИЕ (только для текущего игрока) */}
            {isSelectedByCurrentPlayer && (
              <>
                <div
                  className="absolute -inset-2 rounded-lg -z-10 animate-pulse"
                  style={{
                    background: "linear-gradient(135deg, #9945FF, #14F195)",
                    opacity: 0.8,
                    filter: "blur(12px)",
                  }}
                />
                <div className="absolute inset-0 rounded-lg border-4 border-sol-mint shadow-[0_0_30px_rgba(20,241,149,0.8)] pointer-events-none z-10" />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
