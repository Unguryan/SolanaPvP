// Game Showcase - All game modes demo
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { ChestSelectionGame } from "@/components/game/ChestSelectionGame";
import { GameModeType, MatchType } from "@/types/match";
import { formatSol } from "@/utils/lamports";

type GameMode = "pick3" | "pick5" | "pick1";

export const GameShowcase: React.FC = () => {
  const [currentGame, setCurrentGame] = useState<GameMode>("pick3");
  const [gameResults, setGameResults] = useState<{
    [key: string]: { score: number; isWinner: boolean };
  }>({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState<{
    selectedIndices: number[];
    currentScore: number;
    itemValues: number[];
  }>({ selectedIndices: [], currentScore: 0, itemValues: [] });

  const gameModes = {
    pick3: {
      title: "Pick 3 from 9 Tiles",
      description: "Choose 3 tiles from 9 available options",
      icon: "🎯",
      timeLimit: 20,
      maxSelections: 3,
      gridCols: 3,
    },
    pick5: {
      title: "Pick 5 from 16 Chests",
      description: "Select 5 chests from a 4x4 grid",
      icon: "🏆",
      timeLimit: 20,
      maxSelections: 5,
      gridCols: 4,
    },
    pick1: {
      title: "Pick 1 from 3 Cards",
      description: "Quick decision! Choose 1 card from 3 options",
      icon: "🎴",
      timeLimit: 20,
      maxSelections: 1,
      gridCols: 3,
    },
  };

  const handleGameComplete = (score: number, isWinner: boolean) => {
    setGameResults((prev) => ({
      ...prev,
      [currentGame]: { score, isWinner },
    }));
  };

  const simulateGame = () => {
    if (isSimulating) return;

    setIsSimulating(true);

    const maxSelections = gameModes[currentGame].maxSelections;
    const totalItems =
      currentGame === "pick5" ? 16 : currentGame === "pick1" ? 3 : 9;

    // Generate random values for all items
    const itemValues = Array.from(
      { length: totalItems },
      () => Math.floor(Math.random() * 200) + 100
    );

    setSimulationProgress({ selectedIndices: [], currentScore: 0, itemValues });

    // Select random items with animation delay
    const selectedIndices = [];
    const availableIndices = Array.from({ length: totalItems }, (_, i) => i);

    for (let i = 0; i < maxSelections; i++) {
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      selectedIndices.push(availableIndices[randomIndex]);
      availableIndices.splice(randomIndex, 1);
    }

    // Animate selection one by one
    let currentScore = 0;
    selectedIndices.forEach((index, i) => {
      setTimeout(() => {
        currentScore += itemValues[index];
        setSimulationProgress({
          selectedIndices: [...selectedIndices.slice(0, i + 1)],
          currentScore,
          itemValues,
        });

        // If this is the last selection, complete the game
        if (i === selectedIndices.length - 1) {
          setTimeout(() => {
            const isWinner = Math.random() > 0.3; // 70% win rate for demo
            handleGameComplete(currentScore, isWinner);
            setIsSimulating(false);
            setSimulationProgress({
              selectedIndices: [],
              currentScore: 0,
              itemValues: [],
            });
          }, 1000); // Wait 1 second after last selection
        }
      }, i * 800); // 800ms delay between each selection
    });
  };

  const mockMatch = {
    id: "showcase-match",
    stakeLamports: 2000000000, // 2 SOL
    gameMode:
      currentGame === "pick3"
        ? GameModeType.PickThreeFromNine
        : currentGame === "pick5"
        ? GameModeType.PickFiveFromSixteen
        : GameModeType.PickOneFromThree,
    matchType: MatchType.Solo,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🎮 Game Showcase
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Experience all three game modes of Solana PvP
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Game Mode Selector */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Game Modes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(gameModes).map(([key, mode]) => (
                  <button
                    key={key}
                    onClick={() => setCurrentGame(key as GameMode)}
                    className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                      currentGame === key
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{mode.icon}</div>
                      <div>
                        <div className="font-semibold text-sm">
                          {mode.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {mode.description}
                        </div>
                      </div>
                    </div>
                    {gameResults[key] && (
                      <div className="mt-2 text-xs">
                        <div
                          className={`font-bold ${
                            gameResults[key].isWinner
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {gameResults[key].isWinner ? "Won" : "Lost"} - Score:{" "}
                          {gameResults[key].score}
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Match Info */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Match Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Stake:</span>
                  <span className="font-bold">
                    {formatSol(mockMatch.stakeLamports)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Mode:</span>
                  <span className="font-bold">
                    {gameModes[currentGame].title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Time Limit:</span>
                  <span className="font-bold">
                    {gameModes[currentGame].timeLimit}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Selections:</span>
                  <span className="font-bold">
                    {gameModes[currentGame].maxSelections}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Game Area */}
          <div className="lg:col-span-3">
            {currentGame === "pick5" ? (
              <ChestSelectionGame
                onGameComplete={handleGameComplete}
                timeLimit={gameModes.pick5.timeLimit}
                maxSelections={gameModes.pick5.maxSelections}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{gameModes[currentGame].icon}</span>
                    <span>{gameModes[currentGame].title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">
                      {gameModes[currentGame].icon}
                    </div>
                    <h3 className="text-2xl font-bold mb-4">
                      {gameModes[currentGame].title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {gameModes[currentGame].description}
                    </p>
                    <div
                      className={`grid gap-4 max-w-md mx-auto ${
                        gameModes[currentGame].maxSelections === 1
                          ? "grid-cols-3"
                          : currentGame === "pick5"
                          ? "grid-cols-4"
                          : "grid-cols-3"
                      }`}
                    >
                      {Array.from(
                        {
                          length:
                            currentGame === "pick5"
                              ? 16
                              : gameModes[currentGame].maxSelections === 1
                              ? 3
                              : 9,
                        },
                        (_, i) => {
                          const isSelected =
                            simulationProgress.selectedIndices.includes(i);
                          return (
                            <div
                              key={i}
                              className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                                isSelected
                                  ? "border-blue-500 bg-blue-100 dark:bg-blue-900 shadow-lg scale-105 animate-pulse-glow"
                                  : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                              }`}
                            >
                              <div className="text-2xl">
                                {gameModes[currentGame].icon}
                              </div>
                              {isSelected &&
                                simulationProgress.itemValues[i] && (
                                  <div className="absolute text-xs font-bold text-blue-600">
                                    {simulationProgress.itemValues[i]}
                                  </div>
                                )}
                            </div>
                          );
                        }
                      )}
                    </div>
                    <div className="mt-6">
                      <Button
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={simulateGame}
                        disabled={isSimulating}
                      >
                        {isSimulating ? "Simulating..." : "Simulate Game"}
                      </Button>

                      {isSimulating && (
                        <div className="mt-4 text-center">
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Score: {simulationProgress.currentScore}
                          </div>
                          <div className="text-xs text-gray-500">
                            Selected:{" "}
                            {simulationProgress.selectedIndices.length}/
                            {gameModes[currentGame].maxSelections}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Game Results Summary */}
        {Object.keys(gameResults).length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Game Results Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(gameResults).map(([gameKey, result]) => (
                  <div
                    key={gameKey}
                    className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">
                        {gameModes[gameKey as GameMode].title}
                      </span>
                      <span
                        className={`text-2xl ${
                          result.isWinner ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {result.isWinner ? "🎉" : "😔"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Score: <span className="font-bold">{result.score}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Result:{" "}
                      <span
                        className={`font-bold ${
                          result.isWinner ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {result.isWinner ? "Won" : "Lost"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Play</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl mb-2">🎯</div>
                <h3 className="font-semibold mb-2">Pick 3 from 9</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose 3 tiles from 9 available options. Click to reveal
                  values! The player with the highest total wins!
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🏆</div>
                <h3 className="font-semibold mb-2">Pick 5 from 16</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Select 5 chests from a 4x4 grid. Each chest contains
                  treasures. Find the best combination to win!
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🎴</div>
                <h3 className="font-semibold mb-2">Pick 1 from 3</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Quick decision time! Choose 1 card from 3 options. Fast-paced
                  action with high stakes!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
