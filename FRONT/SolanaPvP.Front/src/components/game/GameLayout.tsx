// Common game layout wrapper - used by all game types
import React from "react";
import { motion } from "framer-motion";
import { GamePlayer } from "@/types/game";
import { PlayerCard } from "./PlayerCard";
import { TeamBattleLayout } from "./TeamBattleLayout";
import { GameResult } from "@/types/game";

interface GameLayoutProps {
  // Game info
  gameName: string;
  stakeSol: number;
  matchType: "Solo" | "Duo" | "Team";
  timeRemaining: number;
  
  // Players
  players: GamePlayer[];
  currentPlayer: string;
  currentPlayerPubkey?: string;
  gameStatus: "waiting" | "loading" | "playing" | "revealing" | "finished";
  gameResult?: GameResult | null;
  
  // Callbacks for score hiding
  shouldHideScores: (playerUsername: string) => boolean;
  hideTeamScores?: boolean;
  
  // Game content (the specific game grid/board)
  children: React.ReactNode;
}

export const GameLayout: React.FC<GameLayoutProps> = ({
  gameName,
  stakeSol,
  matchType,
  timeRemaining,
  players,
  currentPlayer,
  currentPlayerPubkey,
  gameStatus,
  gameResult,
  shouldHideScores,
  hideTeamScores = false,
  children,
}) => {
  return (
    <div className="space-y-4 md:space-y-8">
      {/* Game Header */}
      <div className="text-center">
        <motion.h2
          className="text-lg md:text-2xl font-display font-bold text-sol-purple mb-1 md:mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {gameName}
        </motion.h2>
        <div className="flex items-center justify-center space-x-2 md:space-x-4 text-xs md:text-sm text-txt-muted">
          <span>Stake: {stakeSol} SOL</span>
          <span>•</span>
          <span>Mode: {matchType}</span>
          <span>•</span>
          <span>Time: {timeRemaining}s</span>
        </div>
      </div>

      {/* Players */}
      {matchType === "Duo" || matchType === "Team" ? (
        <TeamBattleLayout
          players={players}
          currentPlayer={currentPlayer}
          gameStatus={gameStatus}
          gameResult={gameResult}
          shouldHideScores={shouldHideScores}
          hideTeamScores={hideTeamScores}
        />
      ) : (
        <div className="flex gap-2 md:gap-4 justify-center">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isCurrentPlayer={
                (currentPlayerPubkey
                  ? player.pubkey === currentPlayerPubkey
                  : player.username === currentPlayer) &&
                gameStatus === "playing"
              }
              isWinner={gameResult?.winner === player.username}
              hideScore={shouldHideScores(player.username)}
              className="w-36 md:w-44 flex-shrink-0"
            />
          ))}
        </div>
      )}

      {/* Game Content (specific to each game type) */}
      {children}
    </div>
  );
};

