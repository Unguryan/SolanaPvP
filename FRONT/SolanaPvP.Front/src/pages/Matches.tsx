// Matches page component
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useArenaStore } from "@/store/arenaStore";
import { useArenaRealtime } from "@/hooks/useArenaRealtime";
import { MatchesList } from "@/components/arena/MatchesList";
import { JoinMatchSheet } from "@/components/arena/JoinMatchSheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { ROUTES } from "@/constants/routes";
import { FunnelIcon, ClockIcon, PlusIcon } from "@heroicons/react/24/outline";
import { MatchLobby } from "@/store/arenaStore";

type GameModeFilter = "all" | "Pick3from9" | "Pick5from16" | "Pick1from3";
type StakeFilter = "all" | "low" | "medium" | "high";
type MatchTypeFilter = "all" | "Solo" | "Duo" | "Team";

export const Matches: React.FC = () => {
  const navigate = useNavigate();
  const { connected } = useWallet();
  const { matches, joinModalMatchId, setJoinModal, isLoading } =
    useArenaStore();
  const [gameModeFilter, setGameModeFilter] = useState<GameModeFilter>("all");
  const [stakeFilter, setStakeFilter] = useState<StakeFilter>("all");
  const [matchTypeFilter, setMatchTypeFilter] =
    useState<MatchTypeFilter>("all");
  const [sortBy, setSortBy] = useState<"stake" | "timeLeft" | "players">(
    "timeLeft"
  );

  // Initialize real-time arena data
  useArenaRealtime();

  // Add mock match for preview if no matches exist
  const matchesWithMock = React.useMemo(() => {
    if (matches.length === 0 && !isLoading) {
      const mockMatch: MatchLobby = {
        id: "mock-1",
        stake: 2.5,
        playersReady: 3,
        playersMax: 6,
        endsAt: Date.now() + 300000, // 5 minutes from now
        gameMode: "Pick3from9",
        matchType: "Duo",
      };
      return [mockMatch];
    }
    return matches;
  }, [matches, isLoading]);

  // Filter only active matches (not full, not ended)
  const activeMatches = matchesWithMock.filter((match) => {
    const now = Date.now();
    const timeLeft = match.endsAt - now;
    const isFull = match.playersReady >= match.playersMax;
    const isEnded = timeLeft <= 0;
    return !isFull && !isEnded;
  });

  const filteredMatches = activeMatches.filter((match) => {
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

    // Match type filter
    if (matchTypeFilter !== "all") {
      if (match.matchType !== matchTypeFilter) return false;
    }

    return true;
  });

  // Note: sortedMatches is computed but MatchesList component uses matches from store directly
  // Sorting and filtering could be moved to MatchesList component if needed
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

  // Use sortedMatches for display if MatchesList supports filtered matches
  // Currently MatchesList uses matches from store, so this is kept for future use
  void sortedMatches;

  const handleCloseJoinModal = () => {
    setJoinModal(null);
  };

  const getStakeRangeLabel = (stake: "all" | "low" | "medium" | "high") => {
    switch (stake) {
      case "all":
        return "All";
      case "low":
        return "0-2 SOL";
      case "medium":
        return "2-5 SOL";
      case "high":
        return "5+ SOL";
      default:
        return "All";
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
            className="text-lg text-txt-muted mb-6"
          >
            Join matches and compete for SOL rewards
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlowButton
              variant={connected ? "neon" : "ghost"}
              disabled={!connected}
              onClick={() => navigate(ROUTES.CREATE_LOBBY)}
              className={`inline-flex items-center gap-2 ${
                !connected ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <PlusIcon className="w-5 h-5" />
              Create New Match
            </GlowButton>
          </motion.div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
          <GlassCard className="p-3 md:p-4 text-center">
            <ClockIcon className="w-5 h-5 md:w-6 md:h-6 text-sol-mint mx-auto mb-2" />
            <div className="text-lg md:text-xl font-bold text-txt-base">
              {activeMatches.length}
            </div>
            <div className="text-xs md:text-sm text-txt-muted">
              Active Matches
            </div>
          </GlassCard>
          <GlassCard className="p-3 md:p-4 text-center">
            <FunnelIcon className="w-5 h-5 md:w-6 md:h-6 text-sol-purple mx-auto mb-2" />
            <div className="text-lg md:text-xl font-bold text-txt-base">
              {filteredMatches.length}
            </div>
            <div className="text-xs md:text-sm text-txt-muted">
              Filtered Results
            </div>
          </GlassCard>
        </div>

        {/* Filters */}
        <div className="space-y-4 mb-8">
          {/* Game Mode Filter */}
          <GlassCard className="p-4">
            <div className="space-y-3">
              <span className="text-txt-muted text-sm font-medium block">
                Game
              </span>
              <div className="flex flex-wrap items-center gap-2 md:gap-4">
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
                        {mode === "Pick3from9"
                          ? "3v9"
                          : mode === "Pick5from16"
                          ? "5v16"
                          : "1v3"}
                      </span>
                    )}
                  </GlowButton>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Stake Filter */}
          <GlassCard className="p-4">
            <div className="space-y-3">
              <span className="text-txt-muted text-sm font-medium block">
                Stake Range
              </span>
              <div className="flex flex-wrap items-center gap-2 md:gap-4">
                {(["all", "low", "medium", "high"] as const).map((stake) => (
                  <GlowButton
                    key={stake}
                    variant={stakeFilter === stake ? "neon" : "ghost"}
                    size="sm"
                    onClick={() => setStakeFilter(stake)}
                    className="text-xs"
                  >
                    {getStakeRangeLabel(stake)}
                  </GlowButton>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Mode & Sort */}
          <GlassCard className="p-4">
            <div className="space-y-3">
              <span className="text-txt-muted text-sm font-medium block">
                Mode
              </span>
              <div className="flex flex-wrap items-center gap-2 md:gap-4">
                {(["all", "Solo", "Duo", "Team"] as const).map((mode) => (
                  <GlowButton
                    key={mode}
                    variant={matchTypeFilter === mode ? "neon" : "ghost"}
                    size="sm"
                    onClick={() => setMatchTypeFilter(mode)}
                    className="text-xs"
                  >
                    {mode}
                  </GlowButton>
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="space-y-3">
              <span className="text-txt-muted text-sm font-medium block">
                Sort by
              </span>
              <div className="flex flex-wrap items-center gap-2 md:gap-4">
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
            </div>
          </GlassCard>
        </div>

        {/* Matches List */}
        <MatchesList
          className="max-h-none"
          maxItems={50}
          matches={sortedMatches}
        />

        {/* Join Match Modal */}
        <JoinMatchSheet
          isOpen={!!joinModalMatchId}
          onClose={handleCloseJoinModal}
        />
      </div>
    </div>
  );
};
