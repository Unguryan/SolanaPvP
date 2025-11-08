// PickHigher game logic - handles tile/chest/card selection
import React from "react";
import { GameTile, GamePlayer } from "@/types/game";
import { TileGrid } from "../TileGrid";
import { ChestGrid } from "../ChestGrid";
import { CardRow } from "../CardRow";

interface PickHigherGameProps {
  gameMode: "PickThreeFromNine" | "PickFiveFromSixteen" | "PickOneFromThree";
  tiles: GameTile[];
  onTileClick: (index: number) => void;
  disabled: boolean;
  currentPlayer: string;
  players: GamePlayer[];
}

export const PickHigherGame: React.FC<PickHigherGameProps> = ({
  gameMode,
  tiles,
  onTileClick,
  disabled,
  currentPlayer,
  players,
}) => {
  // Get current player's selections
  const currentPlayerData = players.find(p => p.username === currentPlayer);
  const currentPlayerSelections = currentPlayerData?.selections || [];
  switch (gameMode) {
    case "PickThreeFromNine":
      // 3v9 - Сундуки (3x3 grid, pick 3 from 9 chests)
      return (
        <ChestGrid
          tiles={tiles}
          onTileClick={onTileClick}
          disabled={disabled}
          currentPlayer={currentPlayer}
          playerSelections={currentPlayerSelections}
        />
      );
    case "PickFiveFromSixteen":
      // 5v16 - Плитки (4x4 grid, pick 5 from 16 tiles)
      return (
        <TileGrid
          tiles={tiles}
          onTileClick={onTileClick}
          disabled={disabled}
          currentPlayer={currentPlayer}
          playerSelections={currentPlayerSelections}
        />
      );
    case "PickOneFromThree":
      // 1v3 - Покерные карты (pick 1 from 3 cards)
      return (
        <CardRow
          tiles={tiles}
          onTileClick={onTileClick}
          disabled={disabled}
          currentPlayer={currentPlayer}
          playerSelections={currentPlayerSelections}
        />
      );
    default:
      return null;
  }
};

