// Matches page component
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useArenaStore } from "@/store/arenaStore";
import { useArenaRealtime } from "@/hooks/useArenaRealtime";
import { useLobbyOperations, useLobbyData, usePvpProgram } from "@/hooks/usePvpProgram";
import { MatchesList } from "@/components/arena/MatchesList";
import { JoinMatchSheet } from "@/components/arena/JoinMatchSheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { ROUTES } from "@/constants/routes";
import { FunnelIcon, ClockIcon, PlusIcon } from "@heroicons/react/24/outline";
import { PdaUtils, LobbyAccount } from "@/services/solana/accounts";
import { PvpAccountFetchers } from "@/services/solana/instructions";
import { matchesApi } from "@/services/api/matches";

type GameModeFilter = "all" | "Pick3from9" | "Pick5from16" | "Pick1from3";
type StakeFilter = "all" | "low" | "medium" | "high";
type MatchTypeFilter = "all" | "Solo" | "Duo" | "Team";

export const Matches: React.FC = () => {
  const navigate = useNavigate();
  const { connected, publicKey } = useWallet();
  const { matches, joinModalMatchId, setJoinModal, isLoading } =
    useArenaStore();
  const { refundLobby, isRefunding } = useLobbyOperations();
  const [gameModeFilter, setGameModeFilter] = useState<GameModeFilter>("all");
  const [stakeFilter, setStakeFilter] = useState<StakeFilter>("all");
  const [matchTypeFilter, setMatchTypeFilter] =
    useState<MatchTypeFilter>("all");
  const [sortBy, setSortBy] = useState<"stake" | "timeLeft" | "players">(
    "timeLeft"
  );
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null
  );
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null);
  const [blockchainOnlyLobby, setBlockchainOnlyLobby] = useState<LobbyAccount | null>(null);
  const { program } = usePvpProgram();

  // Initialize real-time arena data
  useArenaRealtime();

  // Find user's active lobby from matches (only if user is CREATOR)
  const userActiveLobby = publicKey
    ? matches.find(
        (m) =>
          m.matchPda &&
          (m.status === "Open" || m.status === "Pending") &&
          m.creator === publicKey.toBase58() // Only check if user is creator
      )
    : null;

  // Fetch full lobby data from blockchain if user has active lobby
  const lobbyPda = userActiveLobby?.matchPda
    ? new PublicKey(userActiveLobby.matchPda)
    : undefined;
  const { lobby: lobbyData } = useLobbyData(lobbyPda);

  // Check for lobbies that exist in blockchain but not in backend DB
  useEffect(() => {
    const checkBlockchainLobby = async () => {
      if (!publicKey || !program) return;
      
      try {
        // Get user's active lobby PDA
        const [activeLobbyPda] = PdaUtils.getActiveLobbyPda(publicKey);
        
        // Fetch from blockchain
        const blockchainLobby = await PvpAccountFetchers.fetchLobby(program, activeLobbyPda);
        
        if (!blockchainLobby) {
          setBlockchainOnlyLobby(null);
          return;
        }
        
        // Check if this lobby exists in backend
        try {
          await matchesApi.getMatch(activeLobbyPda.toBase58());
          // Lobby exists in both blockchain and backend - normal case
          setBlockchainOnlyLobby(null);
        } catch {
          // Lobby exists ONLY in blockchain (created outside the website)
          console.log("[Matches] Found blockchain-only lobby:", activeLobbyPda.toBase58());
          setBlockchainOnlyLobby(blockchainLobby);
        }
      } catch (error) {
        console.error("[Matches] Error checking blockchain lobby:", error);
        setBlockchainOnlyLobby(null);
      }
    };
    
    checkBlockchainLobby();
  }, [publicKey, program, matches]); // Re-check when matches change

  const handleCreateMatch = () => {
    if (!connected) {
      setValidationMessage("Connect your wallet to create a match");
      setTimeout(() => setValidationMessage(null), 5000);
      return;
    }
    if (userActiveLobby) {
      setValidationMessage("You already have an active lobby");
      setTimeout(() => setValidationMessage(null), 5000);
      return;
    }
    navigate(ROUTES.CREATE_LOBBY);
  };

  const handleRefund = async () => {
    if (!userActiveLobby || !publicKey || !lobbyData) return;
    
    try {
      setRefundError(null);
      setRefundSuccess(null);
      
      const lobbyPubkey = new PublicKey(userActiveLobby.matchPda || userActiveLobby.id);
      
      // Get all participants from both teams
      const participants = [...lobbyData.team1, ...lobbyData.team2];
      
      console.log("[Matches] Requesting refund for lobby:", lobbyPubkey.toString());
      console.log("[Matches] Participants:", participants.map(p => p.toString()));
      
      // Call refund API
      const tx = await refundLobby({
        lobbyPda: lobbyPubkey,
        creator: lobbyData.creator,
        participants,
      });
      
      console.log("[Matches] Refund successful! Transaction:", tx);
      setRefundSuccess("Refund successful! Your funds have been returned.");
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error("[Matches] Refund failed:", err);
      setRefundError(err.message || "Failed to refund lobby");
      setTimeout(() => setRefundError(null), 5000);
    }
  };

  const handleRefundBlockchainLobby = async () => {
    if (!blockchainOnlyLobby || !publicKey) return;
    
    try {
      setRefundError(null);
      setRefundSuccess(null);
      
      const [activeLobbyPda] = PdaUtils.getActiveLobbyPda(publicKey);
      
      // Get all participants from both teams
      const participants = [...blockchainOnlyLobby.team1, ...blockchainOnlyLobby.team2];
      
      console.log("[Matches] Requesting refund for blockchain-only lobby:", activeLobbyPda.toString());
      console.log("[Matches] Participants:", participants.map(p => p.toString()));
      
      // Call refund API
      const tx = await refundLobby({
        lobbyPda: activeLobbyPda,
        creator: blockchainOnlyLobby.creator,
        participants,
        lobbyAccount: blockchainOnlyLobby,
      });
      
      console.log("[Matches] Refund successful! Transaction:", tx);
      setRefundSuccess("Refund successful! Your funds have been returned.");
      setBlockchainOnlyLobby(null);
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error("[Matches] Refund failed:", err);
      setRefundError(err.message || "Failed to refund lobby");
      setTimeout(() => setRefundError(null), 5000);
    }
  };

  // Check if refund is available (deadline passed)
  const isRefundAvailable = () => {
    if (!userActiveLobby) return false;
    const deadlineTs = userActiveLobby.endsAt / 1000; // Convert ms to seconds
    const now = Math.floor(Date.now() / 1000);
    return now >= deadlineTs;
  };

  // Filter only active matches (Open, Pending, or InProgress)
  const activeMatches = matches.filter((match) => {
    return match.status === "Open" || match.status === "Pending" || match.status === "InProgress";
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
      if (match.teamSize !== matchTypeFilter) return false;
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
        <div className="max-w-7xl mx-auto px-6">
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
    <div className="min-h-screen bg-bg py-8 relative">
      {/* Validation Message Toast */}
      <AnimatePresence>
        {validationMessage && (
          <motion.div
            className="fixed top-0 left-0 right-0 z-[100] flex justify-center md:pt-[6vh] pt-[6vh] px-4 pointer-events-none"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.4 }}
          >
            <div className="glass-card p-4 border-yellow-500/50 bg-yellow-500/10 max-w-md w-full pointer-events-auto">
              <p className="text-yellow-400 text-sm text-center font-semibold">
                {validationMessage}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6">
        {/* Blockchain-Only Lobby Warning */}
        {blockchainOnlyLobby && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard className="p-6 border-2 border-red-500/50 bg-red-500/5 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-red-400 font-bold text-lg mb-2">
                    Лобби создано вне сайта
                  </h3>
                  <p className="text-txt-muted text-sm mb-4">
                    Вы создали лобби не используя сайт, поэтому оно не может быть играбельно. 
                    Сделайте рефаунд и создайте лобби через сайт.
                  </p>
                  <GlowButton
                    variant="ghost"
                    size="sm"
                    onClick={handleRefundBlockchainLobby}
                    disabled={isRefunding}
                    className="border-red-500/50 hover:border-red-500 text-red-400"
                  >
                    {isRefunding ? "Processing..." : "Refund"}
                  </GlowButton>
                  {refundError && (
                    <p className="text-red-400 text-sm mt-3 p-2 bg-red-500/10 rounded">
                      {refundError}
                    </p>
                  )}
                  {refundSuccess && (
                    <p className="text-sol-mint text-sm mt-3 p-2 bg-sol-mint/10 rounded">
                      {refundSuccess}
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Active Lobby Warning */}
        {userActiveLobby && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard className="p-6 border-2 border-yellow-500/50 bg-yellow-500/5 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-yellow-400 font-bold text-lg mb-2">
                    You have an active lobby
                  </h3>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-txt-muted">
                      <span className="text-txt-base font-semibold">{userActiveLobby.stake} SOL</span>
                      {" • "}
                      <span>{userActiveLobby.playersReady}/{userActiveLobby.playersMax} players</span>
                      {" • "}
                      <span className="text-yellow-400">{userActiveLobby.status}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <GlowButton
                      variant="neon"
                      size="sm"
                      onClick={() => navigate(`/match/${userActiveLobby.matchPda || userActiveLobby.id}`)}
                      className="flex-1"
                    >
                      View
                    </GlowButton>
                    {isRefundAvailable() ? (
                      <GlowButton
                        variant="ghost"
                        size="sm"
                        onClick={handleRefund}
                        disabled={isRefunding || !lobbyData}
                        className="flex-1 border-red-500/50 hover:border-red-500 text-red-400"
                      >
                        {isRefunding ? "..." : "Refund"}
                      </GlowButton>
                    ) : (
                      <span className="text-xs text-txt-muted self-center flex-1 text-center">
                        Refund after deadline
                      </span>
                    )}
                  </div>
                  {refundError && (
                    <p className="text-red-400 text-sm mt-3 p-2 bg-red-500/10 rounded">
                      {refundError}
                    </p>
                  )}
                  {refundSuccess && (
                    <p className="text-sol-mint text-sm mt-3 p-2 bg-sol-mint/10 rounded">
                      {refundSuccess}
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

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
              onClick={handleCreateMatch}
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
        <div className="grid grid-cols-2 gap-4 md:gap-4 mb-4">
          <GlassCard className="p-4 text-center">
            <ClockIcon className="w-5 h-5 md:w-6 md:h-6 text-sol-mint mx-auto mb-2" />
            <div className="text-lg md:text-xl font-bold text-txt-base">
              {activeMatches.length}
            </div>
            <div className="text-xs md:text-sm text-txt-muted">
              Active Matches
            </div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
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
