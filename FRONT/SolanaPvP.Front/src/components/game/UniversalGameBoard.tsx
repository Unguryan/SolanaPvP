// Universal game board component
import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  UniversalGameBoardProps,
  GameState,
  GameResult,
  Player,
} from "@/types/game";
import { TileGrid } from "./TileGrid";
import { ChestGrid } from "./ChestGrid";
import { CardRow } from "./CardRow";
import { PlayerCard } from "./PlayerCard";
import { WaitingLobby } from "./WaitingLobby";
import { GameResultModal } from "./GameResultModal";
import { TeamBattleLayout } from "./TeamBattleLayout";
import {
  getGameModeConfig,
  calculateGameResult,
} from "@/utils/gameScoreDistribution";
import {
  generateWinnableTiles,
  generateDemoPlayers,
} from "@/lib/gameMockGenerator";

export const UniversalGameBoard: React.FC<UniversalGameBoardProps> = ({
  gameMode,
  matchType,
  stakeSol,
  players,
  currentPlayer = "You",
  timeLimit = 20,
  onGameComplete,
  isDemoMode = false,
}) => {
  const [gameState, setGameState] = useState<GameState>({
    status: "waiting",
    timeRemaining: timeLimit,
    tiles: [],
    players: players.map((p) => ({
      id: p.username,
      username: p.username,
      targetScore: p.targetScore,
      currentScore: p.currentScore || 0,
      selections: [],
      isReady: p.isReady,
      isScoreRevealed: p.username === currentPlayer, // Current player always shows score
    })),
    currentPlayerTurn: currentPlayer,
    winner: undefined,
  });

  const [showResultModal, setShowResultModal] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [opponentRevealTimers, setOpponentRevealTimers] = useState<
    Map<string, NodeJS.Timeout>
  >(new Map());
  const gameCompletedRef = useRef(false);

  const gameConfig = getGameModeConfig(gameMode);
  const maxPlayers = matchType === "Solo" ? 2 : matchType === "Duo" ? 2 : 5;
  const isWaitingForPlayers = gameState.players.length < maxPlayers;
  const isWaitingForScores = gameState.status === "loading";

  // Check if we should hide other players' scores (opponents reveal individually)
  const shouldHideScores = useCallback(
    (playerUsername: string) => {
      // Current player always sees their own score
      if (playerUsername === currentPlayer) return false;

      // Check if this opponent has revealed their score
      const player = gameState.players.find(
        (p) => p.username === playerUsername
      );
      const shouldHide = !player?.isScoreRevealed;
      console.log(
        `shouldHideScores(${playerUsername}): isScoreRevealed=${player?.isScoreRevealed}, shouldHide=${shouldHide}`
      );
      return shouldHide;
    },
    [currentPlayer, gameState]
  );

  // For team battles, also hide scores during the entire game
  const shouldHideTeamScores = Boolean(
    (matchType === "Duo" || matchType === "Team") &&
      gameState.status === "playing"
  );

  // Function to show opponent score (NO TILE SELECTION!)
  const showOpponentScore = useCallback((playerUsername: string) => {
    console.log(`showOpponentScore called for: ${playerUsername}`);
    setGameState((prev) => {
      const newPlayers = prev.players.map((p) => {
        if (p.username === playerUsername) {
          console.log(`Setting isScoreRevealed: true for ${playerUsername}`);
          return {
            ...p,
            isScoreRevealed: true,
          };
        }
        return p;
      });

      return {
        ...prev,
        players: newPlayers,
      };
    });
  }, []);

  // Auto-select function for timeout
  const autoSelectForPlayer = useCallback(
    (playerUsername: string) => {
      const player = gameState.players.find(
        (p) => p.username === playerUsername
      );
      if (!player) return;

      const remainingSelections =
        gameConfig.maxSelections - player.selections.length;
      if (remainingSelections <= 0) return;

      // Get unselected tiles
      const unselectedTiles = gameState.tiles
        .map((tile, index) => ({ tile, index }))
        .filter(({ tile }) => !tile.selected);

      // Randomly select remaining tiles
      const shuffled = [...unselectedTiles].sort(() => Math.random() - 0.5);
      const autoSelections = shuffled
        .slice(0, remainingSelections)
        .map(({ index }) => index);

      // Auto-select remaining tiles for current player

      setGameState((prev) => {
        const newTiles = [...prev.tiles];
        const newPlayers = prev.players.map((p) => {
          if (p.username === playerUsername) {
            let newScore = p.currentScore;
            const newSelections = [...p.selections];

            autoSelections.forEach((tileIndex) => {
              // Use existing tile value instead of generating new one
              const tileValue = newTiles[tileIndex]?.value || 0;
              newTiles[tileIndex] = {
                ...newTiles[tileIndex],
                selected: true,
                revealed: true,
                value: tileValue,
              };
              newSelections.push(tileIndex);
              newScore += tileValue;
            });

            return {
              ...p,
              selections: newSelections,
              currentScore: newScore,
            };
          }
          return p;
        });

        // After auto-selection, reveal all remaining tiles (same logic as in handleTileClick)
        const allTilesRevealed = newTiles.map((tile) => ({
          ...tile,
          revealed: true,
        }));

        return {
          ...prev,
          tiles: allTilesRevealed,
          players: newPlayers,
        };
      });
    },
    [gameState.players, gameState.tiles, gameConfig.maxSelections]
  );

  // Timer effect
  useEffect(() => {
    if (gameState.status !== "playing" && gameState.status !== "waiting")
      return;

    const timer = setInterval(() => {
      setGameState((prev) => {
        if (prev.timeRemaining <= 0) {
          if (prev.status === "waiting") {
            // Timeout waiting for players - refund
            return { ...prev, status: "finished" };
          } else if (prev.status === "playing") {
            // Timeout during game - auto-select for current player
            const currentPlayerData = prev.players.find(
              (p) => p.username === currentPlayer
            );
            if (
              currentPlayerData &&
              currentPlayerData.selections.length < gameConfig.maxSelections
            ) {
              // Auto-select remaining tiles for current player
              autoSelectForPlayer(currentPlayer);
            }
            return { ...prev, status: "revealing" };
          }
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    gameState.status,
    autoSelectForPlayer,
    currentPlayer,
    gameConfig.maxSelections,
  ]);

  // Initialize game when all players are ready
  useEffect(() => {
    if (isWaitingForPlayers || isWaitingForScores) return;

    if (
      gameState.status === "waiting" &&
      gameState.players.length >= maxPlayers
    ) {
      // Start loading phase
      setGameState((prev) => ({ ...prev, status: "loading" }));

      // Simulate loading delay
      setTimeout(() => {
        // Get current player and AI players
        const currentPlayerData = gameState.players.find(
          (p) => p.username === currentPlayer
        );
        const aiPlayers = gameState.players.filter(
          (p) => p.username !== currentPlayer
        );

        // Find the highest AI score to determine what player needs to beat
        const highestAIScore = Math.max(
          ...aiPlayers.map((p) => p.currentScore)
        );

        // Generate tiles that give player a chance to win
        // Player needs to reach at least highestAIScore + 100 to win
        const targetWinScore = highestAIScore + 100;
        const playerCurrentScore = currentPlayerData?.currentScore || 0;
        const neededScore = Math.max(0, targetWinScore - playerCurrentScore);

        // Generate tiles with values that could help player reach winning score
        const tiles = generateWinnableTiles(gameMode, neededScore);

        setGameState((prev) => ({
          ...prev,
          status: "playing",
          tiles,
          timeRemaining: timeLimit,
        }));

        // Set up individual timers for ALL AI players (12-18 seconds)
        // In demo mode: all players except current player are AI
        // aiPlayers already defined above
        const newTimers = new Map<string, NodeJS.Timeout>();

        console.log(
          `Setting up timers for ${aiPlayers.length} AI players in ${matchType} mode`
        );

        aiPlayers.forEach((aiPlayer) => {
          const delay = Math.random() * 6000 + 12000; // 12-18 seconds
          const timer = setTimeout(() => {
            console.log(`Revealing score for AI player: ${aiPlayer.username}`);
            showOpponentScore(aiPlayer.username);
          }, delay);
          newTimers.set(aiPlayer.username, timer);
        });

        setOpponentRevealTimers(newTimers);
      }, 2000);
    }
  }, [
    isWaitingForPlayers,
    isWaitingForScores,
    gameState.status,
    gameState.players.length,
    gameState.players,
    maxPlayers,
    gameMode,
    timeLimit,
    currentPlayer,
    showOpponentScore,
    matchType,
  ]);

  // Handle tile selection
  const handleTileClick = useCallback(
    (index: number) => {
      if (gameState.status !== "playing") return;

      const currentPlayerData = gameState.players.find(
        (p) => p.username === currentPlayer
      );
      if (!currentPlayerData) return;

      // Check if current player has reached selection limit
      if (currentPlayerData.selections.length >= gameConfig.maxSelections) {
        return; // Don't allow more selections
      }

      setGameState((prev) => {
        const newPlayers = prev.players.map((player) => {
          if (player.username === currentPlayer) {
            const newSelections = [...player.selections, index];
            const tileValue = prev.tiles[index]?.value || 0;
            return {
              ...player,
              selections: newSelections,
              currentScore: player.currentScore + tileValue,
            };
          }
          return player;
        });

        const newTiles = prev.tiles.map((tile, i) =>
          i === index ? { ...tile, selected: true, revealed: true } : tile
        );

        // Check if current player has finished all selections
        const updatedCurrentPlayer = newPlayers.find(
          (p) => p.username === currentPlayer
        );
        if (
          updatedCurrentPlayer &&
          updatedCurrentPlayer.selections.length >= gameConfig.maxSelections
        ) {
          // Reveal all remaining tiles
          const allTilesRevealed = newTiles.map((tile) => ({
            ...tile,
            revealed: true,
          }));
          return {
            ...prev,
            tiles: allTilesRevealed,
            players: newPlayers,
          };
        }

        return {
          ...prev,
          tiles: newTiles,
          players: newPlayers,
        };
      });
    },
    [
      gameState.status,
      currentPlayer,
      gameState.players,
      gameConfig.maxSelections,
    ]
  );

  // Handle game completion
  useEffect(() => {
    if (gameState.status === "revealing" && !gameCompletedRef.current) {
      gameCompletedRef.current = true;

      // Clear any remaining timers
      opponentRevealTimers.forEach((timer) => clearTimeout(timer));
      setOpponentRevealTimers(new Map());

      // Wait 5 seconds then show results
      setTimeout(() => {
        const result = calculateGameResult(
          gameState.players,
          stakeSol,
          matchType,
          currentPlayer
        );
        setGameResult(result);
        setShowResultModal(true);

        // Only call onGameComplete once
        if (onGameComplete) {
          onGameComplete(result);
        }
      }, 5000);
    }
  }, [
    gameState.status,
    gameState.players,
    stakeSol,
    matchType,
    onGameComplete,
    opponentRevealTimers,
    currentPlayer,
  ]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      opponentRevealTimers.forEach((timer) => clearTimeout(timer));
    };
  }, [opponentRevealTimers]);

  const renderGameGrid = () => {
    switch (gameMode) {
      case "PickThreeFromNine":
        return (
          <TileGrid
            tiles={gameState.tiles}
            onTileClick={handleTileClick}
            disabled={gameState.status !== "playing"}
            currentPlayer={currentPlayer}
          />
        );
      case "PickFiveFromSixteen":
        return (
          <ChestGrid
            tiles={gameState.tiles}
            onTileClick={handleTileClick}
            disabled={gameState.status !== "playing"}
            currentPlayer={currentPlayer}
          />
        );
      case "PickOneFromThree":
        return (
          <CardRow
            tiles={gameState.tiles}
            onTileClick={handleTileClick}
            disabled={gameState.status !== "playing"}
            currentPlayer={currentPlayer}
          />
        );
      default:
        return null;
    }
  };

  if (isWaitingForPlayers) {
    return (
      <WaitingLobby
        players={gameState.players}
        maxPlayers={maxPlayers}
        timeRemaining={gameState.timeRemaining}
        onCancel={() =>
          setGameState((prev) => ({ ...prev, status: "finished" }))
        }
      />
    );
  }

  if (isWaitingForScores) {
    return (
      <div className="text-center py-12">
        <motion.div
          className="text-6xl mb-4"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          ⚔️
        </motion.div>
        <h2 className="text-2xl font-display font-bold text-sol-purple mb-2">
          Loading Battle...
        </h2>
        <p className="text-txt-muted">
          Preparing your match with epic rewards!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <div className="text-center">
        <motion.h2
          className="text-2xl font-display font-bold text-sol-purple mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {gameConfig.name}
        </motion.h2>
        <div className="flex items-center justify-center space-x-4 text-sm text-txt-muted">
          <span>Stake: {stakeSol} SOL</span>
          <span>•</span>
          <span>Mode: {matchType}</span>
          <span>•</span>
          <span>Time: {gameState.timeRemaining}s</span>
        </div>
      </div>

      {/* Players */}
      {matchType === "Duo" || matchType === "Team" ? (
        <TeamBattleLayout
          players={gameState.players}
          currentPlayer={currentPlayer}
          gameStatus={gameState.status}
          gameResult={gameResult}
          shouldHideScores={shouldHideScores}
          hideTeamScores={shouldHideTeamScores}
        />
      ) : (
        <div className="flex gap-4 justify-center">
          {gameState.players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isCurrentPlayer={
                player.username === currentPlayer &&
                gameState.status === "playing"
              }
              isWinner={gameResult?.winner === player.username}
              hideScore={shouldHideScores(player.username)}
              className="w-44 flex-shrink-0"
            />
          ))}
        </div>
      )}

      {/* Game Grid */}
      <div className="w-full">
        <motion.div
          className="glass-card p-6 rounded-xl w-full"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {renderGameGrid()}
        </motion.div>
      </div>

      {/* Result Modal */}
      <GameResultModal
        isOpen={showResultModal}
        result={gameResult}
        onClose={() => setShowResultModal(false)}
        onPlayAgain={() => {
          setShowResultModal(false);
          // Clear any existing timers
          opponentRevealTimers.forEach((timer) => clearTimeout(timer));
          setOpponentRevealTimers(new Map());

          // Reset completion flag
          gameCompletedRef.current = false;

          // Clear game result
          setGameResult(null);

          // Generate fresh players with new random scores
          const freshPlayers = generateDemoPlayers(matchType, currentPlayer);

          // Reset game state completely
          setGameState({
            status: "waiting",
            timeRemaining: timeLimit,
            tiles: [],
            players: freshPlayers.map((p: Player) => ({
              id: p.username,
              username: p.username,
              targetScore: p.targetScore,
              currentScore: p.username === currentPlayer ? 0 : p.currentScore,
              selections: [],
              isReady: p.isReady,
              isScoreRevealed: p.username === currentPlayer,
            })),
            currentPlayerTurn: currentPlayer,
            winner: undefined,
          });
        }}
        isDemoMode={isDemoMode}
      />
    </div>
  );
};
