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
import {
  TrophyIcon,
  UserGroupIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

export const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState(mockLeaderboard);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"rank" | "winRate" | "pnl">("rank");
  const [filter, setFilter] = useState<"all" | "top10" | "top50">("all");

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    switch (sortBy) {
      case "winRate":
        return b.winRate - a.winRate;
      case "pnl":
        return b.totalPnL - a.totalPnL;
      default:
        return a.rank - b.rank;
    }
  });

  const filteredLeaderboard = sortedLeaderboard.filter((entry) => {
    switch (filter) {
      case "top10":
        return entry.rank <= 10;
      case "top50":
        return entry.rank <= 50;
      default:
        return true;
    }
  });

  const formatWinRate = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const formatPnL = (pnl: number) => {
    const sign = pnl >= 0 ? "+" : "";
    return `${sign}${pnl.toFixed(2)} SOL`;
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <GlassCard className="p-6 text-center">
            <TrophyIcon className="w-8 h-8 text-sol-mint mx-auto mb-2" />
            <div className="text-2xl font-bold text-txt-base">
              {leaderboard.length}
            </div>
            <div className="text-sm text-txt-muted">Total Players</div>
          </GlassCard>
          <GlassCard className="p-6 text-center">
            <UserGroupIcon className="w-8 h-8 text-sol-purple mx-auto mb-2" />
            <div className="text-2xl font-bold text-txt-base">
              {leaderboard.reduce((sum, p) => sum + p.gamesPlayed, 0)}
            </div>
            <div className="text-sm text-txt-muted">Games Played</div>
          </GlassCard>
          <GlassCard className="p-6 text-center">
            <ChartBarIcon className="w-8 h-8 text-sol-mint mx-auto mb-2" />
            <div className="text-2xl font-bold text-txt-base">
              {leaderboard.reduce((sum, p) => sum + p.totalPnL, 0).toFixed(1)}
            </div>
            <div className="text-sm text-txt-muted">Total P&L (SOL)</div>
          </GlassCard>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex gap-2">
            <span className="text-txt-muted text-sm">Sort by:</span>
            {(["rank", "winRate", "pnl"] as const).map((sort) => (
              <GlowButton
                key={sort}
                variant={sortBy === sort ? "neon" : "ghost"}
                size="sm"
                onClick={() => setSortBy(sort)}
                className="text-xs"
              >
                {sort === "rank"
                  ? "Rank"
                  : sort === "winRate"
                  ? "Win Rate"
                  : "P&L"}
              </GlowButton>
            ))}
          </div>
          <div className="flex gap-2">
            <span className="text-txt-muted text-sm">Filter:</span>
            {(["all", "top10", "top50"] as const).map((filterType) => (
              <GlowButton
                key={filterType}
                variant={filter === filterType ? "neon" : "ghost"}
                size="sm"
                onClick={() => setFilter(filterType)}
                className="text-xs"
              >
                {filterType === "all"
                  ? "All"
                  : filterType === "top10"
                  ? "Top 10"
                  : "Top 50"}
              </GlowButton>
            ))}
          </div>
        </div>

        {/* Leaderboard Table */}
        <GlassCard className="overflow-hidden">
          <GlassCardHeader>
            <GlassCardTitle className="text-xl font-display text-sol-purple">
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
                  <th className="text-right py-4 px-6 text-txt-muted font-medium">
                    Games
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
                        {player.rank}
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
                    <td className="py-4 px-6 text-right">
                      <span className="text-txt-muted">
                        {player.gamesPlayed}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 p-6">
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
                      <div className="text-sm text-txt-muted">
                        #{player.rank}
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
                    <div className="text-sm text-txt-muted">
                      {player.gamesPlayed} games
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
                  <div>
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
