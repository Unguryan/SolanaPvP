// CreateLobby page - Create new match/lobby
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import { GlowButton } from "@/components/ui/GlowButton";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard";
import {
  usePvpProgram,
  useLobbyOperations,
  useLobbyData,
} from "@/hooks/usePvpProgram";
import { useActiveLobby } from "@/hooks/useActiveLobby";
import { PdaUtils } from "@/services/solana/accounts";
import { MIN_STAKE_LAMPORTS } from "@/services/solana/config";
import { AuroraBackground } from "@/components/effects/AuroraBackground";
import { cn } from "@/utils/cn";

type GameMode =
  | "Pick3from9"
  | "Pick5from16"
  | "Pick1from3"
  | "GoldBars1v9"
  | "GoldBars3v16"
  | "GoldBars5v25"
  | "Plinko3Balls"
  | "Plinko5Balls"
  | "Plinko7Balls"
  | "Miner1v9"
  | "Miner3v16"
  | "Miner5v25";
type TeamSize = 1 | 2 | 5;
type GameCategory = "PickHigher" | "GoldBars" | "Plinko" | "Miner";

export const CreateLobby: React.FC = () => {
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const { isInitialized } = usePvpProgram();
  const { createLobby, refundLobby, isCreating, isRefunding } =
    useLobbyOperations();
  const {
    hasActiveLobby,
    activeLobby,
    isLoading: isLoadingActive,
  } = useActiveLobby();

  const [currentGame, setCurrentGame] = useState<GameCategory>("PickHigher");
  const [gameMode, setGameMode] = useState<GameMode>("Pick3from9");
  const [teamSize, setTeamSize] = useState<TeamSize>(1);
  const [stakeSOL, setStakeSOL] = useState(0.1);
  const [side, setSide] = useState<0 | 1>(0);
  const [lobbyId] = useState(Date.now());

  // Reset gameMode when switching games
  useEffect(() => {
    if (currentGame === "PickHigher") {
      setGameMode("Pick3from9");
    } else if (currentGame === "GoldBars") {
      setGameMode("GoldBars1v9");
    } else if (currentGame === "Plinko") {
      setGameMode("Plinko3Balls");
    } else if (currentGame === "Miner") {
      setGameMode("Miner1v9");
    }
  }, [currentGame]);
  const [stakeError, setStakeError] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);

  // Fetch full lobby data from blockchain if user has active lobby
  const { lobby: lobbyData } = useLobbyData(activeLobby?.lobby);

  const pickHigherModes: { mode: GameMode; label: string; icon: string }[] = [
    { mode: "Pick3from9", label: "3v9", icon: "🏆" }, // Сундуки (3x3)
    { mode: "Pick5from16", label: "5v16", icon: "🎯" }, // Плитки (4x4)
    { mode: "Pick1from3", label: "1v3", icon: "🎴" }, // Карты (3 cards)
  ];

  const plinkoModes: { mode: GameMode; label: string; icon: string }[] = [
    { mode: "Plinko3Balls", label: "3 Balls", icon: "🎱" },
    { mode: "Plinko5Balls", label: "5 Balls", icon: "🎱" },
    { mode: "Plinko7Balls", label: "7 Balls", icon: "🎱" },
  ];

  const goldBarsModes: { mode: GameMode; label: string; icon: string }[] = [
    { mode: "GoldBars1v9", label: "1v9", icon: "🥇" }, // 3x3 grid
    { mode: "GoldBars3v16", label: "3v16", icon: "🥇" }, // 4x4 grid
    { mode: "GoldBars5v25", label: "5v25", icon: "🥇" }, // 5x5 grid
  ];

  const minerModes: { mode: GameMode; label: string; icon: string }[] = [
    { mode: "Miner1v9", label: "1v9", icon: "💣" }, // 3x3 grid
    { mode: "Miner3v16", label: "3v16", icon: "💣" }, // 4x4 grid
    { mode: "Miner5v25", label: "5v25", icon: "💣" }, // 5x5 grid
  ];

  const teamSizes: { size: TeamSize; label: string; description: string }[] = [
    { size: 1, label: "1v1", description: "Solo" },
    { size: 2, label: "2v2", description: "Duo" },
    { size: 5, label: "5v5", description: "Team" },
  ];

  // NOTE: Removed redirect - allow viewing page without wallet
  // User will get validation message when trying to create

  // Fetch user balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (publicKey && connected) {
        try {
          const connection = new Connection("https://api.devnet.solana.com");
          const balance = await connection.getBalance(publicKey);
          setUserBalance(balance / LAMPORTS_PER_SOL);
        } catch (err) {
          console.error("Failed to fetch balance:", err);
        }
      }
    };
    fetchBalance();
  }, [publicKey, connected]);

  // Validate stake amount
  useEffect(() => {
    const minStake = MIN_STAKE_LAMPORTS / LAMPORTS_PER_SOL;
    if (stakeSOL < minStake) {
      setStakeError(`Minimum stake is ${minStake} SOL`);
    } else {
      setStakeError(null);
    }
  }, [stakeSOL]);

  const handleCreate = async () => {
    // Validation checks
    if (!connected || !publicKey) {
      setValidationMessage("Connect your wallet to create a match");
      setTimeout(() => setValidationMessage(null), 5000);
      return;
    }

    // Check for active lobby
    if (hasActiveLobby && activeLobby) {
      setValidationMessage(
        `You already have an active lobby. Please finish or cancel it first.`
      );
      setTimeout(() => setValidationMessage(null), 5000);
      return;
    }

    if (stakeError) {
      setValidationMessage(stakeError);
      setTimeout(() => setValidationMessage(null), 5000);
      return;
    }

    if (userBalance < stakeSOL) {
      setValidationMessage(
        `Insufficient funds (need ${stakeSOL} SOL, have ${userBalance.toFixed(
          2
        )} SOL)`
      );
      setTimeout(() => setValidationMessage(null), 5000);
      return;
    }

    if (!isInitialized) {
      setValidationMessage("Program not initialized. Please wait...");
      setTimeout(() => setValidationMessage(null), 5000);
      return;
    }

    try {
      const stakeLamports = Math.floor(stakeSOL * LAMPORTS_PER_SOL);

      // Map gameMode to the correct format (backend standard format)
      const gameModeMapping: Record<GameMode, string> = {
        Pick3from9: "PickHigher3v9",
        Pick5from16: "PickHigher5v16",
        Pick1from3: "PickHigher1v3",
        GoldBars1v9: "GoldBars1v9",
        GoldBars3v16: "GoldBars3v16",
        GoldBars5v25: "GoldBars5v25",
        Plinko3Balls: "Plinko3Balls",
        Plinko5Balls: "Plinko5Balls",
        Plinko7Balls: "Plinko7Balls",
        Miner1v9: "Miner1v9",
        Miner3v16: "Miner3v16",
        Miner5v25: "Miner5v25",
      };

      // Map teamSize to string format
      const teamSizeMapping: Record<TeamSize, string> = {
        1: "1v1",
        2: "2v2",
        5: "5v5",
      };

      console.log("[CreateLobby] Creating lobby with params:", {
        lobbyId,
        teamSize,
        stakeLamports,
        side,
        creator: publicKey.toString(),
        game: currentGame, // Use selected game type!
        gameMode: gameModeMapping[gameMode],
        arenaType: "SingleBattle",
        teamSizeStr: teamSizeMapping[teamSize],
      });

      const tx = await createLobby({
        lobbyId,
        teamSize,
        stakeLamports,
        side,
        game: currentGame, // Use selected game type!
        gameMode: gameModeMapping[gameMode],
        arenaType: "SingleBattle",
        teamSizeStr: teamSizeMapping[teamSize],
      });

      console.log("[CreateLobby] Transaction successful:", tx);

      // Show success message
      setSuccessMessage("Lobby created successfully! Redirecting...");

      // Navigate to match preview after brief delay
      const [lobbyPda] = PdaUtils.getLobbyPda(publicKey, lobbyId);
      console.log("[CreateLobby] Lobby PDA:", lobbyPda.toString());

      setTimeout(() => {
        navigate(`/match/${lobbyPda.toString()}`);
      }, 1000);
    } catch (err: any) {
      console.error("[CreateLobby] Failed to create lobby:", err);

      // Extract meaningful error message
      let errorMessage = "Failed to create lobby";
      if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      } else if (err?.toString) {
        errorMessage = err.toString();
      }

      // Check if the error is "already processed" - this means the transaction actually succeeded
      const isAlreadyProcessed = errorMessage
        .toLowerCase()
        .includes("already been processed");

      if (isAlreadyProcessed) {
        console.log(
          "[CreateLobby] Transaction was already processed - treating as success"
        );

        // Show success message
        setSuccessMessage("Lobby created successfully! Redirecting...");

        // Navigate to match preview
        const [lobbyPda] = PdaUtils.getLobbyPda(publicKey, lobbyId);
        console.log("[CreateLobby] Lobby PDA:", lobbyPda.toString());

        setTimeout(() => {
          navigate(`/match/${lobbyPda.toString()}`);
        }, 1000);
      } else {
        // Show actual error
        setValidationMessage(errorMessage);
        setTimeout(() => setValidationMessage(null), 5000);
      }
    }
  };

  const handleRefund = async () => {
    if (!activeLobby || !publicKey || !lobbyData) return;

    try {
      setRefundError(null);
      setRefundSuccess(null);

      // Get all participants from both teams
      const participants = [...lobbyData.team1, ...lobbyData.team2];

      console.log(
        "[CreateLobby] Requesting refund for lobby:",
        activeLobby.lobby.toString()
      );
      console.log(
        "[CreateLobby] Participants:",
        participants.map((p) => p.toString())
      );

      // Call refund API
      const tx = await refundLobby({
        lobbyPda: activeLobby.lobby,
        creator: lobbyData.creator,
        participants,
      });

      console.log("[CreateLobby] Refund successful! Transaction:", tx);
      setRefundSuccess("Refund successful! Your funds have been returned.");

      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error("[CreateLobby] Refund failed:", err);
      setRefundError(err.message || "Failed to refund lobby");
      setTimeout(() => setRefundError(null), 5000);
    }
  };

  const canCreate = (): boolean => {
    if (!connected || !publicKey) return false;
    if (hasActiveLobby) return false; // Already has active lobby
    if (stakeError) return false;
    if (stakeSOL < MIN_STAKE_LAMPORTS / LAMPORTS_PER_SOL) return false;
    if (userBalance < stakeSOL) return false;
    if (!isInitialized) return false;
    if (isLoadingActive) return false; // Wait for active lobby check
    return true;
  };

  return (
    <div className="relative min-h-screen bg-bg py-4 lg:py-8 overflow-hidden">
      <AuroraBackground />
      <div className="relative z-10">
        {/* Validation Message Toast */}
        <AnimatePresence>
          {validationMessage && (
            <motion.div
              className="fixed top-0 left-0 right-0 z-[100] flex justify-center md:pt-[8vh] pt-[6vh] px-3 pointer-events-none"
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

        {/* Success Message Toast */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              className="fixed top-0 left-0 right-0 z-[100] flex justify-center md:pt-[6vh] pt-[6vh] px-3 pointer-events-none"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.4 }}
            >
              <div className="glass-card p-4 border-sol-mint/50 bg-sol-mint/10 max-w-md w-full pointer-events-auto">
                <p className="text-sol-mint text-sm text-center font-semibold">
                  {successMessage}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-4xl mx-auto px-3 lg:px-6">
          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-display font-bold text-txt-base mb-4">
              🎮 Create Match
            </h1>
            <p className="text-lg text-txt-muted">
              Choose your game mode, team size, and stake to start a new match
            </p>
          </motion.div>

          <div className="space-y-4">
            {/* Active Lobby Warning */}
            {hasActiveLobby && activeLobby && (
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
                        Please finish or request a refund for your current lobby
                        before creating a new one.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <GlowButton
                        variant="neon"
                        size="sm"
                        onClick={() =>
                          navigate(`/match/${activeLobby.lobby.toString()}`)
                        }
                        className="flex-1"
                      >
                        View
                      </GlowButton>
                      <GlowButton
                        variant="ghost"
                        size="sm"
                        onClick={handleRefund}
                        disabled={isRefunding || !lobbyData}
                        className="flex-1 border-red-500/50 hover:border-red-500 text-red-400"
                      >
                        {isRefunding ? "..." : "Refund"}
                      </GlowButton>
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
            )}

            {/* Game Category Selection - Horizontal Scroll */}
            <GlassCard className="p-4">
              <GlassCardHeader>
                <GlassCardTitle className="text-lg font-display text-txt-base">
                  Game
                </GlassCardTitle>
              </GlassCardHeader>
              <div className="flex gap-3 md:gap-4 overflow-x-scroll pb-2 -mx-1 px-1 mt-4 game-scroll">
                {/* Pick Higher */}
                <button
                  onClick={() => setCurrentGame("PickHigher")}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all min-w-[100px]",
                    currentGame === "PickHigher"
                      ? "bg-gradient-to-br from-green-500 to-emerald-600 border-green-400/50 shadow-lg"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  <div className="text-4xl md:text-5xl">🎴</div>
                  <span className="text-sm font-semibold text-white">
                    Pick Higher
                  </span>
                </button>

                {/* GoldBars */}
                <button
                  onClick={() => setCurrentGame("GoldBars")}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all min-w-[100px]",
                    currentGame === "GoldBars"
                      ? "bg-gradient-to-br from-yellow-500 to-orange-600 border-yellow-400/50 shadow-lg"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  <div className="text-4xl md:text-5xl">🥇</div>
                  <span className="text-sm font-semibold text-white">
                    Gold Bars
                  </span>
                </button>

                {/* Plinko - ACTIVE! */}
                <button
                  onClick={() => setCurrentGame("Plinko")}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all min-w-[100px]",
                    currentGame === "Plinko"
                      ? "bg-gradient-to-br from-purple-500 to-pink-600 border-purple-400/50 shadow-lg"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  <div className="text-4xl md:text-5xl">🎰</div>
                  <span className="text-sm font-semibold text-white">
                    Plinko
                  </span>
                </button>

                {/* Miner - ACTIVE! */}
                <button
                  onClick={() => setCurrentGame("Miner")}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all min-w-[100px]",
                    currentGame === "Miner"
                      ? "bg-gradient-to-br from-red-500 to-orange-600 border-red-400/50 shadow-lg"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  <div className="text-4xl md:text-5xl">💣</div>
                  <span className="text-sm font-semibold text-white">
                    Miner
                  </span>
                </button>
              </div>
            </GlassCard>

            {/* Game Mode Selection - только если выбрана конкретная игра */}
            {(currentGame === "PickHigher" ||
              currentGame === "GoldBars" ||
              currentGame === "Plinko" ||
              currentGame === "Miner") && (
              <GlassCard className="p-4">
                <GlassCardHeader>
                  <GlassCardTitle className="text-lg font-display text-txt-base">
                    Game mode
                  </GlassCardTitle>
                </GlassCardHeader>
                <div className="grid grid-cols-3 gap-3 md:gap-4 mt-1">
                  {currentGame === "PickHigher" ? (
                    pickHigherModes.map(({ mode, label, icon }, index) => {
                      const variants = ["mint", "orange", "blue"];
                      const selectedVariant =
                        gameMode === mode ? variants[index] : "ghost";
                      return (
                        <GlowButton
                          key={mode}
                          variant={selectedVariant as any}
                          onClick={() => setGameMode(mode)}
                          className="flex flex-col items-center space-y-1 p-3 h-18"
                        >
                          <span className="text-xl md:text-2xl">{icon}</span>
                          <span className="text-xs md:text-sm font-medium">
                            {label}
                          </span>
                        </GlowButton>
                      );
                    })
                  ) : currentGame === "GoldBars" ? (
                    goldBarsModes.map(({ mode, label, icon }, index) => {
                      const variants = ["mint", "orange", "blue"];
                      const selectedVariant =
                        gameMode === mode ? variants[index] : "ghost";
                      return (
                        <GlowButton
                          key={mode}
                          variant={selectedVariant as any}
                          onClick={() => setGameMode(mode)}
                          className="flex flex-col items-center space-y-1 p-3 h-18"
                        >
                          <span className="text-xl md:text-2xl">{icon}</span>
                          <span className="text-xs md:text-sm font-medium">
                            {label}
                          </span>
                        </GlowButton>
                      );
                    })
                  ) : currentGame === "Plinko" ? (
                    plinkoModes.map(({ mode, label, icon }, index) => {
                      const variants = ["mint", "orange", "blue"];
                      const selectedVariant =
                        gameMode === mode ? variants[index] : "ghost";
                      return (
                        <GlowButton
                          key={mode}
                          variant={selectedVariant as any}
                          onClick={() => setGameMode(mode)}
                          className="flex flex-col items-center space-y-1 p-3 h-18"
                        >
                          <span className="text-xl md:text-2xl">{icon}</span>
                          <span className="text-xs md:text-sm font-medium">
                            {label}
                          </span>
                        </GlowButton>
                      );
                    })
                  ) : currentGame === "Miner" ? (
                    minerModes.map(({ mode, label, icon }, index) => {
                      const variants = ["mint", "orange", "blue"];
                      const selectedVariant =
                        gameMode === mode ? variants[index] : "ghost";
                      return (
                        <GlowButton
                          key={mode}
                          variant={selectedVariant as any}
                          onClick={() => setGameMode(mode)}
                          className="flex flex-col items-center space-y-1 p-3 h-18"
                        >
                          <span className="text-xl md:text-2xl">{icon}</span>
                          <span className="text-xs md:text-sm font-medium">
                            {label}
                          </span>
                        </GlowButton>
                      );
                    })
                  ) : (
                    /* Future games */
                    <>
                      {[
                        { label: "3x5", icon: "🎰" },
                        { label: "5x7", icon: "🎰" },
                        { label: "7x10", icon: "🎰" },
                      ].map((mode) => (
                        <GlowButton
                          key={mode.label}
                          variant="ghost"
                          disabled
                          className="flex flex-col items-center space-y-1 p-3 h-18 opacity-50 cursor-not-allowed"
                        >
                          <span className="text-xl md:text-2xl">
                            {mode.icon}
                          </span>
                          <span className="text-xs md:text-sm font-medium">
                            {mode.label}
                          </span>
                        </GlowButton>
                      ))}
                    </>
                  )}
                </div>
              </GlassCard>
            )}

            {/* Team Size Selection */}
            <GlassCard className="p-4">
              <GlassCardHeader>
                <GlassCardTitle className="text-xl font-display text-sol-purple">
                  Team Size
                </GlassCardTitle>
              </GlassCardHeader>
              <div className="grid grid-cols-3 gap-3 md:gap-4 mt-1">
                {teamSizes.map(({ size, label, description }, index) => {
                  const variants = ["purple", "blue", "orange"] as const;
                  const selectedVariant =
                    teamSize === size ? variants[index] : "ghost";
                  return (
                    <GlowButton
                      key={size}
                      variant={selectedVariant}
                      onClick={() => setTeamSize(size)}
                      className="flex flex-col items-center space-y-1 p-3 h-18"
                    >
                      <span className="text-sm md:text-lg font-bold">
                        {label}
                      </span>
                      <span className="text-xs">{description}</span>
                    </GlowButton>
                  );
                })}
              </div>
            </GlassCard>

            {/* Stake Input */}
            <GlassCard className="p-4">
              <GlassCardHeader>
                <GlassCardTitle className="text-xl font-display text-sol-purple">
                  Stake Amount
                </GlassCardTitle>
              </GlassCardHeader>
              <div className="mt-1">
                <div className="flex flex-col space-y-4">
                  <input
                    type="number"
                    min="0.05"
                    step="0.01"
                    value={stakeSOL}
                    onChange={(e) =>
                      setStakeSOL(parseFloat(e.target.value) || 0.05)
                    }
                    className={`px-4 py-3 bg-transparent border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sol-purple ${
                      stakeError
                        ? "border-red-500 focus:ring-red-500"
                        : "border-sol-purple/30"
                    }`}
                    placeholder="0.10"
                  />
                  {stakeError && (
                    <p className="text-sm text-red-400">{stakeError}</p>
                  )}
                  <div className="flex gap-2">
                    {[0.05, 0.1, 0.5, 1.0, 2.0].map((amount) => (
                      <GlowButton
                        key={amount}
                        variant="ghost"
                        size="sm"
                        onClick={() => setStakeSOL(amount)}
                        className="flex-1 text-xs md:text-sm"
                      >
                        {amount}
                      </GlowButton>
                    ))}
                  </div>
                  <p className="text-sm text-txt-muted">Minimum: 0.05 SOL</p>
                </div>
              </div>
            </GlassCard>

            {/* Team Selection */}
            <GlassCard className="p-4">
              <GlassCardHeader>
                <GlassCardTitle className="text-xl font-display text-sol-purple">
                  Your Team
                </GlassCardTitle>
              </GlassCardHeader>
              <div className="grid grid-cols-2 gap-4 mt-1">
                <GlowButton
                  variant={side === 0 ? "blue" : "ghost"}
                  onClick={() => setSide(0)}
                  className="p-4 h-18"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold">Team 1</span>
                    <span className="text-xs">Left Side</span>
                  </div>
                </GlowButton>
                <GlowButton
                  variant={side === 1 ? "orange" : "ghost"}
                  onClick={() => setSide(1)}
                  className="p-4 h-18"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold">Team 2</span>
                    <span className="text-xs">Right Side</span>
                  </div>
                </GlowButton>
              </div>
            </GlassCard>

            {/* Error Display */}
            {/* {error && (
            <GlassCard className="p-4 border-red-500/50">
              <p className="text-red-400 text-sm">{error}</p>
            </GlassCard>
          )} */}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <GlowButton
                variant="neon"
                onClick={handleCreate}
                disabled={isCreating}
                className={`flex-1 ${
                  !canCreate() ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isCreating ? "Creating..." : "Create Match"}
              </GlowButton>
              <GlowButton
                variant="ghost"
                onClick={() => navigate("/matches")}
                className="flex-1"
              >
                Cancel
              </GlowButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
