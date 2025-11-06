// PickHigher game logic - handles tile/chest/card selection
import React from "react";
import { GameTile } from "@/types/game";
import { TileGrid } from "../TileGrid";
import { ChestGrid } from "../ChestGrid";
import { CardRow } from "../CardRow";

interface PickHigherGameProps {
  gameMode: "PickThreeFromNine" | "PickFiveFromSixteen" | "PickOneFromThree";
  tiles: GameTile[];
  onTileClick: (index: number) => void;
  disabled: boolean;
  currentPlayer: string;
}

export const PickHigherGame: React.FC<PickHigherGameProps> = ({
  gameMode,
  tiles,
  onTileClick,
  disabled,
  currentPlayer,
}) => {
  switch (gameMode) {
    case "PickThreeFromNine":
      return (
        <TileGrid
          tiles={tiles}
          onTileClick={onTileClick}
          disabled={disabled}
          currentPlayer={currentPlayer}
        />
      );
    case "PickFiveFromSixteen":
      return (
        <ChestGrid
          tiles={tiles}
          onTileClick={onTileClick}
          disabled={disabled}
          currentPlayer={currentPlayer}
        />
      );
    case "PickOneFromThree":
      return (
        <CardRow
          tiles={tiles}
          onTileClick={onTileClick}
          disabled={disabled}
          currentPlayer={currentPlayer}
        />
      );
    default:
      return null;
  }
};

