// Waiting lobby component
import React from "react";
import { motion } from "framer-motion";
import { GamePlayer } from "@/types/game";
import { Skeleton } from "@/components/ui/Skeleton";
import { GlowButton } from "@/components/ui/GlowButton";
import { PlayerCard } from "./PlayerCard";

interface WaitingLobbyProps {
  players: GamePlayer[];
  maxPlayers: number;
  timeRemaining: number;
  onCancel?: () => void;
  className?: string;
}

export const WaitingLobby: React.FC<WaitingLobbyProps> = ({
  players,
  maxPlayers,
  timeRemaining,
  onCancel,
  className = "",
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getEmptySlots = () => {
    return Array.from({ length: maxPlayers - players.length }, (_, i) => i);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <motion.h2
          className="text-2xl font-display font-bold text-sol-purple mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Waiting for Players
        </motion.h2>
        <motion.p
          className="text-txt-muted"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {players.length}/{maxPlayers} players joined
        </motion.p>
      </div>

      {/* Timer */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="inline-flex items-center space-x-2 bg-white/5 rounded-full px-4 py-2 border border-white/10">
          <div className="w-2 h-2 bg-sol-mint rounded-full animate-pulse" />
          <span className="text-lg font-mono font-bold text-sol-mint">
            {formatTime(timeRemaining)}
          </span>
        </div>
        <p className="text-xs text-txt-muted mt-2">
          Match will start when all players join or time runs out
        </p>
      </motion.div>

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Existing Players */}
        {players.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <PlayerCard
              player={player}
              isCurrentPlayer={player.username === "You"}
            />
          </motion.div>
        ))}

        {/* Empty Slots */}
        {getEmptySlots().map((_, index) => (
          <motion.div
            key={`empty-${index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.3,
              delay: (players.length + index) * 0.1,
            }}
            className="glass-card p-4 rounded-xl border-2 border-dashed border-white/20"
          >
            <div className="flex items-center space-x-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="w-6 h-6 rounded-full bg-white/10 animate-pulse" />
            </div>
            <div className="mt-3 space-y-2">
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-3/4" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Cancel Button */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <GlowButton
          variant="ghost"
          onClick={onCancel}
          className="text-txt-muted hover:text-txt-base"
        >
          Cancel Match
        </GlowButton>
      </motion.div>
    </div>
  );
};
