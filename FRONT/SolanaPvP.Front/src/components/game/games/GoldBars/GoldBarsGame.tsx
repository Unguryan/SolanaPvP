// Gold Bars game component - handles tile opening to find gold bars
// Animations exactly like MinerGame (flip through rotateY)
import React, { useMemo, memo, useCallback, useState, useEffect } from "react";
import { GoldBarsTile } from "@/types/goldBars";

interface GoldBarsGameProps {
  gameMode: "GoldBars1v9" | "GoldBars3v16" | "GoldBars5v25";
  tiles: GoldBarsTile[];
  onTileClick: (index: number) => void;
  disabled?: boolean;
  currentPlayer?: string;
  playerSelections?: number[];
  gameEnded?: boolean; // Whether game has ended for this player
  allTilesRevealed?: boolean; // Whether all tiles are revealed (for dimming unselected tiles)
}

// Helper functions - defined at module level
const getTileStyle = (tile: GoldBarsTile, isFlipped: boolean) => {
  if (!isFlipped) {
    // Closed tile - Gold/orange gradient style
    return {
      background:
        "linear-gradient(135deg, rgba(251,191,36,0.3) 0%, rgba(245,158,11,0.3) 100%)",
      borderColor: "rgba(251, 191, 36, 0.4)",
    };
  }

  // Revealed tile - different styles based on type
  switch (tile.type) {
    case "gold":
      // Bright gold gradient for gold bars
      return {
        background:
          "linear-gradient(135deg, #fbbf24 0%, #f59e0b 30%, #d97706 60%, #92400e 100%)",
        borderColor: "#fbbf24",
      };
    case "bomb":
      // Red gradient for bomb
      return {
        background:
          "linear-gradient(135deg, #dc2626 0%, #b91c1c 30%, #991b1b 60%, #7f1d1d 100%)",
        borderColor: "#dc2626",
      };
    case "empty":
    default:
      // Gray gradient for empty
      return {
        background:
          "linear-gradient(135deg, #d1d5db 0%, #9ca3af 40%, #6b7280 70%, #374151 100%)",
        borderColor: "#9ca3af",
      };
  }
};

const getTileIcon = (tile: GoldBarsTile, isFlipped: boolean) => {
  if (!isFlipped) {
    return "?!"; // Closed tile icon
  }

  switch (tile.type) {
    case "gold":
      return "💰"; // Gold bar icon
    case "bomb":
      return "💣";
    case "empty":
    default:
      return "·"; // Small dot for empty tiles
  }
};

const getTileShadow = (tile: GoldBarsTile) => {
  switch (tile.type) {
    case "gold":
      // Gold glow
      return "0 0 20px rgba(251, 191, 36, 1), 0 0 40px rgba(245, 158, 11, 0.9), 0 0 60px rgba(217, 119, 6, 0.7)";
    case "bomb":
      // Red flash
      return "0 0 20px rgba(220, 38, 38, 1), 0 0 40px rgba(185, 28, 28, 0.9), 0 0 60px rgba(153, 27, 27, 0.7)";
    default:
      return "0 0 10px rgba(209, 213, 219, 0.8)";
  }
};

// Tile component props - defined at module level
interface GoldBarsTileComponentProps {
  tile: GoldBarsTile;
  isSelectedByPlayer: boolean;
  isFlipped: boolean;
  disabled: boolean;
  gameEnded: boolean;
  onTileClick: (index: number) => void;
  gameMode: "GoldBars1v9" | "GoldBars3v16" | "GoldBars5v25";
  allTilesRevealed?: boolean; // Whether all tiles are revealed (for dimming unselected tiles)
}

// Tile component - defined at module level
const GoldBarsTileComponent: React.FC<GoldBarsTileComponentProps> = ({
  tile,
  isSelectedByPlayer,
  isFlipped,
  disabled,
  gameEnded,
  onTileClick,
  gameMode: tileGameMode,
  allTilesRevealed = false,
}) => {
  // Show border with delay after tile is flipped and selected
  const [showBorder, setShowBorder] = useState(false);

  useEffect(() => {
    if (isSelectedByPlayer && isFlipped) {
      // Delay showing border by 300ms
      const timeout = setTimeout(() => {
        setShowBorder(true);
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      // Reset when tile is not selected or not flipped
      setShowBorder(false);
    }
  }, [isSelectedByPlayer, isFlipped]);

  // Handle tile click
  const handleTileClickInternal = () => {
    if (disabled || tile.revealed || tile.selected || gameEnded) {
      return; // Don't allow clicks on already revealed tiles
    }
    onTileClick(tile.index);
  };

  const icon = getTileIcon(tile, isFlipped);
  const shadow = getTileShadow(tile);

  // Icon size based on game mode
  const getIconSizeForTile = (isFlipped: boolean) => {
    if (!isFlipped) {
      return "text-xl md:text-2xl";
    }
    switch (tileGameMode) {
      case "GoldBars1v9":
        return "text-5xl md:text-6xl lg:text-7xl";
      case "GoldBars3v16":
        return "text-4xl md:text-5xl lg:text-6xl";
      case "GoldBars5v25":
        return "text-3xl md:text-4xl lg:text-5xl";
      default:
        return "text-4xl md:text-5xl lg:text-6xl";
    }
  };
  const iconSizeClass = getIconSizeForTile(isFlipped);

  return (
    <div
      className="relative w-full aspect-square"
      style={{ perspective: "800px" }}
    >
      {/* Tile container with flip animation */}
      <div
        className={`relative w-full h-full transition-all duration-300 ${
          disabled || gameEnded ? "cursor-not-allowed" : "cursor-pointer"
        }`}
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          willChange: "transform",
        }}
        onClick={handleTileClickInternal}
      >
        {/* Tile Back (closed) - Gold/orange gradient style */}
        <div
          className="absolute inset-0 rounded-lg border-2 border-yellow-500/40 shadow-lg"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            background:
              "linear-gradient(135deg, rgba(251,191,36,0.3) 0%, rgba(245,158,11,0.3) 100%)",
          }}
        >
          {/* Pattern - Diagonal stripes */}
          <div
            className="absolute inset-0 rounded-lg opacity-30"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.1) 8px, rgba(255,255,255,0.1) 16px)`,
            }}
          />
          {/* Icon */}
          <div
            className={`absolute inset-0 flex items-center justify-center ${iconSizeClass} font-bold opacity-70`}
            style={{
              textShadow:
                "0 0 10px rgba(251, 191, 36, 0.8), 0 0 20px rgba(245, 158, 11, 0.6)",
            }}
          >
            {icon}
          </div>
          {/* Hover effect - Gold/yellow glow */}
          {!disabled && !gameEnded && !isFlipped && (
            <div className="absolute inset-0 bg-yellow-500/0 hover:bg-yellow-500/25 transition-colors duration-200 rounded-lg" />
          )}
        </div>

        {/* Tile Front (revealed) */}
        <div
          className="absolute inset-0 rounded-lg border-2 shadow-lg"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            opacity: isFlipped ? 1 : 0,
            transition: "opacity 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
            ...getTileStyle(tile, true),
          }}
        >
          {/* Dim overlay for unselected tiles when all tiles are revealed */}
          {allTilesRevealed && !isSelectedByPlayer && isFlipped && (
            <div
              className="absolute inset-0 rounded-lg bg-black/60 z-10 transition-opacity duration-300"
              style={{
                pointerEvents: "none",
              }}
            />
          )}
          {/* Icon */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <div
              className={iconSizeClass}
              style={{
                textShadow: shadow,
                transformOrigin: "center center",
              }}
            >
              {icon}
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

          {/* Empty tile pattern (only for revealed empty tiles) */}
          {isFlipped && tile.type === "empty" && (
            <div
              className="absolute inset-0 rounded-lg opacity-30"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)`,
              }}
            />
          )}
        </div>
      </div>

      {/* Selected indicator ring - highlight ONLY tiles selected by current player when revealed */}
      {showBorder && (
        <div className="absolute inset-0 rounded-lg border-4 border-sol-mint pointer-events-none z-10 transition-opacity duration-300 opacity-100" />
      )}
    </div>
  );
};

GoldBarsTileComponent.displayName = "GoldBarsTileComponent";

// Memoize the entire GoldBarsGame component
const GoldBarsGameComponent: React.FC<GoldBarsGameProps> = ({
  gameMode,
  tiles,
  onTileClick,
  disabled = false,
  playerSelections = [],
  gameEnded = false,
  allTilesRevealed = false,
}) => {
  const handleTileClick = useCallback(
    (index: number) => {
      if (
        disabled ||
        tiles[index].selected ||
        tiles[index].revealed ||
        gameEnded
      )
        return;
      onTileClick(index);
    },
    [disabled, tiles, gameEnded, onTileClick]
  );

  // Memoize player selections set for faster lookup
  const playerSelectionsSet = useMemo(
    () => new Set(playerSelections || []),
    [playerSelections]
  );

  // Memoize grid columns based on game mode
  const gridCols = useMemo(() => {
    switch (gameMode) {
      case "GoldBars1v9":
        return "grid-cols-3";
      case "GoldBars3v16":
        return "grid-cols-4";
      case "GoldBars5v25":
        return "grid-cols-5";
      default:
        return "grid-cols-3";
    }
  }, [gameMode]);

  // Check if all tiles are revealed
  const allRevealed = useMemo(() => {
    return tiles.every((tile) => tile.revealed);
  }, [tiles]);

  return (
    <div className="w-full overflow-hidden" style={{ maxWidth: "100vw" }}>
      <div
        className={`grid ${gridCols} gap-1.5 md:gap-2 p-2 mx-auto`}
        style={{
          width: "100%",
          maxWidth: "min(100%, 512px)",
          boxSizing: "border-box",
          overflow: "hidden", // Prevent scrollbar
        }}
      >
        {tiles.map((tile) => {
          const isSelectedByPlayer = playerSelectionsSet.has(tile.index);
          // Only flip if tile is revealed (opened)
          const isFlipped = tile.revealed;
          // Use prop if provided, otherwise check if all tiles are revealed
          const shouldDim = allTilesRevealed || allRevealed;

          return (
            <GoldBarsTileComponent
              key={tile.index}
              tile={tile}
              isSelectedByPlayer={isSelectedByPlayer}
              isFlipped={isFlipped}
              disabled={disabled}
              gameEnded={gameEnded}
              onTileClick={handleTileClick}
              gameMode={gameMode}
              allTilesRevealed={shouldDim}
            />
          );
        })}
      </div>
    </div>
  );
};

GoldBarsGameComponent.displayName = "GoldBarsGame";

// Memoize the component with custom comparison function
export const GoldBarsGame = memo(
  GoldBarsGameComponent,
  (prevProps, nextProps) => {
    // Custom comparison function to prevent re-renders when only timeRemaining changes
    if (prevProps.gameMode !== nextProps.gameMode) return false;
    if (prevProps.disabled !== nextProps.disabled) return false;
    if (prevProps.gameEnded !== nextProps.gameEnded) return false;
    if (prevProps.currentPlayer !== nextProps.currentPlayer) return false;
    if (prevProps.tiles.length !== nextProps.tiles.length) return false;
    if (
      prevProps.playerSelections?.length !== nextProps.playerSelections?.length
    )
      return false;

    // Deep compare tiles array
    for (let i = 0; i < prevProps.tiles.length; i++) {
      const prevTile = prevProps.tiles[i];
      const nextTile = nextProps.tiles[i];
      if (
        prevTile.index !== nextTile.index ||
        prevTile.revealed !== nextTile.revealed ||
        prevTile.selected !== nextTile.selected ||
        prevTile.type !== nextTile.type
      ) {
        return false; // Tiles changed, need re-render
      }
    }

    // Deep compare playerSelections
    if (prevProps.playerSelections && nextProps.playerSelections) {
      const prevSorted = [...prevProps.playerSelections].sort();
      const nextSorted = [...nextProps.playerSelections].sort();
      if (prevSorted.length !== nextSorted.length) return false;
      for (let i = 0; i < prevSorted.length; i++) {
        if (prevSorted[i] !== nextSorted[i]) return false;
      }
    }

    return true; // No changes, skip re-render
  }
);
