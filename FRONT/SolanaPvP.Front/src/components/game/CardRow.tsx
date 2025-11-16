// 1x3 Card Row component - Poker style cards
import React, { useMemo } from "react";
import { GameTile } from "@/types/game";

interface CardRowProps {
  tiles: GameTile[];
  onTileClick: (index: number) => void;
  disabled?: boolean;
  currentPlayer?: string;
  playerSelections?: number[];
  allTilesRevealed?: boolean; // Whether all tiles are revealed (for dimming unselected tiles)
}

export const CardRow: React.FC<CardRowProps> = ({
  tiles,
  onTileClick,
  disabled = false,
  playerSelections = [],
  allTilesRevealed = false,
}) => {
  const handleCardClick = (index: number) => {
    if (disabled || tiles[index].selected || tiles[index].revealed) return;
    onTileClick(index);
  };

  const getSuitIcon = (value: number) => {
    if (value >= 700) return "♠";
    if (value >= 500) return "♥";
    if (value >= 300) return "♦";
    return "♣";
  };

  const getValueColor = (value: number) => {
    if (value >= 901) return "text-orange-500"; // Оранжевый
    if (value >= 600) return "text-sol-mint"; // Неон (cyan/mint)
    if (value >= 401) return "text-green-500"; // Зеленый
    if (value >= 201) return "text-blue-500"; // Синий
    return "text-gray-600"; // Серый (0-200)
  };

  const getCardColor = (value: number) => {
    // Для мастей используем ту же схему
    return getValueColor(value);
  };

  // Check if all tiles are revealed
  const allRevealed = useMemo(() => {
    return tiles.every((tile) => tile.revealed);
  }, [tiles]);

  return (
    <div className="flex justify-center gap-4 md:gap-6 lg:gap-8 py-6 md:py-8 px-4 md:px-6">
      {tiles.map((tile) => {
        // Проверяем выбрал ли ТЕКУЩИЙ игрок эту карту
        const isSelectedByCurrentPlayer = playerSelections.includes(tile.index);
        const isFlipped = tile.revealed || isSelectedByCurrentPlayer;
        const suitIcon = getSuitIcon(tile.value);
        const cardColor = getCardColor(tile.value);
        // Use prop if provided, otherwise check if all tiles are revealed
        const shouldDim = allTilesRevealed || allRevealed;

        return (
          <div
            key={tile.index}
            className="relative w-28 h-40 md:w-40 md:h-56 lg:w-44 lg:h-64 xl:w-48 xl:h-72"
            style={{
              perspective: "1000px",
            }}
          >
            {/* Selected glow - ЗА КАРТОЙ (только для выбора текущего игрока) */}
            {isSelectedByCurrentPlayer && (
              <div className="absolute -inset-3 rounded-xl bg-gradient-to-br from-purple-500 to-green-400 opacity-80 blur-lg animate-pulse" />
            )}
            
            <div
              className={`relative w-full h-full transition-transform duration-500 cursor-pointer ${
                disabled ? "cursor-not-allowed" : ""
              }`}
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                willChange: "transform",
              }}
              onClick={() => handleCardClick(tile.index)}
            >
              {/* Card Back */}
              <div
                className="absolute inset-0 rounded-xl border-4 border-white/20 shadow-2xl overflow-hidden"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  background: "linear-gradient(135deg, #9945FF 0%, #14F195 100%)",
                }}
              >
                {/* Pattern overlay */}
                <div className="absolute inset-0 opacity-30">
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: `repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 10px,
                        rgba(255,255,255,0.1) 10px,
                        rgba(255,255,255,0.1) 20px
                      )`,
                    }}
                  />
                </div>
                {/* Center Logo */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-6xl opacity-80">🎴</div>
                </div>
                {/* Hover glow */}
                {!disabled && !isFlipped && (
                  <div className="absolute inset-0 bg-white/0 hover:bg-white/10 transition-colors duration-300" />
                )}
              </div>

              {/* Card Front */}
              <div
                className="absolute inset-0 rounded-xl border-4 border-gray-300 shadow-2xl bg-white"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  opacity: isFlipped ? 1 : 0,
                  transition: "opacity 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
                }}
              >
                {/* Dim overlay for unselected cards when all cards are revealed */}
                {shouldDim && !isSelectedByCurrentPlayer && isFlipped && (
                  <div
                    className="absolute inset-0 rounded-xl bg-black/60 z-10 transition-opacity duration-300"
                    style={{
                      pointerEvents: "none",
                    }}
                  />
                )}
                {/* Top suit */}
                <div className={`absolute top-2 left-2 ${cardColor} text-xl md:text-2xl font-bold`}>
                  {suitIcon}
                </div>
                <div className={`absolute top-2 right-2 ${cardColor} text-xl md:text-2xl font-bold`}>
                  {suitIcon}
                </div>

                {/* Center value */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`${cardColor} font-extrabold text-4xl md:text-6xl`}>
                    {tile.value}
                  </div>
                </div>

                {/* Bottom suit (rotated) */}
                <div
                  className={`absolute bottom-2 left-2 ${cardColor} text-xl md:text-2xl font-bold`}
                  style={{ transform: "rotate(180deg)" }}
                >
                  {suitIcon}
                </div>
                <div
                  className={`absolute bottom-2 right-2 ${cardColor} text-xl md:text-2xl font-bold`}
                  style={{ transform: "rotate(180deg)" }}
                >
                  {suitIcon}
                </div>
              </div>
            </div>

            {/* Hover effect ring */}
            {!disabled && !isFlipped && (
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-purple-500 to-green-400 opacity-0 hover:opacity-30 transition-opacity duration-300 -z-10 blur-sm" />
            )}
          </div>
        );
      })}
    </div>
  );
};
