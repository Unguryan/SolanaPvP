// Player card component for game display
import React from "react";
import { motion } from "framer-motion";
import { GamePlayer } from "@/types/game";
import { ScoreCounter } from "./effects/ScoreCounter";

interface PlayerCardProps {
  player: GamePlayer;
  isCurrentPlayer?: boolean;
  isWinner?: boolean;
  className?: string;
  hideScore?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isCurrentPlayer = false,
  isWinner = false,
  className = "",
  hideScore = false,
}) => {
  const getStatusColor = () => {
    if (isWinner) return "border-sol-mint shadow-glow-mint";
    if (isCurrentPlayer) return "border-sol-purple shadow-glow-purple";
    return "border-white/20";
  };

  const getStatusIcon = () => {
    if (isWinner) return "👑";
    if (isCurrentPlayer) return "🎯";
    if (player.isReady) return "✅";
    return "⏳";
  };

  return (
    <motion.div
      className={`glass-card p-4 rounded-xl border-2 ${getStatusColor()} ${className}`}
      animate={
        isCurrentPlayer
          ? {
              scale: [1, 1.02, 1],
              boxShadow: [
                "0 0 0px #9945FF",
                "0 0 20px #9945FF",
                "0 0 0px #9945FF",
              ],
            }
          : {}
      }
      transition={{
        duration: 2,
        repeat: isCurrentPlayer ? Infinity : 0,
        repeatType: "reverse",
      }}
    >
      {/* Player Info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-txt-base truncate">
              {player.username}
            </h3>
            <span className="text-lg">{getStatusIcon()}</span>
          </div>
          <div className="text-xs text-txt-muted">
            {player.isReady ? "Ready" : "Waiting..."}
          </div>
        </div>
      </div>

      {/* Score Display */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-txt-muted">Score</span>
          {hideScore && !isCurrentPlayer ? (
            <span className="text-2xl font-bold text-txt-muted">???</span>
          ) : (
            <ScoreCounter value={player.currentScore} />
          )}
        </div>
      </div>
    </motion.div>
  );
};
