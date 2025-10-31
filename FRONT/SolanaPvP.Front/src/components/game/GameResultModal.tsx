// Game result modal component
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameResult } from "@/types/game";
import { GlowButton } from "@/components/ui/GlowButton";
import { GlassCard, GlassCardContent } from "@/components/ui/GlassCard";
import { ScoreCounter } from "./effects/ScoreCounter";
import { TrophyIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";

interface GameResultModalProps {
  isOpen: boolean;
  result: GameResult | null;
  onClose: () => void;
  onPlayAgain?: () => void;
  onViewLeaderboard?: () => void;
  onBackToLobby?: () => void;
  isDemoMode?: boolean;
}

export const GameResultModal: React.FC<GameResultModalProps> = ({
  isOpen,
  result,
  onClose,
  onPlayAgain,
  onViewLeaderboard,
  onBackToLobby,
  isDemoMode = false,
}) => {
  const [isWinner, setIsWinner] = useState(false);

  useEffect(() => {
    if (isOpen && result) {
      const isPlayerWinner = result.isTeamBattle
        ? result.winner === "Team A" // Player is always in Team A in demo mode
        : result.winner === "You";

      setIsWinner(isPlayerWinner);
      // Confetti is now handled in UniversalGameBoard
    }
  }, [isOpen, result, isWinner]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!result) return null;

  const sortedScores = Object.entries(result.scores).sort(
    ([, a], [, b]) => b - a
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
            style={{ zIndex: 1000, top: "-10%" }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: 1001 }}
          >
            <GlassCard className="w-full max-w-md mx-auto">
              <GlassCardContent className="p-6">
                {/* Header */}
                <div className="text-center mb-4">
                  <motion.div
                    className="text-6xl mb-4"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.2,
                      type: "spring",
                      stiffness: 200,
                    }}
                  >
                    {isWinner ? "🏆" : result.winner === "Tie" ? "🤝" : "😔"}
                  </motion.div>

                  <motion.h2
                    className={`text-3xl font-display font-bold mb-2 ${
                      isWinner ? "text-sol-mint" : "text-txt-base"
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {isWinner
                      ? "Victory!"
                      : result.winner === "Tie"
                      ? "Tie Game!"
                      : "Defeat"}
                  </motion.h2>

                  <motion.p
                    className="text-txt-muted"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    {result.isTeamBattle ? (
                      <>
                        {result.winner === "Team A" ? "Team A" : "Team B"} won!
                        <br />
                        {isWinner
                          ? "Congratulations! Your team won!"
                          : "Your team lost this time."}
                      </>
                    ) : isWinner ? (
                      "Congratulations! You won the match!"
                    ) : result.winner === "Tie" ? (
                      "It's a tie! No winner this time."
                    ) : (
                      "Better luck next time!"
                    )}
                  </motion.p>
                </div>

                {/* Win Amount - only show if player won */}
                {isWinner && (
                  <motion.div
                    className="text-center mb-4 p-3 bg-gradient-to-r from-sol-purple/10 to-sol-mint/10 rounded-xl border border-sol-purple/20"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <CurrencyDollarIcon className="w-5 h-5 text-sol-mint" />
                      <span className="text-txt-muted">You won</span>
                      <span className="text-xl text-sol-mint">
                        {Number(result.winAmount).toLocaleString(undefined, {
                          minimumFractionDigits: result.winAmount < 1 ? 1 : 0,
                          maximumFractionDigits: 3,
                        })}
                      </span>
                      <span className="text-xl text-txt-muted">SOL</span>
                    </div>
                  </motion.div>
                )}

                {/* Scoreboard */}
                <motion.div
                  className="mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <h3 className="text-lg font-semibold text-txt-base mb-3 flex items-center">
                    <TrophyIcon className="w-5 h-5 mr-2 text-sol-purple" />
                    {result.isTeamBattle ? "Team Results" : "Final Scores"}
                  </h3>

                  {result.isTeamBattle ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-sol-purple/10 border border-sol-purple/20">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">🏆</span>
                          <span className="font-medium text-txt-base">
                            Team A
                          </span>
                        </div>
                        <ScoreCounter
                          value={result.teamScores?.["Team A"] || 0}
                          className="text-xl font-bold"
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-sol-mint/10 border border-sol-mint/20">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">🥈</span>
                          <span className="font-medium text-txt-base">
                            Team B
                          </span>
                        </div>
                        <ScoreCounter
                          value={result.teamScores?.["Team B"] || 0}
                          className="text-xl font-bold"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sortedScores.map(([username, score], index) => (
                        <div
                          key={username}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            username === "You"
                              ? "bg-sol-purple/10 border border-sol-purple/20"
                              : "bg-white/5"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">
                              {index === 0
                                ? "🥇"
                                : index === 1
                                ? "🥈"
                                : index === 2
                                ? "🥉"
                                : "🏅"}
                            </span>
                            <span className="font-medium text-txt-base">
                              {username}
                            </span>
                          </div>
                          <ScoreCounter value={score} className="text-lg" />
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* Actions */}
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  {isDemoMode ? (
                    <>
                      <GlowButton
                        variant="neon"
                        onClick={onPlayAgain}
                        className="w-full"
                      >
                        Play Again
                      </GlowButton>
                      <GlowButton
                        variant="glass"
                        onClick={onClose}
                        className="w-full"
                      >
                        Close
                      </GlowButton>
                    </>
                  ) : (
                    <>
                      <GlowButton
                        variant="neon"
                        onClick={onPlayAgain}
                        className="w-full"
                      >
                        Rematch
                      </GlowButton>
                      <div className="grid grid-cols-2 gap-3">
                        <GlowButton
                          variant="glass"
                          onClick={onViewLeaderboard}
                          className="w-full"
                        >
                          Leaderboard
                        </GlowButton>
                        <GlowButton
                          variant="ghost"
                          onClick={onBackToLobby}
                          className="w-full"
                        >
                          Back to Lobby
                        </GlowButton>
                      </div>
                    </>
                  )}
                </motion.div>
              </GlassCardContent>
            </GlassCard>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
