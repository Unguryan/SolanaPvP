// 3x3 Tile Grid component
import React, { useState } from "react";
import { motion } from "framer-motion";
import { GameTile } from "@/types/game";

interface TileGridProps {
  tiles: GameTile[];
  onTileClick: (index: number) => void;
  disabled?: boolean;
  currentPlayer?: string;
}

export const TileGrid: React.FC<TileGridProps> = ({
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

  const getTileIcon = (tile: GameTile) => {
    if (tile.revealed) {
      if (tile.isBonus) return "✨";
      if (tile.value >= 500) return "💎";
      if (tile.value >= 300) return "⭐";
      return "🎯";
    }
    return "🎯";
  };

  const getTileClass = (tile: GameTile) => {
    let baseClass =
      "w-20 h-20 md:w-24 md:h-24 rounded-xl border-2 transition-all duration-300 cursor-pointer flex items-center justify-center text-2xl font-bold relative overflow-hidden";

    if (tile.selected) {
      baseClass +=
        " bg-gradient-to-br from-sol-purple to-sol-mint border-4 border-sol-purple shadow-glow-purple text-white";
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
    <div className="grid grid-cols-3 gap-3 md:gap-4 p-2 w-full">
      {tiles.map((tile, index) => (
        <div key={tile.index} className="relative">
          <motion.div
            className={getTileClass(tile)}
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
                    rotateY: [0, 180, 0],
                    scale: [1, 1.2, 1],
                    y: [0, -10, 0],
                  }
                : {}
            }
            transition={{
              rotateY: { duration: 0.8, ease: "easeInOut" },
              scale: { duration: 0.8, ease: "easeOut" },
              y: { duration: 0.8, ease: "easeOut" },
            }}
            style={{
              transformStyle: "preserve-3d",
              perspective: "1000px",
            }}
          >
            <div className="flex flex-col items-center justify-center">
              <div className="text-2xl mb-1">{getTileIcon(tile)}</div>
              {tile.revealed && (
                <div className="text-xs font-bold">
                  {tile.value}
                  {tile.isBonus && "x2"}
                </div>
              )}
            </div>

            {/* Glow effect for selected tiles */}
            {tile.selected && (
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-sol-purple/20 to-sol-mint/20 animate-pulse" />
            )}
          </motion.div>
        </div>
      ))}
    </div>
  );
};
