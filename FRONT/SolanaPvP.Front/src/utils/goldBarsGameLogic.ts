// Gold Bars game logic utilities
import { GameType } from "@/types/game";
import {
  GoldBarsGameResult,
  GoldBarsGamePlayer,
  GoldBarsTile,
} from "@/types/goldBars";

/**
 * Determines the click number where player will hit a bomb
 * Bomb is guaranteed on (targetScore + 1)-th click
 * @param targetScore Target score from backend (how many gold bars player should open)
 * @returns Click number where bomb will appear (targetScore + 1)
 */
export function determineBombClick(targetScore: number): number {
  // Bomb appears on the next click after reaching targetScore
  const bombClick = targetScore + 1;
  console.log(
    `[determineBombClick] Bomb will appear on click ${bombClick} (targetScore: ${targetScore})`
  );
  return bombClick;
}

/**
 * Distributes gold bars and bombs to closed tiles
 * @param tiles Current tiles array
 * @param clickedIndex Index of the tile that was just clicked
 * @param totalGoldBars Total number of gold bars in the game
 * @param totalBombs Total number of bombs in the game
 * @param currentPlayerFoundGold Whether current player found gold (true) or bomb (false)
 * @param currentPlayerScore Current score of the player (how many gold bars opened)
 * @param targetScore Target score from backend
 * @returns Updated tiles array with gold bars and bombs distributed
 */
export function distributeGoldBarsAndBombs(
  tiles: GoldBarsTile[],
  clickedIndex: number,
  totalGoldBars: number,
  totalBombs: number,
  currentPlayerFoundGold: boolean,
  currentPlayerScore: number,
  targetScore: number
): GoldBarsTile[] {
  // Get ONLY closed tile indices (excluding the one just clicked)
  const closedIndices = tiles
    .map((tile, idx) => ({ tile, idx }))
    .filter(({ tile, idx }) => !tile.revealed && idx !== clickedIndex)
    .map(({ idx }) => idx);

  // Determine remaining gold bars and bombs
  // currentPlayerScore is the number of gold bars already opened by the player
  // If currentPlayerFoundGold is true, the current tile is a gold bar (already counted in currentPlayerScore)
  // If currentPlayerFoundGold is false, the current tile is a bomb (not counted in currentPlayerScore)
  const remainingGoldBars = totalGoldBars - currentPlayerScore;
  const remainingBombs = totalBombs - (currentPlayerFoundGold ? 0 : 1);

  console.log(
    `[distributeGoldBarsAndBombs] Distributing: ${remainingGoldBars} gold bars, ${remainingBombs} bombs. ` +
      `Closed slots available: ${closedIndices.length}, currentScore: ${currentPlayerScore}, targetScore: ${targetScore}`
  );

  // Shuffle closed indices randomly
  const shuffledClosed = [...closedIndices].sort(() => Math.random() - 0.5);

  // Assign gold bars and bombs to closed slots
  const goldIndices = new Set<number>();
  const bombIndices = new Set<number>();

  // First, assign gold bars to closed slots
  const goldBarsToAssign = Math.min(remainingGoldBars, shuffledClosed.length);
  for (let i = 0; i < goldBarsToAssign; i++) {
    goldIndices.add(shuffledClosed[i]);
  }

  // Then, assign bombs to remaining closed slots
  const slotsAfterGold = shuffledClosed.length - goldBarsToAssign;
  const bombsToAssign = Math.min(remainingBombs, slotsAfterGold);
  for (let i = goldBarsToAssign; i < goldBarsToAssign + bombsToAssign; i++) {
    bombIndices.add(shuffledClosed[i]);
  }

  // Log warning if we still can't fit everything
  if (remainingGoldBars + remainingBombs > shuffledClosed.length) {
    console.warn(
      `[distributeGoldBarsAndBombs] ⚠️ Not enough closed slots! Need ${
        remainingGoldBars + remainingBombs
      } items but only ${shuffledClosed.length} closed slots available. ` +
        `Assigning ${goldBarsToAssign} gold bars and ${bombsToAssign} bombs. ` +
        `Missing: ${
          remainingGoldBars + remainingBombs - shuffledClosed.length
        } items.`
    );
  } else {
    console.log(
      `[distributeGoldBarsAndBombs] ✅ All items distributed to closed slots: ${goldBarsToAssign} gold bars, ${bombsToAssign} bombs. ` +
        `Remaining empty slots: ${
          shuffledClosed.length - goldBarsToAssign - bombsToAssign
        }`
    );
  }

  // Also add the current tile (the one player just clicked) to the appropriate set
  if (currentPlayerFoundGold) {
    goldIndices.add(clickedIndex);
  } else {
    bombIndices.add(clickedIndex);
  }

  console.log(
    `[distributeGoldBarsAndBombs] Gold indices:`,
    Array.from(goldIndices)
  );
  console.log(
    `[distributeGoldBarsAndBombs] Bomb indices:`,
    Array.from(bombIndices)
  );

  // Update tiles: assign types and reveal ALL tiles
  return tiles.map((tile) => {
    // Current tile (the one player clicked) - already has correct type
    if (tile.index === clickedIndex) {
      return {
        ...tile,
        type: currentPlayerFoundGold ? "gold" : "bomb",
        selected: true,
        revealed: true,
      };
    }

    // Tiles in gold/bomb sets - assign type and reveal
    if (goldIndices.has(tile.index)) {
      return { ...tile, type: "gold", revealed: true };
    } else if (bombIndices.has(tile.index)) {
      return { ...tile, type: "bomb", revealed: true };
    }

    // Already revealed tiles that are not in gold/bomb sets - keep as is (stay empty)
    if (tile.revealed) {
      return tile;
    }

    // Closed tiles not in gold/bomb sets - reveal as empty
    return { ...tile, type: "empty", revealed: true };
  });
}

/**
 * Automatically opens tiles for a player when timer runs out
 * Opens tiles randomly, one every 500ms, until bomb is found or targetScore is reached
 * @param tiles Current tiles array
 * @param bombClick The click number where player should hit a bomb (targetScore + 1)
 * @param currentClickCount Current number of clicks made by player
 * @param targetScore Target score from backend
 * @param totalGoldBars Total number of gold bars in the game
 * @param onTileOpen Callback function to call when opening each tile
 * @param onComplete Callback function to call when result is found
 */
export function autoOpenTiles(
  tiles: GoldBarsTile[],
  bombClick: number,
  currentClickCount: number,
  targetScore: number,
  totalGoldBars: number,
  onTileOpen: (index: number, clickNumber: number) => void,
  onComplete: () => void
): () => void {
  // Get unopened tiles (not revealed)
  const unopenedTiles = tiles
    .map((tile, index) => ({ tile, index }))
    .filter(({ tile }) => !tile.revealed);

  if (unopenedTiles.length === 0) {
    console.log(`[autoOpenTiles] No unopened tiles, completing immediately`);
    onComplete();
    return () => {}; // Return empty cleanup function
  }

  // Shuffle unopened tiles randomly
  const shuffled = [...unopenedTiles].sort(() => Math.random() - 0.5);

  let clickNumber = currentClickCount;
  const timeouts: NodeJS.Timeout[] = [];

  console.log(
    `[autoOpenTiles] Starting auto-open: ${unopenedTiles.length} unopened tiles, bomb on click ${bombClick}, current click ${currentClickCount}, targetScore: ${targetScore}`
  );

  // Track if result was found to stop opening more tiles
  let resultFound = false;

  // Open tiles one by one, every 500ms, until bomb is found or targetScore is reached
  shuffled.forEach(({ index }, arrayIndex) => {
    clickNumber++;
    const timeout = setTimeout(() => {
      // Stop if result was already found (check before processing)
      if (resultFound) {
        console.log(
          `[autoOpenTiles] Result already found, skipping tile ${index}`
        );
        return;
      }

      console.log(
        `[autoOpenTiles] Auto-opening tile: index=${index}, clickNumber=${clickNumber}`
      );

      // Check if this is the bomb click
      if (clickNumber === bombClick) {
        console.log(`[autoOpenTiles] 💣 Bomb found on click ${clickNumber}!`);
        resultFound = true;

        // Clear all remaining timeouts (stop opening more tiles)
        for (let i = arrayIndex + 1; i < shuffled.length; i++) {
          if (timeouts[i]) {
            clearTimeout(timeouts[i]);
          }
        }

        onTileOpen(index, clickNumber);
        // Complete after opening bomb tile
        setTimeout(() => {
          onComplete();
        }, 100);
      } else {
        // Check if we've reached targetScore (all gold bars opened)
        // In this case, we should stop and mark as complete
        // But we continue opening until bomb is found
        onTileOpen(index, clickNumber);
      }
    }, arrayIndex * 500); // 500ms delay between each tile

    timeouts.push(timeout);
  });

  // Return cleanup function
  return () => {
    timeouts.forEach((timeout) => clearTimeout(timeout));
  };
}

/**
 * Calculates Gold Bars game result based on currentScore (number of gold bars opened)
 * Winner is the player/team with the highest currentScore
 * @param players Array of game players
 * @param stakeSol Stake amount in SOL
 * @param matchType Match type (Solo, Duo, Team)
 * @param currentPlayer Current player username
 * @param currentPlayerPubkey Current player pubkey
 * @param matchFromBackend Full match data from backend
 * @returns GoldBarsGameResult with winner determined by highest currentScore
 */
export function calculateGoldBarsGameResult(
  players: GoldBarsGamePlayer[],
  stakeSol: number,
  matchType?: "Solo" | "Duo" | "Team",
  currentPlayer?: string,
  currentPlayerPubkey?: string,
  matchFromBackend?: any
): GoldBarsGameResult {
  const isTeamBattle = matchType === "Duo" || matchType === "Team";

  console.log(
    `[calculateGoldBarsGameResult] Calculating result for ${matchType} match`
  );
  console.log(
    `[calculateGoldBarsGameResult] Players:`,
    players.map((p) => ({
      username: p.username,
      currentScore: p.currentScore,
      targetScore: p.targetScore,
    }))
  );

  if (isTeamBattle) {
    // Team battle logic: winner = team with higher total currentScore
    const teamSize = matchType === "Duo" ? 2 : 5;
    const teamA = players.slice(0, teamSize);
    const teamB = players.slice(teamSize, teamSize * 2);

    // Sum currentScore for each team
    const teamAScore = teamA.reduce((sum, player) => sum + player.currentScore, 0);
    const teamBScore = teamB.reduce((sum, player) => sum + player.currentScore, 0);

    // Winner is team with higher score (no ties allowed - Team A wins on tie)
    const isTeamAWinner = teamAScore >= teamBScore;
    const winningTeamName = isTeamAWinner ? "Team A" : "Team B";

    console.log(
      `[calculateGoldBarsGameResult] Team A: ${teamAScore} gold bars, Team B: ${teamBScore} gold bars, Winner: ${winningTeamName}${
        teamAScore === teamBScore ? " (tie - Team A wins)" : ""
      }`
    );

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

    // Create scores record (currentScore = number of gold bars opened)
    const scores: Record<string, number> = {};
    players.forEach((player) => {
      scores[player.username] = player.currentScore;
    });

    const teamScores: Record<string, number> = {
      "Team A": teamAScore,
      "Team B": teamBScore,
    };

    console.log(`[calculateGoldBarsGameResult] Team result:`, {
      winner: winningTeamName,
      scores,
      teamScores,
      winAmount,
    });

    return {
      winner: winningTeamName,
      scores,
      winAmount,
      duration: 0,
      isTeamBattle: true,
      teamScores,
      isCurrentPlayerWinner,
      gameType: GameType.GoldBars,
    };
  } else {
    // Solo battle logic (1v1)
    // Winner is player with higher currentScore
    // If scores are equal, first player in original array wins (no ties allowed)
    const sortedPlayers = [...players].sort((a, b) => {
      // Sort by score (descending)
      if (b.currentScore !== a.currentScore) {
        return b.currentScore - a.currentScore;
      }
      // If scores are equal, maintain original order (first player wins)
      const aIndex = players.findIndex((p) => p.id === a.id);
      const bIndex = players.findIndex((p) => p.id === b.id);
      return aIndex - bIndex;
    });
    const winner = sortedPlayers[0];

    // If scores are equal, first player wins (no ties)
    let finalWinner = winner;
    if (sortedPlayers.length > 1 && sortedPlayers[0].currentScore === sortedPlayers[1].currentScore) {
      console.log(
        `[calculateGoldBarsGameResult] ⚠️ Equal scores detected! First player wins: ${players[0].username} (${sortedPlayers[0].currentScore} vs ${sortedPlayers[1].currentScore})`
      );
      // Explicitly set winner to first player in original array (no ties allowed)
      finalWinner = players[0];
      console.log(
        `[calculateGoldBarsGameResult] Winner explicitly set to first player: ${finalWinner.username}`
      );
    }

    // Ensure winner is always defined
    if (!winner) {
      console.error(
        `[calculateGoldBarsGameResult] ERROR: No winner determined! Using first player as fallback.`
      );
      const fallbackWinner = players[0] || { username: "Unknown", pubkey: "" };
      return {
        winner: fallbackWinner.username,
        scores: {},
        winAmount: 0,
        duration: 0,
        isTeamBattle: false,
        isCurrentPlayerWinner: false,
        gameType: GameType.GoldBars,
      };
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
      // Check if current player is the winner
      const currentPlayerData = players.find(
        (p) => p.username === currentPlayer || p.pubkey === currentPlayerPubkey
      );
      isCurrentPlayerWinner = currentPlayerData?.username === finalWinner.username;
    }

    // Calculate win amount
    const totalPot = stakeSol * 2;
    const winAmount = isCurrentPlayerWinner ? totalPot : 0;

    // Create scores record (currentScore = number of gold bars opened)
    const scores: Record<string, number> = {};
    players.forEach((player) => {
      scores[player.username] = player.currentScore;
    });

    console.log(`[calculateGoldBarsGameResult] Solo result:`, {
      winner: finalWinner.username,
      scores,
      winAmount,
      isCurrentPlayerWinner,
    });

    return {
      winner: finalWinner.username,
      scores,
      winAmount,
      duration: 0,
      isTeamBattle: false,
      isCurrentPlayerWinner,
      gameType: GameType.GoldBars,
    };
  }
}

