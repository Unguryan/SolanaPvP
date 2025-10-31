// Game Demo page - Live Arena style
import React, { useState } from "react";
import { motion } from "framer-motion";
import { UniversalGameBoard } from "@/components/game/UniversalGameBoard";
import { GlowButton } from "@/components/ui/GlowButton";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/GlassCard";
import { generateDemoPlayers } from "@/lib/gameMockGenerator";
import { getGameModeConfig } from "@/utils/gameScoreDistribution";
import { Confetti } from "@/components/game/effects/Confetti";
import { GameResult } from "@/types/game";

type GameMode =
  | "PickThreeFromNine"
  | "PickFiveFromSixteen"
  | "PickOneFromThree";
type MatchType = "Solo" | "Duo" | "Team";

export const GameDemo: React.FC = () => {
  const [currentGameMode, setCurrentGameMode] =
    useState<GameMode>("PickThreeFromNine");
  const [currentMatchType, setCurrentMatchType] = useState<MatchType>("Solo");
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [stakeAmount, setStakeAmount] = useState(0.1);
  const [showConfetti, setShowConfetti] = useState(false);

  const gameModes: { mode: GameMode; label: string; icon: string }[] = [
    { mode: "PickThreeFromNine", label: "3x3 Tiles", icon: "🎯" },
    { mode: "PickFiveFromSixteen", label: "4x4 Chests", icon: "🏆" },
    { mode: "PickOneFromThree", label: "1x3 Cards", icon: "🎴" },
  ];

  const matchTypes: { type: MatchType; label: string; description: string }[] =
    [
      { type: "Solo", label: "1v1", description: "Classic duel" },
      { type: "Duo", label: "2v2", description: "Team battle" },
      { type: "Team", label: "5v5", description: "Epic showdown" },
    ];

  const handleStartGame = () => {
    // Generate random stake amount
    const stakes = [0.1, 0.5, 1.0];
    const randomStake = stakes[Math.floor(Math.random() * stakes.length)];
    setStakeAmount(randomStake);
    setIsGameActive(true);
    setGameKey((prev) => prev + 1); // Force re-render

    // Scroll to top with delay to ensure state update
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  const handleGameComplete = (result: GameResult) => {
    console.log("Game completed:", result);
    // Show confetti if player won
    const isWinner =
      result.winner === "You" ||
      (result.isTeamBattle && result.winner === "Team A");
    if (isWinner) {
      setShowConfetti(true);
    }
  };

  const handleResetGame = () => {
    setIsGameActive(false);
    setGameKey((prev) => prev + 1);
  };

  const currentConfig = getGameModeConfig(currentGameMode);

  return (
    <>
      {/* Confetti - render at absolute top level */}
      {showConfetti && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 9999,
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <Confetti
            isActive={showConfetti}
            onComplete={() => setShowConfetti(false)}
          />
        </div>
      )}

      <div className="min-h-screen bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-display font-bold text-txt-base mb-4">
              🎮 Game Demo
            </h1>
            <p className="text-lg text-txt-muted max-w-2xl mx-auto">
              Experience the thrill of Solana PvP gaming. Choose your game mode
              and battle against AI opponents!
            </p>
          </motion.div>

          {!isGameActive ? (
            /* Game Setup */
            <div className="space-y-8">
              {/* Game Mode Selection */}
              <GlassCard className="p-6 mt-8">
                <GlassCardHeader>
                  <GlassCardTitle className="text-xl font-display text-sol-purple flex items-center">
                    <span className="text-2xl mr-3">{currentConfig.icon}</span>
                    Choose Game Mode
                  </GlassCardTitle>
                </GlassCardHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {gameModes.map(({ mode, label, icon }, index) => {
                    const variants = [
                      "neon",
                      "purple",
                      "mint",
                      "orange",
                      "blue",
                    ];
                    const selectedVariant =
                      currentGameMode === mode ? variants[index] : "ghost";
                    return (
                      <GlowButton
                        key={mode}
                        variant={
                          selectedVariant as
                            | "neon"
                            | "purple"
                            | "mint"
                            | "orange"
                            | "blue"
                            | "ghost"
                        }
                        onClick={() => setCurrentGameMode(mode)}
                        className="flex flex-col items-center space-y-2 p-3 h-16"
                      >
                        <span className="text-2xl">{icon}</span>
                        <span className="text-sm font-medium">{label}</span>
                      </GlowButton>
                    );
                  })}
                </div>
              </GlassCard>

              {/* Match Type Selection */}
              <GlassCard className="p-6">
                <GlassCardHeader>
                  <GlassCardTitle className="text-xl font-display text-sol-purple">
                    Match Type
                  </GlassCardTitle>
                </GlassCardHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {matchTypes.map(({ type, label, description }, index) => {
                    const variants = ["blue", "orange", "purple"];
                    const selectedVariant =
                      currentMatchType === type ? variants[index] : "ghost";
                    return (
                      <GlowButton
                        key={type}
                        variant={
                          selectedVariant as
                            | "neon"
                            | "purple"
                            | "mint"
                            | "orange"
                            | "blue"
                            | "ghost"
                        }
                        onClick={() => setCurrentMatchType(type)}
                        className="flex flex-col items-center space-y-2 p-3 h-16"
                      >
                        <span className="text-lg font-bold">{label}</span>
                        <span className="text-xs">{description}</span>
                      </GlowButton>
                    );
                  })}
                </div>
              </GlassCard>

              {/* Game Info */}
              <GlassCard className="p-6">
                <GlassCardHeader>
                  <GlassCardTitle className="text-xl font-display text-sol-purple">
                    Game Information
                  </GlassCardTitle>
                </GlassCardHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <h3 className="font-semibold text-txt-base mb-2">
                      How to Play
                    </h3>
                    <ul className="text-sm text-txt-muted space-y-1">
                      <li>
                        • Select {currentConfig.maxSelections}{" "}
                        {currentConfig.name.toLowerCase()}
                      </li>
                      <li>• Each selection reveals a point value</li>
                      <li>• Reach your target score to win</li>
                      <li>• Higher values give you better chances</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-txt-base mb-2">
                      Demo Features
                    </h3>
                    <ul className="text-sm text-txt-muted space-y-1">
                      <li>• Play against AI opponents</li>
                      <li>• Experience real game mechanics</li>
                      <li>• No real SOL required</li>
                      <li>• Full animations and effects</li>
                    </ul>
                  </div>
                </div>
              </GlassCard>

              {/* Start Button */}
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <GlowButton
                  size="lg"
                  variant="neon"
                  onClick={handleStartGame}
                  className="text-xl px-8 py-4 min-w-[200px]"
                >
                  Start Demo Game
                </GlowButton>
              </motion.div>
            </div>
          ) : (
            /* Active Game */
            <div className="space-y-6">
              {/* Game Controls */}
              <div className="flex justify-center">
                <GlowButton
                  variant="ghost"
                  onClick={handleResetGame}
                  className="text-txt-muted hover:text-txt-base"
                >
                  Reset Game
                </GlowButton>
              </div>

              {/* Game Board */}
              <UniversalGameBoard
                key={gameKey}
                gameMode={currentGameMode}
                matchType={currentMatchType}
                stakeSol={stakeAmount} // Demo stake
                players={generateDemoPlayers(currentMatchType, "You")}
                currentPlayer="You"
                timeLimit={20}
                onGameComplete={handleGameComplete}
                isDemoMode={true}
              />
            </div>
          )}

          {/* Footer Info */}
          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <p className="text-sm text-txt-muted">
              This is a demo version. In real games, you'll compete for actual
              SOL rewards!
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
};
