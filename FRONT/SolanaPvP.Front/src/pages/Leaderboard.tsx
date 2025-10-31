// Leaderboard page component
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  mockLeaderboard,
  getRankIcon,
  getRankColor,
  getWinRateColor,
  getPnLColor,
} from "@/lib/mockLeaderboard";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { TrophyIcon, UserGroupIcon } from "@heroicons/react/24/outline";

export const Leaderboard: React.FC = () => {
  const [leaderboard] = useState(mockLeaderboard);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"month" | "allTime">("allTime");

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Sort by rank always
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    return a.rank - b.rank;
  });

  // Filter by time period if needed (for now just return all)
  const filteredLeaderboard = sortedLeaderboard;

  const formatWinRate = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const formatPnL = (pnl: number) => {
    const sign = pnl >= 0 ? "+" : "";
    return `${sign}${pnl.toFixed(1)} SOL`;
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
            {Array.from({ length: 10 }).map((_, i) => (
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
            Leaderboard
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-txt-muted"
          >
            Top players competing for SOL rewards
          </motion.p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <GlassCard className="p-3 md:p-4 text-center">
            <TrophyIcon className="w-5 h-5 md:w-8 md:h-8 text-sol-mint mx-auto mb-2" />
            <div className="text-lg md:text-2xl font-bold text-txt-base">
              {leaderboard.length}
            </div>
            <div className="text-xs md:text-sm text-txt-muted">
              Total Players
            </div>
          </GlassCard>
          <GlassCard className="p-3 md:p-4 text-center">
            <UserGroupIcon className="w-5 h-5 md:w-8 md:h-8 text-sol-purple mx-auto mb-2" />
            <div className="text-lg md:text-2xl font-bold text-txt-base">
              {leaderboard.reduce((sum, p) => sum + p.gamesPlayed, 0)}
            </div>
            <div className="text-xs md:text-sm text-txt-muted">
              Games Played
            </div>
          </GlassCard>
        </div>

        {/* Time Filter */}
        <div className="mb-4">
          <GlassCard className="p-4">
            <div className="flex items-center ">
              <span className="text-txt-muted text-sm font-medium block">
                Time Period
              </span>
              <div className="flex flex-wrap items-center gap-2 md:gap-4 ml-2">
                {(["month", "allTime"] as const).map((period) => (
                  <GlowButton
                    key={period}
                    variant={timeFilter === period ? "neon" : "ghost"}
                    size="sm"
                    onClick={() => setTimeFilter(period)}
                    className="text-xs"
                  >
                    {period === "month" ? "Month" : "All time"}
                  </GlowButton>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Leaderboard Table */}
        <GlassCard className="overflow-hidden">
          <GlassCardHeader>
            <GlassCardTitle className="text-xl font-display text-sol-purple px-3 md:px-6 py-3 md:py-4">
              Player Rankings
            </GlassCardTitle>
          </GlassCardHeader>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-txt-muted font-medium">
                    Rank
                  </th>
                  <th className="text-left py-4 px-6 text-txt-muted font-medium">
                    Player
                  </th>
                  <th className="text-right py-4 px-6 text-txt-muted font-medium">
                    W/L
                  </th>
                  <th className="text-right py-4 px-6 text-txt-muted font-medium">
                    Win Rate
                  </th>
                  <th className="text-right py-4 px-6 text-txt-muted font-medium">
                    P&L
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaderboard.map((player, index) => (
                  <motion.tr
                    key={player.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                      player.rank <= 3
                        ? "bg-gradient-to-r from-sol-purple/5 to-sol-mint/5"
                        : ""
                    }`}
                  >
                    <td className="py-4 px-6">
                      <div
                        className={`flex items-center font-bold ${getRankColor(
                          player.rank
                        )}`}
                      >
                        <span className="text-lg mr-2">
                          {getRankIcon(player.rank)}
                        </span>
                        <span>#{player.rank}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-sol-purple to-sol-mint rounded-full flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-sm">
                            {player.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-txt-base font-medium">
                          {player.username}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-txt-base">
                        {player.totalWins}/{player.totalLosses}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span
                        className={`font-semibold ${getWinRateColor(
                          player.winRate
                        )}`}
                      >
                        {formatWinRate(player.winRate)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span
                        className={`font-semibold ${getPnLColor(
                          player.totalPnL
                        )}`}
                      >
                        {formatPnL(player.totalPnL)}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 md:p-6">
            {filteredLeaderboard.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`glass-card p-4 ${
                  player.rank <= 3 ? "border-sol-mint shadow-glow-mint" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div
                      className={`text-2xl mr-3 ${getRankColor(player.rank)}`}
                    >
                      {getRankIcon(player.rank)}
                    </div>
                    <div>
                      <div className="text-txt-base font-medium">
                        {player.username}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-bold ${getPnLColor(
                        player.totalPnL
                      )}`}
                    >
                      {formatPnL(player.totalPnL)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-txt-muted">W/L</div>
                    <div className="text-txt-base font-medium">
                      {player.totalWins}/{player.totalLosses}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-txt-muted">Win Rate</div>
                    <div
                      className={`font-semibold ${getWinRateColor(
                        player.winRate
                      )}`}
                    >
                      {formatWinRate(player.winRate)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
