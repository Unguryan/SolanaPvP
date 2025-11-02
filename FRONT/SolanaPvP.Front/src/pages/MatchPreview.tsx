// MatchPreview page - View and interact with match/lobby
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { GlowButton } from "@/components/ui/GlowButton";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard";
import { useLobbyOperations, useLobbyData } from "@/hooks/usePvpProgram";
import {
  LobbyAccount,
  LobbyStatus,
  isLobbyFull,
} from "@/services/solana/accounts";
import { Skeleton } from "@/components/ui/Skeleton";
import { UniversalGameBoard } from "@/components/game/UniversalGameBoard";
import { Player, GameResult } from "@/types/game";
import { generateDemoPlayers } from "@/lib/gameMockGenerator";
import * as anchor from "@coral-xyz/anchor";

type PageMode = "preview" | "preparing" | "game";

export const MatchPreview: React.FC = () => {
  const { matchPda } = useParams<{ matchPda: string }>();
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const { joinLobby, refundLobby, isJoining, isRefunding } =
    useLobbyOperations();

  // Use the hook to fetch lobby data from blockchain
  const lobbyPdaPubkey =
    matchPda && !matchPda.startsWith("mock-")
      ? new PublicKey(matchPda)
      : undefined;
  const {
    lobby: lobbyFromChain,
    isLoading: isLoadingChain,
    error: errorChain,
    refetch: refetchLobby,
  } = useLobbyData(lobbyPdaPubkey);

  // For mock lobbies only
  const [mockLobby, setMockLobby] = useState<LobbyAccount | null>(null);

  // Use lobby from hook or mock
  const lobby = matchPda?.startsWith("mock-") ? mockLobby : lobbyFromChain;
  const isLoading = matchPda?.startsWith("mock-")
    ? mockLobby === null
    : isLoadingChain;
  const loadError = matchPda?.startsWith("mock-") ? null : errorChain;

  // UI state for operations (join/refund errors)
  const [error, setError] = useState<string | null>(null);
  const [isViewer, setIsViewer] = useState(false);
  const [pageMode, setPageMode] = useState<PageMode>("preview");
  const [gameData, setGameData] = useState<{
    players: Player[];
    gameMode: "PickThreeFromNine" | "PickFiveFromSixteen" | "PickOneFromThree";
  } | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);

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

  // Fetch user balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (publicKey && connected) {
        try {
          const connection = new anchor.web3.Connection(
            "https://api.devnet.solana.com"
          );
          const balance = await connection.getBalance(publicKey);
          setUserBalance(balance / LAMPORTS_PER_SOL);
        } catch (err) {
          console.error("Failed to fetch balance:", err);
        }
      }
    };
    fetchBalance();
  }, [publicKey, connected]);

  // Calculate time left (5 minutes timeout for lobby)
  useEffect(() => {
    if (!lobby) return;

    const calculateTimeLeft = () => {
      const createdAtSeconds = lobby.createdAt.toNumber();
      const nowSeconds = Date.now() / 1000;
      const elapsed = nowSeconds - createdAtSeconds;
      const timeout = 300; // 5 minutes in seconds
      const remaining = Math.max(0, timeout - elapsed);
      setTimeLeft(Math.floor(remaining));
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [lobby]);

  // Page mode management based on lobby status
  useEffect(() => {
    if (!lobby) return;

    if (lobby.status === LobbyStatus.Open && !isLobbyFull(lobby)) {
      setPageMode("preview");
    } else if (
      lobby.status === LobbyStatus.Open &&
      isLobbyFull(lobby) &&
      !gameData
    ) {
      setPageMode("preparing");
    } else if (
      lobby.status === LobbyStatus.Pending ||
      lobby.status === LobbyStatus.Resolved
    ) {
      if (gameData) {
        setPageMode("game");
      } else {
        setPageMode("preparing");
      }
    } else {
      setPageMode("preview");
    }
  }, [lobby, gameData]);

  // Poll backend for game data when preparing
  useEffect(() => {
    if (pageMode === "preparing" && lobby) {
      const pollGameData = async () => {
        try {
          // TODO: Replace with actual API call to fetch game data
          // For now, simulate with mock data after 3 seconds
          console.log("Polling for game data...");

          // Mock: After 3 seconds, generate game data
          setTimeout(() => {
            const mockPlayers = generateDemoPlayers("Solo", "You");
            setGameData({
              players: mockPlayers,
              gameMode: "PickThreeFromNine",
            });
          }, 3000);
        } catch (err) {
          console.error("Failed to poll game data:", err);
        }
      };

      pollGameData();

      // Set up polling interval
      pollingIntervalRef.current = setInterval(pollGameData, 3000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [pageMode, lobby]);

  // Load mock lobby data only for mock matches
  useEffect(() => {
    if (!matchPda || !matchPda.startsWith("mock-")) return;

    // Create mock lobby data
    const mockData: LobbyAccount = {
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
      randomnessAccount: new PublicKey("11111111111111111111111111111115"),
      winnerSide: 0,
    };

    setTimeout(() => {
      setMockLobby(mockData);
    }, 500);
  }, [matchPda]);

  const handleJoin = async (side: 0 | 1) => {
    if (!publicKey || !matchPda || !lobby) return;

    try {
      setError(null);
      const lobbyPubkey = new PublicKey(matchPda);

      console.log("[MatchPreview] Joining lobby:", {
        lobbyPda: lobbyPubkey.toString(),
        creator: lobby.creator.toString(),
        player: publicKey.toString(),
        side,
      });

      // TODO: Get VRF accounts for last join if needed
      const tx = await joinLobby({
        lobbyPda: lobbyPubkey,
        creator: lobby.creator,
        side,
      });

      console.log("[MatchPreview] Join transaction successful:", tx);

      // Reload lobby data from blockchain
      await refetchLobby();

      // Also reload the page state
      window.location.reload();
    } catch (err: any) {
      console.error("[MatchPreview] Failed to join lobby:", err);
      setError(err.message || "Failed to join match");
    }
  };

  const handleGameComplete = (result: GameResult) => {
    console.log("Game completed:", result);
    // TODO: Handle game completion (update backend, show results, etc.)
  };

  const canJoinTeam = (side: 0 | 1): boolean => {
    if (!lobby || !connected || !publicKey) return false;
    if (lobby.status !== LobbyStatus.Open) return false;
    if (isPlayerInLobby()) return false;

    const team = side === 0 ? lobby.team1 : lobby.team2;
    const hasSpace = team.length < lobby.teamSize;
    const stakeSOL = lobby.stakeLamports.toNumber() / LAMPORTS_PER_SOL;
    const hasFunds = userBalance >= stakeSOL;

    return hasSpace && hasFunds;
  };

  const getJoinDisabledReason = (side: 0 | 1): string | null => {
    if (!lobby) return "Match not found";
    if (!connected || !publicKey) return "Connect your wallet to join";
    if (lobby.status !== LobbyStatus.Open) return "Match is not open";
    if (isPlayerInLobby()) return "You are already in this match";

    const team = side === 0 ? lobby.team1 : lobby.team2;
    const hasSpace = team.length < lobby.teamSize;
    const stakeSOL = lobby.stakeLamports.toNumber() / LAMPORTS_PER_SOL;
    const hasFunds = userBalance >= stakeSOL;

    if (!hasSpace) return "Team is full";
    if (!hasFunds)
      return `Insufficient funds (need ${stakeSOL} SOL, have ${userBalance.toFixed(
        2
      )} SOL)`;

    return null;
  };

  const handleJoinAttempt = (side: 0 | 1) => {
    const reason = getJoinDisabledReason(side);
    if (reason) {
      setJoinMessage(reason);
      setTimeout(() => setJoinMessage(null), 5000);
      return;
    }
    handleJoin(side);
  };

  const handleRefund = async () => {
    if (!publicKey || !matchPda || !lobby) return;

    // Check if user is authorized to refund (only creator or admin)
    const isCreator = lobby.creator.toString() === publicKey?.toString();
    // TODO: Check if user is admin from GlobalConfig
    // For now, allow creator only

    if (!isCreator) {
      setError("Only the lobby creator can request a refund");
      return;
    }

    try {
      setError(null);
      const lobbyPubkey = new PublicKey(matchPda);
      const participants = [...lobby.team1, ...lobby.team2];

      console.log("[MatchPreview] Requesting refund:", {
        lobbyPda: lobbyPubkey.toString(),
        creator: lobby.creator.toString(),
        requester: publicKey.toString(),
        participantsCount: participants.length,
      });

      const tx = await refundLobby({
        lobbyPda: lobbyPubkey,
        creator: lobby.creator,
        participants,
        lobbyAccount: lobby, // Pass lobby data for PDA resolution
      });

      console.log("[MatchPreview] Refund transaction successful:", tx);

      // Wait a bit for blockchain to confirm
      setTimeout(() => {
        // Navigate back
        navigate("/matches");
      }, 1500);
    } catch (err: any) {
      console.error("[MatchPreview] Failed to refund:", err);
      setError(err.message || "Failed to refund");
    }
  };

  const canRefund = () => {
    if (!lobby || !publicKey) return false;
    if (lobby.status !== LobbyStatus.Open) return false;

    // Only creator can refund (or admin, but we don't check that here)
    const isCreator = lobby.creator.toString() === publicKey?.toString();

    if (!isCreator) return false;

    // Check if 2 minutes have passed
    const createdAtSeconds = lobby.createdAt.toNumber();
    const nowSeconds = Date.now() / 1000;
    const timePassed = nowSeconds - createdAtSeconds;
    const canRefundTime = timePassed >= 120; // 2 minutes

    return canRefundTime;
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

  const formatTimeLeft = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
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

  if (!lobby && !isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-bold text-txt-base mb-4">
            Match Not Found
          </h2>
          <p className="text-txt-muted mb-6">
            {loadError || "This match does not exist or has been removed"}
          </p>
          <GlowButton onClick={() => navigate("/matches")} variant="neon">
            Go Back
          </GlowButton>
        </GlassCard>
      </div>
    );
  }

  // Early return if still loading or no lobby
  if (!lobby) {
    return null; // Will show loading skeleton above
  }

  const stakeSOL = lobby.stakeLamports.toNumber() / LAMPORTS_PER_SOL;
  const team1Progress = (lobby.team1.length / lobby.teamSize) * 100;
  const team2Progress = (lobby.team2.length / lobby.teamSize) * 100;

  // Render game mode
  if (pageMode === "game" && gameData) {
    if (isViewer) {
      // Spectators only see stats, not the game board
      return (
        <div className="min-h-screen bg-bg py-8">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-4xl font-display font-bold text-txt-base mb-2">
                Match #{lobby.lobbyId.toString()}
              </h1>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg text-blue-400">{lobby.status}</span>
                <span className="text-txt-muted">•</span>
                <span className="text-txt-muted">{stakeSOL} SOL stake</span>
              </div>
            </motion.div>

            <GlassCard className="p-8 text-center">
              <h2 className="text-2xl font-bold text-sol-purple mb-4">
                Watching Match
              </h2>
              <p className="text-txt-muted mb-6">
                You are viewing this match as a spectator. Only participants can
                see the game board.
              </p>

              <div className="mt-8">
                <h3 className="text-xl font-semibold text-txt-base mb-4">
                  Match Status
                </h3>
                <div className="space-y-2 text-txt-muted">
                  <p>Teams are currently playing...</p>
                  <p>Results will be available when the match completes.</p>
                </div>
              </div>
            </GlassCard>

            <div className="mt-8 flex justify-center">
              <GlowButton variant="ghost" onClick={() => navigate("/matches")}>
                Back to Matches
              </GlowButton>
            </div>
          </div>
        </div>
      );
    }

    // Participants see the full game
    return (
      <div className="min-h-screen bg-bg py-8">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-display font-bold text-txt-base mb-2">
              Match #{lobby.lobbyId.toString()}
            </h1>
          </motion.div>

          <UniversalGameBoard
            gameMode={gameData.gameMode}
            matchType="Solo"
            stakeSol={stakeSOL}
            players={gameData.players}
            currentPlayer="You"
            timeLimit={20}
            onGameComplete={handleGameComplete}
            isDemoMode={false}
          />

          <div className="mt-8 flex justify-center">
            <GlowButton variant="ghost" onClick={() => navigate("/matches")}>
              Exit Match
            </GlowButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-8 relative">
      {/* Join Message Toast */}
      <AnimatePresence>
        {joinMessage && (
          <motion.div
            className="fixed top-0 left-0 right-0 z-[100] flex justify-center md:pt-[6vh] pt-[6vh] px-4 pointer-events-none"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.4 }}
          >
            <div className="glass-card p-4 border-yellow-500/50 bg-yellow-500/10 max-w-md w-full pointer-events-auto">
              <p className="text-yellow-400 text-sm text-center font-semibold">
                {joinMessage}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preparation Overlay */}
      <AnimatePresence>
        {pageMode === "preparing" && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backdropFilter: "blur(10px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60" />
            <motion.div
              className="relative z-10 text-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="text-8xl mb-6"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                ⚔️
              </motion.div>
              <h2 className="text-4xl font-display font-bold text-sol-purple mb-3">
                Подготовка матча
              </h2>
              <p className="text-xl text-txt-muted">Ожидание результатов...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-6 lg:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl lg:text-4xl font-display font-bold text-txt-base mb-2">
            Match #{lobby.lobbyId.toString()}
          </h1>
        </motion.div>

        {/* Match Info */}
        <GlassCard className="p-4 lg:p-6 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
            <div>
              <p className="text-xs lg:text-sm text-txt-muted mb-1">Status</p>
              <p
                className={`text-sm lg:text-lg font-semibold ${getStatusColor(
                  lobby.status
                )}`}
              >
                {lobby.status}
              </p>
            </div>
            <div>
              <p className="text-xs lg:text-sm text-txt-muted mb-1">Stake</p>
              <p className="text-sm lg:text-lg font-semibold text-txt-base">
                {stakeSOL} SOL
              </p>
            </div>
            <div>
              <p className="text-xs lg:text-sm text-txt-muted mb-1">Time</p>
              <p className="text-sm lg:text-lg font-semibold text-txt-base">
                {formatTimeLeft(timeLeft)}
              </p>
            </div>
            <div>
              <p className="text-xs lg:text-sm text-txt-muted mb-1">Pot</p>
              <p className="text-sm lg:text-lg font-semibold text-txt-base">
                {(stakeSOL * lobby.teamSize * 2 * 0.99).toFixed(2)} SOL
              </p>
            </div>
            <div>
              <p className="text-xs lg:text-sm text-txt-muted mb-1">Game</p>
              <p className="text-sm lg:text-lg font-semibold text-txt-base">
                3x3
              </p>
            </div>
            <div>
              <p className="text-xs lg:text-sm text-txt-muted mb-1">Mode</p>
              <p className="text-sm lg:text-lg font-semibold text-txt-base">
                {lobby.teamSize}v{lobby.teamSize}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Teams - Side by side */}
        <div className="grid grid-cols-2 gap-4 lg:gap-6 mb-6">
          {/* Team 1 */}
          <GlassCard className="p-6">
            <GlassCardHeader>
              <GlassCardTitle className="text-base lg:text-xl font-display text-sol-purple">
                Team 1 ({lobby.team1.length}/{lobby.teamSize})
              </GlassCardTitle>
            </GlassCardHeader>
            <div className="mt-2 lg:mt-4 space-y-1 lg:space-y-2">
              {Array.from({ length: lobby.teamSize }).map((_, i) => {
                const player = lobby.team1[i];
                return (
                  <div
                    key={i}
                    className="p-2 lg:p-3 bg-bg-dark rounded-lg flex items-center gap-2"
                  >
                    {player ? (
                      <>
                        <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                        <span className="text-txt-base font-mono text-xs lg:text-sm flex-1 truncate">
                          {player.toString()}
                        </span>
                        {publicKey?.toString() === player.toString() && (
                          <span className="text-xs text-sol-purple flex-shrink-0">
                            You
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-txt-muted text-xs lg:text-sm">
                        Empty slot
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Progress bar */}
            <div className="mt-2 lg:mt-4">
              <div className="h-1.5 lg:h-2 bg-bg-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${team1Progress}%` }}
                />
              </div>
            </div>
            {/* Join Button */}
            {lobby.status === LobbyStatus.Open && !isPlayerInLobby() && (
              <div className="mt-3 lg:mt-4">
                <GlowButton
                  variant="blue"
                  size="sm"
                  onClick={() => handleJoinAttempt(0)}
                  disabled={isJoining}
                  className={`w-full ${
                    !canJoinTeam(0) ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isJoining ? "Joining..." : "Join Team 1"}
                </GlowButton>
              </div>
            )}
          </GlassCard>

          {/* Team 2 */}
          <GlassCard className="p-6">
            <GlassCardHeader>
              <GlassCardTitle className="text-base lg:text-xl font-display text-sol-purple">
                Team 2 ({lobby.team2.length}/{lobby.teamSize})
              </GlassCardTitle>
            </GlassCardHeader>
            <div className="mt-2 lg:mt-4 space-y-1 lg:space-y-2">
              {Array.from({ length: lobby.teamSize }).map((_, i) => {
                const player = lobby.team2[i];
                return (
                  <div
                    key={i}
                    className="p-2 lg:p-3 bg-bg-dark rounded-lg flex items-center gap-2"
                  >
                    {player ? (
                      <>
                        <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                        <span className="text-txt-base font-mono text-xs lg:text-sm flex-1 truncate">
                          {player.toString()}
                        </span>
                        {publicKey?.toString() === player.toString() && (
                          <span className="text-xs text-sol-purple flex-shrink-0">
                            You
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-txt-muted text-xs lg:text-sm">
                        Empty slot
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Progress bar */}
            <div className="mt-2 lg:mt-4">
              <div className="h-1.5 lg:h-2 bg-bg-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                  style={{ width: `${team2Progress}%` }}
                />
              </div>
            </div>
            {/* Join Button */}
            {lobby.status === LobbyStatus.Open && !isPlayerInLobby() && (
              <div className="mt-3 lg:mt-4">
                <GlowButton
                  variant="orange"
                  size="sm"
                  onClick={() => handleJoinAttempt(1)}
                  disabled={isJoining}
                  className={`w-full ${
                    !canJoinTeam(1) ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isJoining ? "Joining..." : "Join Team 2"}
                </GlowButton>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Participant already in match message */}
        {!isViewer &&
          isPlayerInLobby() &&
          lobby.status === LobbyStatus.Open && (
            <GlassCard className="p-6 mb-6 text-center">
              <p className="text-sol-mint font-semibold">
                ✓ You are already in this match
              </p>
              <p className="text-txt-muted text-sm mt-2">
                Waiting for other players to join...
              </p>
            </GlassCard>
          )}

        {/* Refund - Only for participants */}
        {canRefund() && !isViewer && (
          <GlassCard className="p-6 mb-6 border-red-500/30">
            <GlassCardHeader>
              <GlassCardTitle className="text-xl font-display text-red-400">
                Refund Match
              </GlassCardTitle>
            </GlassCardHeader>
            <div className="mt-4">
              <p className="text-sm text-txt-muted mb-4">
                You can refund this match after 2 minutes if it hasn't started.
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
          <GlassCard className="p-4 mb-6 border-red-500/50">
            <p className="text-red-400 text-sm">{error}</p>
          </GlassCard>
        )}

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
