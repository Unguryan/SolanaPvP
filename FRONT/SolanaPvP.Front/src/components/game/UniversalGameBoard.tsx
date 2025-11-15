// Universal game board component
import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  UniversalGameBoardProps,
  GameState,
  GameResult,
  GameType,
  MatchMode,
} from "@/types/game";
import { WaitingLobby } from "./WaitingLobby";
import { GameLayout } from "./GameLayout";
import { PickHigherGame } from "./games/PickHigher";
import { PlinkoGame } from "./games/Plinko";
import type { PlinkoGameHandle } from "./games/Plinko/PlinkoGame";
import { MinerGameBoard } from "./games/Miner";
import {
  getGameModeConfig,
  calculateGameResult,
} from "@/utils/gameScoreDistribution";
import {
  generateWinnableTiles,
  generateTargetedTiles,
} from "@/lib/gameMockGenerator";
import {
  breakdownScoreToSlots,
  getSlotValues,
} from "@/utils/plinkoScoreBreakdown";

export const UniversalGameBoard: React.FC<UniversalGameBoardProps> = ({
  gameType = GameType.PickHigher,
  gameMode,
  matchMode: _matchMode = MatchMode.Team, // eslint-disable-line @typescript-eslint/no-unused-vars
  teamSize,
  stakeSol,
  players,
  currentPlayer = "You",
  currentPlayerPubkey,
  matchFromBackend,
  timeLimit = 20,
  onGameComplete,
  isDemoMode = false,
}) => {
  // Map teamSize to old matchType format for backwards compatibility
  const matchType = teamSize || "Solo";

  // Determine if this is a Plinko game
  const isPlinkoGame =
    gameType === GameType.Plinko || gameMode.startsWith("Plinko");
  // Determine if this is a Miner game
  const isMinerGame =
    gameType === GameType.Miner || gameMode.startsWith("Miner");
  const [gameState, setGameState] = useState<GameState>({
    status: "waiting",
    timeRemaining: timeLimit,
    tiles: [],
    players: players.map((p) => ({
      id: p.username,
      username: p.username,
      pubkey: p.pubkey,
      targetScore: p.targetScore,
      currentScore: p.currentScore || 0,
      selections: [],
      isReady: p.isReady,
      isScoreRevealed: currentPlayerPubkey
        ? p.pubkey === currentPlayerPubkey
        : p.username === currentPlayer, // Current player always shows score
      // Miner-specific fields: preserve willWin from players prop
      willWin: p.willWin,
      isAlive: p.isAlive,
      openedTileCount: p.openedTileCount,
    })),
    currentPlayerTurn: currentPlayer,
    winner: undefined,
  });

  const [opponentRevealTimers, setOpponentRevealTimers] = useState<
    Map<string, NodeJS.Timeout>
  >(new Map());
  const gameCompletedRef = useRef(false);
  const autoSelectingRef = useRef(false);
  const plinkoGameRef = useRef<PlinkoGameHandle>(null);

  // Plinko-specific state
  const [plinkoSlots, setPlinkoSlots] = useState<number[]>([]); // Pre-determined slots for each ball
  const [currentBallIndex, setCurrentBallIndex] = useState(0); // Current ball being dropped

  const gameConfig = getGameModeConfig(gameMode);
  const maxPlayers = matchType === "Solo" ? 2 : matchType === "Duo" ? 2 : 5;
  // В Demo режиме сразу пропускаем waiting, в реальной игре ждем игроков
  const isWaitingForPlayers = isDemoMode
    ? false
    : gameState.players.length < maxPlayers;
  const isWaitingForScores = gameState.status === "loading";
  const [localGameResult, setLocalGameResult] = useState<GameResult | null>(
    null
  );

  // Check if we should hide other players' scores (opponents reveal individually)
  const shouldHideScores = useCallback(
    (playerUsername: string) => {
      // Find the player by username
      const player = gameState.players.find(
        (p) => p.username === playerUsername
      );

      // Current player always sees their own score (check by pubkey if available)
      if (currentPlayerPubkey && player?.pubkey === currentPlayerPubkey) {
        return false;
      }

      // Fallback to username check for demo mode
      if (!currentPlayerPubkey && playerUsername === currentPlayer) {
        return false;
      }

      // Check if this opponent has revealed their score
      const shouldHide = !player?.isScoreRevealed;
      console.log(
        `shouldHideScores(${playerUsername}): isScoreRevealed=${player?.isScoreRevealed}, shouldHide=${shouldHide}`
      );
      return shouldHide;
    },
    [currentPlayer, currentPlayerPubkey, gameState]
  );

  // For team battles, also hide scores during the entire game
  const shouldHideTeamScores = Boolean(
    (matchType === "Duo" || matchType === "Team") &&
      gameState.status === "playing"
  );

  // Function to show opponent score (NO TILE SELECTION!)
  // Use ref to track which players have already been revealed to prevent duplicate calls
  const revealedPlayersRef = useRef<Set<string>>(new Set());

  const showOpponentScore = useCallback((playerUsername: string) => {
    // Prevent duplicate calls for the same player
    if (revealedPlayersRef.current.has(playerUsername)) {
      console.log(
        `showOpponentScore: ${playerUsername} already revealed, skipping`
      );
      return;
    }

    console.log(`showOpponentScore called for: ${playerUsername}`);
    revealedPlayersRef.current.add(playerUsername);

    setGameState((prev) => {
      // Double-check if player is already revealed (defensive check)
      const player = prev.players.find((p) => p.username === playerUsername);
      if (player?.isScoreRevealed) {
        console.log(
          `showOpponentScore: ${playerUsername} already revealed in state, skipping`
        );
        return prev;
      }

      const newPlayers = prev.players.map((p) => {
        if (p.username === playerUsername) {
          console.log(
            `Setting isScoreRevealed: true and currentScore = targetScore for ${playerUsername}`
          );
          return {
            ...p,
            isScoreRevealed: true,
            currentScore: p.targetScore, // AI "completed" their selection, show targetScore
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

  // Initialize game when all players are ready
  useEffect(() => {
    if (isWaitingForPlayers || isWaitingForScores) return;

    if (
      gameState.status === "waiting" &&
      (isDemoMode || gameState.players.length >= maxPlayers)
    ) {
      // Start loading phase
      setGameState((prev) => ({ ...prev, status: "loading" }));

      // Simulate loading delay (shorter for demo)
      setTimeout(() => {
        // Get current player and AI players
        // Use currentPlayerPubkey if available (real game), otherwise username (demo)
        let currentPlayerData;
        let aiPlayers;

        if (currentPlayerPubkey) {
          // Real game: find by pubkey
          currentPlayerData = gameState.players.find(
            (p) => p.pubkey === currentPlayerPubkey
          );
          aiPlayers = gameState.players.filter(
            (p) => p.pubkey !== currentPlayerPubkey
          );

          console.log(
            `[Real Game] Current player:`,
            currentPlayerData?.username,
            currentPlayerPubkey
          );
          console.log(
            `[Real Game] AI opponents:`,
            aiPlayers.map((p) => p.username)
          );
        } else {
          // Demo mode: use username
          currentPlayerData = gameState.players.find(
            (p) => p.username === currentPlayer
          );
          aiPlayers = gameState.players.filter(
            (p) => p.username !== currentPlayer
          );
        }

        // For Plinko: generate slot indices based on target score
        // For PickHigher: generate tiles
        if (isPlinkoGame) {
          // Plinko mode: break down target score into slots
          const targetScore = currentPlayerData?.targetScore || 1000;
          const ballCount = gameConfig.maxSelections;
          const slotCount = (gameConfig as any).slots || 6;

          const slots = breakdownScoreToSlots(
            targetScore,
            ballCount,
            slotCount
          );
          setPlinkoSlots(slots);
          setCurrentBallIndex(0);

          setGameState((prev) => ({
            ...prev,
            status: "playing",
            tiles: [], // No tiles for Plinko
            timeRemaining: timeLimit,
          }));
        } else {
          // PickHigher mode: generate tiles
          const tiles = isDemoMode
            ? (() => {
                // Demo mode: generate tiles to give player chance to win
                // Берем максимальный targetScore среди ВСЕХ игроков
                const allTargetScores = gameState.players.map(
                  (p) => p.targetScore
                );
                const maxTargetScore = Math.max(...allTargetScores);
                // Добавляем 5% для гарантии возможности выиграть
                const winningTarget = Math.floor(maxTargetScore * 1.05);
                const playerCurrentScore = currentPlayerData?.currentScore || 0;
                const neededScore = Math.max(
                  0,
                  winningTarget - playerCurrentScore
                );
                return generateWinnableTiles(gameMode, neededScore);
              })()
            : generateTargetedTiles(
                gameMode,
                currentPlayerData?.targetScore || 1000,
                gameConfig.maxSelections
              );

          setGameState((prev) => ({
            ...prev,
            status: "playing",
            tiles,
            timeRemaining: timeLimit,
          }));
        }

        // Reset revealed players ref when starting new game
        revealedPlayersRef.current.clear();

        // Set up individual timers for ALL AI players (everyone except current player)
        // In both demo AND real games: all opponents are AI-controlled
        // NOTE: Miner game has its own logic in MinerGameBoard - don't set up timers here
        if (!isMinerGame) {
          const newTimers = new Map<string, NodeJS.Timeout>();

          console.log(
            `Setting up timers for ${aiPlayers.length} AI players in ${matchType} mode`
          );

          aiPlayers.forEach((aiPlayer) => {
            const delay = Math.random() * 6000 + 12000; // 12-18 seconds
            const timer = setTimeout(() => {
              console.log(
                `Revealing score for AI player: ${aiPlayer.username}`
              );
              showOpponentScore(aiPlayer.username);
            }, delay);
            newTimers.set(aiPlayer.username, timer);
          });

          setOpponentRevealTimers(newTimers);
        }
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
    currentPlayerPubkey,
    showOpponentScore,
    matchType,
    isDemoMode,
    matchFromBackend,
    gameConfig,
    isPlinkoGame,
    isMinerGame,
  ]);

  // Handle ball drop for Plinko
  const handleBallDrop = useCallback(
    (slotIndex: number) => {
      console.log(
        "🔵 handleBallDrop called! Slot:",
        slotIndex,
        "Status:",
        gameState.status
      );

      // При revealing тоже принимаем очки (для автоброса после таймера)
      if (gameState.status !== "playing" && gameState.status !== "revealing") {
        console.log("❌ BLOCKED by status:", gameState.status);
        return;
      }

      // Find current player
      const currentPlayerData = currentPlayerPubkey
        ? gameState.players.find((p) => p.pubkey === currentPlayerPubkey)
        : gameState.players.find((p) => p.username === currentPlayer);

      if (!currentPlayerData) {
        console.log("❌ BLOCKED: current player not found");
        return;
      }

      console.log(
        "👤 Current player:",
        currentPlayer,
        "Selections:",
        currentPlayerData.selections.length,
        "/",
        gameConfig.maxSelections
      );

      // НЕ блокируем если revealing - автоброшенные шарики должны засчитаться!
      if (
        gameState.status === "playing" &&
        currentPlayerData.selections.length >= gameConfig.maxSelections
      ) {
        console.log("❌ BLOCKED: max selections in playing mode");
        return;
      }

      // Get the value from the slot
      const slotCount = (gameConfig as any).slots || 6;
      const slotValues = getSlotValues(slotCount);

      // Ensure slotIndex is within bounds
      const clampedSlotIndex = Math.max(0, Math.min(slotCount - 1, slotIndex));
      const ballValue = slotValues[clampedSlotIndex];

      if (slotIndex !== clampedSlotIndex) {
        console.warn(
          `⚠️ Slot index clamped: ${slotIndex} → ${clampedSlotIndex} (slotCount: ${slotCount}, slotValues length: ${slotValues.length})`
        );
      }

      console.log(
        `✅ Ball landed in slot ${clampedSlotIndex} (was ${slotIndex}), value: ${ballValue}, slotCount: ${slotCount}, slotValues: [${slotValues.join(
          ", "
        )}]`
      );

      setGameState((prev) => {
        // Update players with ball value
        const newPlayers = prev.players.map((player) => {
          const isCurrentPlayer = currentPlayerPubkey
            ? player.pubkey === currentPlayerPubkey
            : player.username === currentPlayer;

          if (isCurrentPlayer) {
            const newSelections = [...player.selections, slotIndex];
            const newScore = player.currentScore + ballValue;
            console.log(
              "💎 Player update:",
              player.username,
              "Score:",
              player.currentScore,
              "→",
              newScore,
              "Selections:",
              player.selections.length,
              "→",
              newSelections.length
            );
            return {
              ...player,
              selections: newSelections,
              currentScore: newScore,
            };
          }
          return player;
        });

        // Check if current player has finished all balls
        const updatedCurrentPlayer = currentPlayerPubkey
          ? newPlayers.find((p) => p.pubkey === currentPlayerPubkey)
          : newPlayers.find((p) => p.username === currentPlayer);

        if (
          updatedCurrentPlayer &&
          updatedCurrentPlayer.selections.length >= gameConfig.maxSelections
        ) {
          // For Plinko: DON'T move to revealing - wait for timer!
          // For PickHigher: reveal immediately (not implemented yet)
          // Just update players, keep status "playing"
        }

        // Move to next ball
        setCurrentBallIndex((prevIndex) => prevIndex + 1);

        return {
          ...prev,
          players: newPlayers,
        };
      });
    },
    [
      gameState.status,
      currentPlayer,
      currentPlayerPubkey,
      gameState.players,
      gameConfig,
    ]
  );

  // Handle tile selection
  const handleTileClick = useCallback(
    (index: number) => {
      if (gameState.status !== "playing") return;

      // Find current player by pubkey (real game) or username (demo)
      const currentPlayerData = currentPlayerPubkey
        ? gameState.players.find((p) => p.pubkey === currentPlayerPubkey)
        : gameState.players.find((p) => p.username === currentPlayer);

      if (!currentPlayerData) return;

      // Check if current player has reached selection limit
      if (currentPlayerData.selections.length >= gameConfig.maxSelections) {
        return; // Don't allow more selections
      }

      setGameState((prev) => {
        // Calculate tile value FIRST (before updating players)
        let calculatedTileValue = prev.tiles[index]?.value || 0;

        // Find current player to calculate correct value
        const currentPlayerData = currentPlayerPubkey
          ? prev.players.find((p) => p.pubkey === currentPlayerPubkey)
          : prev.players.find((p) => p.username === currentPlayer);

        if (
          currentPlayerData &&
          !isDemoMode &&
          currentPlayerData.targetScore > 0
        ) {
          // Real game: calculate value to reach targetScore
          const selectionsCount = currentPlayerData.selections.length + 1; // +1 for current selection
          const remainingSelections =
            gameConfig.maxSelections - selectionsCount;

          if (remainingSelections === 0) {
            // Last selection: make it exactly targetScore
            calculatedTileValue =
              currentPlayerData.targetScore - currentPlayerData.currentScore;
          } else {
            // Not last selection: distribute remaining score
            const remainingScore =
              currentPlayerData.targetScore - currentPlayerData.currentScore;
            // Divide remaining score by remaining selections (with some randomness)
            const baseValue = Math.floor(
              remainingScore / (remainingSelections + 1)
            );
            const variation = Math.floor(baseValue * 0.3); // ±30% variation
            calculatedTileValue =
              baseValue + Math.floor(Math.random() * variation * 2) - variation;
            calculatedTileValue = Math.max(1, calculatedTileValue); // At least 1
          }
        }

        // Update players with calculated value
        const newPlayers = prev.players.map((player) => {
          // Match by pubkey (real game) or username (demo)
          const isCurrentPlayer = currentPlayerPubkey
            ? player.pubkey === currentPlayerPubkey
            : player.username === currentPlayer;

          if (isCurrentPlayer) {
            const newSelections = [...player.selections, index];
            return {
              ...player,
              selections: newSelections,
              currentScore: player.currentScore + calculatedTileValue,
            };
          }
          return player;
        });

        // Update tiles - set the CALCULATED value to the selected tile
        const newTiles = prev.tiles.map((tile, i) =>
          i === index
            ? {
                ...tile,
                selected: true,
                revealed: true,
                value: calculatedTileValue,
              }
            : tile
        );

        // Check if current player has finished all selections
        const updatedCurrentPlayer = currentPlayerPubkey
          ? newPlayers.find((p) => p.pubkey === currentPlayerPubkey)
          : newPlayers.find((p) => p.username === currentPlayer);
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
      currentPlayerPubkey,
      gameState.players,
      gameConfig.maxSelections,
      isDemoMode,
    ]
  );

  // Auto-select function for timeout - вызывает handleTileClick для правильного расчета
  const autoSelectForPlayer = useCallback(
    (playerUsername: string) => {
      // Защита от повторного вызова
      if (autoSelectingRef.current) return;
      autoSelectingRef.current = true;

      const player = gameState.players.find(
        (p) => p.username === playerUsername
      );
      if (!player) {
        autoSelectingRef.current = false;
        return;
      }

      const remainingSelections =
        gameConfig.maxSelections - player.selections.length;
      if (remainingSelections <= 0) {
        autoSelectingRef.current = false;
        return;
      }

      // Get unselected tiles
      const unselectedTiles = gameState.tiles
        .map((tile, index) => ({ tile, index }))
        .filter(({ tile }) => !tile.selected && !tile.revealed);

      // Randomly select remaining tiles
      const shuffled = [...unselectedTiles].sort(() => Math.random() - 0.5);
      const autoSelections = shuffled
        .slice(0, remainingSelections)
        .map(({ index }) => index);

      console.log(
        `[AutoSelect] Player: ${playerUsername}, Remaining: ${remainingSelections}, Selecting: ${autoSelections}`
      );

      // Вызываем handleTileClick для каждого tile
      // Это гарантирует правильный расчет значений для достижения targetScore
      autoSelections.forEach((tileIndex) => {
        handleTileClick(tileIndex);
      });

      // Сбрасываем флаг после небольшой задержки
      setTimeout(() => {
        autoSelectingRef.current = false;
      }, 500);
    },
    [
      gameState.players,
      gameState.tiles,
      gameConfig.maxSelections,
      handleTileClick,
    ]
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
            // Timeout during game - auto-select/drop for current player
            // NOTE: Miner game has its own logic in MinerGameBoard - don't interfere
            if (!isMinerGame) {
              const currentPlayerData = prev.players.find(
                (p) => p.username === currentPlayer
              );
              if (
                currentPlayerData &&
                currentPlayerData.selections.length < gameConfig.maxSelections
              ) {
                if (isPlinkoGame) {
                  // Plinko: автоброс всех оставшихся шариков
                  plinkoGameRef.current?.dropAllRemainingBalls();
                } else {
                  // PickHigher: автовыбор
                  autoSelectForPlayer(currentPlayer);
                }
              }
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
    isPlinkoGame,
    isMinerGame,
  ]);

  // Handle game completion
  // IMPORTANT: Skip this for Miner games - MinerGameBoard handles its own completion
  useEffect(() => {
    if (isMinerGame) {
      // Miner games handle their own completion in MinerGameBoard
      return;
    }

    if (gameState.status === "revealing" && !gameCompletedRef.current) {
      gameCompletedRef.current = true;

      // Clear any remaining timers
      opponentRevealTimers.forEach((timer) => clearTimeout(timer));
      setOpponentRevealTimers(new Map());

      // УМНАЯ ЗАДЕРЖКА для Plinko!
      const showResults = () => {
        // В демо режиме используем реальные currentScore, в реальной игре - targetScore
        const result = calculateGameResult(
          gameState.players,
          stakeSol,
          matchType,
          currentPlayer,
          !isDemoMode // useFinalScores = true только для реальной игры (используем targetScore)
        );

        // Determine if current player won from backend data
        let isCurrentPlayerWinner =
          result.winner === currentPlayer || result.winner === "You";
        let actualWinAmount = result.winAmount;

        if (matchFromBackend && currentPlayerPubkey) {
          const myParticipant = matchFromBackend.participants?.find(
            (p: any) => p.pubkey === currentPlayerPubkey
          );
          if (myParticipant) {
            isCurrentPlayerWinner = myParticipant.isWinner ?? false;

            // Calculate actual win amount from real game data
            // Winner gets total pot (all stakes combined)
            if (isCurrentPlayerWinner) {
              const totalParticipants =
                matchFromBackend.participants?.length || 2;
              const totalPot = stakeSol * totalParticipants;

              // Winner gets full pot
              actualWinAmount = totalPot;
            } else {
              // Loser gets nothing
              actualWinAmount = 0;
            }
          }
        }

        const enhancedResult = {
          ...result,
          isCurrentPlayerWinner,
          winAmount: actualWinAmount, // Override with actual win amount
        };

        setLocalGameResult(enhancedResult);

        // Call onGameComplete to notify parent (MatchPreview will show modal)
        if (onGameComplete) {
          onGameComplete(enhancedResult);
        }
      };

      // Проверяем, был ли автоброс (для Plinko)
      if (isPlinkoGame && plinkoGameRef.current?.wasAutoDropped()) {
        // Автоброс: ждем пока все шарики упадут + 2 сек
        const checkInterval = setInterval(() => {
          if (plinkoGameRef.current?.getAllBallsLanded()) {
            clearInterval(checkInterval);
            // Все шарики упали, ждем еще 2 секунды
            setTimeout(showResults, 2000);
          }
        }, 100); // Проверяем каждые 100ms
      } else {
        // Юзер сам все бросил: ждем 3 секунды
        setTimeout(showResults, 3000);
      }
    }
  }, [
    gameState.status,
    gameState.players,
    stakeSol,
    matchType,
    onGameComplete,
    opponentRevealTimers,
    currentPlayer,
    currentPlayerPubkey,
    matchFromBackend,
    isPlinkoGame,
    isMinerGame,
    isDemoMode,
  ]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      opponentRevealTimers.forEach((timer) => clearTimeout(timer));
    };
  }, [opponentRevealTimers]);

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

  // If Miner game, use MinerGameBoard component
  if (isMinerGame) {
    return (
      <MinerGameBoard
        gameMode={gameMode as "Miner1v9" | "Miner3v16" | "Miner5v25"}
        matchType={matchType}
        stakeSol={stakeSol}
        players={gameState.players}
        currentPlayer={currentPlayer}
        currentPlayerPubkey={currentPlayerPubkey}
        matchFromBackend={matchFromBackend}
        timeLimit={timeLimit}
        onGameComplete={onGameComplete}
        isDemoMode={isDemoMode}
      />
    );
  }

  return (
    <>
      <GameLayout
        gameName={gameConfig.name}
        stakeSol={stakeSol}
        matchType={matchType}
        timeRemaining={gameState.timeRemaining}
        players={gameState.players}
        currentPlayer={currentPlayer}
        currentPlayerPubkey={currentPlayerPubkey}
        gameStatus={gameState.status}
        gameResult={localGameResult}
        shouldHideScores={shouldHideScores}
        hideTeamScores={shouldHideTeamScores}
      >
        {/* Game Board - Plinko or PickHigher (hidden for real spectators only) */}
        {currentPlayer !== "" || isDemoMode ? (
          isPlinkoGame ? (
            <PlinkoGame
              ref={plinkoGameRef}
              gameMode={
                gameMode as "Plinko3Balls" | "Plinko5Balls" | "Plinko7Balls"
              }
              onBallDrop={handleBallDrop}
              disabled={gameState.status !== "playing"}
              currentPlayer={currentPlayer}
              players={gameState.players}
              currentBallIndex={currentBallIndex}
              targetSlotIndex={plinkoSlots[currentBallIndex]}
              allTargetSlots={plinkoSlots}
            />
          ) : (
            <PickHigherGame
              gameMode={
                gameMode as
                  | "PickThreeFromNine"
                  | "PickFiveFromSixteen"
                  | "PickOneFromThree"
              }
              tiles={gameState.tiles}
              onTileClick={handleTileClick}
              disabled={gameState.status !== "playing"}
              currentPlayer={currentPlayer}
              players={gameState.players}
            />
          )
        ) : (
          <div className="text-center py-12">
            <div className="glass-card p-8 max-w-md mx-auto">
              <h3 className="text-2xl font-bold text-sol-purple mb-4">
                👁️ Spectator Mode
              </h3>
              <p className="text-txt-muted">
                You are watching this match as a spectator. The game board is
                hidden, but you can see all player scores and team progress
                above.
              </p>
            </div>
          </div>
        )}
      </GameLayout>
    </>
  );
};
