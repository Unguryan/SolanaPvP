// Gold Bars game result modal component
import React, { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoldBarsGameResult } from "@/types/goldBars";
import { GlowButton } from "@/components/ui/GlowButton";
import { GlassCard, GlassCardContent } from "@/components/ui/GlassCard";
import { TrophyIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";

interface GoldBarsResultModalProps {
  isOpen: boolean;
  result: GoldBarsGameResult | null;
  onClose: () => void;
  onPlayAgain?: () => void;
  onViewLeaderboard?: () => void;
  onBackToLobby?: () => void;
  isDemoMode?: boolean;
}

export const GoldBarsResultModal: React.FC<GoldBarsResultModalProps> = ({
  isOpen,
  result,
  onClose,
  onPlayAgain,
  onViewLeaderboard,
  onBackToLobby,
  isDemoMode = false,
}) => {
  // Memoize isWinner calculation based on winner
  const isWinner = useMemo(() => {
    if (!result) return false;
    
    // Check if current player won
    return result.isCurrentPlayerWinner === true;
  }, [result]);

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

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log(`[GoldBarsResultModal] Modal opened, result=`, result);
      if (result) {
        console.log(`[GoldBarsResultModal] scores=`, result.scores);
        console.log(`[GoldBarsResultModal] isWinner=`, isWinner);
      }
    }
  }, [isOpen, result, isWinner]);

  // Check if result exists and scores is not empty
  if (!result || !result.scores || Object.keys(result.scores).length === 0) {
    console.log(`[GoldBarsResultModal] Returning null - result=`, result);
    return null;
  }

  // Sort players by score (highest first)
  const sortedPlayers = Object.entries(result.scores).sort(
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
            style={{ zIndex: 9999, top: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
            style={{ zIndex: 10000 }}
          >
            <GlassCard className="w-full max-w-md mx-auto pointer-events-auto">
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
                    {isWinner ? "🏆" : "🥇"}
                  </motion.div>

                  <motion.h2
                    className={`text-3xl font-display font-bold mb-2 ${
                      isWinner ? "text-sol-mint" : "text-yellow-500"
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {isWinner ? "Victory!" : "Game Over"}
                  </motion.h2>

                  <motion.p
                    className="text-txt-muted"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    {isWinner
                      ? "Congratulations! You collected the most gold bars!"
                      : "Better luck next time!"}
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
                      <CurrencyDollarIcon className="w-6 h-6 text-sol-mint" />
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

                {/* Results */}
                <motion.div
                  className="mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <h3 className="text-lg font-semibold text-txt-base mb-3 flex items-center">
                    <TrophyIcon className="w-5 h-5 mr-2 text-sol-purple" />
                    {result.isTeamBattle ? "Team Results" : "Results"}
                  </h3>

                  {/* For team battles: show only Team A and Team B */}
                  {result.isTeamBattle && result.teamScores ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-sol-purple/10 border border-sol-purple/20">
                        <span className="font-medium text-txt-base">Team A</span>
                        <span className="text-lg font-bold text-yellow-500 flex items-center gap-1">
                          <span>🥇</span>
                          {result.teamScores["Team A"] || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-sol-mint/10 border border-sol-mint/20">
                        <span className="font-medium text-txt-base">Team B</span>
                        <span className="text-lg font-bold text-yellow-500 flex items-center gap-1">
                          <span>🥇</span>
                          {result.teamScores["Team B"] || 0}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* For 1v1: show players with gold bar counts */
                    <div className="space-y-2">
                      {sortedPlayers.map(([username, score], index) => {
                        return (
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
                            <span className="text-lg font-bold text-yellow-500 flex items-center gap-1">
                              <span>🥇</span>
                              {score}
                            </span>
                          </div>
                        );
                      })}
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
                        Back to Arena
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
                          Stats
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

