// Common game layout wrapper - used by all game types
import React, { useMemo, memo } from "react";
import { motion } from "framer-motion";
import { GamePlayer } from "@/types/game";
import { PlayerCard } from "./PlayerCard";
import { TeamBattleLayout } from "./TeamBattleLayout";
import { GameResult } from "@/types/game";

// Separate component for timer display to prevent re-renders
// Directly render the prop without internal state to avoid unnecessary updates
const TimeDisplay = memo(
  ({ timeRemaining }: { timeRemaining: number }) => {
    return <span>Time: {timeRemaining}s</span>;
  },
  (prev, next) => {
    // Only re-render if time actually changed (prevent re-render on every render cycle)
    return prev.timeRemaining === next.timeRemaining;
  }
);
TimeDisplay.displayName = "TimeDisplay";

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

  // Game type for display customization
  gameType?: import("@/types/game").GameType;

  // AI player timer info for Miner game
  aiPlayerTimerInfo?: Map<string, { delay: number; startTime: number }>;

  // Game mode for GoldBars (to determine totalGoldBars)
  gameMode?: string;
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
  gameType,
  aiPlayerTimerInfo,
  gameMode,
}) => {
  // Memoize players list to prevent re-renders when timeRemaining changes
  // BUT ensure it updates when player properties change
  const memoizedPlayers = useMemo(() => {
    // Return a new array reference when player properties change
    return players.map((p) => ({ ...p }));
  }, [
    // Only re-memoize if these change (not when timeRemaining changes)
    // Create a stable key from player properties
    players
      .map(
        (p) =>
          `${p.id}-${p.username}-${p.isScoreRevealed}-${p.willWin}-${
            p.isReady
          }-${p.currentScore}-${p.isAlive}-${p.pubkey || ""}`
      )
      .join("|"),
  ]);

  return (
    <div className="space-y-4 md:space-y-8 overflow-hidden w-full py-4 md:py-6">
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
          <TimeDisplay timeRemaining={timeRemaining} />
        </div>
      </div>

      {/* Players */}
      {matchType === "Duo" || matchType === "Team" ? (
        <TeamBattleLayout
          players={memoizedPlayers}
          currentPlayer={currentPlayer}
          gameStatus={gameStatus}
          gameResult={gameResult}
          shouldHideScores={shouldHideScores}
          hideTeamScores={hideTeamScores}
          gameType={gameType}
          aiPlayerTimerInfo={aiPlayerTimerInfo}
        />
      ) : (
        <div className="flex gap-2 md:gap-4 justify-center">
          {memoizedPlayers.map((player) => (
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
              gameType={gameType}
              gameStatus={gameStatus}
              aiTimerInfo={aiPlayerTimerInfo?.get(player.username)}
              gameMode={gameMode}
            />
          ))}
        </div>
      )}

      {/* Game Content (specific to each game type) */}
      {children}
    </div>
  );
};
