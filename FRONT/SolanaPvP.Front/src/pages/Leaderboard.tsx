// Leaderboard page component
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { leaderboardApi } from "@/services/api/leaderboard";
import {
  LeaderboardType,
  LeaderboardPeriod,
  LeaderboardEntry,
} from "@/types/leaderboard";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { TrophyIcon, UserGroupIcon } from "@heroicons/react/24/outline";

// Helper functions
const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return "";
  }
};

const getRankColor = (rank: number) => {
  switch (rank) {
    case 1:
      return "text-yellow-400";
    case 2:
      return "text-gray-400";
    case 3:
      return "text-orange-400";
    default:
      return "text-txt-base";
  }
};

const getWinRateColor = (rate: number) => {
  if (rate >= 0.7) return "text-sol-mint";
  if (rate >= 0.5) return "text-blue-400";
  if (rate >= 0.3) return "text-yellow-400";
  return "text-red-400";
};

const getPnLColor = (pnl: number) => {
  if (pnl > 0) return "text-sol-mint";
  if (pnl < 0) return "text-red-400";
  return "text-txt-muted";
};

export const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"month" | "allTime">("allTime");

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setIsLoading(true);
        console.log("📊 [Leaderboard] Loading leaderboard for period:", timeFilter);
        const period =
          timeFilter === "month"
            ? LeaderboardPeriod.Monthly
            : LeaderboardPeriod.AllTime;
        const result = await leaderboardApi.getLeaderboard(
          LeaderboardType.WinRate,
          period,
          1,
          50
        );
        console.log("📊 [Leaderboard] Loaded entries:", result.entries.length);
        console.log("📊 [Leaderboard] Data:", result);
        setLeaderboard(result.entries);
      } catch (err: any) {
        console.error("❌ [Leaderboard] Failed to load:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard();
  }, [timeFilter]);

  const filteredLeaderboard = leaderboard;

  const formatWinRate = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const formatPnL = (earnings: number) => {
    // Convert lamports to SOL
    const sol = earnings / 1000000000;
    const sign = sol >= 0 ? "+" : "";
    return `${sign}${sol.toFixed(2)} SOL`;
  };

  const totalPlayers = leaderboard.length;
  const totalGamesPlayed = leaderboard.reduce(
    (sum, p) => sum + p.totalMatches,
    0
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg py-4 lg:py-8">
        <div className="max-w-7xl mx-auto px-3 lg:px-6">
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
    <div className="min-h-screen bg-bg py-4 lg:py-8">
      <div className="max-w-7xl mx-auto px-3 lg:px-6">
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
          <GlassCard className="p-4 text-center">
            <TrophyIcon className="w-6 h-6 text-sol-mint mx-auto mb-2" />
            <div className="text-xl font-bold text-txt-base">
              {totalPlayers}
            </div>
            <div className="text-sm text-txt-muted">Total Players</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <UserGroupIcon className="w-6 h-6 text-sol-purple mx-auto mb-2" />
            <div className="text-xl font-bold text-txt-base">
              {totalGamesPlayed}
            </div>
            <div className="text-sm text-txt-muted">Games Played</div>
          </GlassCard>
        </div>

        {/* Time Filter */}
        <div className="mb-4">
          <GlassCard className="p-4">
            <div className="flex items-center ">
              <span className="text-txt-muted text-sm font-medium block">
                Time Period
              </span>
              <div className="flex flex-wrap items-center gap-4 ml-2">
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
            <GlassCardTitle className="text-xl font-display text-sol-purple px-6 py-4">
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
                    key={player.pubkey}
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
                      <span className="text-txt-base font-medium">
                        {player.username ||
                          `${player.pubkey.slice(0, 6)}...${player.pubkey.slice(
                            -4
                          )}`}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-txt-base">
                        {player.wonMatches}/
                        {player.totalMatches - player.wonMatches}
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
                          player.totalEarnings
                        )}`}
                      >
                        {formatPnL(player.totalEarnings)}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 p-4">
            {filteredLeaderboard.map((player, index) => (
              <motion.div
                key={player.pubkey}
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
                        {player.username ||
                          `${player.pubkey.slice(0, 6)}...${player.pubkey.slice(
                            -4
                          )}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-bold ${getPnLColor(
                        player.totalEarnings
                      )}`}
                    >
                      {formatPnL(player.totalEarnings)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-txt-muted">W/L</div>
                    <div className="text-txt-base font-medium">
                      {player.wonMatches}/
                      {player.totalMatches - player.wonMatches}
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
