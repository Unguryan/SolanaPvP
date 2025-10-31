// CreateLobby page - Create new match/lobby
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { GlowButton } from "@/components/ui/GlowButton";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard";
import { usePvpProgram, useLobbyOperations } from "@/hooks/usePvpProgram";
import { PdaUtils } from "@/services/solana/accounts";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { MIN_STAKE_LAMPORTS } from "@/services/solana/config";

type GameMode = "Pick3from9" | "Pick5from16" | "Pick1from3";
type TeamSize = 1 | 2 | 5;

export const CreateLobby: React.FC = () => {
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const { isInitialized } = usePvpProgram();
  const { createLobby, isCreating, error } = useLobbyOperations();

  const [gameMode, setGameMode] = useState<GameMode>("Pick3from9");
  const [teamSize, setTeamSize] = useState<TeamSize>(1);
  const [stakeSOL, setStakeSOL] = useState(0.1);
  const [side, setSide] = useState<0 | 1>(0);
  const [lobbyId] = useState(Date.now());

  const gameModes: { mode: GameMode; label: string; icon: string }[] = [
    { mode: "Pick3from9", label: "3x3 Tiles", icon: "🎯" },
    { mode: "Pick5from16", label: "4x4 Chests", icon: "🏆" },
    { mode: "Pick1from3", label: "1x3 Cards", icon: "🎴" },
  ];

  const teamSizes: { size: TeamSize; label: string; description: string }[] = [
    { size: 1, label: "1v1", description: "Solo duel" },
    { size: 2, label: "2v2", description: "Duo battle" },
    { size: 5, label: "5v5", description: "Team showdown" },
  ];

  useEffect(() => {
    if (!connected || !publicKey) {
      navigate("/matches");
    }
  }, [connected, publicKey, navigate]);

  const handleCreate = async () => {
    if (!publicKey || !isInitialized) return;

    try {
      const stakeLamports = Math.floor(stakeSOL * LAMPORTS_PER_SOL);

      // Validate minimum stake
      if (stakeLamports < MIN_STAKE_LAMPORTS) {
        alert(`Minimum stake is ${MIN_STAKE_LAMPORTS / LAMPORTS_PER_SOL} SOL`);
        return;
      }

      const tx = await createLobby({
        lobbyId,
        teamSize,
        stakeLamports,
        side,
      });

      console.log("Lobby created successfully:", tx);

      // Navigate to match preview
      const [lobbyPda] = PdaUtils.getLobbyPda(publicKey, lobbyId);
      navigate(`/match/${lobbyPda.toString()}`);
    } catch (err) {
      console.error("Failed to create lobby:", err);
      alert(`Failed to create lobby: ${err}`);
    }
  };

  if (!connected || !publicKey) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-bold text-txt-base mb-4">
            Wallet Not Connected
          </h2>
          <p className="text-txt-muted mb-6">
            Please connect your wallet to create a lobby
          </p>
          <GlowButton onClick={() => navigate("/matches")} variant="neon">
            Go Back
          </GlowButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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

        <div className="space-y-6">
          {/* Game Mode Selection */}
          <GlassCard className="p-6">
            <GlassCardHeader>
              <GlassCardTitle className="text-xl font-display text-sol-purple flex items-center">
                <span className="text-2xl mr-3">🎯</span>
                Choose Game Mode
              </GlassCardTitle>
            </GlassCardHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {gameModes.map(({ mode, label, icon }, index) => {
                const variants = ["neon", "purple", "mint"];
                const selectedVariant =
                  gameMode === mode ? variants[index] : "ghost";
                return (
                  <GlowButton
                    key={mode}
                    variant={selectedVariant as any}
                    onClick={() => setGameMode(mode)}
                    className="flex flex-col items-center space-y-2 p-3 h-20"
                  >
                    <span className="text-2xl">{icon}</span>
                    <span className="text-sm font-medium">{label}</span>
                  </GlowButton>
                );
              })}
            </div>
          </GlassCard>

          {/* Team Size Selection */}
          <GlassCard className="p-6">
            <GlassCardHeader>
              <GlassCardTitle className="text-xl font-display text-sol-purple">
                Team Size
              </GlassCardTitle>
            </GlassCardHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {teamSizes.map(({ size, label, description }, index) => {
                const variants = ["blue", "orange", "purple"];
                const selectedVariant =
                  teamSize === size ? variants[index] : "ghost";
                return (
                  <GlowButton
                    key={size}
                    variant={selectedVariant as any}
                    onClick={() => setTeamSize(size)}
                    className="flex flex-col items-center space-y-2 p-3 h-20"
                  >
                    <span className="text-lg font-bold">{label}</span>
                    <span className="text-xs">{description}</span>
                  </GlowButton>
                );
              })}
            </div>
          </GlassCard>

          {/* Stake Input */}
          <GlassCard className="p-6">
            <GlassCardHeader>
              <GlassCardTitle className="text-xl font-display text-sol-purple">
                Stake Amount
              </GlassCardTitle>
            </GlassCardHeader>
            <div className="mt-4">
              <div className="flex flex-col space-y-4">
                <input
                  type="number"
                  min="0.05"
                  step="0.01"
                  value={stakeSOL}
                  onChange={(e) =>
                    setStakeSOL(parseFloat(e.target.value) || 0.05)
                  }
                  className="px-4 py-3 bg-bg-dark border border-sol-purple/30 rounded-lg text-txt-base focus:outline-none focus:ring-2 focus:ring-sol-purple"
                  placeholder="0.10"
                />
                <div className="flex gap-2">
                  {[0.05, 0.1, 0.5, 1.0, 2.0].map((amount) => (
                    <GlowButton
                      key={amount}
                      variant="ghost"
                      size="sm"
                      onClick={() => setStakeSOL(amount)}
                      className="flex-1"
                    >
                      {amount} SOL
                    </GlowButton>
                  ))}
                </div>
                <p className="text-sm text-txt-muted">
                  Minimum: 0.05 SOL | Platform fee: 1%
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Team Selection */}
          <GlassCard className="p-6">
            <GlassCardHeader>
              <GlassCardTitle className="text-xl font-display text-sol-purple">
                Your Team
              </GlassCardTitle>
            </GlassCardHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {[0, 1].map((teamSide) => (
                <GlowButton
                  key={teamSide}
                  variant={side === teamSide ? "neon" : "ghost"}
                  onClick={() => setSide(teamSide as 0 | 1)}
                  className="p-4 h-20"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold">
                      Team {teamSide + 1}
                    </span>
                    <span className="text-xs">
                      {teamSide === 0 ? "Left Side" : "Right Side"}
                    </span>
                  </div>
                </GlowButton>
              ))}
            </div>
          </GlassCard>

          {/* Error Display */}
          {error && (
            <GlassCard className="p-4 border-red-500/50">
              <p className="text-red-400 text-sm">{error}</p>
            </GlassCard>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <GlowButton
              variant="ghost"
              onClick={() => navigate("/matches")}
              className="flex-1"
            >
              Cancel
            </GlowButton>
            <GlowButton
              variant="neon"
              onClick={handleCreate}
              disabled={isCreating || !isInitialized}
              className="flex-1"
            >
              {isCreating ? "Creating..." : "Create Match"}
            </GlowButton>
          </div>
        </div>
      </div>
    </div>
  );
};
