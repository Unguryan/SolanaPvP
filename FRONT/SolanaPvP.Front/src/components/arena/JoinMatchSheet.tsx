import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useArenaStore } from "@/store/arenaStore";
import { useArenaRealtime } from "@/hooks/useArenaRealtime";
import { GlowButton } from "@/components/ui/GlowButton";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface JoinMatchSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinMatchSheet: React.FC<JoinMatchSheetProps> = ({
  isOpen,
  onClose,
}) => {
  const { joinModalMatchId, matches } = useArenaStore();
  const { joinMatch } = useArenaRealtime();
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const match = matches.find((m) => m.id === joinModalMatchId);

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const handleJoin = async () => {
    if (!match) return;

    setIsJoining(true);
    setJoinError(null);

    try {
      await joinMatch(match.id);
      // Success - close modal and show success message
      onClose();
      // TODO: Show success toast/notification
      console.log("Successfully joined match:", match.id);
    } catch (error) {
      console.error("Failed to join match:", error);
      setJoinError(
        error instanceof Error ? error.message : "Failed to join match"
      );
    } finally {
      setIsJoining(false);
    }
  };

  const getGameModeIcon = (gameMode: string) => {
    switch (gameMode) {
      case "Pick3from9":
        return "🎴";
      case "Pick5from16":
        return "🏆";
      case "Pick1from3":
        return "🎯";
      default:
        return "🎮";
    }
  };

  const getGameModeDescription = (gameMode: string) => {
    switch (gameMode) {
      case "Pick3from9":
        return "Choose 3 cards from 9 available options. Each card has a hidden value. The player with the highest total wins!";
      case "Pick5from16":
        return "Select 5 chests from a 4x4 grid. Each chest contains treasures. Find the best combination to win!";
      case "Pick1from3":
        return "Quick decision time! Choose 1 card from 3 options. Fast-paced action with high stakes!";
      default:
        return "An exciting game mode with real SOL rewards.";
    }
  };

  if (!match) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Sheet/Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full"
          >
            <GlassCard className="m-4 md:m-0">
              <GlassCardHeader>
                <div className="flex items-center justify-between">
                  <GlassCardTitle className="text-xl font-display text-sol-purple">
                    Join Match
                  </GlassCardTitle>
                  <button
                    onClick={onClose}
                    className="text-txt-muted hover:text-txt-base transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </GlassCardHeader>

              <GlassCardContent className="space-y-6">
                {/* Match Info */}
                <div className="text-center">
                  <div className="text-4xl mb-2">
                    {getGameModeIcon(match.gameMode)}
                  </div>
                  <h3 className="text-lg font-semibold text-txt-base mb-1">
                    {match.gameMode}
                  </h3>
                  <p className="text-sm text-txt-muted">
                    {getGameModeDescription(match.gameMode)}
                  </p>
                </div>

                {/* Match Details */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-txt-muted">Stake</span>
                    <span className="text-sol-mint font-semibold">
                      {match.stake} SOL
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-txt-muted">Players</span>
                    <span className="text-txt-base">
                      {match.playersReady}/{match.playersMax}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-txt-muted">Time Left</span>
                    <span className="text-txt-base">
                      {Math.max(
                        0,
                        Math.floor((match.endsAt - Date.now()) / 1000)
                      )}
                      s
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs text-txt-muted mb-1">
                    <span>Match Progress</span>
                    <span>
                      {Math.round(
                        (match.playersReady / match.playersMax) * 100
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full h-2 bg-txt-muted/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sol-purple to-sol-mint transition-all duration-300"
                      style={{
                        width: `${
                          (match.playersReady / match.playersMax) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Error Message */}
                {joinError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm">{joinError}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-3">
                  <GlowButton
                    variant="ghost"
                    onClick={onClose}
                    className="flex-1"
                    disabled={isJoining}
                  >
                    Cancel
                  </GlowButton>
                  <GlowButton
                    variant="neon"
                    onClick={handleJoin}
                    className="flex-1"
                    disabled={
                      match.playersReady >= match.playersMax || isJoining
                    }
                    isLoading={isJoining}
                  >
                    {isJoining
                      ? "Joining..."
                      : match.playersReady >= match.playersMax
                      ? "Match Full"
                      : "Join Match"}
                  </GlowButton>
                </div>
              </GlassCardContent>
            </GlassCard>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
