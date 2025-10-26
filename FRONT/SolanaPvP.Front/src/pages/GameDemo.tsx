// Game Demo page - Simulated working game
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";
import { GameModeType, MatchType, MatchStatus } from "@/types/match";
import { formatSol } from "@/utils/lamports";
import { formatDuration } from "@/utils/format";

// Mock game data
const MOCK_MATCH = {
  id: "demo-match-1",
  creatorPubkey: "DemoUser123...",
  gameMode: GameModeType.PickThreeFromNine,
  matchType: MatchType.Solo,
  stakeLamports: 1000000000, // 1 SOL
  status: MatchStatus.Waiting,
  createdAt: new Date().toISOString(),
  participantCount: 1,
  maxParticipants: 2,
};

const MOCK_GAME_DATA = {
  targetScore: 1850,
  opponentScore: 1600,
  isWinner: true,
  timeRemaining: 20,
  selections: [
    { index: 0, value: 450, selected: false, revealed: false },
    { index: 1, value: 320, selected: false, revealed: false },
    { index: 2, value: 680, selected: false, revealed: false },
    { index: 3, value: 290, selected: false, revealed: false },
    { index: 4, value: 550, selected: false, revealed: false },
    { index: 5, value: 410, selected: false, revealed: false },
    { index: 6, value: 720, selected: false, revealed: false },
    { index: 7, value: 380, selected: false, revealed: false },
    { index: 8, value: 620, selected: false, revealed: false },
  ],
};

export const GameDemo: React.FC = () => {
  const [gameState, setGameState] = useState({
    isActive: false,
    isCompleted: false,
    timeRemaining: 20,
    selections: MOCK_GAME_DATA.selections,
    currentScore: 0,
    showResult: false,
    isRevealing: false,
    autoSelected: false,
  });

  const [match] = useState(MOCK_MATCH);

  // Timer effect
  useEffect(() => {
    if (!gameState.isActive || gameState.isCompleted) return;

    const timer = setInterval(() => {
      setGameState((prev) => {
        if (prev.timeRemaining <= 1) {
          // Auto-select remaining tiles if not all selected
          const selectedCount = prev.selections.filter(
            (s) => s.selected
          ).length;
          if (selectedCount < 3) {
            const unselected = prev.selections.filter((s) => !s.selected);
            const toSelect = unselected.slice(0, 3 - selectedCount);

            const newSelections = prev.selections.map((selection) => {
              const toSelectItem = toSelect.find(
                (item) => item.index === selection.index
              );
              if (toSelectItem) {
                return { ...selection, selected: true, revealed: true };
              }
              return selection;
            });

            const selectedTiles = newSelections.filter((s) => s.selected);
            const currentScore = selectedTiles.reduce(
              (sum, tile) => sum + tile.value,
              0
            );

            return {
              ...prev,
              selections: newSelections,
              currentScore,
              isActive: false,
              isCompleted: true,
              autoSelected: true,
            };
          } else {
            return {
              ...prev,
              isActive: false,
              isCompleted: true,
            };
          }
        }
        return {
          ...prev,
          timeRemaining: prev.timeRemaining - 1,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.isActive, gameState.isCompleted]);

  // Show results after 3 seconds when game completes
  useEffect(() => {
    if (gameState.isCompleted && !gameState.showResult) {
      const timer = setTimeout(() => {
        setGameState((prev) => ({
          ...prev,
          showResult: true,
          isRevealing: true,
        }));
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [gameState.isCompleted, gameState.showResult]);

  const handleTileSelect = (index: number) => {
    if (!gameState.isActive || gameState.isCompleted) return;

    setGameState((prev) => {
      const selectedCount = prev.selections.filter((s) => s.selected).length;
      if (selectedCount >= 3) return prev; // Already selected 3 tiles

      const newSelections = prev.selections.map((tile, i) =>
        i === index ? { ...tile, selected: true, revealed: true } : tile
      );

      const selectedTiles = newSelections.filter((tile) => tile.selected);
      const currentScore = selectedTiles.reduce(
        (sum, tile) => sum + tile.value,
        0
      );

      return {
        ...prev,
        selections: newSelections,
        currentScore,
      };
    });
  };

  const startGame = () => {
    setGameState((prev) => ({
      ...prev,
      isActive: true,
      isCompleted: false,
      showResult: false,
      timeRemaining: 20,
      selections: MOCK_GAME_DATA.selections,
      currentScore: 0,
    }));
  };

  const resetGame = () => {
    setGameState({
      isActive: false,
      isCompleted: false,
      timeRemaining: 20,
      selections: MOCK_GAME_DATA.selections,
      currentScore: 0,
      showResult: false,
      isRevealing: false,
      autoSelected: false,
    });
  };

  const selectedTiles = gameState.selections.filter((tile) => tile.selected);
  const isMaxSelections = selectedTiles.length >= 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🎮 Game Demo
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Experience the Solana PvP game interface
          </p>
        </div>

        {/* Match Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Match Information</span>
              <span className="text-sm font-normal text-gray-500">
                {match.gameMode} • {match.matchType} •{" "}
                {formatSol(match.stakeLamports)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatSol(match.stakeLamports)}
                </div>
                <div className="text-sm text-gray-500">Stake Amount</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {match.participantCount}/{match.maxParticipants}
                </div>
                <div className="text-sm text-gray-500">Participants</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {gameState.timeRemaining}s
                </div>
                <div className="text-sm text-gray-500">Time Remaining</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Board */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Pick 3 from 9 Tiles</span>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-500">
                      Selected: {selectedTiles.length}/3
                    </div>
                    <div className="text-sm font-bold text-blue-600">
                      Score: {gameState.currentScore}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {gameState.selections.map((tile, index) => (
                    <button
                      key={index}
                      onClick={() => handleTileSelect(index)}
                      disabled={
                        !gameState.isActive ||
                        gameState.isCompleted ||
                        tile.selected ||
                        isMaxSelections
                      }
                      className={`
                        aspect-square rounded-lg border-2 transition-all duration-300 transform
                        ${
                          tile.selected
                            ? "border-blue-500 bg-blue-100 dark:bg-blue-900 shadow-lg scale-105"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-300 hover:scale-105"
                        }
                        ${
                          !gameState.isActive ||
                          gameState.isCompleted ||
                          tile.selected ||
                          isMaxSelections
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer hover:shadow-md"
                        }
                        ${tile.selected ? "animate-pulse-glow" : ""}
                        ${tile.selected ? "animate-card-flip" : ""}
                      `}
                    >
                      <div className="flex flex-col items-center justify-center h-full p-2">
                        <div className="text-2xl mb-2">🎯</div>
                        {tile.revealed || gameState.isRevealing ? (
                          <div className="text-lg font-bold text-gray-900 dark:text-white animate-score-reveal">
                            {tile.value}
                          </div>
                        ) : (
                          <div className="text-lg font-bold text-gray-400 dark:text-gray-500">
                            ?
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Game Controls */}
                <div className="mt-6 flex justify-center space-x-4">
                  {!gameState.isActive && !gameState.isCompleted && (
                    <Button
                      onClick={startGame}
                      size="lg"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Start Game
                    </Button>
                  )}

                  {gameState.isActive && (
                    <Button
                      onClick={() => {
                        // Auto-select remaining tiles
                        const selectedCount = gameState.selections.filter(
                          (s) => s.selected
                        ).length;
                        if (selectedCount < 3) {
                          const unselected = gameState.selections.filter(
                            (s) => !s.selected
                          );
                          const toSelect = unselected.slice(
                            0,
                            3 - selectedCount
                          );

                          const newSelections = gameState.selections.map(
                            (selection) => {
                              const toSelectItem = toSelect.find(
                                (item) => item.index === selection.index
                              );
                              if (toSelectItem) {
                                return {
                                  ...selection,
                                  selected: true,
                                  revealed: true,
                                };
                              }
                              return selection;
                            }
                          );

                          const selectedTiles = newSelections.filter(
                            (s) => s.selected
                          );
                          const currentScore = selectedTiles.reduce(
                            (sum, tile) => sum + tile.value,
                            0
                          );

                          setGameState((prev) => ({
                            ...prev,
                            selections: newSelections,
                            currentScore,
                            isActive: false,
                            isCompleted: true,
                            autoSelected: true,
                          }));
                        } else {
                          setGameState((prev) => ({
                            ...prev,
                            isActive: false,
                            isCompleted: true,
                          }));
                        }
                      }}
                      variant="secondary"
                      size="lg"
                    >
                      End Game
                    </Button>
                  )}

                  {gameState.isCompleted && !gameState.showResult && (
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-600 mb-2">
                        {gameState.autoSelected
                          ? "Auto-selecting remaining tiles..."
                          : "Game Complete!"}
                      </div>
                      <div className="text-sm text-gray-500">
                        Revealing results in{" "}
                        {gameState.timeRemaining > 0
                          ? gameState.timeRemaining
                          : 3}{" "}
                        seconds...
                      </div>
                    </div>
                  )}

                  {gameState.showResult && (
                    <Button onClick={resetGame} size="lg" variant="secondary">
                      Play Again
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Game Info Panel */}
          <div className="space-y-6">
            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle>Game Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status:</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        gameState.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : gameState.isCompleted
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {gameState.isActive
                        ? "Playing"
                        : gameState.isCompleted
                        ? "Completed"
                        : "Ready"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Time:</span>
                    <span className="font-mono text-lg">
                      {formatDuration(gameState.timeRemaining)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Score:</span>
                    <span className="font-bold text-xl text-blue-600">
                      {gameState.currentScore}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected Tiles */}
            {selectedTiles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Selected Tiles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedTiles.map((tile, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900 rounded"
                      >
                        <span className="text-sm">Tile {tile.index + 1}</span>
                        <span className="font-bold text-blue-600">
                          {tile.value}
                        </span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex items-center justify-between font-bold">
                        <span>Total:</span>
                        <span className="text-blue-600">
                          {gameState.currentScore}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Game Result */}
            {gameState.showResult && (
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="text-green-600">Game Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="text-4xl">
                      {MOCK_GAME_DATA.isWinner ? "🎉" : "😔"}
                    </div>
                    <div
                      className={`text-2xl font-bold ${
                        MOCK_GAME_DATA.isWinner
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {MOCK_GAME_DATA.isWinner ? "You Won!" : "You Lost!"}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Your Score:</span>
                        <span className="font-bold">
                          {gameState.currentScore}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Opponent Score:</span>
                        <span className="font-bold">
                          {MOCK_GAME_DATA.opponentScore}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Winnings:</span>
                        <span
                          className={
                            MOCK_GAME_DATA.isWinner
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {MOCK_GAME_DATA.isWinner
                            ? `+${formatSol(match.stakeLamports * 2)}`
                            : `-${formatSol(match.stakeLamports)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Play</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl mb-2">🎯</div>
                <h3 className="font-semibold mb-2">Select Tiles</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose exactly 3 tiles from the 9 available options. Click to
                  reveal values!
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">⏱️</div>
                <h3 className="font-semibold mb-2">Time Limit</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You have 20 seconds to make your selection. Auto-select if
                  time runs out!
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🏆</div>
                <h3 className="font-semibold mb-2">Win Big</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The player with the highest total score wins the entire pot!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
