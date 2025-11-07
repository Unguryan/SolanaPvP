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
import { GameResultModal } from "@/components/game/GameResultModal";
import { Player, GameType, MatchMode } from "@/types/game";
import { usersApi } from "@/services/api/users";
import { matchesApi } from "@/services/api/matches";
import { mapTeamSizeToMatchType, mapGameModeToFrontend } from "@/utils/gameModeMapper";
import * as anchor from "@coral-xyz/anchor";
import { useWebSocketStore } from "@/store/websocketStore";

type PageMode = "preview" | "preparing" | "game" | "results";

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
  
  // Backend match data (has real-time status updates via SignalR!)
  const [matchFromBackend, setMatchFromBackend] = useState<any>(null);

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
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [gameTimeRemaining, setGameTimeRemaining] = useState<number>(20);
  const resultsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [gameResult, setGameResult] = useState<any>(null);
  
  // SignalR event handlers
  const { onMatchInProgress, onMatchFinalized, onMatchJoined } = useWebSocketStore();

  // Load match from backend for real-time status
  useEffect(() => {
    const loadMatchFromBackend = async () => {
      if (!matchPda || matchPda.startsWith("mock-")) return;
      
      try {
        console.log("📡 [MatchPreview] Loading match from backend:", matchPda);
        const match = await matchesApi.getMatch(matchPda);
        console.log("📡 [MatchPreview] Backend match status:", match.status);
        setMatchFromBackend(match);
      } catch (err) {
        console.log("📡 [MatchPreview] Match not in backend yet (normal for new lobbies)");
        console.error("📡 [MatchPreview] Error loading match from backend:", err);
      }
    };
    
    loadMatchFromBackend();
    
    // Cleanup timeout on unmount
    return () => {
      if (resultsTimeoutRef.current) {
        clearTimeout(resultsTimeoutRef.current);
        resultsTimeoutRef.current = null;
      }
    };
  }, [matchPda]);

  // Listen for match events
  useEffect(() => {
    const handleMatchInProgress = async (match: any) => {
      console.log("🎮 [MatchPreview] Match InProgress event received:", match);
      if (match.matchPda === matchPda && matchPda) {
        console.log("🎮 [MatchPreview] This is OUR match! Updating backend data...");
        // Update backend match data immediately
        setMatchFromBackend(match);
        
        // Immediately fetch full match data including gameData
        try {
          const fullMatchData = await matchesApi.getMatch(matchPda);
          setMatchFromBackend(fullMatchData);
          console.log("🎮 [MatchPreview] Full match data fetched:", fullMatchData);
        } catch (error) {
          console.error("🎮 [MatchPreview] Failed to fetch full match data:", error);
        }
      }
    };

    const handleMatchFinalized = (match: any) => {
      console.log("🏁 [MatchPreview] Match finalized event received:", match);
      if (match.matchPda === matchPda) {
        console.log("🏁 [MatchPreview] This is OUR match! Match complete!");
        // Update backend match data immediately
        setMatchFromBackend(match);
      }
    };

    const handleMatchJoined = async (match: any) => {
      console.log("👥 [MatchPreview] Match joined event received:", match);
      if (match.matchPda === matchPda) {
        console.log("👥 [MatchPreview] This is OUR match! Updating backend data...");
        // Update backend match data immediately
        setMatchFromBackend(match);
        
        // Start polling for InProgress status (in case matchInProgress event is missed)
        console.log("👥 [MatchPreview] Starting polling for InProgress status...");
        let pollCount = 0;
        const pollForInProgress = setInterval(async () => {
          pollCount++;
          try {
            const latestMatch = await matchesApi.getMatch(matchPda!);
            console.log(`[MatchPreview] Poll ${pollCount}/30 - Status: ${latestMatch.status}`);
            
            if (latestMatch.status === "InProgress" || latestMatch.status === "Resolved") {
              console.log("✅ [MatchPreview] Match became InProgress! Updating...");
              clearInterval(pollForInProgress);
              setMatchFromBackend(latestMatch);
            } else if (pollCount >= 30) {
              console.log("⏱️ [MatchPreview] Polling timeout (30 attempts)");
              clearInterval(pollForInProgress);
            }
          } catch (error) {
            console.error("[MatchPreview] Polling error:", error);
          }
        }, 1000); // Poll every 1 second
      }
    };

    onMatchInProgress(handleMatchInProgress);
    onMatchFinalized(handleMatchFinalized);
    onMatchJoined(handleMatchJoined);
  }, [matchPda, onMatchInProgress, onMatchFinalized, onMatchJoined]);

  // Update game time remaining every second
  useEffect(() => {
    if (pageMode === "game" && matchFromBackend?.gameStartTime) {
      const updateTimer = () => {
        const startTime = new Date(matchFromBackend.gameStartTime).getTime();
        const endTime = startTime + 25000; // +25 seconds
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        setGameTimeRemaining(remaining);
      };

      // Initial update
      updateTimer();

      // Update every second
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [pageMode, matchFromBackend?.gameStartTime]);

  // Fetch usernames for all players in the lobby
  useEffect(() => {
    const fetchUsernames = async () => {
      if (!lobby) return;

      const allPlayers = [...lobby.team1, ...lobby.team2];
      const newUsernames: Record<string, string> = {};

      // Fetch usernames for each player
      await Promise.all(
        allPlayers.map(async (player) => {
          const pubkey = player.toString();
          try {
            const userProfile = await usersApi.getUser(pubkey);
            newUsernames[pubkey] = userProfile.username;
          } catch {
            // If user not found or error, keep wallet address
            console.debug(`Could not fetch username for ${pubkey}`);
          }
        })
      );

      setUsernames(newUsernames);
    };

    fetchUsernames();
  }, [lobby]);

  // Determine if user is a viewer (not participant and not connected)
  useEffect(() => {
    if (!publicKey || !connected) {
      setIsViewer(true);
      return;
    }

    // Check blockchain data
    let isParticipantChain = false;
    if (lobby) {
      const allPlayers = [...lobby.team1, ...lobby.team2];
      isParticipantChain = allPlayers.some(
        (p) => p.toString() === publicKey.toString()
      );
    }

    // Also check backend data (more up-to-date)
    let isParticipantBackend = false;
    if (matchFromBackend?.participants) {
      isParticipantBackend = matchFromBackend.participants.some(
        (p: any) => p.pubkey === publicKey.toString()
      );
    }

    // If participant in either blockchain OR backend, they can play
    const isParticipant = isParticipantChain || isParticipantBackend;
    setIsViewer(!isParticipant);
    
    if (isParticipant) {
      console.log("✅ [MatchPreview] User IS participant, can play game");
    } else {
      console.log("👀 [MatchPreview] User is viewer, cannot play");
    }
  }, [lobby, publicKey, connected, matchFromBackend]);

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

  // Calculate time left with team-size-based timeout
  // 1v1: 2 minutes, 2v2: 5 minutes, 5v5: 10 minutes
  useEffect(() => {
    if (!lobby) return;

    const calculateTimeLeft = () => {
      const nowSeconds = Date.now() / 1000;
      
      // If match is resolved, show time until resolveAt + 20 seconds
      if (matchFromBackend?.status === "Resolved" && matchFromBackend?.resolvedAt) {
        const resolvedAtSeconds = new Date(matchFromBackend.resolvedAt).getTime() / 1000;
        const endTimeSeconds = resolvedAtSeconds + 20; // +20 seconds after resolve
        const remaining = Math.max(0, endTimeSeconds - nowSeconds);
        setTimeLeft(Math.floor(remaining));
        return;
      }
      
      // Otherwise show time until deadline (createdAt + timeout)
      const createdAtSeconds = lobby.createdAt.toNumber();
      const elapsed = nowSeconds - createdAtSeconds;

      // Determine timeout based on team size
      const timeout =
        lobby.teamSize === 1 ? 120 : lobby.teamSize === 2 ? 300 : 600;

      const remaining = Math.max(0, timeout - elapsed);
      setTimeLeft(Math.floor(remaining));
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [lobby, matchFromBackend]);

  // Page mode management based on lobby status (HYBRID: blockchain + backend)
  useEffect(() => {
    if (!lobby) return;

    // Use backend status if available (more up-to-date via SignalR!)
    const effectiveStatus = matchFromBackend?.status || lobby.status;
    console.log("🎮 [MatchPreview] Effective status:", effectiveStatus, "(backend:", matchFromBackend?.status, ", chain:", lobby.status, ")");

    if (effectiveStatus === "Open" && !isLobbyFull(lobby)) {
      setPageMode("preview");
    } 
    else if (effectiveStatus === "Pending") {
      setPageMode("preparing");
    }
    else if (effectiveStatus === "InProgress") {
      if (gameData) {
        setPageMode("game");
      } else {
        setPageMode("preparing"); // Still loading game data
      }
    }
    else if (effectiveStatus === "Resolved") {
      // Match is resolved - keep showing game for 20 seconds (to show result modal)
      // Sequence: Game → 1s → Modal appears → user can view/close → after 20s total → results page
      if (pageMode === "game" && !resultsTimeoutRef.current) {
        // Wait 20 seconds before showing results page (plenty of time for modal)
        resultsTimeoutRef.current = setTimeout(() => {
          setPageMode("results");
          resultsTimeoutRef.current = null;
        }, 20000);
      } else if (pageMode !== "game") {
        // Already on results page or other page, switch to results
        setPageMode("results");
      }
    }
    else {
      setPageMode("preview");
    }
  }, [lobby, gameData, matchFromBackend, pageMode]);

  // Poll backend for game data when preparing
  useEffect(() => {
    if (pageMode === "preparing" && lobby && matchPda) {
      const pollGameData = async () => {
        try {
          console.log("[MatchPreview] Polling for game data from backend...");

          // Fetch match data from backend API
          const matchData = await matchesApi.getMatch(matchPda);

          // Check if game data is available and participants exist
          if (matchData.gameData && matchData.participants) {
            console.log("[MatchPreview] Game data received from backend");

            // Convert participants to Player format for game board
            console.log("[MatchPreview] Usernames mapping:", usernames);
            console.log("[MatchPreview] Participants:", matchData.participants);
            
            // Sort participants by side and position before mapping
            const sortedParticipants = [...matchData.participants].sort((a: any, b: any) => {
              if (a.side !== b.side) return a.side - b.side; // Sort by side first (0, 1, 2, ...)
              return a.position - b.position; // Then by position within side
            });
            
            const players = sortedParticipants.map((p: any) => {
              // Use username from participant (from backend) as priority
              const finalUsername = p.username || usernames[p.pubkey] || p.pubkey.substring(0, 8) + "...";
              console.log(`[MatchPreview] Player ${p.pubkey.substring(0, 8)}: side=${p.side}, position=${p.position}, username from backend = ${p.username}, from mapping = ${usernames[p.pubkey]}, final = ${finalUsername}`);
              
              return {
                username: finalUsername,
                pubkey: p.pubkey, // Add pubkey for AI identification
                targetScore: p.targetScore || 0, // Backend's target for winning
                currentScore: 0, // Start from 0, accumulates from tile selections
                selections: [], // Will be filled by game board
                isReady: true,
              };
            });

            // Map backend gameMode string to frontend format
            console.log("[MatchPreview] Backend gameData:", matchData.gameData);
            const frontendGameMode = mapGameModeToFrontend(matchData.gameData.gameMode);
            console.log("[MatchPreview] Mapped gameMode:", frontendGameMode);
            console.log("[MatchPreview] Players:", players);
            
            setGameData({
              players,
              gameMode: frontendGameMode,
            });
          }
        } catch (err) {
          console.error("[MatchPreview] Failed to poll game data:", err);
        }
      };

      pollGameData();

      // Set up polling interval (poll every 2 seconds)
      pollingIntervalRef.current = setInterval(pollGameData, 2000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [pageMode, lobby, matchPda, usernames]);

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
      vrfSeed: Array(32).fill(0),
      vrfRequest: new PublicKey("11111111111111111111111111111115"),
      winnerSide: 0,
      game: "PickHigher",
      gameMode: "3x9",
      arenaType: "SingleBattle",
      teamSizeStr: "5v5",
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

      // Fetch backend data with polling - match will transition to Pending -> InProgress
      console.log("[MatchPreview] Starting to poll for match status updates...");
      
      // Poll backend every second for up to 30 seconds to catch status change
      let pollAttempts = 0;
      const maxPollAttempts = 30;
      
      const pollInterval = setInterval(async () => {
        pollAttempts++;
        console.log(`[MatchPreview] Polling attempt ${pollAttempts}/${maxPollAttempts}`);
        
        try {
          const response = await matchesApi.getMatch(matchPda!);
          console.log("[MatchPreview] Polled match status:", response.status);
          
          if (response.status === "InProgress" || response.status === "Resolved") {
            console.log("[MatchPreview] ✅ Match started! Status:", response.status);
            clearInterval(pollInterval);
            setMatchFromBackend(response);
            // Refetch lobby from blockchain as well
            await refetchLobby();
          } else if (pollAttempts >= maxPollAttempts) {
            console.log("[MatchPreview] ⏱️ Polling timeout reached, reloading page...");
            clearInterval(pollInterval);
            window.location.reload();
          }
        } catch (err) {
          console.error("[MatchPreview] Polling error:", err);
          if (pollAttempts >= maxPollAttempts) {
            clearInterval(pollInterval);
            window.location.reload();
          }
        }
      }, 1000); // Poll every 1 second
    } catch (err: any) {
      console.error("[MatchPreview] Failed to join lobby:", err);
      setError(err.message || "Failed to join match");
    }
  };

  const handleGameComplete = (result: any) => {
    console.log("Game completed:", result);
    // Show result modal
    setGameResult(result);
    setShowResultModal(true);
  };

  const handlePlayAgain = () => {
    // Cancel auto-transition timer
    if (resultsTimeoutRef.current) {
      clearTimeout(resultsTimeoutRef.current);
      resultsTimeoutRef.current = null;
    }
    
    navigate("/matches");
  };

  const handleViewLeaderboard = () => {
    // Cancel auto-transition timer
    if (resultsTimeoutRef.current) {
      clearTimeout(resultsTimeoutRef.current);
      resultsTimeoutRef.current = null;
    }
    
    navigate("/leaderboard");
  };

  const handleBackToLobby = () => {
    // Cancel auto-transition timer
    if (resultsTimeoutRef.current) {
      clearTimeout(resultsTimeoutRef.current);
      resultsTimeoutRef.current = null;
    }
    
    // Immediately go to results page
    setPageMode("results");
  };

  const canJoinTeam = (side: 0 | 1): boolean => {
    if (!lobby || !connected || !publicKey) return false;
    if (lobby.status !== LobbyStatus.Open) return false;
    if (isPlayerInLobby()) return false;

    // Prevent joining if less than 2 seconds remaining (deadline buffer)
    if (timeLeft <= 2) return false;

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

    // Only creator can refund
    const isCreator = lobby.creator.toString() === publicKey?.toString();
    if (!isCreator) return false;

    // Check if enough time has passed based on team size
    // 1v1: 2 minutes, 2v2: 5 minutes, 5v5: 10 minutes
    const createdAtSeconds = lobby.createdAt.toNumber();
    const nowSeconds = Date.now() / 1000;
    const timePassed = nowSeconds - createdAtSeconds;

    const refundDelay =
      lobby.teamSize === 1 ? 120 : lobby.teamSize === 2 ? 300 : 600;
    const canRefundTime = timePassed >= refundDelay;

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

  const getArenaTypeDisplay = () => {
    const arenaType = (lobby as any)?.arenaType || matchFromBackend?.matchMode || "SingleBattle";
    return arenaType === "DeathMatch" ? "Death Match" : "Single Battle";
  };

  const formatTimeLeft = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const formatAddress = (address: string): string => {
    if (address.length <= 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getPlayerDisplay = (playerPubkey: string): string => {
    // Try to get username from backend participants first
    const participant = matchFromBackend?.participants?.find(
      (p: any) => p.pubkey === playerPubkey
    );
    if (participant?.username) {
      return participant.username;
    }
    // Fallback to usernames state or formatted address
    return usernames[playerPubkey] || formatAddress(playerPubkey);
  };

  // Get team players from backend ONLY (more up-to-date via SignalR)
  const getTeam1Players = (): string[] => {
    if (matchFromBackend?.participants) {
      return matchFromBackend.participants
        .filter((p: any) => p.side === 0)
        .sort((a: any, b: any) => a.position - b.position)
        .map((p: any) => p.pubkey);
    }
    // Don't fallback to blockchain data - return empty if no backend data
    // Backend is source of truth via SignalR
    return [];
  };

  const getTeam2Players = (): string[] => {
    if (matchFromBackend?.participants) {
      return matchFromBackend.participants
        .filter((p: any) => p.side === 1)
        .sort((a: any, b: any) => a.position - b.position)
        .map((p: any) => p.pubkey);
    }
    // Don't fallback to blockchain data - return empty if no backend data
    // Backend is source of truth via SignalR
    return [];
  };

  // No longer blocking viewers - removed the wallet check

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg py-4 lg:py-8">
        <div className="max-w-4xl mx-auto px-3 lg:px-4">
          <Skeleton className="h-20 w-full mb-4 lg:mb-6" />
          <Skeleton className="h-64 w-full mb-4 lg:mb-6" />
          <Skeleton className="h-64 w-full mb-4 lg:mb-6" />
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
  const team1Progress = (getTeam1Players().length / lobby.teamSize) * 100;
  const team2Progress = (getTeam2Players().length / lobby.teamSize) * 100;

  // Render game mode
  if (pageMode === "game" && gameData) {
    if (isViewer) {
      // Spectators only see stats, not the game board
      return (
        <div className="min-h-screen bg-bg py-4 lg:py-8">
          <div className="max-w-4xl mx-auto px-3 lg:px-6">
            <motion.div
              className="text-center mb-4 lg:mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-2xl lg:text-4xl font-display font-bold text-txt-base mb-2">
                {getArenaTypeDisplay()} #{lobby.lobbyId.toString()}
              </h1>
              <div className="flex items-center justify-center gap-2">
                <span className="text-base lg:text-lg text-blue-400">{lobby.status}</span>
                <span className="text-txt-muted">•</span>
                <span className="text-txt-muted text-sm lg:text-base">{stakeSOL} SOL stake</span>
              </div>
            </motion.div>

            <GlassCard className="p-4 lg:p-8 text-center">
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
      <div className="min-h-screen bg-bg py-4 lg:py-8">
        <div className="max-w-7xl mx-auto px-3 lg:px-6">
          <motion.div
            className="text-center mb-4 lg:mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-xl lg:text-4xl font-display font-bold text-txt-base mb-2">
              {getArenaTypeDisplay()} #{lobby.lobbyId.toString()}
            </h1>
          </motion.div>

          <UniversalGameBoard
            gameType={GameType.PickHigher}
            gameMode={gameData.gameMode}
            matchMode={MatchMode.Team}
            teamSize={mapTeamSizeToMatchType(matchFromBackend?.teamSize || "OneVOne") as "Solo" | "Duo" | "Team"}
            stakeSol={stakeSOL}
            players={gameData.players}
            currentPlayer="You"
            currentPlayerPubkey={publicKey?.toBase58()}
            matchFromBackend={matchFromBackend}
            timeLimit={gameTimeRemaining}
            onGameComplete={handleGameComplete}
            isDemoMode={false}
          />

          <div className="mt-8 flex justify-center">
            <GlowButton variant="ghost" onClick={() => navigate("/matches")}>
              Exit Match
            </GlowButton>
          </div>
        </div>
        
        {/* Result Modal - rendered here so it persists across pageMode changes */}
        <GameResultModal
          isOpen={showResultModal}
          result={gameResult}
          onClose={() => setShowResultModal(false)}
          onPlayAgain={handlePlayAgain}
          onViewLeaderboard={handleViewLeaderboard}
          onBackToLobby={handleBackToLobby}
          isDemoMode={false}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-4 lg:py-8 relative">
      {/* Join Message Toast */}
      <AnimatePresence>
        {joinMessage && (
          <motion.div
            className="fixed top-0 left-0 right-0 z-[100] flex justify-center md:pt-[6vh] pt-[6vh] px-3 pointer-events-none"
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
                Preparing Match
              </h2>
              {matchFromBackend?.status === "Pending" && matchFromBackend?.pendingAt ? (
                <p className="text-xl text-txt-muted">
                  {Date.now() - new Date(matchFromBackend.pendingAt).getTime() < 5000
                    ? "Creating new Arena...."
                    : "Waiting for VRF..."}
                </p>
              ) : (
                <p className="text-xl text-txt-muted">Preparing arena...</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-3 lg:px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-4 lg:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-xl lg:text-4xl font-display font-bold text-txt-base mb-2">
            {getArenaTypeDisplay()} #{lobby.lobbyId.toString()}
          </h1>
        </motion.div>

        {/* Match Info */}
        <GlassCard className="p-3 lg:p-6 mb-3 lg:mb-4">
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
              <p className="text-xs lg:text-sm text-txt-muted mb-1">Game</p>
              <p className="text-sm lg:text-lg font-semibold text-txt-base">
                {(lobby as any)?.game === "PickHigher" ? "Pick Higher" : (lobby as any)?.game || matchFromBackend?.gameType || "Pick Higher"}
              </p>
            </div>
            <div>
              <p className="text-xs lg:text-sm text-txt-muted mb-1">Game Mode</p>
              <p className="text-sm lg:text-lg font-semibold text-txt-base">
                {(lobby as any)?.gameMode || matchFromBackend?.gameMode || "3x9"}
              </p>
            </div>
            <div>
              <p className="text-xs lg:text-sm text-txt-muted mb-1">Team Size</p>
              <p className="text-sm lg:text-lg font-semibold text-txt-base">
                {(lobby as any)?.teamSizeStr || matchFromBackend?.teamSize || `${lobby.teamSize}v${lobby.teamSize}`}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Teams - Side by side */}
        <div className="grid grid-cols-2 gap-4 lg:gap-6 mb-6">
          {/* Team 1 */}
          <GlassCard className={`p-4 ${
            matchFromBackend?.status === "Resolved" && matchFromBackend?.winnerSide === 0
              ? "border-2 border-sol-mint shadow-glow-mint"
              : ""
          }`}>
            <GlassCardHeader>
              <GlassCardTitle className="text-base lg:text-xl font-display text-sol-purple flex items-center justify-between">
                <span>Team 1 ({getTeam1Players().length}/{lobby.teamSize})</span>
                {matchFromBackend?.status === "Resolved" && matchFromBackend?.winnerSide === 0 && (
                  <span className="text-green-400 font-bold text-xs">WIN</span>
                )}
              </GlassCardTitle>
            </GlassCardHeader>
            <div className="mt-2 lg:mt-4 space-y-1 lg:space-y-2">
              {Array.from({ length: lobby.teamSize }).map((_, i) => {
                const team1Players = getTeam1Players();
                const playerPubkey = team1Players[i];
                return (
                  <div
                    key={i}
                    className="p-2 lg:p-3 bg-bg-dark rounded-lg flex items-center gap-2"
                  >
                    {playerPubkey ? (
                      <>
                        <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                        <span className="text-txt-base text-xs lg:text-sm flex-1 truncate">
                          {getPlayerDisplay(playerPubkey)}
                        </span>
                        {publicKey?.toString() === playerPubkey && (
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
          <GlassCard className={`p-4 ${
            matchFromBackend?.status === "Resolved" && matchFromBackend?.winnerSide === 1
              ? "border-2 border-sol-mint shadow-glow-mint"
              : ""
          }`}>
            <GlassCardHeader>
              <GlassCardTitle className="text-base lg:text-xl font-display text-sol-purple flex items-center justify-between">
                <span>Team 2 ({getTeam2Players().length}/{lobby.teamSize})</span>
                {matchFromBackend?.status === "Resolved" && matchFromBackend?.winnerSide === 1 && (
                  <span className="text-green-400 font-bold text-xs">WIN</span>
                )}
              </GlassCardTitle>
            </GlassCardHeader>
            <div className="mt-2 lg:mt-4 space-y-1 lg:space-y-2">
              {Array.from({ length: lobby.teamSize }).map((_, i) => {
                const team2Players = getTeam2Players();
                const playerPubkey = team2Players[i];
                return (
                  <div
                    key={i}
                    className="p-2 lg:p-3 bg-bg-dark rounded-lg flex items-center gap-2"
                  >
                    {playerPubkey ? (
                      <>
                        <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                        <span className="text-txt-base text-xs lg:text-sm flex-1 truncate">
                          {getPlayerDisplay(playerPubkey)}
                        </span>
                        {publicKey?.toString() === playerPubkey && (
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
          lobby.status === LobbyStatus.Open &&
          matchFromBackend?.status === "Open" && (
            <GlassCard className="p-6 mb-6 text-center">
              <p className="text-sol-mint font-semibold">
                ✓ You are already in this match
              </p>
              <p className="text-txt-muted text-sm mt-2">
                Waiting for other players to join...
              </p>
            </GlassCard>
          )}

        {/* Refund - Only for creator after timeout */}
        {lobby.creator.toString() === publicKey?.toString() &&
          !isViewer &&
          lobby.status === LobbyStatus.Open &&
          matchFromBackend?.status === "Open" && (
            <GlassCard className="p-6 mb-6 border-red-500/30">
              <GlassCardHeader>
                <GlassCardTitle className="text-xl font-display text-red-400">
                  Refund Match
                </GlassCardTitle>
              </GlassCardHeader>
              <div className="mt-4">
                {canRefund() ? (
                  <>
                    <p className="text-sm text-txt-muted mb-4">
                      No one joined your match? Request a refund to get your
                      stake back.
                    </p>
                    <GlowButton
                      variant="ghost"
                      onClick={handleRefund}
                      disabled={isRefunding}
                      className="w-full border-red-500/30"
                    >
                      {isRefunding ? "Processing..." : "Request Refund"}
                    </GlowButton>
                  </>
                ) : (
                  <p className="text-sm text-txt-muted">
                    Refund will be available in {formatTimeLeft(timeLeft)}
                  </p>
                )}
              </div>
            </GlassCard>
          )}

        {/* Error */}
        {error && (
          <GlassCard className="p-4 mb-6 border-red-500/50">
            <p className="text-red-400 text-sm">{error}</p>
          </GlassCard>
        )}

        {/* Transaction Link - only shown when match is Resolved */}
        {pageMode === "results" && matchFromBackend?.payoutTx && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <GlassCard>
              <div>
                <h3 className="text-sm font-semibold text-txt-muted mb-2">
                  Blockchain Transaction
                </h3>
                <a
                  href={`https://solscan.io/tx/${matchFromBackend.payoutTx}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sol-purple hover:text-sol-mint transition-colors break-all text-sm inline-flex items-center gap-1"
                >
                  <span>{matchFromBackend.payoutTx}</span>
                </a>
              </div>
            </GlassCard>
          </motion.div>
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
