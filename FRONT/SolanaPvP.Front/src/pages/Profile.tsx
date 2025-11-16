// Profile page component
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { usersApi } from "@/services/api/users";
import { useWalletBalance } from "@/hooks/usePvpProgram";
import type { UserProfile as APIUserProfile } from "@/types/user";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { ChangeUsernameModal } from "@/components/profile/ChangeUsernameModal";
import {
  TrophyIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  StarIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { AuroraBackground } from "@/components/effects/AuroraBackground";

// Helper functions
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

const getResultColor = (result: "win" | "loss") => {
  return result === "win" ? "text-sol-mint" : "text-red-400";
};

const getResultIcon = (result: "win" | "loss") => {
  return result === "win" ? "🏆" : "💥";
};

// Removed: formatDuration - not used

const formatTimeAgo = (timestamp: number | string) => {
  const date = new Date(timestamp);
  const now = Date.now();
  const diff = now - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }
};

export const Profile: React.FC = () => {
  const { publicKey } = useWallet();
  const { balance, refetch } = useWalletBalance();
  const [profile, setProfile] = useState<APIUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "stats">(
    "overview"
  );
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  const handleUsernameChange = (newUsername: string) => {
    if (profile) {
      setProfile({ ...profile, username: newUsername });
    }
  };

  useEffect(() => {
    if (!publicKey) {
      setIsLoading(false);
      return;
    }

    // Load real user data from API
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log("👤 [Profile] Loading profile for:", publicKey.toString());
        // Fetch user profile (includes recentMatches)
        const userProfile = await usersApi.getUser(publicKey.toString());
        console.log("👤 [Profile] Loaded profile:", userProfile);
        console.log("👤 [Profile] Recent matches:", userProfile.recentMatches?.length || 0);
        setProfile(userProfile);

        // Fetch wallet balance
        refetch();
      } catch (err: any) {
        console.error("❌ [Profile] Failed to load:", err);
        setError(err.message || "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [publicKey, refetch]);

  const formatWinRate = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  if (!publicKey) {
    return (
      <div className="relative min-h-screen bg-bg py-4 lg:py-8 flex items-center justify-center overflow-hidden">
        <AuroraBackground />
        <div className="text-center px-3">
          <h2 className="text-xl lg:text-2xl font-display font-bold text-txt-base mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-txt-muted text-sm lg:text-base">
            Please connect your wallet to view your profile
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="relative min-h-screen bg-bg py-4 lg:py-8 overflow-hidden">
        <AuroraBackground />
        <div className="max-w-6xl mx-auto px-3 lg:px-6">
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

  if (error || !profile) {
    return (
      <div className="relative min-h-screen bg-bg py-4 lg:py-8 flex items-center justify-center overflow-hidden">
        <AuroraBackground />
        <div className="text-center px-3">
          <h2 className="text-xl lg:text-2xl font-display font-bold text-red-400 mb-4">
            Error Loading Profile
          </h2>
          <p className="text-txt-muted text-sm lg:text-base">{error || "Profile not found"}</p>
        </div>
      </div>
    );
  }

  const winRate =
    profile.matchesPlayed > 0 ? profile.wins / profile.matchesPlayed : 0;

  return (
    <div className="relative min-h-screen bg-bg py-4 lg:py-8 overflow-hidden">
      <AuroraBackground />
      <div className="relative z-10">
      <div className="max-w-6xl mx-auto px-3 lg:px-6">
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
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h2 className="text-2xl font-display font-bold text-txt-base">
                    {profile.username}
                  </h2>
                  <button
                    onClick={() => setShowUsernameModal(true)}
                    className="text-sol-purple hover:text-sol-mint transition-colors"
                    title="Change username"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="text-xs text-txt-muted break-all px-4 mb-3">
                  {publicKey.toString()}
                </div>
                <div className="text-center py-2 px-4 bg-sol-purple/10 border border-sol-purple/30 rounded-lg mx-4">
                  <div className="text-xs text-txt-muted mb-1">
                    Wallet Balance
                  </div>
                  <div className="text-lg font-bold text-sol-mint">
                    {balance.toFixed(4)} SOL
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-txt-muted">Games Played</span>
                  <span className="text-txt-base font-semibold">
                    {profile.matchesPlayed}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-txt-muted">Win Rate</span>
                  <span
                    className={`font-semibold ${getResultColor(
                      winRate > 0.5 ? "win" : "loss"
                    )}`}
                  >
                    {formatWinRate(winRate)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-txt-muted">Total Earnings</span>
                  <span className="font-semibold text-sol-mint">
                    {(profile.totalEarningsLamports / 1000000000).toFixed(2)}{" "}
                    SOL
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-txt-muted">Wins</span>
                  <span className="text-txt-base font-semibold">
                    {profile.wins}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-txt-muted">Losses</span>
                  <span className="text-txt-base font-semibold">
                    {profile.losses}
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
                {
                  id: "overview",
                  label: "Overview",
                  icon: ChartBarIcon,
                  color: "purple",
                },
                {
                  id: "history",
                  label: "History",
                  icon: ClockIcon,
                  color: "blue",
                },
                {
                  id: "stats",
                  label: "Statistics",
                  icon: TrophyIcon,
                  color: "mint",
                },
              ].map((tab) => (
                <GlowButton
                  key={tab.id}
                  variant={
                    activeTab === tab.id
                      ? (tab.color as "purple" | "blue" | "mint")
                      : "ghost"
                  }
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
                          {profile.wins}
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
                          {profile.losses}
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
                          {profile.matchesPlayed}
                        </div>
                        <div className="text-sm text-txt-muted">
                          Games Played
                        </div>
                      </div>
                      <CurrencyDollarIcon className="w-8 h-8 text-sol-purple" />
                    </div>
                  </GlassCard>
                  <GlassCard className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-txt-base">
                          {(profile.totalEarningsLamports / 1000000000).toFixed(
                            2
                          )}
                        </div>
                        <div className="text-sm text-txt-muted">
                          Total Earned (SOL)
                        </div>
                      </div>
                      <StarIcon className="w-8 h-8 text-sol-mint" />
                    </div>
                  </GlassCard>
                </div>

                {/* Recent Matches Preview */}
                <GlassCard className="p-6">
                  <h3 className="text-lg font-display font-bold text-sol-purple mb-4">
                    Account Info
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-txt-muted">First Seen</span>
                      <span className="text-txt-base">
                        {formatTimeAgo(profile.firstSeen)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-txt-muted">Last Seen</span>
                      <span className="text-txt-base">
                        {formatTimeAgo(profile.lastSeen)}
                      </span>
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
                            Status
                          </th>
                          <th className="text-right py-3 px-4 text-txt-muted font-medium">
                            Tx
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.recentMatches &&
                        profile.recentMatches.length > 0 ? (
                          profile.recentMatches.map((match, index) => {
                            const isWinner = match.isWinner;
                            const result = isWinner ? "win" : "loss";

                            return (
                              <motion.tr
                                key={match.matchPda}
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
                                    {(match.stakeLamports / 1000000000).toFixed(
                                      2
                                    )}{" "}
                                    SOL
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center space-x-1">
                                    {match.status === "Resolved" && (
                                      <>
                                        <span className="text-lg">
                                          {getResultIcon(
                                            result as "win" | "loss"
                                          )}
                                        </span>
                                        <span
                                          className={`font-semibold ${getResultColor(
                                            result as "win" | "loss"
                                          )}`}
                                        >
                                          {result.toUpperCase()}
                                        </span>
                                      </>
                                    )}
                                    {match.status !== "Resolved" && (
                                      <span className="text-txt-muted">
                                        {match.status}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <a
                                    href={`https://explorer.solana.com/address/${match.matchPda}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sol-mint hover:text-sol-purple transition-colors text-sm"
                                  >
                                    View Tx
                                  </a>
                                </td>
                              </motion.tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={4}
                              className="py-8 text-center text-txt-muted"
                            >
                              No match history yet
                            </td>
                          </tr>
                        )}
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
                      <div className="text-sm text-txt-muted mb-4">
                        Overall Statistics
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-txt-base">Total Matches</span>
                          <span className="text-txt-base font-semibold">
                            {profile.matchesPlayed}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-txt-base">Win Rate</span>
                          <span
                            className={`font-semibold ${getResultColor(
                              winRate > 0.5 ? "win" : "loss"
                            )}`}
                          >
                            {formatWinRate(winRate)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-txt-base">Total Earnings</span>
                          <span className="text-sol-mint font-semibold">
                            {(
                              profile.totalEarningsLamports / 1000000000
                            ).toFixed(2)}{" "}
                            SOL
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-txt-muted mb-4">
                        Account Activity
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-txt-base">Last Active</span>
                          <span className="text-txt-muted">
                            {formatTimeAgo(profile.lastSeen)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-txt-base">First Seen</span>
                          <span className="text-txt-muted">
                            {formatTimeAgo(profile.firstSeen)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-txt-base">Username</span>
                          <span className="text-sol-mint font-semibold">
                            {profile.username}
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

      {/* Change Username Modal */}
      <ChangeUsernameModal
        isOpen={showUsernameModal}
        currentUsername={profile.username}
        onClose={() => setShowUsernameModal(false)}
        onSuccess={handleUsernameChange}
      />
      </div>
    </div>
  );
};
