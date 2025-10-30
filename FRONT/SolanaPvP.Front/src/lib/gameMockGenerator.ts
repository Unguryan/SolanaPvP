// Game mock data generators
import { GamePlayer, GameTile } from "@/types/game";
import {
  distributeScore,
  generateRandomValues,
} from "@/utils/gameScoreDistribution";

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

export const generateDemoPlayers = (
  matchType: "Solo" | "Duo" | "Team",
  currentUsername: string = "You"
): GamePlayer[] => {
  const players: GamePlayer[] = [];

  // Add current user
  players.push({
    id: "current-user",
    username: currentUsername,
    targetScore: Math.floor(Math.random() * 1000) + 1000, // 1000-2000
    currentScore: 0,
    selections: [],
    isReady: true,
  });

  // Add AI players based on match type
  const aiCount = matchType === "Solo" ? 1 : matchType === "Duo" ? 3 : 9;

  for (let i = 0; i < aiCount; i++) {
    const randomName = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
    const targetScore = Math.floor(Math.random() * 1000) + 1000; // 1000-2000
    // Give AI players random scores that will be revealed via timer
    const aiScore = Math.floor(Math.random() * 1500) + 500; // 500-2000
    players.push({
      id: `ai-player-${i}`,
      username: randomName,
      targetScore: targetScore,
      currentScore: aiScore,
      selections: [],
      isReady: true,
    });
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
  gameMode: "PickThreeFromNine" | "PickFiveFromSixteen" | "PickOneFromThree",
  neededScore: number,
  currentScore: number
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

  // Generate tiles that give player a good chance to win
  for (let i = 0; i < totalTiles; i++) {
    let value: number;

    if (i < maxSelections) {
      // First few tiles should be high value to help player win
      // Since player starts with 0, we need to distribute neededScore across selectable tiles
      const baseValue = Math.floor(neededScore / maxSelections);
      const variation = Math.floor(baseValue * 0.4); // ±40% variation for more variety
      value = baseValue + Math.floor(Math.random() * variation * 2) - variation;
      value = Math.max(200, value); // Minimum 200 to ensure meaningful progress
    } else {
      // Remaining tiles can be lower value
      value = Math.floor(Math.random() * 400) + 100; // 100-500
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
