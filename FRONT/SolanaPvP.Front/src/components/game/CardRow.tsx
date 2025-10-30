// 1x3 Card Row component
import React, { useState } from "react";
import { motion } from "framer-motion";
import { GameTile } from "@/types/game";

interface CardRowProps {
  tiles: GameTile[];
  onTileClick: (index: number) => void;
  disabled?: boolean;
  currentPlayer?: string;
}

export const CardRow: React.FC<CardRowProps> = ({
  tiles,
  onTileClick,
  disabled = false,
  currentPlayer,
}) => {
  const [animatingTiles, setAnimatingTiles] = useState<Set<number>>(new Set());
  const handleTileClick = (index: number) => {
    if (disabled || tiles[index].selected || tiles[index].revealed) return;

    // Start animation
    setAnimatingTiles((prev) => new Set(prev).add(index));

    // Remove from animating after animation completes
    setTimeout(() => {
      setAnimatingTiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }, 800);

    onTileClick(index);
  };

  const getCardIcon = (tile: GameTile) => {
    if (tile.revealed) {
      if (tile.isBonus) return "💎";
      if (tile.value >= 500) return "🃏";
      if (tile.value >= 300) return "♠️";
      return "♥️";
    }
    return "🎴";
  };

  const getCardClass = (tile: GameTile) => {
    let baseClass =
      "w-24 h-32 md:w-28 md:h-36 rounded-lg border-2 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-lg font-bold relative overflow-hidden";

    if (tile.selected) {
      baseClass +=
        " bg-gradient-to-br from-sol-purple to-sol-mint border-4 border-white shadow-glow-purple text-white";
    } else if (tile.revealed) {
      if (tile.isBonus) {
        baseClass +=
          " bg-gradient-to-br from-yellow-400 to-orange-500 border-yellow-400 shadow-glow text-white";
      } else if (tile.value >= 300) {
        baseClass +=
          " bg-gradient-to-br from-sol-purple to-sol-mint border-sol-purple shadow-glow-purple text-white";
      } else if (tile.value >= 100) {
        baseClass += " bg-green-500 border-green-500 text-white";
      } else {
        baseClass += " bg-gray-500 border-gray-500 text-white";
      }
    } else {
      baseClass +=
        " bg-white/10 border-white/20 hover:border-sol-purple hover:shadow-glow-purple hover:scale-105";
    }

    if (disabled) {
      baseClass += " opacity-50 cursor-not-allowed";
    }

    return baseClass;
  };

  return (
    <div className="flex justify-center gap-4 md:gap-6 p-2 w-full">
      {tiles.map((tile, index) => (
        <div key={tile.index} className="relative">
          <motion.div
            className={getCardClass(tile)}
            onClick={() => handleTileClick(index)}
            whileHover={
              !disabled && !tile.selected && !tile.revealed
                ? { scale: 1.05 }
                : {}
            }
            whileTap={!disabled ? { scale: 0.95 } : {}}
            animate={
              tile.revealed || animatingTiles.has(index)
                ? {
                    x: [0, -8, 8, 0],
                    y: [0, -12, 0],
                    rotateY: [0, 180, 0],
                    rotateZ: [0, 5, 0],
                    scale: [1, 1.25, 1],
                  }
                : {}
            }
            transition={{
              x: { duration: 0.8, ease: "easeInOut" },
              y: { duration: 0.8, ease: "easeOut" },
              rotateY: { duration: 0.8, ease: "easeInOut" },
              rotateZ: { duration: 0.8, ease: "easeInOut" },
              scale: { duration: 0.8, ease: "easeOut" },
            }}
            style={{
              transformStyle: "preserve-3d",
              perspective: "1000px",
            }}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-2xl mb-2">{getCardIcon(tile)}</div>
              {tile.revealed && (
                <div className="text-sm font-bold text-center">
                  <div>{tile.value}</div>
                  {tile.isBonus && <div className="text-xs">x2</div>}
                </div>
              )}
            </div>

            {/* Glow effect for selected tiles */}
            {tile.selected && (
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-sol-purple/20 to-sol-mint/20 animate-pulse" />
            )}
          </motion.div>
        </div>
      ))}
    </div>
  );
};
