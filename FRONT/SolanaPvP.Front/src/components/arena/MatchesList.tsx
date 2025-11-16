import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useArenaStore, MatchLobby } from "@/store/arenaStore";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard";
import { formatGameDisplay } from "@/utils/gameModeMapper";

interface MatchesListProps {
  className?: string;
  maxItems?: number;
  matches?: MatchLobby[];
}

export const MatchesList: React.FC<MatchesListProps> = ({
  className = "",
  maxItems = 8,
  matches: propMatches,
}) => {
  const navigate = useNavigate();
  const { matches: storeMatches, isLoading } = useArenaStore();
  const allMatches = propMatches || storeMatches;

  // Filter to show only active matches (Open, Pending, InProgress)
  // and resolved matches that are less than 5 seconds old
  const matches = allMatches.filter((match) => {
    const now = Date.now();

    // Show Open, Pending, and InProgress matches
    if (
      match.status === "Open" ||
      match.status === "Pending" ||
      match.status === "InProgress"
    ) {
      return true;
    }

    // Show resolved matches for 5 seconds
    if (match.status === "Resolved" && match.resolvedAt) {
      const timeSinceResolved = (now - match.resolvedAt) / 1000;
      return timeSinceResolved < 5;
    }

    // Hide refunded and old resolved matches
    return false;
  });

  const [timeLeft, setTimeLeft] = useState<Record<string, number>>({});

  // Update countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newTimeLeft: Record<string, number> = {};

      matches.forEach((match) => {
        // For matches already in game, show time remaining out of 20s from gameStartTime
        if (match.status === "InProgress" && match.gameStartTime) {
          const endAt = match.gameStartTime + 20000; // 20s round
          const remaining = Math.max(0, endAt - now);
          newTimeLeft[match.id] = remaining;
          return;
        }

        // Otherwise show time until deadline (Open/Pending)
        const remaining = Math.max(0, match.endsAt - now);
        newTimeLeft[match.id] = remaining;
      });

      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [matches]);

  const formatTimeLeft = (milliseconds: number) => {
    if (milliseconds <= 0) return "Ended";

    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getGameModeIcon = (gameMode: string) => {
    switch (gameMode) {
      case "PickHigher3v9":
        return "🎴";
      case "PickHigher5v16":
        return "🏆";
      case "PickHigher1v3":
        return "🎯";
      case "Plinko3Balls":
      case "Plinko5Balls":
      case "Plinko7Balls":
        return "🎰";
      case "Miner1v9":
      case "Miner3v16":
      case "Miner5v25":
        return "💣";
      default:
        return "🎮";
    }
  };

  const getFillPercentage = (ready: number, max: number) => {
    return Math.round((ready / max) * 100);
  };

  const getMatchStateColors = (match: MatchLobby) => {
    // Resolved (ended) - orange
    if (match.status === "Resolved") {
      return "bg-orange-500/10 border-orange-500/30";
    }

    // Pending or InProgress (in game) - blue
    if (match.status === "Pending" || match.status === "InProgress") {
      return "bg-blue-500/10 border-blue-500/30";
    }

    // Refunded - red
    if (match.status === "Refunded") {
      return "bg-red-500/10 border-red-500/30";
    }

    // Open (open for players) - green
    return "bg-green-500/10 border-green-500/30";
  };

  const getMatchStatusText = (match: MatchLobby) => {
    switch (match.status) {
      case "Open":
        return "Open";
      case "Pending":
        return "Starting";
      case "InProgress":
        return "In Game";
      case "Resolved":
        return "Ended";
      case "Refunded":
        return "Refunded";
      default:
        return "Open";
    }
  };

  const getMatchStatusColor = (match: MatchLobby) => {
    switch (match.status) {
      case "Open":
        return "text-green-400";
      case "Pending":
        return "text-yellow-400";
      case "InProgress":
        return "text-blue-400";
      case "Resolved":
        return "text-orange-400";
      case "Refunded":
        return "text-red-400";
      default:
        return "text-txt-muted";
    }
  };

  const handleMatchClick = (match: MatchLobby) => {
    // Use matchPda if available, otherwise use id
    const matchPda = match.matchPda || match.id;
    navigate(`/match/${matchPda}`);
  };

  if (isLoading) {
    return (
      <GlassCard className={`p-3 lg:p-4 ${className}`}>
        <GlassCardHeader>
          <GlassCardTitle className="text-lg font-display text-sol-purple">
            Live Matches
          </GlassCardTitle>
        </GlassCardHeader>
        <div className="space-y-2 lg:space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={`p-3 lg:p-4 ${className}`}>
      <GlassCardHeader>
        <GlassCardTitle className="text-lg font-display text-sol-purple flex items-center">
          <span className="w-2 h-2 bg-sol-mint rounded-full mr-2 animate-pulse" />
          Live Matches
        </GlassCardTitle>
      </GlassCardHeader>

      <div className="space-y-2 lg:space-y-3 max-h-96 overflow-y-auto">
        {matches
          .filter((m) => m.status !== "Resolved" && m.status !== "Refunded") // Filter out ended matches
          .slice(0, maxItems)
          .map((match, index) => {
            const fillPercentage = getFillPercentage(
              match.playersReady,
              match.playersMax
            );
            const timeRemaining = timeLeft[match.id] || 0;
            const isWaiting = match.status === "Open";
            const isInGame =
              match.status === "Pending" || match.status === "InProgress";

            return (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`match-card ${getMatchStateColors(
                  match
                )} cursor-pointer hover:bg-white/5 transition-colors`}
                onClick={() => handleMatchClick(match)}
              >
                <div className="flex items-center justify-between gap-2 lg:gap-3">
                  <div className="flex items-center space-x-2 lg:space-x-3 flex-1 min-w-0">
                    <div className="text-base lg:text-lg flex-shrink-0">
                      {getGameModeIcon(match.gameMode)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5 lg:space-x-2 flex-wrap">
                        <span className="text-txt-base font-medium text-sm lg:text-base">
                          {match.stake} SOL
                        </span>
                        <span className="text-txt-muted text-xs lg:text-sm">
                          {formatGameDisplay(
                            match.gameType || "PickHigher",
                            match.gameMode,
                            match.teamSize || "OneVOne"
                          )}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 lg:space-x-2 text-xs text-txt-muted">
                        <span>
                          {match.playersReady}/{match.playersMax} players
                        </span>
                        {isWaiting && (
                          <>
                            <span>•</span>
                            <span>{formatTimeLeft(timeRemaining)}</span>
                          </>
                        )}
                        {isInGame && (
                          <>
                            <span>•</span>
                            {match.status === "InProgress" && (match.gameStartTime ?? 0) > 0 ? (
                              <span className="text-blue-400">
                                {formatTimeLeft(timeRemaining)}
                              </span>
                            ) : (
                              <span className="text-blue-400">Playing...</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div
                      className={`text-xs lg:text-sm font-semibold mb-0.5 lg:mb-1 ${getMatchStatusColor(
                        match
                      )}`}
                    >
                      {getMatchStatusText(match)}
                    </div>
                    {isWaiting && (
                      <>
                        <div className="text-xs text-txt-muted mb-0.5 lg:mb-1">
                          {fillPercentage}% full
                        </div>
                        <div className="w-12 lg:w-16 h-1 bg-txt-muted/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sol-purple to-sol-mint transition-all duration-300"
                            style={{ width: `${fillPercentage}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

        {matches.length === 0 && (
          <div className="text-center py-8">
            <div className="text-txt-muted text-sm">No active matches</div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};
