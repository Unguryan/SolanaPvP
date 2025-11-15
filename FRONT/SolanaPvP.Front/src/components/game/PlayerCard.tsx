// Player card component for game display
import React, { useState, useEffect, memo, useRef } from "react";
import { GamePlayer, GameType } from "@/types/game";
import { ScoreCounter } from "./effects/ScoreCounter";
import { motion } from "framer-motion";

interface PlayerCardProps {
  player: GamePlayer;
  isCurrentPlayer?: boolean;
  isWinner?: boolean;
  className?: string;
  hideScore?: boolean;
  gameType?: GameType; // NEW: for Miner game display
  gameStatus?: "waiting" | "loading" | "playing" | "revealing" | "finished"; // NEW: to show "???" during game
  aiTimerInfo?: { delay: number; startTime: number }; // Timer info for AI player reveal
}

const PlayerCardComponent: React.FC<PlayerCardProps> = ({
  player,
  isCurrentPlayer = false,
  isWinner = false,
  className = "",
  hideScore = false,
  gameType,
  gameStatus = "waiting", // Used in arePropsEqual for memoization
  aiTimerInfo,
}) => {
  // gameStatus is used in arePropsEqual for memoization, so we keep it even though it's not used here
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _gameStatus = gameStatus;
  const isMinerGame = gameType === GameType.Miner;

  // Calculate remaining time for AI player reveal
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  // Typing effect for "Alive"/"Bombed" text
  const [displayedText, setDisplayedText] = useState("");
  const [showPulse, setShowPulse] = useState(false);
  const wasRevealedRef = useRef(false);

  // Typing effect for Miner game status - same style as "Connecting to Solana"
  useEffect(() => {
    if (isMinerGame && player.isScoreRevealed && player.willWin !== undefined) {
      const targetText = player.willWin === true ? "Alive" : "Bombed";

      if (!wasRevealedRef.current) {
        wasRevealedRef.current = true;
        setDisplayedText("");
        setShowPulse(true);

        // Type out the text character by character (same speed as MatchLoader)
        let currentIndex = 0;
        const typingInterval = setInterval(() => {
          if (currentIndex < targetText.length) {
            currentIndex++;
            setDisplayedText(targetText.slice(0, currentIndex));
          } else {
            clearInterval(typingInterval);
            // Keep pulse for a bit longer, then fade out
            setTimeout(() => setShowPulse(false), 1000);
          }
        }, 120); // 120ms per character (slower than MatchLoader for better visibility)

        return () => clearInterval(typingInterval);
      } else {
        // If already revealed, ensure text is complete
        if (displayedText !== targetText) {
          setDisplayedText(targetText);
        }
      }
    } else if (!player.isScoreRevealed) {
      // Reset when hidden again
      wasRevealedRef.current = false;
      setDisplayedText("");
      setShowPulse(false);
    }
    // Remove displayedText from dependencies to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMinerGame, player.isScoreRevealed, player.willWin]);

  useEffect(() => {
    // Don't initialize timer if score is already revealed, is current player, or no timer info
    if (
      !aiTimerInfo ||
      !hideScore ||
      isCurrentPlayer ||
      player.isScoreRevealed
    ) {
      setRemainingTime(null);
      return;
    }

    const updateRemaining = () => {
      // Check again if score was revealed (defensive check)
      if (player.isScoreRevealed) {
        setRemainingTime(null);
        return;
      }
      const elapsed = Date.now() - aiTimerInfo.startTime;
      const remaining = Math.max(
        0,
        Math.ceil((aiTimerInfo.delay - elapsed) / 1000)
      );
      setRemainingTime(remaining > 0 ? remaining : null);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [aiTimerInfo, hideScore, isCurrentPlayer, player.isScoreRevealed]);

  const getStatusColor = () => {
    if (isWinner) return "border-sol-mint shadow-glow-mint";
    if (isCurrentPlayer) return "border-sol-purple shadow-glow-purple";
    return "border-white/20";
  };

  const getStatusIcon = () => {
    if (isWinner) return "👑";
    if (isCurrentPlayer) return "🎯";
    if (player.isReady && !hideScore) return "✅"; // Show checkmark only when ready AND score is visible
    if (player.isReady && hideScore) return "⏳"; // Show waiting when ready but score hidden
    return "⏳";
  };

  // Pulse animation for background when status is revealed
  const shouldPulse =
    isMinerGame && player.isScoreRevealed && player.willWin !== undefined;

  return (
    <motion.div
      className={`glass-card p-4 rounded-xl border-2 ${getStatusColor()} ${className}`}
      animate={
        shouldPulse
          ? {
              boxShadow:
                player.willWin === true
                  ? [
                      "0 0 0px rgba(20, 241, 149, 0)",
                      "0 0 20px rgba(20, 241, 149, 0.5)",
                      "0 0 0px rgba(20, 241, 149, 0)",
                    ]
                  : [
                      "0 0 0px rgba(239, 68, 68, 0)",
                      "0 0 20px rgba(239, 68, 68, 0.5)",
                      "0 0 0px rgba(239, 68, 68, 0)",
                    ],
            }
          : {}
      }
      transition={{
        duration: 0.6,
        repeat: shouldPulse ? 1 : 0, // Only pulse once, not 3 times
        ease: "easeInOut",
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
            {isMinerGame
              ? // For Miner: don't show "Revealing in Xs" - just show "Ready" or "Waiting"
                player.isReady
                ? "Ready"
                : "Waiting..."
              : // For other games: show timer countdown
              player.isReady
              ? remainingTime !== null && remainingTime > 0
                ? `Revealing in ${remainingTime}s`
                : "Ready"
              : "Waiting..."}
          </div>
        </div>
      </div>

      {/* Score Display */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          {isMinerGame ? (
            // For Miner: show "Alive"/"Bombed" when revealed (isScoreRevealed === true), otherwise "???"
            // Use willWin from backend (true = Alive, false = Bombed)
            // Priority: isScoreRevealed > hideScore (like PickHigher)
            (() => {
              // Debug logging for Miner game
              if (player.isScoreRevealed) {
                console.log(
                  `[PlayerCard] Miner - Player ${
                    player.username
                  }: isScoreRevealed=${player.isScoreRevealed}, willWin=${
                    player.willWin
                  }, willShow=${
                    player.isScoreRevealed && player.willWin !== undefined
                  }`
                );
              }

              if (player.isScoreRevealed && player.willWin !== undefined) {
                const targetText = player.willWin === true ? "Alive" : "Bombed";
                const isAlive = player.willWin === true;

                return (
                  <motion.span
                    className={`text-2xl font-bold w-full text-center ${
                      isAlive ? "text-sol-mint" : "text-red-500"
                    }`}
                    animate={
                      showPulse
                        ? {
                            scale: [1, 1.1, 1],
                          }
                        : {}
                    }
                    transition={{
                      duration: 0.5,
                      repeat: showPulse ? 1 : 0, // Only pulse once, not 3 times
                      ease: "easeInOut",
                    }}
                  >
                    {displayedText || targetText}
                    {displayedText.length < targetText.length && (
                      <span className="inline-block w-0.5 h-5 bg-current ml-1 align-middle animate-pulse" />
                    )}
                  </motion.span>
                );
              }
              return (
                <span className="text-2xl font-bold text-txt-muted w-full text-center">
                  ???
                </span>
              );
            })()
          ) : hideScore && !isCurrentPlayer ? (
            <>
              <span className="text-sm text-txt-muted">Score</span>
              <span className="text-2xl font-bold text-txt-muted">???</span>
            </>
          ) : (
            <>
              <span className="text-sm text-txt-muted">Score</span>
              <ScoreCounter value={player.currentScore} />
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Memoize PlayerCard to prevent re-renders when only timeRemaining changes
// Returns true if props are equal (skip re-render), false if different (re-render needed)
export const PlayerCard = memo(PlayerCardComponent, (prevProps, nextProps) => {
  // Check all relevant props - if any differ, return false (need re-render)
  // Compare aiTimerInfo objects properly (check if both null/undefined or both have same values)
  const aiTimerEqual =
    (!prevProps.aiTimerInfo && !nextProps.aiTimerInfo) ||
    (prevProps.aiTimerInfo &&
      nextProps.aiTimerInfo &&
      prevProps.aiTimerInfo.delay === nextProps.aiTimerInfo.delay &&
      prevProps.aiTimerInfo.startTime === nextProps.aiTimerInfo.startTime);

  if (
    prevProps.player.id !== nextProps.player.id ||
    prevProps.player.username !== nextProps.player.username ||
    prevProps.player.isScoreRevealed !== nextProps.player.isScoreRevealed ||
    prevProps.player.willWin !== nextProps.player.willWin ||
    prevProps.player.isReady !== nextProps.player.isReady ||
    prevProps.isCurrentPlayer !== nextProps.isCurrentPlayer ||
    prevProps.isWinner !== nextProps.isWinner ||
    prevProps.hideScore !== nextProps.hideScore ||
    prevProps.gameType !== nextProps.gameType ||
    prevProps.gameStatus !== nextProps.gameStatus ||
    prevProps.player.currentScore !== nextProps.player.currentScore ||
    !aiTimerEqual
  ) {
    return false; // Props changed, need re-render
  }
  return true; // Props are equal, skip re-render
});
