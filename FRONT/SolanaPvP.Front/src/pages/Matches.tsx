// Matches page component
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useArenaStore } from "@/store/arenaStore";
import { useArenaRealtime } from "@/hooks/useArenaRealtime";
import { MatchesList } from "@/components/arena/MatchesList";
import { JoinMatchSheet } from "@/components/arena/JoinMatchSheet";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import {
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

type GameModeFilter = "all" | "Pick3from9" | "Pick5from16" | "Pick1from3";
type StakeFilter = "all" | "low" | "medium" | "high";
type StatusFilter = "all" | "open" | "full" | "ending";

export const Matches: React.FC = () => {
  const { matches, joinModalMatchId, setJoinModal, isLoading, setLoading } =
    useArenaStore();
  const [gameModeFilter, setGameModeFilter] = useState<GameModeFilter>("all");
  const [stakeFilter, setStakeFilter] = useState<StakeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<"stake" | "timeLeft" | "players">(
    "timeLeft"
  );

  // Initialize real-time arena data
  useArenaRealtime();

  const filteredMatches = matches.filter((match) => {
    // Game mode filter
    if (gameModeFilter !== "all" && match.gameMode !== gameModeFilter) {
      return false;
    }

    // Stake filter
    if (stakeFilter !== "all") {
      switch (stakeFilter) {
        case "low":
          if (match.stake >= 2) return false;
          break;
        case "medium":
          if (match.stake < 2 || match.stake >= 5) return false;
          break;
        case "high":
          if (match.stake < 5) return false;
          break;
      }
    }

    // Status filter
    if (statusFilter !== "all") {
      const now = Date.now();
      const timeLeft = match.endsAt - now;
      const isFull = match.playersReady >= match.playersMax;
      const isEnding = timeLeft < 60000; // Less than 1 minute

      switch (statusFilter) {
        case "open":
          if (isFull || isEnding) return false;
          break;
        case "full":
          if (!isFull) return false;
          break;
        case "ending":
          if (!isEnding) return false;
          break;
      }
    }

    return true;
  });

  const sortedMatches = [...filteredMatches].sort((a, b) => {
    switch (sortBy) {
      case "stake":
        return b.stake - a.stake;
      case "players":
        return b.playersReady - a.playersReady;
      case "timeLeft":
      default:
        return a.endsAt - b.endsAt;
    }
  });

  const handleCloseJoinModal = () => {
    setJoinModal(null);
  };

  const getStakeRange = (stake: number) => {
    if (stake < 2) return "Low (0-2 SOL)";
    if (stake < 5) return "Medium (2-5 SOL)";
    return "High (5+ SOL)";
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Skeleton className="h-12 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-txt-base mb-4"
          >
            Arena
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-txt-muted"
          >
            Join matches and compete for SOL rewards
          </motion.p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <GlassCard className="p-4 text-center">
            <ClockIcon className="w-6 h-6 text-sol-mint mx-auto mb-2" />
            <div className="text-xl font-bold text-txt-base">
              {matches.length}
            </div>
            <div className="text-sm text-txt-muted">Total Matches</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <UserGroupIcon className="w-6 h-6 text-sol-purple mx-auto mb-2" />
            <div className="text-xl font-bold text-txt-base">
              {matches.reduce((sum, m) => sum + m.playersReady, 0)}
            </div>
            <div className="text-sm text-txt-muted">Players Ready</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <CurrencyDollarIcon className="w-6 h-6 text-sol-mint mx-auto mb-2" />
            <div className="text-xl font-bold text-txt-base">
              {matches.reduce((sum, m) => sum + m.stake, 0).toFixed(1)}
            </div>
            <div className="text-sm text-txt-muted">Total Stakes (SOL)</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <FunnelIcon className="w-6 h-6 text-sol-purple mx-auto mb-2" />
            <div className="text-xl font-bold text-txt-base">
              {filteredMatches.length}
            </div>
            <div className="text-sm text-txt-muted">Filtered Results</div>
          </GlassCard>
        </div>

        {/* Filters */}
        <div className="space-y-6 mb-8">
          {/* Game Mode Filter */}
          <GlassCard className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-txt-muted text-sm font-medium">
                Game Mode:
              </span>
              {(
                ["all", "Pick3from9", "Pick5from16", "Pick1from3"] as const
              ).map((mode) => (
                <GlowButton
                  key={mode}
                  variant={gameModeFilter === mode ? "neon" : "ghost"}
                  size="sm"
                  onClick={() => setGameModeFilter(mode)}
                  className="text-xs"
                >
                  {mode === "all" ? (
                    "All"
                  ) : (
                    <span className="flex items-center">
                      <span className="mr-1">{getGameModeIcon(mode)}</span>
                      {mode}
                    </span>
                  )}
                </GlowButton>
              ))}
            </div>
          </GlassCard>

          {/* Stake Filter */}
          <GlassCard className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-txt-muted text-sm font-medium">
                Stake Range:
              </span>
              {(["all", "low", "medium", "high"] as const).map((stake) => (
                <GlowButton
                  key={stake}
                  variant={stakeFilter === stake ? "neon" : "ghost"}
                  size="sm"
                  onClick={() => setStakeFilter(stake)}
                  className="text-xs"
                >
                  {stake === "all"
                    ? "All"
                    : getStakeRange(
                        stake === "low" ? 1 : stake === "medium" ? 3 : 6
                      )}
                </GlowButton>
              ))}
            </div>
          </GlassCard>

          {/* Status & Sort */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassCard className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-txt-muted text-sm font-medium">
                  Status:
                </span>
                {(["all", "open", "full", "ending"] as const).map((status) => (
                  <GlowButton
                    key={status}
                    variant={statusFilter === status ? "neon" : "ghost"}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className="text-xs capitalize"
                  >
                    {status}
                  </GlowButton>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-txt-muted text-sm font-medium">
                  Sort by:
                </span>
                {(["timeLeft", "stake", "players"] as const).map((sort) => (
                  <GlowButton
                    key={sort}
                    variant={sortBy === sort ? "neon" : "ghost"}
                    size="sm"
                    onClick={() => setSortBy(sort)}
                    className="text-xs capitalize"
                  >
                    {sort === "timeLeft"
                      ? "Time Left"
                      : sort === "stake"
                      ? "Stake"
                      : "Players"}
                  </GlowButton>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Matches List */}
        <MatchesList className="max-h-none" maxItems={50} />

        {/* Join Match Modal */}
        <JoinMatchSheet
          isOpen={!!joinModalMatchId}
          onClose={handleCloseJoinModal}
        />
      </div>
    </div>
  );
};
