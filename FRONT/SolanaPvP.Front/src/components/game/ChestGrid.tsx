// 3x3 Chest Grid component - Treasure chests with lid animation
import React from "react";
import { GameTile } from "@/types/game";

interface ChestGridProps {
  tiles: GameTile[];
  onTileClick: (index: number) => void;
  disabled?: boolean;
  currentPlayer?: string;
  playerSelections?: number[];
}

export const ChestGrid: React.FC<ChestGridProps> = ({
  tiles,
  onTileClick,
  disabled = false,
  playerSelections = [],
}) => {
  const handleChestClick = (index: number) => {
    if (disabled || tiles[index].selected || tiles[index].revealed) return;
    onTileClick(index);
  };

  const getValueShadow = (value: number) => {
    // Многослойные неоновые тени с градиентом (как в TileGrid)
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
    <div className="grid grid-cols-3 gap-4 md:gap-5 lg:gap-6 max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl mx-auto">
      {tiles.map((tile) => {
        // Проверяем выбрал ли ТЕКУЩИЙ игрок этот сундук
        const isSelectedByCurrentPlayer = playerSelections.includes(tile.index);
        const isOpen = tile.revealed || isSelectedByCurrentPlayer;
        const valueShadow = getValueShadow(tile.value);

        return (
          <div
            key={tile.index}
            className={`relative w-full aspect-square ${
              disabled ? "cursor-not-allowed" : "cursor-pointer"
            }`}
            onClick={() => handleChestClick(tile.index)}
            style={{
              perspective: "800px",
            }}
          >
            {/* Chest Body */}
            <div className="relative w-full h-full">
              {/* Base/Bottom of chest */}
              <div
                className="absolute inset-0 top-1/3 rounded-b-lg border-2 border-yellow-700/50 shadow-lg"
                style={{
                  background: "linear-gradient(180deg, #f4d03f 0%, #d4af37 30%, #b8860b 60%, #8b6914 100%)",
                }}
              >
                {/* Lock (only when closed) */}
                {!isOpen && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-5 md:w-5 md:h-6 rounded-sm bg-gray-700 border border-gray-600 flex items-end justify-center">
                    <div className="w-1.5 h-2 md:w-2 md:h-2.5 bg-gray-600 rounded-b-sm"></div>
                  </div>
                )}
              </div>

              {/* Value - floats above chest when open */}
              {isOpen && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center transition-all duration-700 ease-out pointer-events-none"
                  style={{
                    top: "30%",
                    transform: isOpen 
                      ? "translate(-50%, -100%) translateZ(30px)" 
                      : "translate(-50%, 0%) translateZ(0px)",
                    opacity: isOpen ? 1 : 0,
                    willChange: "transform, opacity",
                  }}
                >
                  <div 
                    className="text-2xl md:text-4xl font-extrabold text-white animate-pulse"
                    style={{ textShadow: valueShadow }}
                  >
                    {tile.value}
                  </div>
                </div>
              )}

              {/* Lid */}
              <div
                className="absolute inset-0 bottom-2/3 rounded-t-lg border-2 border-yellow-700/50 shadow-xl transition-all duration-500 ease-out"
                style={{
                  background: "linear-gradient(180deg, #ffd700 0%, #f4d03f 25%, #d4af37 60%, #b8860b 100%)",
                  transformOrigin: "bottom center",
                  transformStyle: "preserve-3d",
                  transform: isOpen ? "rotateX(-85deg)" : "rotateX(0deg)",
                  willChange: "transform",
                }}
              >
                {/* Lid highlight */}
                <div
                  className="absolute inset-0 rounded-t-lg opacity-30"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)",
                  }}
                />

                {/* Lid band/decoration */}
                <div className="absolute left-0 right-0 bottom-0 h-1 md:h-1.5 bg-yellow-800/60" />
              </div>

              {/* Selected glow - ЯРКОЕ ВЫДЕЛЕНИЕ (только для текущего игрока) */}
              {isSelectedByCurrentPlayer && (
                <>
                  <div className="absolute -inset-2 rounded-lg bg-gradient-to-r from-purple-500 to-green-400 opacity-80 blur-md -z-10 animate-pulse" />
                  <div className="absolute inset-0 rounded-lg border-4 border-sol-mint shadow-[0_0_30px_rgba(20,241,149,0.8)] pointer-events-none" />
                </>
              )}

              {/* Hover glow */}
              {!disabled && !isOpen && (
                <div className="absolute -inset-1 rounded-lg bg-yellow-400/0 hover:bg-yellow-400/30 transition-all duration-300 blur-sm -z-10" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
