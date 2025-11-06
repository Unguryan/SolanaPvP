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
import { PickHigherGame } from "./games/PickHigherGame";
import {
  getGameModeConfig,
  calculateGameResult,
} from "@/utils/gameScoreDistribution";
import {
  generateWinnableTiles,
  generateTargetedTiles,
} from "@/lib/gameMockGenerator";

export const UniversalGameBoard: React.FC<UniversalGameBoardProps> = ({
  gameType: _gameType = GameType.PickHigher, // eslint-disable-line @typescript-eslint/no-unused-vars
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
  const [gameState, setGameState] = useState<GameState>({
    status: "waiting",
    timeRemaining: timeLimit,
    tiles: [],
    players: players.map((p) => ({
      id: p.username,
      username: p.username,
      pubkey: (p as any).pubkey,
      targetScore: p.targetScore,
      currentScore: p.currentScore || 0,
      selections: [],
      isReady: p.isReady,
      isScoreRevealed: currentPlayerPubkey 
        ? (p as any).pubkey === currentPlayerPubkey 
        : p.username === currentPlayer, // Current player always shows score
    })),
    currentPlayerTurn: currentPlayer,
    winner: undefined,
  });

  const [opponentRevealTimers, setOpponentRevealTimers] = useState<
    Map<string, NodeJS.Timeout>
  >(new Map());
  const gameCompletedRef = useRef(false);

  const gameConfig = getGameModeConfig(gameMode);
  const maxPlayers = matchType === "Solo" ? 2 : matchType === "Duo" ? 2 : 5;
  const isWaitingForPlayers = gameState.players.length < maxPlayers;
  const isWaitingForScores = gameState.status === "loading";
  const [localGameResult, setLocalGameResult] = useState<GameResult | null>(null);

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
  const showOpponentScore = useCallback((playerUsername: string) => {
    console.log(`showOpponentScore called for: ${playerUsername}`);
    setGameState((prev) => {
      const newPlayers = prev.players.map((p) => {
        if (p.username === playerUsername) {
          console.log(`Setting isScoreRevealed: true and currentScore = targetScore for ${playerUsername}`);
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
        // Use currentPlayerPubkey if available (real game), otherwise username (demo)
        let currentPlayerData;
        let aiPlayers;
        
        if (currentPlayerPubkey) {
          // Real game: find by pubkey
          currentPlayerData = gameState.players.find((p) => p.pubkey === currentPlayerPubkey);
          aiPlayers = gameState.players.filter((p) => p.pubkey !== currentPlayerPubkey);
          
          console.log(`[Real Game] Current player:`, currentPlayerData?.username, currentPlayerPubkey);
          console.log(`[Real Game] AI opponents:`, aiPlayers.map(p => p.username));
        } else {
          // Demo mode: use username
          currentPlayerData = gameState.players.find((p) => p.username === currentPlayer);
          aiPlayers = gameState.players.filter((p) => p.username !== currentPlayer);
        }

        // For real games: use targetScore from backend (outcome already determined)
        // Generate tiles where player can reach their targetScore through selections
        const tiles = isDemoMode
          ? (() => {
              // Demo mode: generate tiles to give player chance to win
              const highestAIScore = Math.max(
                ...aiPlayers.map((p) => p.currentScore)
              );
              const targetWinScore = highestAIScore + 100;
              const playerCurrentScore = currentPlayerData?.currentScore || 0;
              const neededScore = Math.max(0, targetWinScore - playerCurrentScore);
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

        // Set up individual timers for ALL AI players (everyone except current player)
        // In both demo AND real games: all opponents are AI-controlled
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
    currentPlayerPubkey,
    showOpponentScore,
    matchType,
    isDemoMode,
    matchFromBackend,
    gameConfig.maxSelections,
  ]);

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
        
        if (currentPlayerData && !isDemoMode && currentPlayerData.targetScore > 0) {
          // Real game: calculate value to reach targetScore
          const selectionsCount = currentPlayerData.selections.length + 1; // +1 for current selection
          const remainingSelections = gameConfig.maxSelections - selectionsCount;
          
          if (remainingSelections === 0) {
            // Last selection: make it exactly targetScore
            calculatedTileValue = currentPlayerData.targetScore - currentPlayerData.currentScore;
          } else {
            // Not last selection: distribute remaining score
            const remainingScore = currentPlayerData.targetScore - currentPlayerData.currentScore;
            // Divide remaining score by remaining selections (with some randomness)
            const baseValue = Math.floor(remainingScore / (remainingSelections + 1));
            const variation = Math.floor(baseValue * 0.3); // ±30% variation
            calculatedTileValue = baseValue + Math.floor(Math.random() * variation * 2) - variation;
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
            ? { ...tile, selected: true, revealed: true, value: calculatedTileValue } 
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

  // Handle game completion
  useEffect(() => {
    if (gameState.status === "revealing" && !gameCompletedRef.current) {
      gameCompletedRef.current = true;

      // Clear any remaining timers
      opponentRevealTimers.forEach((timer) => clearTimeout(timer));
      setOpponentRevealTimers(new Map());

      // Wait 1 second then show results modal
      setTimeout(() => {
        const result = calculateGameResult(
          gameState.players,
          stakeSol,
          matchType,
          currentPlayer
        );
        
        // Determine if current player won from backend data
        let isCurrentPlayerWinner = result.winner === currentPlayer || result.winner === "You";
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
              const totalParticipants = matchFromBackend.participants?.length || 2;
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
      }, 2000); // Show modal after 1 second
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
        {/* PickHigher Game */}
        <PickHigherGame
          gameMode={gameMode as "PickThreeFromNine" | "PickFiveFromSixteen" | "PickOneFromThree"}
          tiles={gameState.tiles}
          onTileClick={handleTileClick}
          disabled={gameState.status !== "playing"}
          currentPlayer={currentPlayer}
        />
      </GameLayout>
    </>
  );
};
