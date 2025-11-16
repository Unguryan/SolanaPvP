// Miner Game Board - Independent component (not through UniversalGameBoard)
// Handles complete Miner game logic
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  MinerTile,
  MinerGameState,
  MinerGamePlayer,
  MinerGameResult,
} from "@/types/miner";
import { GameType, GamePlayer } from "@/types/game";
import { MinerGame } from "./MinerGame";
import { WaitingLobby } from "../../WaitingLobby";
import { GameLayout } from "../../GameLayout";
import { getGameModeConfig } from "@/utils/gameScoreDistribution";
import {
  calculateMinerGameResult,
  distributePrizesAndBombs,
  autoOpenTiles,
  determineResultClick,
} from "@/utils/minerGameLogic";

interface MinerGameBoardProps {
  gameMode: "Miner1v9" | "Miner3v16" | "Miner5v25";
  matchType?: "Solo" | "Duo" | "Team";
  stakeSol: number;
  players: MinerGamePlayer[];
  currentPlayer?: string;
  currentPlayerPubkey?: string;
  matchFromBackend?: any;
  timeLimit?: number;
  onGameComplete?: (results: MinerGameResult) => void;
  isDemoMode?: boolean;
}

export const MinerGameBoard: React.FC<MinerGameBoardProps> = ({
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
  const maxPlayers = matchType === "Solo" ? 2 : matchType === "Duo" ? 4 : 10;

  // Find current player data - memoized
  const currentPlayerData = useMemo(() => {
    return currentPlayerPubkey
      ? players.find((p) => p.pubkey === currentPlayerPubkey)
      : players.find((p) => p.username === currentPlayer);
  }, [players, currentPlayerPubkey, currentPlayer]);

  // Determine number of prizes and bombs based on game mode
  const getPrizeBombCount = useMemo(() => {
    switch (gameMode) {
      case "Miner1v9":
        return { prizes: 1, bombs: 1, total: 2 };
      case "Miner3v16":
        return { prizes: 3, bombs: 3, total: 6 };
      case "Miner5v25":
        return { prizes: 5, bombs: 5, total: 10 };
      default:
        return { prizes: 1, bombs: 1, total: 2 };
    }
  }, [gameMode]);

  // Store the result position for current player (N-th click, not index)
  const currentPlayerResultClickRef = useRef<number | null>(null);

  // Store if positions have been distributed
  const positionsDistributedRef = useRef<boolean>(false);

  const [gameState, setGameState] = useState<MinerGameState>({
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
      isScoreRevealed: false, // Don't show result until player finds prize/bomb
      willWin: p.willWin,
      openedTileCount: 0,
      isAlive: true,
    })),
    currentPlayerTurn: currentPlayer,
    winner: undefined,
  });

  const [minerTiles, setMinerTiles] = useState<MinerTile[]>([]);
  const [playerGameEnded, setPlayerGameEnded] = useState(false);
  const gameCompletedRef = useRef(false);
  const [opponentRevealTimers, setOpponentRevealTimers] = useState<
    Map<string, NodeJS.Timeout>
  >(new Map());
  // Store timers in ref to access latest value in cleanup without triggering re-runs
  const opponentRevealTimersRef = useRef<Map<string, NodeJS.Timeout>>(
    new Map()
  );
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerCreatedInThisCallRef = useRef<NodeJS.Timeout | null>(null);
  // Separate timeRemaining state to prevent re-renders of entire gameState
  const [timeRemaining, setTimeRemaining] = useState<number>(timeLimit);
  const autoOpenCleanupRef = useRef<(() => void) | null>(null);
  const autoOpenStartedRef = useRef(false); // Prevent double auto-open in StrictMode
  const initializationStartedRef = useRef(false);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializationCompletedRef = useRef(false);

  const isWaitingForPlayers = isDemoMode
    ? false
    : gameState.players.length < maxPlayers;
  const isWaitingForScores = gameState.status === "loading";
  const [localGameResult, setLocalGameResult] =
    useState<MinerGameResult | null>(null);

  // Check if we should hide other players' results (opponents reveal individually)
  const shouldHideScores = useCallback(
    (playerUsername: string) => {
      // Find the player by username
      const player = gameState.players.find(
        (p) => p.username === playerUsername
      );

      // Current player always sees their own result
      if (currentPlayerPubkey && player?.pubkey === currentPlayerPubkey) {
        return false;
      }

      // Fallback to username check for demo mode
      if (!currentPlayerPubkey && playerUsername === currentPlayer) {
        return false;
      }

      // Check if this opponent has revealed their result
      return !player?.isScoreRevealed;
    },
    [currentPlayer, currentPlayerPubkey, gameState.players]
  );

  // Initialize tiles - prevent double initialization
  useEffect(() => {
    // SIMPLE APPROACH: Check status FIRST - if game already started or loading, don't initialize
    // This is the primary protection - status is source of truth
    if (gameState.status !== "waiting") {
      console.log(
        `[MinerGameBoard] Status is ${gameState.status}, not initializing (already started or loading)`
      );
      return;
    }

    // Early return checks - must come first
    if (isWaitingForPlayers || isWaitingForScores) {
      console.log(
        `[MinerGameBoard] Skipping init: isWaitingForPlayers=${isWaitingForPlayers}, isWaitingForScores=${isWaitingForScores}`
      );
      return;
    }

    // Additional protection: check ref (for edge cases)
    if (initializationStartedRef.current) {
      console.log(
        "[MinerGameBoard] Initialization already started (ref check), skipping"
      );
      return;
    }

    if (!isDemoMode && gameState.players.length < maxPlayers) {
      console.log(
        `[MinerGameBoard] Not enough players: ${gameState.players.length} < ${maxPlayers}, not initializing`
      );
      return;
    }

    // All checks passed - initialize now
    // CRITICAL: Set ALL refs SYNCHRONOUSLY BEFORE any state updates or async operations
    // This ensures cleanup can check refs and see that initialization started
    initializationStartedRef.current = true;
    initializationCompletedRef.current = true; // Set immediately, before setState
    console.log(
      "[MinerGameBoard] ✅ Setting initializationStartedRef to true - starting initialization"
    );

    // IMPORTANT: Set resultClick ref BEFORE setTimeout to ensure it's available immediately
    // This prevents null resultClick when tiles are clicked
    if (currentPlayerData && !currentPlayerResultClickRef.current) {
      const { prizes, bombs } = getPrizeBombCount;
      const resultClick = determineResultClick(tileCount, prizes, bombs);
      currentPlayerResultClickRef.current = resultClick;
      console.log(
        `[MinerGameBoard] Current player ${currentPlayerData.username}: willWin=${currentPlayerData.willWin}, will find result on ${resultClick}-th click`
      );
    }

    // Log players' willWin values for debugging
    console.log("========================================");
    console.log("[MinerGameBoard] 🎮 GAME START - Expected Results:");
    console.log("[MinerGameBoard] Initializing game with players:");
    gameState.players.forEach((p) => {
      const result =
        p.willWin === true ? "✅ WILL WIN (Alive)" : "❌ WILL LOSE (Bombed)";
      console.log(
        `  - ${p.username}: willWin=${p.willWin} ${result}, pubkey=${p.pubkey}`
      );
    });
    console.log("[MinerGameBoard] Expected playerResults in modal:");
    const expectedPlayerResults: Record<string, boolean> = {};
    gameState.players.forEach((p) => {
      expectedPlayerResults[p.username] = p.willWin === true;
    });
    console.log("[MinerGameBoard] Expected:", expectedPlayerResults);
    console.log("========================================");

    // Now update state (async, but refs already set synchronously)
    setGameState((prev) => ({ ...prev, status: "loading" }));

    // Clear any existing initialization timeout before creating new one
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }

    initializationTimeoutRef.current = setTimeout(() => {
      // Clear the ref after timeout executes successfully
      initializationTimeoutRef.current = null;
      // Initialize ALL tiles as empty - prizes/bombs will be placed dynamically when needed
      const initialTiles: MinerTile[] = Array.from(
        { length: tileCount },
        (_, i) => ({
          index: i,
          type: "empty",
          selected: false,
          revealed: false,
        })
      );

      // Reset distribution flag
      positionsDistributedRef.current = false;

      // All tiles start as empty - prizes/bombs will be distributed after player finds result
      setMinerTiles(initialTiles);

      // Set up individual timers for ALL AI players (everyone except current player)
      // In both demo AND real games: all opponents are AI-controlled
      // Use the SAME logic as Pick Higher - just call reveal function via setTimeout
      const newTimers = new Map<string, NodeJS.Timeout>();
      const aiPlayers = currentPlayerPubkey
        ? gameState.players.filter((p) => p.pubkey !== currentPlayerPubkey)
        : gameState.players.filter((p) => p.username !== currentPlayer);

      console.log(
        `[MinerGameBoard] Setting up timers for ${aiPlayers.length} AI players`
      );
      aiPlayers.forEach((aiPlayer) => {
        console.log(
          `  - AI player ${aiPlayer.username}: willWin=${aiPlayer.willWin}`
        );
        const delay = Math.random() * 6000 + 12000; // 12-18 seconds

        // Capture aiPlayer data in closure to avoid stale closure issues
        const playerUsername = aiPlayer.username;
        const playerWillWin = aiPlayer.willWin;

        const timer = setTimeout(() => {
          console.log(
            `[MinerGameBoard] Revealing result for AI player: ${playerUsername}, willWin=${playerWillWin}`
          );
          // Use functional update to get latest state
          setGameState((prev) => {
            const player = prev.players.find(
              (p) => p.username === playerUsername
            );
            console.log(
              `[MinerGameBoard] Player before update:`,
              player
                ? {
                    username: player.username,
                    willWin: player.willWin,
                    isScoreRevealed: player.isScoreRevealed,
                  }
                : "NOT FOUND"
            );

            // Check if already revealed to prevent duplicate updates
            if (player?.isScoreRevealed) {
              console.log(
                `[MinerGameBoard] Player ${playerUsername} already revealed, skipping`
              );
              return prev;
            }

            const newPlayers = prev.players.map((p) => {
              if (p.username === playerUsername) {
                const updatedPlayer = {
                  ...p,
                  isScoreRevealed: true,
                  isAlive: playerWillWin === true,
                  willWin: playerWillWin, // Use captured value
                };
                console.log(`[MinerGameBoard] Player after update:`, {
                  username: updatedPlayer.username,
                  willWin: updatedPlayer.willWin,
                  isScoreRevealed: updatedPlayer.isScoreRevealed,
                  isAlive: updatedPlayer.isAlive,
                });
                return updatedPlayer;
              }
              return p;
            });

            console.log(
              `[MinerGameBoard] State update - new players:`,
              newPlayers.map((p) => ({
                username: p.username,
                isScoreRevealed: p.isScoreRevealed,
                willWin: p.willWin,
              }))
            );

            return {
              ...prev,
              players: newPlayers,
            };
          });
        }, delay);
        newTimers.set(aiPlayer.username, timer);
      });

      setOpponentRevealTimers(newTimers);
      opponentRevealTimersRef.current = newTimers; // Update ref

      setTimeRemaining(timeLimit);
      setGameState((prev) => ({
        ...prev,
        status: "playing",
      }));
    }, 2000);

    // Cleanup function - CRITICAL: use ref check, not state (state is stale in cleanup)
    return () => {
      // Check ref FIRST - it's updated synchronously when we call setGameState
      if (
        initializationCompletedRef.current ||
        initializationStartedRef.current
      ) {
        // Initialization started - don't cleanup, let it complete
        console.log(
          `[MinerGameBoard] Cleanup: initialization started (refs: started=${initializationStartedRef.current}, completed=${initializationCompletedRef.current}), KEEPING timeout`
        );
        // DO NOT cleanup - timeout must execute to complete initialization
        return;
      }

      // Initialization hasn't started yet - safe to cleanup
      if (initializationTimeoutRef.current) {
        console.log(
          "[MinerGameBoard] Cleanup: initialization not started, clearing timeout"
        );
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
        initializationStartedRef.current = false;
      }
    };
    // Only depend on status and conditions that trigger initialization, not all state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isWaitingForPlayers,
    isWaitingForScores,
    gameState.status,
    // Use length instead of players array to avoid re-running when player objects change
    gameState.players.length,
    maxPlayers,
    isDemoMode,
  ]); // Closing brace for useEffect

  // Store handleTileClick in ref for auto-open to use
  const handleTileClickRef = useRef<
    ((index: number, isAutoOpen?: boolean) => void) | null
  >(null);

  // Handle tile click - optimized with early returns and batching
  const handleTileClick = useCallback(
    (index: number, isAutoOpen: boolean = false) => {
      // Early return checks
      // For auto-open: allow even if playerGameEnded (timer ran out)
      // For manual clicks: block if playerGameEnded
      if (gameState.status !== "playing") return;
      if (!isAutoOpen && playerGameEnded) return;

      const currentTile = minerTiles[index];
      if (currentTile?.selected || currentTile?.revealed) return; // Prevent double clicks

      const currentPlayerData = currentPlayerPubkey
        ? gameState.players.find((p) => p.pubkey === currentPlayerPubkey)
        : gameState.players.find((p) => p.username === currentPlayer);

      if (!currentPlayerData) return;

      const openedCount = (currentPlayerData.openedTileCount || 0) + 1;
      const resultClick = currentPlayerResultClickRef.current;

      // Determine what this tile should be for current player
      let tileType: "prize" | "bomb" | "empty" = "empty";
      let shouldEndGame = false;

      // Check if this is the N-th click where player finds their result
      if (resultClick !== null && openedCount === resultClick) {
        // This is the N-th click - player finds their result
        if (currentPlayerData.willWin === true) {
          // Player wins: found prize on N-th click
          tileType = "prize";
        } else {
          // Player loses: found bomb on N-th click
          tileType = "bomb";
        }
        shouldEndGame = true;
      } else {
        // Before N-th click - empty tile
        tileType = "empty";
        shouldEndGame = false;
      }

      // Debug: log resultClick to diagnose null issue
      if (resultClick === null) {
        console.warn(
          `[MinerGameBoard] ⚠️ resultClick is NULL! currentPlayerResultClickRef.current=${currentPlayerResultClickRef.current}`
        );
      }
      console.log(
        `[MinerGameBoard] Tile clicked: index=${index}, clickNumber=${openedCount}, resultClick=${resultClick}, tileType=${tileType}, shouldEndGame=${shouldEndGame}`
      );

      // Update tiles - optimize: batch all updates with functional update
      setMinerTiles((prevTiles) => {
        // Check if tile already selected to prevent duplicate updates
        if (prevTiles[index]?.selected || prevTiles[index]?.revealed) {
          return prevTiles;
        }

        // Update current tile with determined type
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
              isAlive: shouldEndGame ? player.willWin === true : player.isAlive,
              isScoreRevealed: shouldEndGame ? true : player.isScoreRevealed, // Show result only after finding prize/bomb
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

      // If bomb/prize found, end game for this player and distribute remaining prizes/bombs
      if (shouldEndGame) {
        console.log(
          `[MinerGameBoard] 🎉 Player found result on ${openedCount}-th click! Type: ${tileType}`
        );

        // Block further clicks - player found their prize/bomb
        setPlayerGameEnded(true);

        // CRITICAL: Stop auto-open if it's running (player found result manually)
        if (autoOpenCleanupRef.current) {
          console.log(
            `[MinerGameBoard] Stopping auto-open - player found result manually`
          );
          autoOpenCleanupRef.current();
          autoOpenCleanupRef.current = null;
          autoOpenStartedRef.current = false;
        }

        // CRITICAL: If timer reached 0 and player found result manually, change status immediately
        // Otherwise, wait for timer to reach 0 (like Pick Higher)
        if (timeRemaining <= 0) {
          console.log(
            `[MinerGameBoard] Timer already at 0, changing status to revealing immediately`
          );
          setGameState((prev) => ({
            ...prev,
            status: "revealing",
          }));
        } else {
          // DO NOT change status here - keep "playing" until timer reaches 0 (like Pick Higher)
          // Status will change to "revealing" when timer reaches 0
          console.log(
            `[MinerGameBoard] Timer still running (${timeRemaining}s), will change status when timer reaches 0`
          );
        }

        // Distribute remaining prizes and bombs to closed slots
        setMinerTiles((prevTiles) => {
          const { prizes: totalPrizes, bombs: totalBombs } = getPrizeBombCount;
          const currentPlayerFoundPrize = currentPlayerData.willWin === true;

          return distributePrizesAndBombs(
            prevTiles,
            index,
            totalPrizes,
            totalBombs,
            currentPlayerFoundPrize
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
      minerTiles,
      getPrizeBombCount,
    ]
  );

  // Set handleTileClickRef immediately - this must run before auto-open effect
  // Use useLayoutEffect to ensure it runs synchronously before paint
  React.useLayoutEffect(() => {
    handleTileClickRef.current = handleTileClick;
  }, [handleTileClick]);

  // Timer effect - use separate timeRemaining state to prevent re-renders
  // Only run timer when game is playing (not waiting or loading)
  useEffect(() => {
    // Only run timer when game is playing
    if (gameState.status !== "playing") {
      // Clear interval if status is not playing
      if (timerIntervalRef.current) {
        console.log(
          `[MinerGameBoard] Status is ${gameState.status}, clearing timer`
        );
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    // CRITICAL: Check ref BEFORE creating interval to prevent double creation in StrictMode
    // In StrictMode, useEffect runs twice, so we need to check ref FIRST
    if (timerIntervalRef.current) {
      console.log(
        `[MinerGameBoard] Timer interval already exists (ID: ${timerIntervalRef.current}), skipping recreation`
      );
      return;
    }

    console.log(
      `[MinerGameBoard] Starting timer, status=${gameState.status}, initial timeRemaining=${timeRemaining}`
    );

    // CRITICAL: Set a flag ref BEFORE creating interval to prevent race condition in StrictMode
    // This way, second call will see the flag and skip even if intervalId is not yet set
    let intervalCreated = false;

    const intervalId = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev > 0 ? prev - 1 : 0;
        console.log(`[MinerGameBoard] ⏱️ Timer tick: ${prev} -> ${newTime}`);

        if (newTime <= 0) {
          console.log(`[MinerGameBoard] ⏰ Timer reached 0, clearing interval`);
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

    // CRITICAL: Store interval ID in refs IMMEDIATELY after creation
    // Set timerIntervalRef FIRST, then timerCreatedInThisCallRef
    // This ensures second StrictMode call sees timerIntervalRef is set
    timerIntervalRef.current = intervalId;
    intervalCreated = true;
    timerCreatedInThisCallRef.current = intervalId;
    console.log(
      `[MinerGameBoard] ✅ Timer interval created (ID: ${intervalId}), will tick in 1 second`
    );

    // Cleanup function - CRITICAL for StrictMode!
    return () => {
      const intervalCreatedHere = timerCreatedInThisCallRef.current;
      const currentInterval = timerIntervalRef.current;
      console.log(
        `[MinerGameBoard] Cleanup timer - created here: ${intervalCreatedHere}, current: ${currentInterval}`
      );

      // SIMPLE: If we created an interval in this call, ALWAYS clear it
      // In StrictMode, cleanup is called for first call - clear that interval
      // Second call will have its own cleanup for its interval
      if (intervalCreatedHere) {
        console.log(
          `[MinerGameBoard] Clearing interval ${intervalCreatedHere} (created in this call)`
        );
        clearInterval(intervalCreatedHere);
        // Only clear timerIntervalRef if it matches the interval we're clearing
        // (it might have been replaced by second StrictMode call)
        if (timerIntervalRef.current === intervalCreatedHere) {
          timerIntervalRef.current = null;
        }
      }

      // Reset ref for this call
      timerCreatedInThisCallRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.status]); // Only depend on status, not timeRemaining (prevents interval from being cleared)

  // Separate effect to handle timer reaching 0 - prevents double render
  useEffect(() => {
    if (timeRemaining <= 0 && gameState.status === "playing") {
      console.log(
        `[MinerGameBoard] ⏰ Timer reached 0, status=${gameState.status}`
      );

      // CRITICAL: Check if auto-open already started to prevent double execution in StrictMode
      if (autoOpenStartedRef.current) {
        console.log(
          `[MinerGameBoard] Auto-open already started, skipping (prevent double in StrictMode)`
        );
        return;
      }

      // Check if player already found result
      if (playerGameEnded) {
        // Player already found result, just change status
        console.log(
          `[MinerGameBoard] Player already found result, changing status to revealing`
        );
        setGameState((prev) => ({
          ...prev,
          status: "revealing",
        }));
      } else {
        // Player didn't find result - start auto-open
        // CRITICAL: Mark auto-open as started IMMEDIATELY to prevent double execution
        autoOpenStartedRef.current = true;
        // IMPORTANT: Don't change status to "revealing" yet - wait for auto-open to complete
        console.log(
          `[MinerGameBoard] ⏰ Timer reached 0, starting auto-open for player: ${currentPlayer}`
        );
        console.log(
          `[MinerGameBoard] ⏰ Status will remain "playing" until result is found`
        );

        const currentPlayerData = currentPlayerPubkey
          ? gameState.players.find((p) => p.pubkey === currentPlayerPubkey)
          : gameState.players.find((p) => p.username === currentPlayer);

        if (currentPlayerData && currentPlayerResultClickRef.current !== null) {
          // Ensure handleTileClickRef is set before starting auto-open
          if (!handleTileClickRef.current) {
            console.warn(
              `[MinerGameBoard] handleTileClickRef not set yet, waiting...`
            );
            // Retry after a short delay to ensure ref is set
            setTimeout(() => {
              if (
                handleTileClickRef.current &&
                timeRemaining <= 0 &&
                gameState.status === "playing"
              ) {
                // Retry auto-open now that ref is set
                const retryResultClick = currentPlayerResultClickRef.current;
                const retryCurrentClickCount =
                  currentPlayerData.openedTileCount || 0;
                const retryPlayerWillWin = currentPlayerData.willWin === true;

                // Check if retryResultClick is valid before proceeding
                if (retryResultClick === null) {
                  console.warn(
                    `[MinerGameBoard] retryResultClick is null, cannot auto-open`
                  );
                  return;
                }

                if (autoOpenCleanupRef.current) {
                  autoOpenCleanupRef.current();
                }

                const cleanup = autoOpenTiles(
                  minerTiles,
                  retryResultClick,
                  retryCurrentClickCount,
                  retryPlayerWillWin,
                  (tileIndex, clickNumber) => {
                    console.log(
                      `[MinerGameBoard] Auto-opening tile: index=${tileIndex}, clickNumber=${clickNumber}`
                    );
                    if (handleTileClickRef.current) {
                      handleTileClickRef.current(tileIndex, true);
                    } else {
                      console.error(
                        `[MinerGameBoard] handleTileClickRef still not set during auto-open!`
                      );
                    }
                  },
                  () => {
                    console.log(
                      `[MinerGameBoard] Auto-open completed, waiting before changing status to revealing`
                    );
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

          const resultClick = currentPlayerResultClickRef.current;
          const currentClickCount = currentPlayerData.openedTileCount || 0;
          const playerWillWin = currentPlayerData.willWin === true;

          // Clean up any existing auto-open
          if (autoOpenCleanupRef.current) {
            autoOpenCleanupRef.current();
          }

          // Start auto-opening tiles - use the SAME handleTileClick logic
          // IMPORTANT: Auto-open should call handleTileClick directly to use the same logic
          console.log(
            `[MinerGameBoard] Starting auto-open: resultClick=${resultClick}, currentClickCount=${currentClickCount}, playerWillWin=${playerWillWin}`
          );
          const cleanup = autoOpenTiles(
            minerTiles,
            resultClick,
            currentClickCount,
            playerWillWin,
            (tileIndex, clickNumber) => {
              // CRITICAL: Check if player already found result (they might have clicked manually)
              if (playerGameEnded) {
                console.log(
                  `[MinerGameBoard] Player already found result, stopping auto-open`
                );
                if (autoOpenCleanupRef.current) {
                  autoOpenCleanupRef.current();
                  autoOpenCleanupRef.current = null;
                  autoOpenStartedRef.current = false;
                }
                return;
              }

              console.log(
                `[MinerGameBoard] Auto-opening tile: index=${tileIndex}, clickNumber=${clickNumber}`
              );

              // Call handleTileClick via ref to get latest version
              // Pass isAutoOpen=true to allow opening even if playerGameEnded
              // This ensures auto-open uses the exact same logic as manual clicks
              if (handleTileClickRef.current) {
                handleTileClickRef.current(tileIndex, true);
              } else {
                console.error(
                  `[MinerGameBoard] handleTileClickRef not set during auto-open! This should not happen.`
                );
              }
            },
            () => {
              // On complete - wait a bit then change status to revealing
              console.log(
                `[MinerGameBoard] Auto-open completed, waiting before changing status to revealing`
              );
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
              }, 500); // Small delay to ensure all tiles are revealed
              // Reset auto-open flag
              autoOpenStartedRef.current = false;
            }
          );

          autoOpenCleanupRef.current = cleanup;
        } else {
          // Fallback: just change status
          console.log(
            `[MinerGameBoard] Auto-open fallback: missing currentPlayerData or resultClick`
          );
          autoOpenStartedRef.current = false; // Reset since we didn't actually start auto-open
          setGameState((prev) => ({
            ...prev,
            status: "revealing",
          }));
        }
      }
    }

    // Reset auto-open flag when timer is reset (> 0) or game status changes away from "playing"
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
    minerTiles,
    getPrizeBombCount,
  ]);

  // Reset all refs and cleanup on unmount (when gameKey changes or component unmounts)
  useEffect(() => {
    return () => {
      console.log(
        `[MinerGameBoard] Component unmounting - status: ${gameState.status}`
      );
      // SIMPLE: Always cleanup everything on unmount
      // The status check at the start of useEffect will prevent re-initialization
      initializationStartedRef.current = false;
      initializationCompletedRef.current = false;
      // Reset game completed flag
      gameCompletedRef.current = false;
      // Clear timer interval
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      // Clear all opponent reveal timers using ref (always has latest value)
      opponentRevealTimersRef.current.forEach((timer) => clearTimeout(timer));
      // Clear auto-open cleanup
      if (autoOpenCleanupRef.current) {
        autoOpenCleanupRef.current();
        autoOpenCleanupRef.current = null;
      }
      // Reset auto-open flag
      autoOpenStartedRef.current = false;
      // Clear initialization timeout
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
      // Reset result click ref
      currentPlayerResultClickRef.current = null;
      // Reset distribution flag
      positionsDistributedRef.current = false;
    };
    // Empty dependency array - only run cleanup on actual unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // DON'T include opponentRevealTimers - it causes cleanup to run on every timer change

  // Store onGameComplete in ref to avoid dependency issues
  const onGameCompleteRef = useRef(onGameComplete);
  useEffect(() => {
    onGameCompleteRef.current = onGameComplete;
  }, [onGameComplete]);

  // Handle game completion - calculate result when status becomes "revealing"
  useEffect(() => {
    // Only process once when status becomes "revealing"
    if (gameState.status !== "revealing" || gameCompletedRef.current) {
      return;
    }

    console.log(
      "[MinerGameBoard] Processing game completion, status=revealing"
    );
    gameCompletedRef.current = true;

    // Clear any remaining timers
    opponentRevealTimersRef.current.forEach((timer) => clearTimeout(timer));
    setOpponentRevealTimers(new Map());
    opponentRevealTimersRef.current = new Map(); // Update ref

    // Clean up auto-open if still running
    if (autoOpenCleanupRef.current) {
      autoOpenCleanupRef.current();
      autoOpenCleanupRef.current = null;
    }

    // Reveal all remaining tiles first - reveal ALL tiles regardless of type
    setMinerTiles((prev) => {
      const updated = prev.map((tile) => {
        // Reveal ALL tiles that are not yet revealed
        if (!tile.revealed) {
          return { ...tile, revealed: true };
        }
        return tile;
      });
      return updated;
    });

    // Calculate result using current gameState
    console.log("[MinerGameBoard] Calculating result when status=revealing");
    console.log(
      "[MinerGameBoard] Players:",
      gameState.players.map((p) => ({
        username: p.username,
        willWin: p.willWin,
        isAlive: p.isAlive,
        isScoreRevealed: p.isScoreRevealed,
      }))
    );

    // IMPORTANT: Use gameState.players which has the latest willWin values
    // This includes AI players that were revealed via timers
    const result = calculateMinerGameResult(
      gameState.players,
      stakeSol,
      matchType,
      currentPlayer,
      currentPlayerPubkey,
      matchFromBackend
    );

    console.log("[MinerGameBoard] Calculated result:", result);
    console.log("[MinerGameBoard] Result playerResults:", result.playerResults);
    console.log("[MinerGameBoard] Result scores:", result.scores);
    console.log("[MinerGameBoard] Result gameType:", result.gameType);

    // Set local result
    setLocalGameResult(result);

    // Call onGameComplete OUTSIDE of setGameState to avoid "Cannot update component while rendering" error
    // Use setTimeout to defer the call until after render completes
    // CRITICAL: Ensure result always has gameType and playerResults
    const resultToPass: MinerGameResult = {
      ...result,
      gameType: result.gameType || GameType.Miner,
      playerResults: result.playerResults || {},
    };

    console.log("[MinerGameBoard] Result to pass:", resultToPass);
    console.log(
      "[MinerGameBoard] Result to pass gameType:",
      resultToPass.gameType
    );
    console.log(
      "[MinerGameBoard] Result to pass playerResults:",
      resultToPass.playerResults
    );
    console.log(
      "[MinerGameBoard] Result to pass keys:",
      Object.keys(resultToPass)
    );

    setTimeout(() => {
      if (onGameCompleteRef.current) {
        console.log(
          "[MinerGameBoard] Calling onGameComplete with result:",
          resultToPass
        );
        onGameCompleteRef.current(resultToPass);
      }
    }, 0);
  }, [
    gameState.status,
    gameState.players,
    stakeSol,
    matchType,
    currentPlayer,
    currentPlayerPubkey,
    matchFromBackend,
    // Don't include opponentRevealTimers - we use ref instead to avoid unnecessary re-runs
  ]);

  // Cleanup timers on unmount - using refs so it doesn't re-run on every state change
  useEffect(() => {
    return () => {
      // Use ref to access latest timers without triggering re-runs
      opponentRevealTimersRef.current.forEach((timer) => clearTimeout(timer));
      if (autoOpenCleanupRef.current) {
        autoOpenCleanupRef.current();
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
    // Empty dependency array - only run cleanup on actual unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // DON'T include opponentRevealTimers - causes cleanup to run constantly

  // Determine if team scores should be hidden (show "???")
  // Hide scores if no players have revealed yet (for team battles)
  // IMPORTANT: This must be before any conditional returns to follow React hooks rules
  const shouldHideTeamScores = useMemo(() => {
    if (matchType === "Solo") return false; // Solo mode doesn't use team scores
    const hasAnyRevealed = gameState.players.some(
      (p) => p.isScoreRevealed === true
    );
    return !hasAnyRevealed; // Show "???" if no one has revealed yet
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
        gameType={GameType.Miner}
      >
        {currentPlayer !== "" || isDemoMode ? (
          <MinerGame
            gameMode={gameMode}
            tiles={minerTiles}
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
