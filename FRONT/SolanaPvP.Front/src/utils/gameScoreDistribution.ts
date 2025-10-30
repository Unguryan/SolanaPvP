// Game score distribution utilities
import { GamePlayer, GameResult } from "@/types/game";

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

export function calculateGameResult(
  players: GamePlayer[],
  stakeSol: number,
  matchType?: "Solo" | "Duo" | "Team"
): GameResult {
  const isTeamBattle = matchType === "Duo" || matchType === "Team";

  if (isTeamBattle) {
    // Team battle logic
    const teamSize = matchType === "Duo" ? 2 : 5;
    const teamA = players.slice(0, teamSize);
    const teamB = players.slice(teamSize, teamSize * 2);

    const teamAScore = teamA.reduce(
      (sum, player) => sum + player.currentScore,
      0
    );
    const teamBScore = teamB.reduce(
      (sum, player) => sum + player.currentScore,
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
      scores[player.username] = player.currentScore;
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
      (a, b) => b.currentScore - a.currentScore
    );
    const winner = sortedPlayers[0];

    // Calculate win amount (x2 from stake for demo)
    const winAmount = stakeSol * 2;

    // Create scores record
    const scores: Record<string, number> = {};
    players.forEach((player) => {
      scores[player.username] = player.currentScore;
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
        icon: "🎯",
        name: "Pick 3 from 9 Tiles",
      };
    case "PickFiveFromSixteen":
      return {
        gridSize: 4,
        maxSelections: 5,
        icon: "🏆",
        name: "Pick 5 from 16 Chests",
      };
    case "PickOneFromThree":
      return {
        gridSize: 1,
        maxSelections: 1,
        icon: "🎴",
        name: "Pick 1 from 3 Cards",
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
