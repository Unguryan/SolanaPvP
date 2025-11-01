// Profile page component
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  mockUserProfile,
  mockMatchHistory,
  getGameModeIcon,
  getResultColor,
  getResultIcon,
  formatDuration,
  formatTimeAgo,
} from "@/lib/mockProfile";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import {
  TrophyIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  StarIcon,
} from "@heroicons/react/24/outline";

export const Profile: React.FC = () => {
  const [profile] = useState(mockUserProfile);
  const [matchHistory] = useState(mockMatchHistory);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "stats">(
    "overview"
  );

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const formatWinRate = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const formatPnL = (pnl: number) => {
    const sign = pnl >= 0 ? "+" : "";
    return `${sign}${pnl.toFixed(2)} SOL`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Skeleton className="h-12 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="lg:col-span-2">
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-txt-base mb-4"
          >
            Profile
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-txt-muted"
          >
            Your gaming statistics and match history
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <GlassCard className="p-6">
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-r from-sol-purple to-sol-mint rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-2xl">
                    {profile.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-2xl font-display font-bold text-txt-base mb-2">
                  {profile.username}
                </h2>
                <div className="flex items-center justify-center space-x-2 text-txt-muted">
                  <TrophyIcon className="w-4 h-4" />
                  <span>Rank #{profile.currentRank}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-txt-muted">Games Played</span>
                  <span className="text-txt-base font-semibold">
                    {profile.gamesPlayed}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-txt-muted">Win Rate</span>
                  <span
                    className={`font-semibold ${getResultColor(
                      profile.winRate > 0.5 ? "win" : "loss"
                    )}`}
                  >
                    {formatWinRate(profile.winRate)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-txt-muted">Total P&L</span>
                  <span
                    className={`font-semibold ${getResultColor(
                      profile.totalPnL > 0 ? "win" : "loss"
                    )}`}
                  >
                    {formatPnL(profile.totalPnL)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-txt-muted">Current Streak</span>
                  <span className="text-txt-base font-semibold">
                    {profile.currentWinStreak}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-txt-muted">Best Streak</span>
                  <span className="text-txt-base font-semibold">
                    {profile.longestWinStreak}
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex justify-center space-x-2 mb-6">
              {[
                { id: "overview", label: "Overview", icon: ChartBarIcon },
                { id: "history", label: "History", icon: ClockIcon },
                { id: "stats", label: "Statistics", icon: TrophyIcon },
              ].map((tab) => (
                <GlowButton
                  key={tab.id}
                  variant={activeTab === tab.id ? "neon" : "ghost"}
                  onClick={() =>
                    setActiveTab(tab.id as "overview" | "history" | "stats")
                  }
                  className="flex items-center space-x-2 px-3 py-2 text-sm"
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </GlowButton>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GlassCard className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-txt-base">
                          {profile.totalWins}
                        </div>
                        <div className="text-sm text-txt-muted">Total Wins</div>
                      </div>
                      <TrophyIcon className="w-8 h-8 text-sol-mint" />
                    </div>
                  </GlassCard>
                  <GlassCard className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-txt-base">
                          {profile.totalLosses}
                        </div>
                        <div className="text-sm text-txt-muted">
                          Total Losses
                        </div>
                      </div>
                      <ChartBarIcon className="w-8 h-8 text-red-400" />
                    </div>
                  </GlassCard>
                  <GlassCard className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-txt-base">
                          {profile.totalStaked.toFixed(1)}
                        </div>
                        <div className="text-sm text-txt-muted">
                          Total Staked (SOL)
                        </div>
                      </div>
                      <CurrencyDollarIcon className="w-8 h-8 text-sol-purple" />
                    </div>
                  </GlassCard>
                  <GlassCard className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-txt-base">
                          {profile.totalEarned.toFixed(1)}
                        </div>
                        <div className="text-sm text-txt-muted">
                          Total Earned (SOL)
                        </div>
                      </div>
                      <StarIcon className="w-8 h-8 text-sol-mint" />
                    </div>
                  </GlassCard>
                </div>

                {/* Favorite Game Mode */}
                <GlassCard className="p-6">
                  <h3 className="text-lg font-display font-bold text-sol-purple mb-4">
                    Favorite Game Mode
                  </h3>
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">
                      {getGameModeIcon(profile.favoriteGameMode)}
                    </div>
                    <div>
                      <div className="text-xl font-semibold text-txt-base">
                        {profile.favoriteGameMode}
                      </div>
                      <div className="text-txt-muted">
                        Most played game mode
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === "history" && (
              <GlassCard className="overflow-hidden">
                <GlassCardHeader>
                  <GlassCardTitle className="text-xl font-display text-sol-purple">
                    Recent Matches
                  </GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-txt-muted font-medium">
                            Game
                          </th>
                          <th className="text-left py-3 px-4 text-txt-muted font-medium">
                            Stake
                          </th>
                          <th className="text-center py-3 px-4 text-txt-muted font-medium">
                            Result
                          </th>
                          <th className="text-right py-3 px-4 text-txt-muted font-medium">
                            P&L
                          </th>
                          <th className="text-right py-3 px-4 text-txt-muted font-medium">
                            Time
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchHistory.slice(0, 10).map((match, index) => (
                          <motion.tr
                            key={match.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">
                                  {getGameModeIcon(match.gameMode)}
                                </span>
                                <span className="text-txt-base">
                                  {match.gameMode}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-txt-base">
                                {match.stake} SOL
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <span className="text-lg">
                                  {getResultIcon(match.result)}
                                </span>
                                <span
                                  className={`font-semibold ${getResultColor(
                                    match.result
                                  )}`}
                                >
                                  {match.result.toUpperCase()}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span
                                className={`font-semibold ${getResultColor(
                                  match.result
                                )}`}
                              >
                                {formatPnL(match.pnl)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="text-sm text-txt-muted">
                                <div>{formatTimeAgo(match.timestamp)}</div>
                                <div>{formatDuration(match.duration)}</div>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCardContent>
              </GlassCard>
            )}

            {activeTab === "stats" && (
              <div className="space-y-6">
                <GlassCard className="p-6">
                  <h3 className="text-lg font-display font-bold text-sol-purple mb-4">
                    Performance Metrics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm text-txt-muted mb-2">
                        Win Rate by Game Mode
                      </div>
                      <div className="space-y-3">
                        {["Pick3from9", "Pick5from16", "Pick1from3"].map(
                          (mode) => (
                            <div
                              key={mode}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center space-x-2">
                                <span>{getGameModeIcon(mode)}</span>
                                <span className="text-txt-base">{mode}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-txt-base font-semibold">
                                  {Math.floor(Math.random() * 30 + 60)}%
                                </div>
                                <div className="text-xs text-txt-muted">
                                  {Math.floor(Math.random() * 20 + 10)} games
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-txt-muted mb-2">
                        Recent Activity
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-txt-base">Last Active</span>
                          <span className="text-txt-muted">
                            {formatTimeAgo(profile.lastActive)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-txt-base">Member Since</span>
                          <span className="text-txt-muted">
                            {formatDate(profile.joinDate)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-txt-base">Best Rank</span>
                          <span className="text-sol-mint font-semibold">
                            #{profile.bestRank}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
