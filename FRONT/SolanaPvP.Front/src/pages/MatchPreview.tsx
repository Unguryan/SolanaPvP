// MatchPreview page - View and interact with match/lobby
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { GlowButton } from "@/components/ui/GlowButton";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard";
import { usePvpProgram, useLobbyOperations } from "@/hooks/usePvpProgram";
import { LobbyAccount, LobbyStatus } from "@/services/solana/accounts";
import { Skeleton } from "@/components/ui/Skeleton";
import * as anchor from "@coral-xyz/anchor";

export const MatchPreview: React.FC = () => {
  const { matchPda } = useParams<{ matchPda: string }>();
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const { isInitialized } = usePvpProgram();
  const { joinLobby, refundLobby, isJoining, isRefunding } =
    useLobbyOperations();

  const [lobby, setLobby] = useState<LobbyAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSide, setSelectedSide] = useState<0 | 1>(0);
  const [error, setError] = useState<string | null>(null);
  const [isViewer, setIsViewer] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Determine if user is a viewer (not participant and not connected)
  useEffect(() => {
    if (lobby && publicKey) {
      const allPlayers = [...lobby.team1, ...lobby.team2];
      const isParticipant = allPlayers.some(
        (p) => p.toString() === publicKey.toString()
      );
      setIsViewer(!isParticipant);
    } else if (!connected) {
      setIsViewer(true);
    } else {
      setIsViewer(false);
    }
  }, [lobby, publicKey, connected]);

  // Viewer countdown timer (20 seconds)
  useEffect(() => {
    if (isViewer && lobby && lobby.status === LobbyStatus.Resolved) {
      setCountdown(20);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            setShowResult(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isViewer, lobby]);

  // Fetch lobby data - allow loading without wallet
  useEffect(() => {
    if (!matchPda) return;

    // Allow loading even if wallet is not connected
    const loadLobby = async () => {
      try {
        setIsLoading(true);

        // Check if this is a mock match
        if (matchPda.startsWith("mock-")) {
          // Create mock lobby data
          const mockLobby: LobbyAccount = {
            bump: 255,
            lobbyId: new anchor.BN(1),
            creator: new PublicKey("11111111111111111111111111111111"),
            stakeLamports: new anchor.BN(2.5 * 1_000_000_000),
            teamSize: 3,
            team1: [
              new PublicKey("11111111111111111111111111111112"),
              new PublicKey("11111111111111111111111111111113"),
            ],
            team2: [new PublicKey("11111111111111111111111111111114")],
            status: LobbyStatus.Open,
            createdAt: new anchor.BN(Math.floor(Date.now() / 1000)),
            finalized: false,
            vrf: new PublicKey("11111111111111111111111111111115"),
          };

          setTimeout(() => {
            setLobby(mockLobby);
            setIsLoading(false);
          }, 500);
          return;
        }

        // TODO: Fetch lobby data from blockchain/API
        // For now, showing loading state
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
      } catch (err) {
        console.error("Failed to load lobby:", err);
        setError("Failed to load match data");
        setIsLoading(false);
      }
    };

    loadLobby();
  }, [matchPda]);

  const handleJoin = async (side: 0 | 1) => {
    if (!publicKey || !matchPda || !lobby) return;

    try {
      setError(null);
      const lobbyPubkey = new PublicKey(matchPda);

      // TODO: Get VRF accounts for last join if needed
      const tx = await joinLobby({
        lobbyPda: lobbyPubkey,
        creator: lobby.creator,
        side,
      });

      console.log("Joined lobby successfully:", tx);

      // Reload lobby data
      window.location.reload();
    } catch (err: any) {
      console.error("Failed to join lobby:", err);
      setError(err.message || "Failed to join match");
    }
  };

  const handleRefund = async () => {
    if (!publicKey || !matchPda || !lobby) return;

    // Check if user is authorized to refund
    const isParticipant = [...lobby.team1, ...lobby.team2].some(
      (p) => p.toString() === publicKey?.toString()
    );

    if (!isParticipant && lobby.creator.toString() !== publicKey?.toString()) {
      setError("Only participants and creator can refund");
      return;
    }

    try {
      setError(null);
      const lobbyPubkey = new PublicKey(matchPda);
      const participants = [...lobby.team1, ...lobby.team2];

      const tx = await refundLobby({
        lobbyPda: lobbyPubkey,
        creator: lobby.creator,
        participants,
      });

      console.log("Refund successful:", tx);

      // Navigate back
      navigate("/matches");
    } catch (err: any) {
      console.error("Failed to refund:", err);
      setError(err.message || "Failed to refund");
    }
  };

  const canRefund = () => {
    if (!lobby || !publicKey) return false;
    if (lobby.status !== LobbyStatus.Open) return false;

    const isParticipant = [...lobby.team1, ...lobby.team2].some(
      (p) => p.toString() === publicKey?.toString()
    );
    const isCreator = lobby.creator.toString() === publicKey?.toString();

    // Check if 2 minutes have passed
    const createdAtSeconds = lobby.createdAt.toNumber();
    const nowSeconds = Date.now() / 1000;
    const timePassed = nowSeconds - createdAtSeconds;
    const canRefundTime = timePassed >= 120; // 2 minutes

    return canRefundTime && (isParticipant || isCreator);
  };

  const isPlayerInLobby = () => {
    if (!lobby || !publicKey) return false;
    const allPlayers = [...lobby.team1, ...lobby.team2];
    return allPlayers.some((p) => p.toString() === publicKey?.toString());
  };

  const getStatusColor = (status: LobbyStatus) => {
    switch (status) {
      case LobbyStatus.Open:
        return "text-green-400";
      case LobbyStatus.Pending:
        return "text-yellow-400";
      case LobbyStatus.Resolved:
        return "text-blue-400";
      case LobbyStatus.Refunded:
        return "text-gray-400";
      default:
        return "text-txt-muted";
    }
  };

  // No longer blocking viewers - removed the wallet check

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Skeleton className="h-20 w-full mb-6" />
          <Skeleton className="h-64 w-full mb-6" />
          <Skeleton className="h-64 w-full mb-6" />
        </div>
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-bold text-txt-base mb-4">
            Match Not Found
          </h2>
          <p className="text-txt-muted mb-6">
            This match does not exist or has been removed
          </p>
          <GlowButton onClick={() => navigate("/matches")} variant="neon">
            Go Back
          </GlowButton>
        </GlassCard>
      </div>
    );
  }

  const stakeSOL = lobby.stakeLamports.toNumber() / 1_000_000_000;
  const team1Progress = (lobby.team1.length / lobby.teamSize) * 100;
  const team2Progress = (lobby.team2.length / lobby.teamSize) * 100;

  return (
    <div className="min-h-screen bg-bg py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-display font-bold text-txt-base mb-2">
            Match #{lobby.lobbyId.toString()}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className={`text-lg ${getStatusColor(lobby.status)}`}>
              {lobby.status}
            </span>
            <span className="text-txt-muted">•</span>
            <span className="text-txt-muted">{stakeSOL} SOL stake</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teams */}
          <div className="lg:col-span-2 space-y-6">
            {/* Team 1 */}
            <GlassCard className="p-6">
              <GlassCardHeader>
                <GlassCardTitle className="text-xl font-display text-sol-purple">
                  Team 1 ({lobby.team1.length}/{lobby.teamSize})
                </GlassCardTitle>
              </GlassCardHeader>
              <div className="mt-4 space-y-2">
                {Array.from({ length: lobby.teamSize }).map((_, i) => {
                  const player = lobby.team1[i];
                  return (
                    <div
                      key={i}
                      className="p-3 bg-bg-dark rounded-lg flex items-center justify-between"
                    >
                      {player ? (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-txt-base font-mono text-sm">
                              {player.toString().slice(0, 8)}...
                            </span>
                          </div>
                          {publicKey?.toString() === player.toString() && (
                            <span className="text-xs text-sol-purple">You</span>
                          )}
                        </>
                      ) : (
                        <span className="text-txt-muted text-sm">
                          Empty slot
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-2 bg-bg-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${team1Progress}%` }}
                  />
                </div>
              </div>
            </GlassCard>

            {/* Team 2 */}
            <GlassCard className="p-6">
              <GlassCardHeader>
                <GlassCardTitle className="text-xl font-display text-sol-purple">
                  Team 2 ({lobby.team2.length}/{lobby.teamSize})
                </GlassCardTitle>
              </GlassCardHeader>
              <div className="mt-4 space-y-2">
                {Array.from({ length: lobby.teamSize }).map((_, i) => {
                  const player = lobby.team2[i];
                  return (
                    <div
                      key={i}
                      className="p-3 bg-bg-dark rounded-lg flex items-center justify-between"
                    >
                      {player ? (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-txt-base font-mono text-sm">
                              {player.toString().slice(0, 8)}...
                            </span>
                          </div>
                          {publicKey?.toString() === player.toString() && (
                            <span className="text-xs text-sol-purple">You</span>
                          )}
                        </>
                      ) : (
                        <span className="text-txt-muted text-sm">
                          Empty slot
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-2 bg-bg-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                    style={{ width: `${team2Progress}%` }}
                  />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Match Info */}
            <GlassCard className="p-6">
              <GlassCardHeader>
                <GlassCardTitle className="text-xl font-display text-sol-purple">
                  Match Info
                </GlassCardTitle>
              </GlassCardHeader>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-txt-muted">Stake:</span>
                  <span className="text-txt-base font-bold">
                    {stakeSOL} SOL
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-txt-muted">Pot:</span>
                  <span className="text-txt-base font-bold">
                    {(stakeSOL * lobby.teamSize * 2 * 0.99).toFixed(2)} SOL
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-txt-muted">Platform Fee:</span>
                  <span className="text-txt-base">1%</span>
                </div>
              </div>
            </GlassCard>

            {/* Actions - Only for participants */}
            {lobby.status === LobbyStatus.Open && !isViewer && (
              <GlassCard className="p-6">
                <GlassCardHeader>
                  <GlassCardTitle className="text-xl font-display text-sol-purple">
                    Join Match
                  </GlassCardTitle>
                </GlassCardHeader>
                {!isPlayerInLobby() && (
                  <div className="mt-4 space-y-3">
                    <GlowButton
                      variant={selectedSide === 0 ? "neon" : "ghost"}
                      onClick={() => setSelectedSide(0)}
                      className="w-full"
                      disabled={
                        lobby.team1.length >= lobby.teamSize || !connected
                      }
                    >
                      Join Team 1
                      {lobby.team1.length >= lobby.teamSize && " (Full)"}
                    </GlowButton>
                    <GlowButton
                      variant={selectedSide === 1 ? "neon" : "ghost"}
                      onClick={() => setSelectedSide(1)}
                      className="w-full"
                      disabled={
                        lobby.team2.length >= lobby.teamSize || !connected
                      }
                    >
                      Join Team 2
                      {lobby.team2.length >= lobby.teamSize && " (Full)"}
                    </GlowButton>
                    <GlowButton
                      variant="purple"
                      onClick={() => handleJoin(selectedSide)}
                      disabled={isJoining || !isInitialized || !connected}
                      className="w-full"
                    >
                      {isJoining ? "Joining..." : "Confirm Join"}
                    </GlowButton>
                  </div>
                )}
                {isPlayerInLobby() && (
                  <div className="mt-4 text-center text-txt-muted">
                    You are already in this match
                  </div>
                )}
              </GlassCard>
            )}

            {/* Viewer message */}
            {isViewer && (
              <GlassCard className="p-6">
                <GlassCardHeader>
                  <GlassCardTitle className="text-xl font-display text-sol-purple">
                    {lobby.status === LobbyStatus.Resolved
                      ? showResult || countdown === 0
                        ? "Match Result"
                        : `Results in ${countdown}s`
                      : "Viewing Match"}
                  </GlassCardTitle>
                </GlassCardHeader>
                <div className="mt-4 text-center">
                  {lobby.status === LobbyStatus.Resolved ? (
                    showResult || countdown === 0 ? (
                      <div className="space-y-3">
                        <div className="text-2xl font-bold text-sol-mint">
                          {lobby.status === LobbyStatus.Resolved
                            ? "Match Finished"
                            : "Match In Progress"}
                        </div>
                        <div className="text-txt-muted">
                          You are viewing this match as a spectator
                        </div>
                      </div>
                    ) : (
                      <div className="text-txt-muted">
                        Results will be revealed in {countdown} seconds...
                      </div>
                    )
                  ) : (
                    <div className="text-txt-muted">
                      You are viewing this match as a spectator. Connect your
                      wallet to participate.
                    </div>
                  )}
                </div>
              </GlassCard>
            )}

            {/* Refund - Only for participants */}
            {canRefund() && !isViewer && (
              <GlassCard className="p-6 border-red-500/30">
                <GlassCardHeader>
                  <GlassCardTitle className="text-xl font-display text-red-400">
                    Refund Match
                  </GlassCardTitle>
                </GlassCardHeader>
                <div className="mt-4">
                  <p className="text-sm text-txt-muted mb-4">
                    You can refund this match after 2 minutes if it hasn't
                    started.
                  </p>
                  <GlowButton
                    variant="ghost"
                    onClick={handleRefund}
                    disabled={isRefunding}
                    className="w-full border-red-500/30"
                  >
                    {isRefunding ? "Processing..." : "Request Refund"}
                  </GlowButton>
                </div>
              </GlassCard>
            )}

            {/* Error */}
            {error && (
              <GlassCard className="p-4 border-red-500/50">
                <p className="text-red-400 text-sm">{error}</p>
              </GlassCard>
            )}
          </div>
        </div>

        {/* Back button */}
        <div className="mt-8 flex justify-center">
          <GlowButton variant="ghost" onClick={() => navigate("/matches")}>
            Back to Matches
          </GlowButton>
        </div>
      </div>
    </div>
  );
};
