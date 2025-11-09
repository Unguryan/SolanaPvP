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
import { Confetti } from "@/components/game/effects/Confetti";
import { GameResult, GameType } from "@/types/game";
import { AuroraBackground } from "@/components/effects/AuroraBackground";
import { MatchLoader } from "@/components/loaders/MatchLoader";
import { GameResultModal } from "@/components/game/GameResultModal";
import { cn } from "@/utils/cn";

type GameMode =
  | "PickThreeFromNine"
  | "PickFiveFromSixteen"
  | "PickOneFromThree"
  | "Plinko3Balls"
  | "Plinko5Balls"
  | "Plinko7Balls";
type MatchType = "Solo" | "Duo" | "Team";
type GameCategory = "PickHigher" | "Plinko";

export const GameDemo: React.FC = () => {
  const [currentGame, setCurrentGame] = useState<GameCategory>("PickHigher");
  const [currentGameMode, setCurrentGameMode] =
    useState<GameMode>("PickThreeFromNine");
  const [currentMatchType, setCurrentMatchType] = useState<MatchType>("Solo");
  const [isLoading, setIsLoading] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [stakeAmount, setStakeAmount] = useState(0.1);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);

  // PickHigher game modes
  const pickHigherModes: { mode: GameMode; label: string; icon: string }[] = [
    { mode: "PickThreeFromNine", label: "3v9", icon: "🏆" }, // Сундуки (3x3)
    { mode: "PickFiveFromSixteen", label: "5v16", icon: "🎯" }, // Плитки (4x4)
    { mode: "PickOneFromThree", label: "1v3", icon: "🎴" }, // Карты (3 cards)
  ];

  // Plinko game modes
  const plinkoModes: { mode: GameMode; label: string; icon: string }[] = [
    { mode: "Plinko3Balls", label: "3 Balls", icon: "🎱" },
    { mode: "Plinko5Balls", label: "5 Balls", icon: "🎱" },
    { mode: "Plinko7Balls", label: "7 Balls", icon: "🎱" },
  ];

  const gameModes = currentGame === "Plinko" ? plinkoModes : pickHigherModes;

  const matchTypes: { type: MatchType; label: string; description: string }[] =
    [
      { type: "Solo", label: "1v1", description: "Solo" },
      { type: "Duo", label: "2v2", description: "Duo" },
      { type: "Team", label: "5v5", description: "Team" },
    ];

  const handleStartGame = () => {
    // Scroll to top FIRST
    window.scrollTo({ top: 0, behavior: "smooth" });
    
    // Show loader for 5 seconds
    setIsLoading(true);
    
    // Generate random stake amount
    const stakes = [0.1, 0.5, 1.0];
    const randomStake = stakes[Math.floor(Math.random() * stakes.length)];
    setStakeAmount(randomStake);

    // Start game after loader
    setTimeout(() => {
      setIsLoading(false);
      setIsGameActive(true);
      setGameKey((prev) => prev + 1); // Force re-render
      // Scroll again after game starts
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    }, 5000); // 5 seconds loader
  };

  const handleGameComplete = (result: GameResult) => {
    console.log("Game completed:", result);
    setGameResult(result);
    // Show confetti if player won
    const isWinner =
      result.winner === "You" ||
      (result.isTeamBattle && result.winner === "Team A");
    if (isWinner) {
      setShowConfetti(true);
    }
  };

  const handleResetGame = () => {
    setIsLoading(false);
    setIsGameActive(false);
    setGameKey((prev) => prev + 1);
  };

  // Show loader overlay
  if (isLoading) {
    const teamSize = currentMatchType === "Solo" ? 1 : currentMatchType === "Duo" ? 2 : 5;
    const demoPlayers = [
      ["@demo_player", "@ai_opponent", "@test_user", "@random_guy", "@mock_player"],
      ["@bot_alpha", "@bot_beta", "@bot_gamma", "@bot_delta", "@bot_omega"]
    ];

    return (
      <MatchLoader
        team1={{
          name: "Team 1",
          players: demoPlayers[0].slice(0, teamSize).map(p => p),
        }}
        team2={{
          name: "Team 2",
          players: demoPlayers[1].slice(0, teamSize).map(p => p),
        }}
        statusMessages={[
          "Connecting to Solana",
          "Creating demo arena",
          `Preparing ${teamSize}v${teamSize} match`,
          "Loading game board",
          "Match starting soon",
        ]}
      />
    );
  }

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

      <div className="relative min-h-screen bg-bg overflow-hidden">
        <AuroraBackground />
        <div className="relative z-10 max-w-7xl mx-auto px-1 md:px-6 py-2 md:py-8">
          {/* Header */}
          <motion.div
            className="text-center mb-4 md:mb-8"
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
            <div className="space-y-4 md:space-y-6">
              {/* Game Category Selection - Horizontal Scroll */}
              <GlassCard className="p-4 md:p-6 mt-4 md:mt-8">
                <GlassCardHeader>
                  <GlassCardTitle className="md:text-2xl text-lg font-display text-sol-purple">
                    Game
                  </GlassCardTitle>
                </GlassCardHeader>
                <div className="flex gap-3 md:gap-4 overflow-x-scroll pb-2 -mx-1 px-1 mt-0 game-scroll">
                  {/* Pick Higher */}
                  <button
                    onClick={() => {
                      setCurrentGame("PickHigher");
                      setCurrentGameMode("PickThreeFromNine");
                    }}
                    className={cn(
                      "flex-shrink-0 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all min-w-[100px]",
                      currentGame === "PickHigher"
                        ? "bg-gradient-to-br from-green-500 to-emerald-600 border-green-400/50 shadow-lg"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    )}
                  >
                    <div className="text-4xl md:text-5xl">🎴</div>
                    <span className="text-sm font-semibold text-white">Pick Higher</span>
                  </button>

                  {/* Plinko */}
                  <button
                    onClick={() => {
                      setCurrentGame("Plinko");
                      setCurrentGameMode("Plinko3Balls");
                    }}
                    className={cn(
                      "flex-shrink-0 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all min-w-[100px]",
                      currentGame === "Plinko"
                        ? "bg-gradient-to-br from-purple-500 to-pink-600 border-purple-400/50 shadow-lg"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    )}
                  >
                    <div className="text-4xl md:text-5xl">🎰</div>
                    <span className="text-sm font-semibold text-white">Plinko</span>
                  </button>

                  {/* Bomber - Future */}
                  <button
                    disabled
                    className="flex-shrink-0 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 bg-white/5 border-white/10 opacity-50 cursor-not-allowed min-w-[100px]"
                  >
                    <div className="text-4xl md:text-5xl">💣</div>
                    <span className="text-sm font-semibold text-white/70">Bomber</span>
                    <span className="text-[10px] text-white/50">Soon</span>
                  </button>
                </div>
              </GlassCard>

              {/* Game Mode Selection - for both games */}
              <GlassCard className="p-4 md:p-6">
                <GlassCardHeader>
                  <GlassCardTitle className="md:text-2xl text-lg font-display text-sol-purple">
                    Game mode
                  </GlassCardTitle>
                </GlassCardHeader>
                <div className="grid grid-cols-3 gap-3 md:gap-4 mt-3 md:mt-4">
                  {gameModes.map(({ mode, label, icon }, index) => {
                    const variants = ["mint", "orange", "blue"] as const;
                    const selectedVariant =
                      currentGameMode === mode ? variants[index] : "ghost";
                    return (
                      <GlowButton
                        key={mode}
                        variant={selectedVariant}
                        onClick={() => setCurrentGameMode(mode)}
                        className="flex flex-col items-center space-y-1 p-3 h-16"
                      >
                        <span className="text-2xl">{icon}</span>
                        <span className="text-sm font-medium">{label}</span>
                      </GlowButton>
                    );
                  })}
                </div>
              </GlassCard>

              {/* Match Type Selection */}
              <GlassCard className="p-4 md:p-6">
                <GlassCardHeader>
                  <GlassCardTitle className="md:text-2xl text-lg font-display text-sol-purple">
                    Match Type
                  </GlassCardTitle>
                </GlassCardHeader>
                <div className="grid grid-cols-3 gap-3 md:gap-4 mt-0 md:mt-4">
                  {matchTypes.map(({ type, label, description }, index) => {
                    const variants = ["blue", "purple", "orange"] as const;
                    const selectedVariant =
                      currentMatchType === type ? variants[index] : "ghost";
                    return (
                      <GlowButton
                        key={type}
                        variant={selectedVariant}
                        onClick={() => setCurrentMatchType(type)}
                        className="flex flex-col items-center space-y-1 p-3 h-16"
                      >
                        <span className="text-lg font-bold">{label}</span>
                        <span className="text-xs">{description}</span>
                      </GlowButton>
                    );
                  })}
                </div>
              </GlassCard>

              {/* Game Info */}
              <GlassCard className="p-4 md:p-6">
                <GlassCardHeader>
                  <GlassCardTitle className="md:text-2xl text-lg font-display text-sol-purple">
                    Game Information
                  </GlassCardTitle>
                </GlassCardHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-0 md:mt-4">
                  <div>
                    <h3 className="font-semibold text-txt-base mb-2">
                      How to Play
                    </h3>
                    <ul className="text-sm text-txt-muted space-y-1">
                      {currentGame === "Plinko" ? (
                        <>
                          <li>• Drop {currentGameMode === "Plinko3Balls" ? "3" : currentGameMode === "Plinko5Balls" ? "5" : "7"} balls down the board</li>
                          <li>• Each ball bounces off pins and lands in a slot</li>
                          <li>• Reach your target score to win</li>
                          <li>• Edge slots give higher scores</li>
                        </>
                      ) : (
                        <>
                          <li>
                            • {currentGameMode === "PickThreeFromNine" ? "Pick 3 from 9 tiles" 
                              : currentGameMode === "PickFiveFromSixteen" ? "Pick 5 from 16 tiles"
                              : "Pick 1 from 3 cards"}
                          </li>
                          <li>• Each selection reveals a point value</li>
                          <li>• Reach your target score to win</li>
                          <li>• Higher values give you better chances</li>
                        </>
                      )}
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
                gameType={currentGame === "Plinko" ? GameType.Plinko : GameType.PickHigher}
                gameMode={currentGameMode}
                teamSize={currentMatchType}
                stakeSol={stakeAmount} // Demo stake
                players={generateDemoPlayers(currentMatchType, "You", currentGameMode)}
                currentPlayer="You"
                timeLimit={20} // 20s for all games
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

      {/* Game Result Modal */}
      {gameResult && (
        <GameResultModal
          isOpen={!!gameResult}
          onClose={() => {
            setGameResult(null);
          }}
          onPlayAgain={() => {
            setGameResult(null);
            handleResetGame();
          }}
          result={gameResult}
          isDemoMode={true}
        />
      )}
    </>
  );
};
