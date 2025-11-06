// Plinko game logic - PLACEHOLDER for future implementation
import React from "react";
import { GameTile } from "@/types/game";

interface PlinkoGameProps {
  tiles: GameTile[];
  onDropBall: () => void;
  disabled: boolean;
  currentPlayer: string;
}

export const PlinkoGame: React.FC<PlinkoGameProps> = ({
  tiles,
  onDropBall,
  disabled,
  currentPlayer,
}) => {
  return (
    <div className="text-center p-8">
      <h3 className="text-xl font-bold text-sol-purple mb-4">
        Plinko Game (Coming Soon)
      </h3>
      <p className="text-txt-muted mb-4">
        Drop the ball and watch it bounce!
      </p>
      <button
        onClick={onDropBall}
        disabled={disabled}
        className="px-6 py-3 bg-sol-purple text-white rounded-lg disabled:opacity-50"
      >
        Drop Ball
      </button>
      <div className="mt-4 text-xs text-txt-muted">
        Current Player: {currentPlayer}
      </div>
    </div>
  );
};

