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

  // Filter to show only active matches (Waiting or AwaitingRandomness)
  // and resolved matches that are less than 5 seconds old
  const matches = allMatches.filter((match) => {
    const now = Date.now();

    // Show Waiting and AwaitingRandomness matches
    if (match.status === "Waiting" || match.status === "AwaitingRandomness") {
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

  const getFillPercentage = (ready: number, max: number) => {
    return Math.round((ready / max) * 100);
  };

  const getMatchStateColors = (match: MatchLobby) => {
    // Resolved (ended) - orange
    if (match.status === "Resolved") {
      return "bg-orange-500/10 border-orange-500/30";
    }

    // AwaitingRandomness or Pending (in game) - blue
    if (match.status === "AwaitingRandomness" || match.status === "Pending") {
      return "bg-blue-500/10 border-blue-500/30";
    }

    // Refunded - red
    if (match.status === "Refunded") {
      return "bg-red-500/10 border-red-500/30";
    }

    // Waiting (open for players) - green
    return "bg-green-500/10 border-green-500/30";
  };

  const getMatchStatusText = (match: MatchLobby) => {
    switch (match.status) {
      case "Waiting":
        return "Open";
      case "AwaitingRandomness":
      case "Pending":
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
      case "Waiting":
        return "text-green-400";
      case "AwaitingRandomness":
      case "Pending":
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
      <GlassCard className={`p-4 ${className}`}>
        <GlassCardHeader>
          <GlassCardTitle className="text-lg font-display text-sol-purple">
            Live Matches
          </GlassCardTitle>
        </GlassCardHeader>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={`p-4 ${className}`}>
      <GlassCardHeader>
        <GlassCardTitle className="text-lg font-display text-sol-purple flex items-center">
          <span className="w-2 h-2 bg-sol-mint rounded-full mr-2 animate-pulse" />
          Live Matches
        </GlassCardTitle>
      </GlassCardHeader>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {matches
          .filter((m) => m.status !== "Resolved" && m.status !== "Refunded") // Filter out ended matches
          .slice(0, maxItems)
          .map((match, index) => {
          const fillPercentage = getFillPercentage(
            match.playersReady,
            match.playersMax
          );
          const timeRemaining = timeLeft[match.id] || 0;
          const isWaiting = match.status === "Waiting";
          const isInGame = match.status === "AwaitingRandomness" || match.status === "Pending";

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
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-lg">
                    {getGameModeIcon(match.gameMode)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-txt-base font-medium">
                        {match.stake} SOL
                      </span>
                      <span className="text-txt-muted text-sm">
                        {match.gameMode === "Pick3from9"
                          ? "Pick 3 from 9"
                          : match.gameMode === "Pick5from16"
                          ? "Pick 5 from 16"
                          : "Pick 3 from 9"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-txt-muted">
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
                          <span className="text-blue-400">Playing...</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-sm font-semibold mb-1 ${getMatchStatusColor(match)}`}>
                    {getMatchStatusText(match)}
                  </div>
                  {isWaiting && (
                    <>
                      <div className="text-xs text-txt-muted mb-1">
                        {fillPercentage}% full
                      </div>
                      <div className="w-16 h-1 bg-txt-muted/20 rounded-full overflow-hidden">
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
