// Gold Bars Game Board - Independent component
// Handles complete Gold Bars game logic
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  GoldBarsTile,
  GoldBarsGameState,
  GoldBarsGamePlayer,
  GoldBarsGameResult,
} from "@/types/goldBars";
import { GameType, GamePlayer } from "@/types/game";
import { GoldBarsGame } from "./GoldBarsGame";
import { WaitingLobby } from "../../WaitingLobby";
import { GameLayout } from "../../GameLayout";
import { getGameModeConfig } from "@/utils/gameScoreDistribution";
import {
  calculateGoldBarsGameResult,
  distributeGoldBarsAndBombs,
  autoOpenTiles,
  determineBombClick,
} from "@/utils/goldBarsGameLogic";

interface GoldBarsGameBoardProps {
  gameMode: "GoldBars1v9" | "GoldBars3v16" | "GoldBars5v25";
  matchType?: "Solo" | "Duo" | "Team";
  stakeSol: number;
  players: GoldBarsGamePlayer[];
  currentPlayer?: string;
  currentPlayerPubkey?: string;
  matchFromBackend?: any;
  timeLimit?: number;
  onGameComplete?: (results: GoldBarsGameResult) => void;
  isDemoMode?: boolean;
}

export const GoldBarsGameBoard: React.FC<GoldBarsGameBoardProps> = ({
  gameMode,
  matchType = "Solo",
  stakeSol,
  players,
  currentPlayer = "You",
  currentPlayerPubkey,
  matchFromBackend,
  timeLimit = 20,
  onGameComplete,
  isDemoMode = false,
}) => {
  const gameConfig = getGameModeConfig(gameMode);
  const tileCount = (gameConfig as any).tileCount || 9;
  const totalGoldBars = (gameConfig as any).goldBars || 8;
  const totalBombs = (gameConfig as any).bombs || 1;
  const maxPlayers = matchType === "Solo" ? 2 : matchType === "Duo" ? 4 : 10;

  // Find current player data - memoized
  const currentPlayerData = useMemo(() => {
    return currentPlayerPubkey
      ? players.find((p) => p.pubkey === currentPlayerPubkey)
      : players.find((p) => p.username === currentPlayer);
  }, [players, currentPlayerPubkey, currentPlayer]);

  // Store the bomb click position for current player (targetScore + 1)
  const currentPlayerBombClickRef = useRef<number | null>(null);

  // Store if positions have been distributed
  const positionsDistributedRef = useRef<boolean>(false);

  const [gameState, setGameState] = useState<GoldBarsGameState>({
    status: "waiting",
    timeRemaining: timeLimit,
    tiles: [],
    players: players.map((p) => ({
      id: p.id || p.username,
      username: p.username,
      pubkey: p.pubkey,
      targetScore: p.targetScore,
      currentScore: p.currentScore || 0,
      selections: [],
      isReady: p.isReady,
      isScoreRevealed: false,
      openedTileCount: 0,
      reachedAllGoldBars: false,
    })),
    currentPlayerTurn: currentPlayer,
    winner: undefined,
  });

  const [goldBarsTiles, setGoldBarsTiles] = useState<GoldBarsTile[]>([]);
  const [playerGameEnded, setPlayerGameEnded] = useState(false);
  const gameCompletedRef = useRef(false);
  const [opponentRevealTimers, setOpponentRevealTimers] = useState<
    Map<string, NodeJS.Timeout>
  >(new Map());
  const opponentRevealTimersRef = useRef<Map<string, NodeJS.Timeout>>(
    new Map()
  );
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerCreatedInThisCallRef = useRef<NodeJS.Timeout | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(timeLimit);
  const autoOpenCleanupRef = useRef<(() => void) | null>(null);
  const autoOpenStartedRef = useRef(false);
  const initializationStartedRef = useRef(false);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializationCompletedRef = useRef(false);

  const isWaitingForPlayers = isDemoMode
    ? false
    : gameState.players.length < maxPlayers;
  const isWaitingForScores = gameState.status === "loading";
  const [localGameResult, setLocalGameResult] =
    useState<GoldBarsGameResult | null>(null);

  // Check if we should hide other players' results
  const shouldHideScores = useCallback(
    (playerUsername: string) => {
      const player = gameState.players.find(
        (p) => p.username === playerUsername
      );

      if (currentPlayerPubkey && player?.pubkey === currentPlayerPubkey) {
        return false;
      }

      if (!currentPlayerPubkey && playerUsername === currentPlayer) {
        return false;
      }

      return !player?.isScoreRevealed;
    },
    [currentPlayer, currentPlayerPubkey, gameState.players]
  );

  // Initialize tiles
  useEffect(() => {
    if (gameState.status !== "waiting") {
      return;
    }

    if (isWaitingForPlayers || isWaitingForScores) {
      return;
    }

    if (initializationStartedRef.current) {
      return;
    }

    if (!isDemoMode && gameState.players.length < maxPlayers) {
      return;
    }

    initializationStartedRef.current = true;
    initializationCompletedRef.current = true;

    // Set bomb click ref BEFORE setTimeout
    if (currentPlayerData && !currentPlayerBombClickRef.current) {
      // Normalize targetScore to valid range: 0 to totalGoldBars
      let normalizedTargetScore = currentPlayerData.targetScore;
      if (normalizedTargetScore > totalGoldBars) {
        console.warn(
          `[GoldBarsGameBoard] ⚠️ targetScore (${normalizedTargetScore}) exceeds totalGoldBars (${totalGoldBars}). Normalizing to ${totalGoldBars}.`
        );
        normalizedTargetScore = totalGoldBars;
      }
      if (normalizedTargetScore < 0) {
        console.warn(
          `[GoldBarsGameBoard] ⚠️ targetScore (${normalizedTargetScore}) is negative. Normalizing to 0.`
        );
        normalizedTargetScore = 0;
      }

      const bombClick = determineBombClick(normalizedTargetScore);
      currentPlayerBombClickRef.current = bombClick;
      console.log(
        `[GoldBarsGameBoard] Current player ${currentPlayerData.username}: targetScore=${currentPlayerData.targetScore} (normalized: ${normalizedTargetScore}), bomb on click ${bombClick}`
      );
    }

    console.log("========================================");
    console.log("[GoldBarsGameBoard] 🎮 GAME START");
    console.log("[GoldBarsGameBoard] Initializing game with players:");
    gameState.players.forEach((p) => {
      console.log(
        `  - ${p.username}: targetScore=${p.targetScore}, pubkey=${p.pubkey}`
      );
    });
    console.log("========================================");

    setGameState((prev) => ({ ...prev, status: "loading" }));

    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }

    initializationTimeoutRef.current = setTimeout(() => {
      initializationTimeoutRef.current = null;
      const initialTiles: GoldBarsTile[] = Array.from(
        { length: tileCount },
        (_, i) => ({
          index: i,
          type: "empty",
          selected: false,
          revealed: false,
        })
      );

      positionsDistributedRef.current = false;
      setGoldBarsTiles(initialTiles);

      // Set up timers for AI players
      const newTimers = new Map<string, NodeJS.Timeout>();
      const aiPlayers = currentPlayerPubkey
        ? gameState.players.filter((p) => p.pubkey !== currentPlayerPubkey)
        : gameState.players.filter((p) => p.username !== currentPlayer);

      console.log(
        `[GoldBarsGameBoard] Setting up timers for ${aiPlayers.length} AI players`
      );
      aiPlayers.forEach((aiPlayer) => {
        const delay = Math.random() * 6000 + 12000; // 12-18 seconds
        const playerUsername = aiPlayer.username;

        const timer = setTimeout(() => {
          console.log(
            `[GoldBarsGameBoard] Revealing result for AI player: ${playerUsername}`
          );
          setGameState((prev) => {
            const player = prev.players.find(
              (p) => p.username === playerUsername
            );

            if (player?.isScoreRevealed) {
              return prev;
            }

            // Update currentScore for AI player based on targetScore
            let normalizedTargetScore = player?.targetScore || 0;
            if (normalizedTargetScore > totalGoldBars) {
              normalizedTargetScore = totalGoldBars;
            }
            if (normalizedTargetScore < 0) {
              normalizedTargetScore = 0;
            }

            const newPlayers = prev.players.map((p) => {
              if (p.username === playerUsername) {
                console.log(
                  `[GoldBarsGameBoard] Updating AI player ${p.username}: currentScore=${p.currentScore} -> ${normalizedTargetScore} (targetScore=${p.targetScore})`
                );
                return {
                  ...p,
                  currentScore: normalizedTargetScore,
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
        }, delay);
        newTimers.set(aiPlayer.username, timer);
      });

      setOpponentRevealTimers(newTimers);
      opponentRevealTimersRef.current = newTimers;

      setTimeRemaining(timeLimit);
      setGameState((prev) => ({
        ...prev,
        status: "playing",
      }));
    }, 2000);

    return () => {
      if (
        initializationCompletedRef.current ||
        initializationStartedRef.current
      ) {
        return;
      }

      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
        initializationStartedRef.current = false;
      }
    };
  }, [
    isWaitingForPlayers,
    isWaitingForScores,
    gameState.status,
    gameState.players.length,
    totalGoldBars,
    maxPlayers,
    isDemoMode,
  ]);

  // Store handleTileClick in ref for auto-open
  const handleTileClickRef = useRef<
    ((index: number, isAutoOpen?: boolean) => void) | null
  >(null);

  // Handle tile click
  const handleTileClick = useCallback(
    (index: number, isAutoOpen: boolean = false) => {
      if (gameState.status !== "playing") return;
      if (!isAutoOpen && playerGameEnded) return;

      const currentTile = goldBarsTiles[index];
      if (currentTile?.selected || currentTile?.revealed) return;

      const currentPlayerData = currentPlayerPubkey
        ? gameState.players.find((p) => p.pubkey === currentPlayerPubkey)
        : gameState.players.find((p) => p.username === currentPlayer);

      if (!currentPlayerData) return;

      const openedCount = (currentPlayerData.openedTileCount || 0) + 1;
      const bombClick = currentPlayerBombClickRef.current;
      const currentScore = currentPlayerData.currentScore || 0;

      // Normalize targetScore to valid range: 0 to totalGoldBars
      // targetScore should be from 0 to (Tiles.Count - bombs.Count) = totalGoldBars
      let targetScore = currentPlayerData.targetScore;
      if (targetScore > totalGoldBars) {
        console.warn(
          `[GoldBarsGameBoard] ⚠️ targetScore (${targetScore}) exceeds totalGoldBars (${totalGoldBars}). Normalizing to ${totalGoldBars}.`
        );
        targetScore = totalGoldBars;
      }
      if (targetScore < 0) {
        console.warn(
          `[GoldBarsGameBoard] ⚠️ targetScore (${targetScore}) is negative. Normalizing to 0.`
        );
        targetScore = 0;
      }

      // Determine what this tile should be
      let tileType: "gold" | "bomb" | "empty" = "empty";
      let shouldEndGame = false;
      let newScore = currentScore;
      let reachedAllGoldBars = false;

      // Check if player will reach targetScore after opening this tile
      const scoreAfterThisTile = currentScore + 1;

      // PRIORITY 1: Check if player already opened ALL available gold bars
      // This handles cases where targetScore > totalGoldBars (invalid/unrealistic data from backend)
      // OR when player opened all gold bars before reaching targetScore
      if (currentScore >= totalGoldBars) {
        // Player already opened all available gold bars - THIS tile MUST be a bomb
        tileType = "bomb";
        shouldEndGame = true;
        console.log(
          `[GoldBarsGameBoard] 💣 Bomb: Player already opened all ${totalGoldBars} gold bars (currentScore=${currentScore})`
        );
      }
      // PRIORITY 2: Check if opening this tile would exceed totalGoldBars
      // This ensures bomb appears when all gold bars are opened
      else if (scoreAfterThisTile > totalGoldBars) {
        // Opening this tile would exceed total gold bars - THIS tile must be a bomb
        tileType = "bomb";
        shouldEndGame = true;
        console.log(
          `[GoldBarsGameBoard] 💣 Bomb: Opening this tile would exceed totalGoldBars (${totalGoldBars})`
        );
      }
      // PRIORITY 3: Check if player reached all gold bars (targetScore === totalGoldBars)
      // This is the special case where player opens ALL gold bars and wins
      else if (
        targetScore === totalGoldBars &&
        scoreAfterThisTile === totalGoldBars
      ) {
        // Player reached all gold bars - this tile is the last gold bar
        tileType = "gold";
        newScore = scoreAfterThisTile;
        reachedAllGoldBars = true;
        shouldEndGame = true;
        console.log(
          `[GoldBarsGameBoard] 🏆 Reached all gold bars! (targetScore=${targetScore} === totalGoldBars=${totalGoldBars})`
        );
      }
      // PRIORITY 4: Check if player already reached targetScore (and targetScore < totalGoldBars)
      // If targetScore is less than totalGoldBars, player can only open targetScore gold bars
      else if (targetScore < totalGoldBars && currentScore === targetScore) {
        // Player already reached targetScore - THIS tile must be a bomb
        tileType = "bomb";
        shouldEndGame = true;
        console.log(
          `[GoldBarsGameBoard] 💣 Bomb: Player reached targetScore (${targetScore} < ${totalGoldBars})`
        );
      }
      // PRIORITY 5: Check if player will reach targetScore after this tile (and targetScore < totalGoldBars)
      else if (
        targetScore < totalGoldBars &&
        scoreAfterThisTile === targetScore
      ) {
        // Player will reach targetScore after this tile - THIS tile is the last gold bar
        // Next tile will be bomb (handled on next click)
        tileType = "gold";
        newScore = scoreAfterThisTile;
        console.log(
          `[GoldBarsGameBoard] 🥇 Gold: Player will reach targetScore (${targetScore}) after this tile`
        );
      }
      // PRIORITY 6: If targetScore >= totalGoldBars, player can open all gold bars
      // This handles cases where targetScore is unrealistic (e.g., 433 for 1v9 game)
      // Player can open all available gold bars, then next tile is bomb
      else if (targetScore >= totalGoldBars) {
        // Player can still open gold bars (hasn't reached totalGoldBars yet)
        tileType = "gold";
        newScore = scoreAfterThisTile;
        console.log(
          `[GoldBarsGameBoard] 🥇 Gold: targetScore (${targetScore}) >= totalGoldBars (${totalGoldBars}), opening gold bar ${scoreAfterThisTile}/${totalGoldBars}`
        );
      }
      // PRIORITY 7: Fallback - check bombClick (shouldn't happen with correct logic)
      else if (bombClick !== null && openedCount === bombClick) {
        // This is the bomb click (fallback check)
        tileType = "bomb";
        shouldEndGame = true;
        console.log(
          `[GoldBarsGameBoard] 💣 Bomb: Fallback check - bombClick=${bombClick}`
        );
      }
      // Default: Regular gold bar
      else {
        tileType = "gold";
        newScore = scoreAfterThisTile;
        console.log(
          `[GoldBarsGameBoard] 🥇 Gold: Default case - opening gold bar ${scoreAfterThisTile}`
        );
      }

      console.log(
        `[GoldBarsGameBoard] Tile clicked: index=${index}, clickNumber=${openedCount}, bombClick=${bombClick}, currentScore=${currentScore}, targetScore=${targetScore}, tileType=${tileType}, shouldEndGame=${shouldEndGame}`
      );

      // Update tiles
      setGoldBarsTiles((prevTiles) => {
        if (prevTiles[index]?.selected || prevTiles[index]?.revealed) {
          return prevTiles;
        }

        const updatedTiles = prevTiles.map((tile) =>
          tile.index === index
            ? {
                ...tile,
                type: tileType,
                selected: true,
                revealed: true,
              }
            : tile
        );

        return updatedTiles;
      });

      // Update player state
      setGameState((prev) => {
        const newPlayers = prev.players.map((player) => {
          const isCurrentPlayer = currentPlayerPubkey
            ? player.pubkey === currentPlayerPubkey
            : player.username === currentPlayer;

          if (isCurrentPlayer) {
            return {
              ...player,
              openedTileCount: openedCount,
              currentScore: newScore,
              isScoreRevealed: shouldEndGame ? true : player.isScoreRevealed,
              reachedAllGoldBars: reachedAllGoldBars,
              selections: [...player.selections, index],
            };
          }
          return player;
        });

        return {
          ...prev,
          players: newPlayers,
        };
      });

      // If bomb found or all gold bars reached, end game for this player
      if (shouldEndGame) {
        console.log(
          `[GoldBarsGameBoard] 🎉 Player ${
            reachedAllGoldBars ? "reached all gold bars" : "hit bomb"
          } on ${openedCount}-th click!`
        );

        setPlayerGameEnded(true);

        if (autoOpenCleanupRef.current) {
          autoOpenCleanupRef.current();
          autoOpenCleanupRef.current = null;
          autoOpenStartedRef.current = false;
        }

        if (timeRemaining <= 0) {
          setGameState((prev) => ({
            ...prev,
            status: "revealing",
          }));
        }

        // Distribute remaining gold bars and bombs
        setGoldBarsTiles((prevTiles) => {
          const currentPlayerFoundGold = tileType === "gold";
          const currentPlayerScore = newScore;

          return distributeGoldBarsAndBombs(
            prevTiles,
            index,
            totalGoldBars,
            totalBombs,
            currentPlayerFoundGold,
            currentPlayerScore,
            targetScore
          );
        });

        positionsDistributedRef.current = true;
      }
    },
    [
      gameState.status,
      playerGameEnded,
      currentPlayer,
      currentPlayerPubkey,
      gameState.players,
      goldBarsTiles,
      totalGoldBars,
      totalBombs,
    ]
  );

  // Set handleTileClickRef
  React.useLayoutEffect(() => {
    handleTileClickRef.current = handleTileClick;
  }, [handleTileClick]);

  // Timer effect
  useEffect(() => {
    if (gameState.status !== "playing") {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    if (timerIntervalRef.current) {
      return;
    }

    const intervalId = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev > 0 ? prev - 1 : 0;

        if (newTime <= 0) {
          const currentInterval = timerIntervalRef.current;
          if (currentInterval) {
            clearInterval(currentInterval);
            timerIntervalRef.current = null;
          }
          return 0;
        }

        return newTime;
      });
    }, 1000);

    timerIntervalRef.current = intervalId;
    timerCreatedInThisCallRef.current = intervalId;

    return () => {
      const intervalCreatedHere = timerCreatedInThisCallRef.current;
      if (intervalCreatedHere) {
        clearInterval(intervalCreatedHere);
        if (timerIntervalRef.current === intervalCreatedHere) {
          timerIntervalRef.current = null;
        }
      }
      timerCreatedInThisCallRef.current = null;
    };
  }, [gameState.status]);

  // Handle timer reaching 0
  useEffect(() => {
    if (timeRemaining <= 0 && gameState.status === "playing") {
      if (autoOpenStartedRef.current) {
        return;
      }

      if (playerGameEnded) {
        setGameState((prev) => ({
          ...prev,
          status: "revealing",
        }));
      } else {
        autoOpenStartedRef.current = true;

        const currentPlayerData = currentPlayerPubkey
          ? gameState.players.find((p) => p.pubkey === currentPlayerPubkey)
          : gameState.players.find((p) => p.username === currentPlayer);

        if (currentPlayerData && currentPlayerBombClickRef.current !== null) {
          if (!handleTileClickRef.current) {
            setTimeout(() => {
              if (
                handleTileClickRef.current &&
                timeRemaining <= 0 &&
                gameState.status === "playing"
              ) {
                const bombClick = currentPlayerBombClickRef.current;
                const currentClickCount =
                  currentPlayerData.openedTileCount || 0;
                const targetScore = currentPlayerData.targetScore;

                if (autoOpenCleanupRef.current) {
                  autoOpenCleanupRef.current();
                }

                const cleanup = autoOpenTiles(
                  goldBarsTiles,
                  bombClick!,
                  currentClickCount,
                  targetScore,
                  totalGoldBars,
                  (tileIndex) => {
                    if (handleTileClickRef.current) {
                      handleTileClickRef.current(tileIndex, true);
                    }
                  },
                  () => {
                    setTimeout(() => {
                      setGameState((prev) => {
                        if (prev.status === "playing") {
                          return {
                            ...prev,
                            status: "revealing",
                          };
                        }
                        return prev;
                      });
                    }, 500);
                  }
                );
                autoOpenCleanupRef.current = cleanup;
              }
            }, 100);
            return;
          }

          const bombClick = currentPlayerBombClickRef.current;
          const currentClickCount = currentPlayerData.openedTileCount || 0;
          const targetScore = currentPlayerData.targetScore;

          if (autoOpenCleanupRef.current) {
            autoOpenCleanupRef.current();
          }

          const cleanup = autoOpenTiles(
            goldBarsTiles,
            bombClick,
            currentClickCount,
            targetScore,
            totalGoldBars,
            (tileIndex) => {
              if (playerGameEnded) {
                if (autoOpenCleanupRef.current) {
                  autoOpenCleanupRef.current();
                  autoOpenCleanupRef.current = null;
                  autoOpenStartedRef.current = false;
                }
                return;
              }

              if (handleTileClickRef.current) {
                handleTileClickRef.current(tileIndex, true);
              }
            },
            () => {
              setTimeout(() => {
                setGameState((prev) => {
                  if (prev.status === "playing") {
                    return {
                      ...prev,
                      status: "revealing",
                    };
                  }
                  return prev;
                });
              }, 500);
              autoOpenStartedRef.current = false;
            }
          );

          autoOpenCleanupRef.current = cleanup;
        } else {
          autoOpenStartedRef.current = false;
          setGameState((prev) => ({
            ...prev,
            status: "revealing",
          }));
        }
      }
    }

    if (timeRemaining > 0 || gameState.status !== "playing") {
      autoOpenStartedRef.current = false;
    }
  }, [
    timeRemaining,
    gameState.status,
    playerGameEnded,
    currentPlayer,
    currentPlayerPubkey,
    gameState.players,
    goldBarsTiles,
    totalGoldBars,
  ]);

  // Reset refs on unmount
  useEffect(() => {
    return () => {
      initializationStartedRef.current = false;
      initializationCompletedRef.current = false;
      gameCompletedRef.current = false;
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      opponentRevealTimersRef.current.forEach((timer) => clearTimeout(timer));
      if (autoOpenCleanupRef.current) {
        autoOpenCleanupRef.current();
        autoOpenCleanupRef.current = null;
      }
      autoOpenStartedRef.current = false;
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
      currentPlayerBombClickRef.current = null;
      positionsDistributedRef.current = false;
    };
  }, []);

  // Store onGameComplete in ref
  const onGameCompleteRef = useRef(onGameComplete);
  useEffect(() => {
    onGameCompleteRef.current = onGameComplete;
  }, [onGameComplete]);

  // Handle game completion
  useEffect(() => {
    if (gameState.status !== "revealing" || gameCompletedRef.current) {
      return;
    }

    console.log(
      "[GoldBarsGameBoard] Processing game completion, status=revealing"
    );
    gameCompletedRef.current = true;

    opponentRevealTimersRef.current.forEach((timer) => clearTimeout(timer));
    setOpponentRevealTimers(new Map());
    opponentRevealTimersRef.current = new Map();

    if (autoOpenCleanupRef.current) {
      autoOpenCleanupRef.current();
      autoOpenCleanupRef.current = null;
    }

    // Reveal all remaining tiles
    setGoldBarsTiles((prev) => {
      const updated = prev.map((tile) => {
        if (!tile.revealed) {
          return { ...tile, revealed: true };
        }
        return tile;
      });
      return updated;
    });

    // Update currentScore for all players based on their targetScore
    // For AI players, currentScore should be set based on targetScore
    setGameState((prev) => {
      const updatedPlayers = prev.players.map((player) => {
        // Skip if this is the current player (their score is already updated)
        const isCurrentPlayer = currentPlayerPubkey
          ? player.pubkey === currentPlayerPubkey
          : player.username === currentPlayer;

        if (isCurrentPlayer) {
          return player; // Current player's score is already correct
        }

        // For AI players: set currentScore based on targetScore
        // If targetScore <= totalGoldBars, currentScore = targetScore
        // If targetScore > totalGoldBars (normalized), currentScore = totalGoldBars
        let normalizedTargetScore = player.targetScore;
        if (normalizedTargetScore > totalGoldBars) {
          normalizedTargetScore = totalGoldBars;
        }
        if (normalizedTargetScore < 0) {
          normalizedTargetScore = 0;
        }

        // Only update if currentScore is 0 or less than targetScore
        if (
          player.currentScore === 0 ||
          player.currentScore < normalizedTargetScore
        ) {
          console.log(
            `[GoldBarsGameBoard] Updating AI player ${player.username}: currentScore=${player.currentScore} -> ${normalizedTargetScore} (targetScore=${player.targetScore})`
          );
          return {
            ...player,
            currentScore: normalizedTargetScore,
            isScoreRevealed: true,
          };
        }

        return player;
      });

      // Calculate result with updated players
      console.log(
        "[GoldBarsGameBoard] Calculating result when status=revealing"
      );
      const result = calculateGoldBarsGameResult(
        updatedPlayers,
        stakeSol,
        matchType,
        currentPlayer,
        currentPlayerPubkey,
        matchFromBackend
      );

      console.log("[GoldBarsGameBoard] Calculated result:", result);
      setLocalGameResult(result);

      const resultToPass: GoldBarsGameResult = {
        ...result,
        gameType: GameType.GoldBars,
      };

      // Call onGameComplete in next tick to ensure state is updated
      setTimeout(() => {
        if (onGameCompleteRef.current) {
          onGameCompleteRef.current(resultToPass);
        }
      }, 0);

      return {
        ...prev,
        players: updatedPlayers,
      };
    });
  }, [
    gameState.status,
    gameState.players,
    stakeSol,
    matchType,
    currentPlayer,
    currentPlayerPubkey,
    matchFromBackend,
    totalGoldBars,
  ]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      opponentRevealTimersRef.current.forEach((timer) => clearTimeout(timer));
      if (autoOpenCleanupRef.current) {
        autoOpenCleanupRef.current();
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Determine if team scores should be hidden
  const shouldHideTeamScores = useMemo(() => {
    if (matchType === "Solo") return false;
    const hasAnyRevealed = gameState.players.some(
      (p) => p.isScoreRevealed === true
    );
    return !hasAnyRevealed;
  }, [matchType, gameState.players]);

  if (isWaitingForPlayers) {
    return (
      <WaitingLobby
        players={gameState.players}
        maxPlayers={maxPlayers}
        timeRemaining={timeRemaining}
        onCancel={() =>
          setGameState((prev) => ({ ...prev, status: "finished" }))
        }
      />
    );
  }

  if (isWaitingForScores) {
    return (
      <div className="text-center py-12">
        <div
          className="text-6xl mb-4"
          style={{
            animation: "spin 1s linear infinite",
          }}
        >
          ⚔️
        </div>
        <h2 className="text-2xl font-display font-bold text-sol-purple mb-2">
          Loading Battle...
        </h2>
        <p className="text-txt-muted">
          Preparing your match with epic rewards!
        </p>
      </div>
    );
  }

  const currentPlayerDataForDisplay = currentPlayerPubkey
    ? gameState.players.find((p) => p.pubkey === currentPlayerPubkey)
    : gameState.players.find((p) => p.username === currentPlayer);

  return (
    <>
      <GameLayout
        gameName={gameConfig.name}
        stakeSol={stakeSol}
        matchType={matchType}
        timeRemaining={timeRemaining}
        players={gameState.players as GamePlayer[]}
        currentPlayer={currentPlayer}
        currentPlayerPubkey={currentPlayerPubkey}
        gameStatus={gameState.status}
        gameResult={localGameResult}
        shouldHideScores={shouldHideScores}
        hideTeamScores={shouldHideTeamScores}
        gameType={GameType.GoldBars}
        gameMode={gameMode}
      >
        {currentPlayer !== "" || isDemoMode ? (
          <GoldBarsGame
            gameMode={gameMode}
            tiles={goldBarsTiles}
            onTileClick={handleTileClick}
            disabled={gameState.status !== "playing" || playerGameEnded}
            currentPlayer={currentPlayer}
            playerSelections={currentPlayerDataForDisplay?.selections || []}
            gameEnded={playerGameEnded}
          />
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
