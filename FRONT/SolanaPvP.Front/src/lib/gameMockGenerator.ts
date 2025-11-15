// Game mock data generators
import { GamePlayer, GameTile } from "@/types/game";
import {
  distributeScore,
  distributeScoreArray,
  generateRandomValues,
} from "@/utils/gameScoreDistribution";
import { getSlotValues } from "@/utils/plinkoScoreBreakdown";

const AI_NAMES = [
  "CryptoKing",
  "SolanaMaster",
  "BlockchainPro",
  "DeFiWarrior",
  "NFTCollector",
  "Web3Ninja",
  "CryptoQueen",
  "DiamondHands",
  "MoonWalker",
  "HodlHero",
  "CryptoWhale",
  "BlockchainBeast",
  "SolanaSniper",
  "DeFiDragon",
  "CryptoEagle",
  "Web3Wizard",
];

/**
 * Generate realistic Plinko score from actual slot values
 * Uses weighted selection (center slots appear more often) - same logic as backend
 * @param ballCount - Number of balls (3, 5, or 7)
 * @param slotCount - Number of slots (5, 7, or 9)
 * @returns Realistic score that can be achieved
 */
function generateRealisticPlinkoScore(
  ballCount: number,
  slotCount: number
): number {
  const slotValues = getSlotValues(slotCount);
  let totalScore = 0;

  // Create weighted pool: center slots appear MORE often (same as backend)
  const weightedSlots: number[] = [];
  const center = Math.floor(slotValues.length / 2);

  for (let i = 0; i < slotValues.length; i++) {
    // Weight based on distance from center (center = higher weight)
    const distanceFromCenter = Math.abs(i - center);
    const weight = slotValues.length - distanceFromCenter; // Center = max weight

    for (let w = 0; w < weight; w++) {
      weightedSlots.push(i);
    }
  }

  // Pick ballCount random weighted slots
  for (let i = 0; i < ballCount; i++) {
    const randomIndex = Math.floor(Math.random() * weightedSlots.length);
    const slotIndex = weightedSlots[randomIndex];
    totalScore += slotValues[slotIndex];
  }

  return totalScore;
}

export const generateDemoPlayers = (
  matchType: "Solo" | "Duo" | "Team",
  currentUsername: string = "You",
  gameMode?: string
): GamePlayer[] => {
  const players: GamePlayer[] = [];

  // Check game type
  const isPlinko = gameMode?.startsWith("Plinko");
  const isMiner = gameMode?.startsWith("Miner");

  // Add current user
  if (isMiner) {
    // Miner: use willWin instead of targetScore
    // Current player can win or lose randomly, but there's always a winner (no ties)
    // Determine if current player will win (70% chance to win for demo)
    const currentPlayerWillWin = Math.random() > 0.3; // 70% chance to win

    players.push({
      id: "current-user",
      username: currentUsername,
      targetScore: 0, // Not used for Miner
      currentScore: 0,
      selections: [],
      isReady: true,
      willWin: currentPlayerWillWin,
      openedTileCount: 0,
      isAlive: true,
    });

    // Store current player's willWin for later use
    (players as any).__currentPlayerWillWin = currentPlayerWillWin;
  } else {
    // PickHigher or Plinko: use targetScore
    let playerTargetScore: number;

    if (isPlinko) {
      // Generate REALISTIC Plinko scores based on actual slot values
      const ballCount =
        gameMode === "Plinko3Balls" ? 3 : gameMode === "Plinko5Balls" ? 5 : 7;
      const slotCount =
        gameMode === "Plinko3Balls" ? 5 : gameMode === "Plinko5Balls" ? 7 : 9;
      playerTargetScore = generateRealisticPlinkoScore(ballCount, slotCount);
    } else {
      // PickHigher - old logic
      playerTargetScore = Math.floor(Math.random() * 400) + 400; // 400-800
    }

    players.push({
      id: "current-user",
      username: currentUsername,
      targetScore: playerTargetScore,
      currentScore: 0,
      selections: [],
      isReady: true,
    });
  }

  // Add AI players based on match type
  // Solo: 1 opponent (total: 2 players = 1v1)
  // Duo: 3 AI (1 teammate + 2 opponents) (total: 4 players = 2v2)
  // Team: 9 AI (4 teammates + 5 opponents) (total: 10 players = 5v5)
  const aiCount = matchType === "Solo" ? 1 : matchType === "Duo" ? 3 : 9;

  // Shuffle names to avoid duplicates
  const shuffledNames = [...AI_NAMES].sort(() => Math.random() - 0.5);

  if (isMiner) {
    // Miner: ensure guaranteed winner (no ties)
    // Current player can win or lose, but someone always wins
    const currentPlayerWillWin =
      (players as any).__currentPlayerWillWin ?? true;

    let teamAWinners = currentPlayerWillWin ? 1 : 0; // Current player on Team A
    let teamBWinners = 0;

    if (matchType === "Solo") {
      // 1v1: If current player wins, opponent loses. If current loses, opponent wins.
      if (currentPlayerWillWin) {
        teamAWinners = 1; // Current player wins
        teamBWinners = 0; // Opponent loses
      } else {
        teamAWinners = 0; // Current player loses
        teamBWinners = 1; // Opponent wins
      }
    } else if (matchType === "Duo") {
      // 2v2: Ensure one team has more winners
      if (currentPlayerWillWin) {
        // Current player wins -> Team A should win (need at least 2 winners on Team A)
        teamAWinners = 2; // Current player + 1 teammate = 2 winners
        teamBWinners = Math.random() > 0.7 ? 1 : 0; // 0-1 winners on Team B
      } else {
        // Current player loses -> Team B should win (need at least 2 winners on Team B)
        teamAWinners = Math.random() > 0.7 ? 1 : 0; // 0-1 winners on Team A
        teamBWinners = 2; // Both opponents win = 2 winners
      }
    } else if (matchType === "Team") {
      // 5v5: Ensure one team has more winners
      if (currentPlayerWillWin) {
        // Current player wins -> Team A should win (need at least 3 winners on Team A)
        const teamAAdditionalWinners = 2 + Math.floor(Math.random() * 3); // 2-4 more winners
        teamAWinners = 1 + teamAAdditionalWinners; // Total: 3-5 winners on Team A
        teamBWinners = Math.floor(Math.random() * 3); // 0-2 winners on Team B
      } else {
        // Current player loses -> Team B should win (need at least 3 winners on Team B)
        teamAWinners = Math.floor(Math.random() * 3); // 0-2 winners on Team A
        teamBWinners = 3 + Math.floor(Math.random() * 3); // 3-5 winners on Team B
      }
    }

    // Assign willWin to AI players
    let teamAIndex = 0; // Track Team A AI players (teammates)
    let teamBIndex = 0; // Track Team B AI players (opponents)

    for (let i = 0; i < aiCount; i++) {
      const uniqueName = shuffledNames[i % shuffledNames.length];
      let willWin: boolean;

      if (matchType === "Solo") {
        // Solo: opponent wins if current player loses
        willWin = !currentPlayerWillWin;
      } else if (matchType === "Duo") {
        // First AI is teammate (Team A), rest are opponents (Team B)
        if (i === 0) {
          // Teammate on Team A
          // If current player wins, teammate should win too (to have 2 winners)
          // If current player loses, teammate might win or lose
          willWin = currentPlayerWillWin
            ? true // If current wins, teammate wins (need 2 winners)
            : teamAIndex < teamAWinners; // If current loses, teammate might win/lose based on teamAWinners
          teamAIndex++;
        } else {
          // Opponent on Team B
          willWin = teamBIndex < teamBWinners;
          teamBIndex++;
        }
      } else {
        // Team: first 4 AI are teammates (Team A), last 5 are opponents (Team B)
        if (i < 4) {
          // Teammate on Team A
          // Need teamAWinners - (current player's contribution) winners among teammates
          willWin = teamAIndex < teamAWinners - (currentPlayerWillWin ? 1 : 0);
          teamAIndex++;
        } else {
          // Opponent on Team B
          willWin = teamBIndex < teamBWinners;
          teamBIndex++;
        }
      }

      players.push({
        id: `ai-player-${i}`,
        username: uniqueName,
        targetScore: 0, // Not used for Miner
        currentScore: 0,
        selections: [],
        isReady: true,
        willWin,
        openedTileCount: 0,
        isAlive: true,
      });
    }

    // Clean up temporary property
    delete (players as any).__currentPlayerWillWin;
  } else {
    // PickHigher or Plinko: use targetScore logic
    for (let i = 0; i < aiCount; i++) {
      const uniqueName = shuffledNames[i % shuffledNames.length];
      // PickHigher or Plinko: use targetScore
      let aiTargetScore: number;

      if (isPlinko) {
        // Generate realistic Plinko score for AI
        const ballCount =
          gameMode === "Plinko3Balls" ? 3 : gameMode === "Plinko5Balls" ? 5 : 7;
        const slotCount =
          gameMode === "Plinko3Balls" ? 5 : gameMode === "Plinko5Balls" ? 7 : 9;
        aiTargetScore = generateRealisticPlinkoScore(ballCount, slotCount);
      } else {
        // PickHigher - old logic
        const playerTargetScore = players[0]?.targetScore || 600;
        const variance = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
        aiTargetScore = Math.floor(playerTargetScore * variance);
      }

      players.push({
        id: `ai-player-${i}`,
        username: uniqueName,
        targetScore: aiTargetScore,
        currentScore: 0, // Everyone starts at 0
        selections: [],
        isReady: true,
      });
    }
  }

  return players;
};

export const generateTileValues = (
  gameMode: "PickThreeFromNine" | "PickFiveFromSixteen" | "PickOneFromThree",
  targetScore: number,
  selectedIndices: number[]
): GameTile[] => {
  let totalTiles: number;

  switch (gameMode) {
    case "PickThreeFromNine":
      totalTiles = 9;
      break;
    case "PickFiveFromSixteen":
      totalTiles = 16;
      break;
    case "PickOneFromThree":
      totalTiles = 3;
      break;
    default:
      totalTiles = 9;
  }

  const tiles: GameTile[] = [];

  // Generate values for selected tiles (distributed to reach targetScore)
  const selectedValues: number[] = [];
  for (let i = 0; i < selectedIndices.length; i++) {
    const value = distributeScore(targetScore, selectedIndices.length, i);
    selectedValues.push(value);
  }

  // Generate values for unselected tiles that could potentially win
  const unselectedIndices = Array.from(
    { length: totalTiles },
    (_, i) => i
  ).filter((i) => !selectedIndices.includes(i));

  // Ensure at least one combination of unselected tiles could reach a high score
  const unselectedValues = generateRandomValues(unselectedIndices.length, []);

  // If we have enough unselected tiles, make sure at least one combination could win
  if (unselectedIndices.length >= 2) {
    // Add a high-value tile that could help reach winning score
    const highValueIndex = Math.floor(Math.random() * unselectedIndices.length);
    unselectedValues[highValueIndex] = Math.floor(Math.random() * 500) + 800; // 800-1300
  }

  // Create tiles
  for (let i = 0; i < totalTiles; i++) {
    const isSelected = selectedIndices.includes(i);
    const value = isSelected
      ? selectedValues[selectedIndices.indexOf(i)]
      : unselectedValues[unselectedIndices.indexOf(i)];

    tiles.push({
      index: i,
      value,
      selected: isSelected,
      revealed: false,
      isBonus: value > 500 && Math.random() < 0.1, // 10% chance for bonus
    });
  }

  return tiles;
};

export const simulateAISelection = async (
  tiles: GameTile[],
  maxSelections: number,
  delay: number = 1000
): Promise<number[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const availableTiles = tiles
        .map((tile, index) => ({ tile, index }))
        .filter(({ tile }) => !tile.selected)
        .map(({ index }) => index);

      // Randomly select tiles
      const selectedIndices: number[] = [];
      const selectionCount = Math.min(maxSelections, availableTiles.length);

      for (let i = 0; i < selectionCount; i++) {
        const randomIndex = Math.floor(Math.random() * availableTiles.length);
        const tileIndex = availableTiles[randomIndex];
        selectedIndices.push(tileIndex);
        availableTiles.splice(randomIndex, 1);
      }

      resolve(selectedIndices);
    }, delay);
  });
};

export const generateWinnableTiles = (
  gameMode: string,
  neededScore: number
): GameTile[] => {
  let totalTiles: number;

  switch (gameMode) {
    case "PickThreeFromNine":
      totalTiles = 9;
      break;
    case "PickFiveFromSixteen":
      totalTiles = 16;
      break;
    case "PickOneFromThree":
      totalTiles = 3;
      break;
    default:
      totalTiles = 9;
  }

  const tiles: GameTile[] = [];

  // Calculate how many tiles player can select
  const maxSelections =
    gameMode === "PickThreeFromNine"
      ? 3
      : gameMode === "PickFiveFromSixteen"
      ? 5
      : 1;

  // Generate tiles that give player a GUARANTEED chance to win
  // Strategy: ensure at least one tile/combination can reach neededScore

  const values: number[] = [];

  // Generate values for first maxSelections tiles (these are the "winning" tiles)
  for (let i = 0; i < maxSelections; i++) {
    if (i === 0) {
      // First tile should give enough to potentially win
      // For single selection (cards), this tile alone should be enough
      if (maxSelections === 1) {
        // For 1v3 cards: guarantee winning with best card
        values.push(Math.floor(neededScore * 1.1)); // 110% of needed
      } else {
        // For multiple selections: distribute fairly
        values.push(
          Math.floor(neededScore / maxSelections) +
            Math.floor(Math.random() * 200)
        );
      }
    } else {
      // Other tiles contribute to total but with variation
      const remaining = neededScore - values.reduce((sum, v) => sum + v, 0);
      const avgPerRemaining = Math.floor(remaining / (maxSelections - i));
      const variation = Math.floor(avgPerRemaining * 0.5);
      values.push(
        Math.max(
          150,
          avgPerRemaining +
            Math.floor(Math.random() * variation * 2) -
            variation
        )
      );
    }
  }

  // Add decoy tiles (lower values)
  for (let i = maxSelections; i < totalTiles; i++) {
    values.push(Math.floor(Math.random() * 400) + 100); // 100-500
  }

  // Shuffle all values so the best tile isn't always first
  const shuffledValues = values.sort(() => Math.random() - 0.5);

  // Create tiles with shuffled values
  for (let i = 0; i < totalTiles; i++) {
    tiles.push({
      index: i,
      value: shuffledValues[i],
      selected: false,
      revealed: false,
      isBonus: shuffledValues[i] > 600 && Math.random() < 0.1, // 10% chance for bonus
    });
  }

  return tiles;
};

/**
 * Generate tiles where specific tiles sum to targetScore (predefined game result)
 * This is for real games where the outcome is already determined by blockchain VRF
 */
export const generateTargetedTiles = (
  gameMode: string,
  targetScore: number,
  maxSelections: number
): GameTile[] => {
  let totalTiles: number;

  switch (gameMode) {
    case "PickThreeFromNine":
      totalTiles = 9;
      break;
    case "PickFiveFromSixteen":
      totalTiles = 16;
      break;
    case "PickOneFromThree":
      totalTiles = 3;
      break;
    default:
      totalTiles = 9;
  }

  // Distribute targetScore across maxSelections cards
  const targetValues = distributeScoreArray(targetScore, maxSelections);

  // Shuffle which tiles get the target values (randomize tile positions)
  const targetIndices = Array.from({ length: totalTiles }, (_, i) => i)
    .sort(() => Math.random() - 0.5)
    .slice(0, maxSelections);

  // Generate tiles
  const tiles: GameTile[] = [];
  let targetValueIndex = 0;

  for (let i = 0; i < totalTiles; i++) {
    let value: number;

    if (targetIndices.includes(i)) {
      // This tile is one of the "correct" tiles that sum to targetScore
      value = targetValues[targetValueIndex++];
    } else {
      // Decoy tile with random value (not part of winning combination)
      // Make sure decoy values are different from target values
      const avgTargetValue = targetScore / maxSelections;
      const decoyMin = Math.max(50, Math.floor(avgTargetValue * 0.3)); // 30% of average
      const decoyMax = Math.min(800, Math.floor(avgTargetValue * 1.3)); // 130% of average
      value = Math.floor(Math.random() * (decoyMax - decoyMin)) + decoyMin;

      // Try to ensure decoy doesn't match any target value (max 10 attempts)
      let attempts = 0;
      while (
        attempts < 10 &&
        targetValues.some((tv) => Math.abs(value - tv) / tv < 0.05)
      ) {
        value = Math.floor(Math.random() * (decoyMax - decoyMin)) + decoyMin;
        attempts++;
      }
    }

    tiles.push({
      index: i,
      value,
      selected: false,
      revealed: false,
      isBonus: value > 500 && Math.random() < 0.1, // 10% chance for bonus
    });
  }

  return tiles;
};

export const generateGameState = (
  gameMode: "PickThreeFromNine" | "PickFiveFromSixteen" | "PickOneFromThree",
  players: GamePlayer[],
  timeLimit: number = 30
) => {
  const totalTiles =
    gameMode === "PickThreeFromNine"
      ? 9
      : gameMode === "PickFiveFromSixteen"
      ? 16
      : 3;

  return {
    status: "waiting" as const,
    timeRemaining: timeLimit,
    tiles: Array.from({ length: totalTiles }, (_, i) => ({
      index: i,
      value: 0,
      selected: false,
      revealed: false,
      isBonus: false,
    })),
    players,
    currentPlayerTurn: players[0]?.username,
    winner: undefined,
  };
};
