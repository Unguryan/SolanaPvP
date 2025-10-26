// Chest Selection Game Component
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { formatSol } from "@/utils/lamports";
import { formatDuration } from "@/utils/format";

interface Chest {
  index: number;
  value: number;
  selected: boolean;
  revealed: boolean;
}

interface ChestSelectionGameProps {
  onGameComplete: (score: number, isWinner: boolean) => void;
  timeLimit?: number;
  maxSelections?: number;
}

export const ChestSelectionGame: React.FC<ChestSelectionGameProps> = ({
  onGameComplete,
  timeLimit = 20,
  maxSelections = 5,
}) => {
  const [gameState, setGameState] = useState({
    isActive: false,
    isCompleted: false,
    timeRemaining: timeLimit,
    selections: Array.from({ length: 16 }, (_, i) => ({
      index: i,
      value: Math.floor(Math.random() * 200) + 100, // Random values 100-300
      selected: false,
      revealed: false,
    })) as Chest[],
    currentScore: 0,
    showResult: false,
    isRevealing: false,
    autoSelected: false,
  });

  // Timer effect
  useEffect(() => {
    if (!gameState.isActive || gameState.isCompleted) return;

    const timer = setInterval(() => {
      setGameState((prev) => {
        if (prev.timeRemaining <= 1) {
          // Auto-select remaining chests if not all selected
          const selectedCount = prev.selections.filter(
            (s) => s.selected
          ).length;
          if (selectedCount < maxSelections) {
            const unselected = prev.selections.filter((s) => !s.selected);
            const toSelect = unselected.slice(0, maxSelections - selectedCount);

            const newSelections = prev.selections.map((selection) => {
              const toSelectItem = toSelect.find(
                (item) => item.index === selection.index
              );
              if (toSelectItem) {
                return { ...selection, selected: true, revealed: true };
              }
              return selection;
            });

            const selectedChests = newSelections.filter((s) => s.selected);
            const currentScore = selectedChests.reduce(
              (sum, chest) => sum + chest.value,
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
  }, [gameState.isActive, gameState.isCompleted, maxSelections]);

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

  const handleChestSelect = (index: number) => {
    if (!gameState.isActive || gameState.isCompleted) return;

    setGameState((prev) => {
      const selectedCount = prev.selections.filter((s) => s.selected).length;
      if (selectedCount >= maxSelections) return prev; // Already selected max chests

      const newSelections = prev.selections.map((chest, i) =>
        i === index ? { ...chest, selected: true, revealed: true } : chest
      );

      const selectedChests = newSelections.filter((chest) => chest.selected);
      const currentScore = selectedChests.reduce(
        (sum, chest) => sum + chest.value,
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
      isRevealing: false,
      autoSelected: false,
      timeRemaining: timeLimit,
      selections: prev.selections.map((chest) => ({
        ...chest,
        selected: false,
        revealed: false,
      })),
      currentScore: 0,
    }));
  };

  const endGame = () => {
    const selectedChests = gameState.selections.filter(
      (chest) => chest.selected
    );
    const finalScore = selectedChests.reduce(
      (sum, chest) => sum + chest.value,
      0
    );

    // Simulate opponent score (slightly lower for demo)
    const opponentScore = Math.max(
      0,
      finalScore - Math.floor(Math.random() * 200) - 50
    );
    const isWinner = finalScore > opponentScore;

    setGameState((prev) => ({
      ...prev,
      isActive: false,
      isCompleted: true,
      showResult: true,
    }));

    onGameComplete(finalScore, isWinner);
  };

  const selectedChests = gameState.selections.filter((chest) => chest.selected);
  const isMaxSelections = selectedChests.length >= maxSelections;

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🏆 Pick 5 from 16 Chests</span>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Selected: {selectedChests.length}/{maxSelections}
              </div>
              <div className="text-sm font-bold text-purple-600">
                Score: {gameState.currentScore}
              </div>
              <div className="text-sm font-bold text-orange-600">
                Time: {formatDuration(gameState.timeRemaining)}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Chest Grid */}
          <div className="grid grid-cols-4 gap-3">
            {gameState.selections.map((chest, index) => (
              <button
                key={index}
                onClick={() => handleChestSelect(index)}
                disabled={
                  !gameState.isActive ||
                  gameState.isCompleted ||
                  chest.selected ||
                  isMaxSelections
                }
                className={`
                   aspect-square rounded-lg border-2 transition-all duration-300 transform
                   ${
                     chest.selected
                       ? "border-purple-500 bg-purple-100 dark:bg-purple-900 shadow-lg scale-105"
                       : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-purple-300 hover:scale-105"
                   }
                   ${
                     !gameState.isActive ||
                     gameState.isCompleted ||
                     chest.selected ||
                     isMaxSelections
                       ? "opacity-50 cursor-not-allowed"
                       : "cursor-pointer hover:shadow-md"
                   }
                   ${chest.selected ? "animate-pulse-glow" : ""}
                   ${chest.selected ? "animate-card-flip" : ""}
                 `}
              >
                <div className="flex flex-col items-center justify-center h-full p-1">
                  <div className="text-2xl mb-1">🏆</div>
                  {chest.revealed || gameState.isRevealing ? (
                    <div className="text-xs font-bold text-gray-900 dark:text-white animate-score-reveal">
                      {chest.value}
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-gray-400 dark:text-gray-500">
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
                className="bg-purple-600 hover:bg-purple-700"
              >
                Start Game
              </Button>
            )}

            {gameState.isActive && (
              <Button
                onClick={() => {
                  // Auto-select remaining chests
                  const selectedCount = gameState.selections.filter(
                    (s) => s.selected
                  ).length;
                  if (selectedCount < maxSelections) {
                    const unselected = gameState.selections.filter(
                      (s) => !s.selected
                    );
                    const toSelect = unselected.slice(
                      0,
                      maxSelections - selectedCount
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

                    const selectedChests = newSelections.filter(
                      (s) => s.selected
                    );
                    const currentScore = selectedChests.reduce(
                      (sum, chest) => sum + chest.value,
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
                <div className="text-lg font-semibold text-purple-600 mb-2">
                  {gameState.autoSelected
                    ? "Auto-selecting remaining chests..."
                    : "Game Complete!"}
                </div>
                <div className="text-sm text-gray-500">
                  Revealing results in 3 seconds...
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Chests */}
      {selectedChests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Chests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {selectedChests.map((chest, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center p-2 bg-purple-50 dark:bg-purple-900 rounded"
                >
                  <div className="text-lg">🏆</div>
                  <div className="text-sm font-bold text-purple-600">
                    {chest.value}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex items-center justify-between font-bold">
                <span>Total Score:</span>
                <span className="text-purple-600">
                  {gameState.currentScore}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
