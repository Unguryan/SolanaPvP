// Game score distribution utilities
import { GamePlayer, GameResult, GameType } from "@/types/game";

export function distributeScore(
  targetScore: number,
  maxSelections: number,
  selectedCount: number
): number {
  if (selectedCount === 0) {
    // First selection: 30-40% of target score
    const percentage = 0.3 + Math.random() * 0.1; // 30-40%
    return Math.floor(targetScore * percentage);
  }

  if (selectedCount === maxSelections - 1) {
    // Last selection: exact value to reach target
    return targetScore;
  }

  // Middle selections: distribute remaining score with variation
  const remainingSelections = maxSelections - selectedCount;
  const remainingScore = targetScore;
  const baseScore = remainingScore / remainingSelections;

  // Add ±20% variation
  const variation = 0.8 + Math.random() * 0.4; // 80-120%
  return Math.floor(baseScore * variation);
}

export function distributeScoreArray(
  targetScore: number,
  count: number
): number[] {
  if (count === 0) return [];
  if (count === 1) return [targetScore];

  const values: number[] = [];
  let remainingScore = targetScore;

  for (let i = 0; i < count; i++) {
    if (i === count - 1) {
      // Last value: exact remaining score
      values.push(remainingScore);
    } else {
      // Random value between 20-60% of remaining score
      const percentage = 0.2 + Math.random() * 0.4;
      const value = Math.floor(remainingScore * percentage);
      values.push(value);
      remainingScore -= value;
    }
  }

  return values;
}

export function generateRandomValues(
  count: number,
  excludeIndices: number[] = []
): number[] {
  const values: number[] = [];

  for (let i = 0; i < count; i++) {
    if (excludeIndices.includes(i)) {
      values.push(0); // Placeholder for excluded indices
      continue;
    }

    // Generate random value with chance for bonuses
    const random = Math.random();

    if (random < 0.05) {
      // 5% chance for x2 multiplier
      values.push(Math.floor(Math.random() * 500) + 100);
    } else if (random < 0.02) {
      // 2% chance for x3 multiplier
      values.push(Math.floor(Math.random() * 300) + 200);
    } else {
      // Regular value
      values.push(Math.floor(Math.random() * 800) + 50);
    }
  }

  return values;
}

export function calculateMinerGameResult(
  players: GamePlayer[],
  stakeSol: number,
  matchType?: "Solo" | "Duo" | "Team",
  currentPlayer?: string,
  currentPlayerPubkey?: string,
  matchFromBackend?: any
): GameResult {
  const isTeamBattle = matchType === "Duo" || matchType === "Team";

  if (isTeamBattle) {
    // Team battle logic: winner = team with more players who willWin
    const teamSize = matchType === "Duo" ? 2 : 5;
    const teamA = players.slice(0, teamSize);
    const teamB = players.slice(teamSize, teamSize * 2);

    // Count players who willWin (from backend)
    const teamAPrizeCount = teamA.filter((p) => p.willWin === true).length;
    const teamBPrizeCount = teamB.filter((p) => p.willWin === true).length;

    const winningTeamName =
      teamAPrizeCount > teamBPrizeCount ? "Team A" : "Team B";
    const isTeamAWinner = teamAPrizeCount > teamBPrizeCount;

    // Determine if current player won
    let isCurrentPlayerWinner = false;
    if (currentPlayerPubkey && matchFromBackend) {
      const myParticipant = matchFromBackend.participants?.find(
        (p: any) => p.pubkey === currentPlayerPubkey
      );
      if (myParticipant) {
        isCurrentPlayerWinner = myParticipant.isWinner ?? false;
      }
    } else {
      // Fallback: check if current player's team won
      const currentPlayerData = players.find(
        (p) => p.username === currentPlayer || p.pubkey === currentPlayerPubkey
      );
      if (currentPlayerData) {
        const isInTeamA = teamA.some(
          (p) =>
            p.username === currentPlayerData.username ||
            p.pubkey === currentPlayerData.pubkey
        );
        isCurrentPlayerWinner = isInTeamA ? isTeamAWinner : !isTeamAWinner;
      }
    }

    // Calculate win amount
    const totalParticipants =
      matchFromBackend?.participants?.length || players.length;
    const totalPot = stakeSol * totalParticipants;
    const winAmount = isCurrentPlayerWinner ? totalPot : 0;

    // Create scores record (based on willWin from backend)
    const scores: Record<string, number> = {};
    players.forEach((player) => {
      scores[player.username] = player.willWin === true ? 1 : 0;
    });

    const teamScores: Record<string, number> = {
      "Team A": teamAPrizeCount,
      "Team B": teamBPrizeCount,
    };

    // Create playerResults for Miner display (true = Alive, false = Bombed)
    // Based on willWin from backend
    const playerResults: Record<string, boolean> = {};
    players.forEach((player) => {
      playerResults[player.username] = player.willWin === true;
    });

    return {
      winner: winningTeamName,
      scores,
      winAmount,
      duration: 0,
      isTeamBattle: true,
      teamScores,
      isCurrentPlayerWinner,
      gameType: GameType.Miner,
      playerResults,
    };
  } else {
    // Solo battle logic (1v1)
    // Winner is determined by willWin flag from backend
    // In 1v1: exactly ONE player should have willWin === true (the winner)
    // If both have willWin === true, prioritize current player (backend should handle this correctly)
    // If both have willWin === false, current player loses (fallback)
    const playersWithWillWin = players.filter((p) => p.willWin === true);

    // Find current player
    const currentPlayerData = players.find(
      (p) => p.username === currentPlayer || p.pubkey === currentPlayerPubkey
    );

    // In 1v1, exactly ONE player must win
    // If both have willWin === true, current player wins (prioritize current player)
    // If both have willWin === false, current player loses (opponent wins)
    // If one has willWin === true, that player wins
    let winner;
    if (players.length !== 2) {
      // Fallback for non-1v1 (shouldn't happen in Solo mode)
      winner = playersWithWillWin[0] || players[0];
    } else {
      // 1v1 logic: exactly one winner
      if (playersWithWillWin.length === 1) {
        // Exactly one winner - use that player
        winner = playersWithWillWin[0];
      } else if (playersWithWillWin.length === 2) {
        // Both have willWin === true - current player wins (prioritize current player)
        winner = currentPlayerData || playersWithWillWin[0];
        console.log(
          `[calculateMinerGameResult] Both players have willWin=true, current player wins: ${winner.username}`
        );
      } else {
        // No one has willWin === true - opponent wins (current player loses)
        const opponent = players.find(
          (p) =>
            p.username !== currentPlayer && p.pubkey !== currentPlayerPubkey
        );
        winner = opponent || players[0];
        console.log(
          `[calculateMinerGameResult] No players have willWin=true, opponent wins: ${winner.username}`
        );
      }
    }

    // Determine if current player won
    let isCurrentPlayerWinner = false;
    if (currentPlayerPubkey && matchFromBackend) {
      const myParticipant = matchFromBackend.participants?.find(
        (p: any) => p.pubkey === currentPlayerPubkey
      );
      if (myParticipant) {
        isCurrentPlayerWinner = myParticipant.isWinner ?? false;
      }
    } else {
      // Check if current player has willWin === true (from backend)
      const currentPlayerData = players.find(
        (p) => p.username === currentPlayer || p.pubkey === currentPlayerPubkey
      );
      isCurrentPlayerWinner = currentPlayerData?.willWin === true;
    }

    // Calculate win amount
    const totalPot = stakeSol * 2;
    const winAmount = isCurrentPlayerWinner ? totalPot : 0;

    // Create scores record (based on willWin from backend)
    const scores: Record<string, number> = {};
    players.forEach((player) => {
      scores[player.username] = player.willWin === true ? 1 : 0;
    });

    // Create playerResults for Miner display (true = Alive, false = Bombed)
    // Based ONLY on willWin from backend (game is just visualization)
    // IMPORTANT: In 1v1, if both have willWin=true, we keep both as true in playerResults
    // but only one can be the winner
    const playerResults: Record<string, boolean> = {};
    players.forEach((player) => {
      // willWin should be boolean (true/false) from backend
      // If willWin is undefined or null, default to false (Bombed)
      // This ensures playerResults always has a boolean value
      const willWinValue = player.willWin === true;
      playerResults[player.username] = willWinValue;

      // Debug logging
      console.log(
        `[calculateMinerGameResult] Player ${player.username}: willWin=${player.willWin}, playerResults=${willWinValue}`
      );
      if (player.willWin === undefined || player.willWin === null) {
        console.warn(
          `[calculateMinerGameResult] Player ${player.username} has undefined willWin, defaulting to false`
        );
      }
    });

    // In 1v1, if both players have willWin=true, ensure playerResults reflects this correctly
    // but winner is still only one (current player)
    if (players.length === 2 && playersWithWillWin.length === 2) {
      console.log(
        `[calculateMinerGameResult] Both players have willWin=true in 1v1 - keeping both as Alive in playerResults`
      );
    }

    console.log(
      `[calculateMinerGameResult] Final playerResults:`,
      playerResults
    );
    console.log(`[calculateMinerGameResult] Final scores:`, scores);
    console.log(`[calculateMinerGameResult] Winner: ${winner.username}`);

    return {
      winner: winner.username,
      scores,
      winAmount,
      duration: 0,
      isTeamBattle: false,
      isCurrentPlayerWinner,
      gameType: GameType.Miner,
      playerResults,
    };
  }
}

export function calculateGameResult(
  players: GamePlayer[],
  stakeSol: number,
  matchType?: "Solo" | "Duo" | "Team",
  currentPlayer?: string,
  useFinalScores?: boolean // Для Plinko используем targetScore
): GameResult {
  const isTeamBattle = matchType === "Duo" || matchType === "Team";

  // Для финального результата используем targetScore
  const getPlayerScore = (player: GamePlayer) =>
    useFinalScores ? player.targetScore : player.currentScore;

  if (isTeamBattle) {
    // Team battle logic
    const teamSize = matchType === "Duo" ? 2 : 5;
    const teamA = players.slice(0, teamSize);
    const teamB = players.slice(teamSize, teamSize * 2);

    const teamAScore = teamA.reduce(
      (sum, player) => sum + getPlayerScore(player),
      0
    );
    const teamBScore = teamB.reduce(
      (sum, player) => sum + getPlayerScore(player),
      0
    );

    const winningTeamName = teamAScore > teamBScore ? "Team A" : "Team B";
    const isTeamAWinner = teamAScore > teamBScore;

    // Calculate win amount based on which team won
    // In demo: if Team A wins, show stake*2, if Team B wins, show 0 (defeat)
    const winAmount = isTeamAWinner ? stakeSol * 2 : 0;

    // Create scores record
    const scores: Record<string, number> = {};
    players.forEach((player) => {
      scores[player.username] = getPlayerScore(player);
    });

    const teamScores: Record<string, number> = {
      "Team A": teamAScore,
      "Team B": teamBScore,
    };

    return {
      winner: winningTeamName,
      scores,
      winAmount,
      duration: 0,
      isTeamBattle: true,
      teamScores,
    };
  } else {
    // Solo battle logic (existing)
    const sortedPlayers = [...players].sort(
      (a, b) => getPlayerScore(b) - getPlayerScore(a)
    );
    const winner = sortedPlayers[0];

    // Calculate win amount based on winner
    // In demo: if current player wins, show stake*2, if loses, show 0
    const isCurrentPlayerWinner = winner.username === (currentPlayer || "You");
    const winAmount = isCurrentPlayerWinner ? stakeSol * 2 : 0;

    // Create scores record
    const scores: Record<string, number> = {};
    players.forEach((player) => {
      scores[player.username] = getPlayerScore(player);
    });

    return {
      winner: winner.username,
      scores,
      winAmount,
      duration: 0,
      isTeamBattle: false,
    };
  }
}

export function getGameModeConfig(gameMode: string) {
  switch (gameMode) {
    case "PickThreeFromNine":
      return {
        gridSize: 3,
        maxSelections: 3,
        icon: "🏆",
        name: "Pick 3 from 9 Chests",
      };
    case "PickFiveFromSixteen":
      return {
        gridSize: 4,
        maxSelections: 5,
        icon: "🎯",
        name: "Pick 5 from 16 Tiles",
      };
    case "PickOneFromThree":
      return {
        gridSize: 1,
        maxSelections: 1,
        icon: "🎴",
        name: "Pick 1 from 3 Cards",
      };
    case "Plinko3Balls":
      return {
        gridSize: 5,
        maxSelections: 3,
        icon: "🎰",
        name: "Plinko: 3 Balls",
        rows: 5,
        slots: 5, // 5 rows → 5 slots (между 6 пинами последнего ряда)
      };
    case "Plinko5Balls":
      return {
        gridSize: 7,
        maxSelections: 5,
        icon: "🎰",
        name: "Plinko: 5 Balls",
        rows: 7,
        slots: 7, // 7 rows → 7 slots (между 8 пинами последнего ряда)
      };
    case "Plinko7Balls":
      return {
        gridSize: 9,
        maxSelections: 7,
        icon: "🎰",
        name: "Plinko: 7 Balls",
        rows: 9,
        slots: 9, // 9 rows → 9 slots (между 10 пинами последнего ряда)
      };
    case "Miner1v9":
      return {
        gridSize: 3,
        maxSelections: 8, // Can open up to 8 tiles
        icon: "💣",
        name: "Miner: 1v9",
        tileCount: 9,
      };
    case "Miner3v16":
      return {
        gridSize: 4,
        maxSelections: 13, // Can open up to 13 tiles
        icon: "💣",
        name: "Miner: 3v16",
        tileCount: 16,
      };
    case "Miner5v25":
      return {
        gridSize: 5,
        maxSelections: 20, // Can open up to 20 tiles
        icon: "💣",
        name: "Miner: 5v25",
        tileCount: 25,
      };
    case "GoldBars1v9":
      return {
        gridSize: 3,
        maxSelections: 8, // Can open up to 8 tiles (8 gold bars, 1 bomb)
        icon: "🥇",
        name: "Gold Bars: 1v9",
        tileCount: 9,
        goldBars: 8,
        bombs: 1,
      };
    case "GoldBars3v16":
      return {
        gridSize: 4,
        maxSelections: 13, // Can open up to 13 tiles (13 gold bars, 3 bombs)
        icon: "🥇",
        name: "Gold Bars: 3v16",
        tileCount: 16,
        goldBars: 13,
        bombs: 3,
      };
    case "GoldBars5v25":
      return {
        gridSize: 5,
        maxSelections: 20, // Can open up to 20 tiles (20 gold bars, 5 bombs)
        icon: "🥇",
        name: "Gold Bars: 5v25",
        tileCount: 25,
        goldBars: 20,
        bombs: 5,
      };
    default:
      return {
        gridSize: 3,
        maxSelections: 3,
        icon: "🎮",
        name: "Unknown Game Mode",
      };
  }
}
