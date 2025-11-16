// Miner game logic utilities
import { GameType } from "@/types/game";
import { MinerGameResult, MinerGamePlayer, MinerTile } from "@/types/miner";

/**
 * Determines the N-th click where player will find their result (prize or bomb)
 * @param tileCount Total number of tiles
 * @param totalPrizes Total number of prizes in the game
 * @param totalBombs Total number of bombs in the game
 * @returns Random number from 1 to (tileCount - totalPrizes - totalBombs)
 *
 * Formula:
 * - Miner1v9: 1 to (9 - 1 - 1) = 1 to 7
 * - Miner3v16: 1 to (16 - 3 - 3) = 1 to 10
 * - Miner5v25: 1 to (25 - 5 - 5) = 1 to 15
 */
export function determineResultClick(
  tileCount: number,
  totalPrizes: number,
  totalBombs: number
): number {
  const maxClick = tileCount - totalPrizes - totalBombs;
  const minClick = 1;
  const resultClick =
    Math.floor(Math.random() * (maxClick - minClick + 1)) + minClick;
  console.log(
    `[determineResultClick] Result click determined: ${resultClick} (range: 1 to ${maxClick}, out of ${tileCount} tiles, ${totalPrizes} prizes, ${totalBombs} bombs)`
  );
  return resultClick;
}

/**
 * Distributes prizes and bombs to closed tiles ONLY (not to already opened empty tiles)
 * @param tiles Current tiles array
 * @param clickedIndex Index of the tile that was just clicked (where player found result)
 * @param totalPrizes Total number of prizes needed
 * @param totalBombs Total number of bombs needed
 * @param currentPlayerFoundPrize Whether current player found prize (true) or bomb (false)
 * @returns Updated tiles array with prizes and bombs distributed ONLY to closed slots
 */
export function distributePrizesAndBombs(
  tiles: MinerTile[],
  clickedIndex: number,
  totalPrizes: number,
  totalBombs: number,
  currentPlayerFoundPrize: boolean
): MinerTile[] {
  // Get ONLY closed tile indices (excluding the one just clicked)
  // IMPORTANT: Do NOT include already opened empty tiles - they stay empty!
  const closedIndices = tiles
    .map((tile, idx) => ({ tile, idx }))
    .filter(({ tile, idx }) => !tile.revealed && idx !== clickedIndex)
    .map(({ idx }) => idx);

  // Determine remaining prizes and bombs
  const remainingPrizes = totalPrizes - (currentPlayerFoundPrize ? 1 : 0);
  const remainingBombs = totalBombs - (currentPlayerFoundPrize ? 0 : 1);

  console.log(
    `[distributePrizesAndBombs] Distributing: ${remainingPrizes} prizes, ${remainingBombs} bombs. ` +
      `Closed slots available: ${closedIndices.length}`
  );

  // Shuffle closed indices randomly
  const shuffledClosed = [...closedIndices].sort(() => Math.random() - 0.5);

  // Assign prizes and bombs to closed slots ONLY
  const prizeIndices = new Set<number>();
  const bombIndices = new Set<number>();

  // First, assign prizes to closed slots
  const prizesToAssign = Math.min(remainingPrizes, shuffledClosed.length);
  for (let i = 0; i < prizesToAssign; i++) {
    prizeIndices.add(shuffledClosed[i]);
  }

  // Then, assign bombs to remaining closed slots
  const slotsAfterPrizes = shuffledClosed.length - prizesToAssign;
  const bombsToAssign = Math.min(remainingBombs, slotsAfterPrizes);
  for (let i = prizesToAssign; i < prizesToAssign + bombsToAssign; i++) {
    bombIndices.add(shuffledClosed[i]);
  }

  // Log warning if we still can't fit everything
  if (remainingPrizes + remainingBombs > shuffledClosed.length) {
    console.warn(
      `[distributePrizesAndBombs] ⚠️ Not enough closed slots! Need ${
        remainingPrizes + remainingBombs
      } items but only ${shuffledClosed.length} closed slots available. ` +
        `Assigning ${prizesToAssign} prizes and ${bombsToAssign} bombs. ` +
        `Missing: ${
          remainingPrizes + remainingBombs - shuffledClosed.length
        } items.`
    );
  } else {
    console.log(
      `[distributePrizesAndBombs] ✅ All items distributed to closed slots: ${prizesToAssign} prizes, ${bombsToAssign} bombs. ` +
        `Remaining empty slots: ${
          shuffledClosed.length - prizesToAssign - bombsToAssign
        }`
    );
  }

  // Also add the current tile (the one player just clicked) to the appropriate set
  if (currentPlayerFoundPrize) {
    prizeIndices.add(clickedIndex);
  } else {
    bombIndices.add(clickedIndex);
  }

  console.log(
    `[distributePrizesAndBombs] Prize indices:`,
    Array.from(prizeIndices)
  );
  console.log(
    `[distributePrizesAndBombs] Bomb indices:`,
    Array.from(bombIndices)
  );

  // Update tiles: assign types and reveal ALL tiles
  return tiles.map((tile) => {
    // Current tile (the one player clicked) - already has correct type
    if (tile.index === clickedIndex) {
      return {
        ...tile,
        type: currentPlayerFoundPrize ? "prize" : "bomb",
        selected: true,
        revealed: true,
      };
    }

    // Tiles in prize/bomb sets - assign type and reveal
    if (prizeIndices.has(tile.index)) {
      return { ...tile, type: "prize", revealed: true };
    } else if (bombIndices.has(tile.index)) {
      return { ...tile, type: "bomb", revealed: true };
    }

    // Already revealed tiles that are not in prize/bomb sets - keep as is (stay empty)
    if (tile.revealed) {
      return tile;
    }

    // Closed tiles not in prize/bomb sets - reveal as empty
    return { ...tile, type: "empty", revealed: true };
  });
}

/**
 * Automatically opens tiles for a player when timer runs out
 * Opens tiles randomly, one every 500ms, until prize or bomb is found
 * @param tiles Current tiles array
 * @param resultClick The N-th click where player should find their result
 * @param currentClickCount Current number of clicks made by player
 * @param willWin Whether player will win (true = prize, false = bomb)
 * @param onTileOpen Callback function to call when opening each tile
 * @param onComplete Callback function to call when result is found
 */
export function autoOpenTiles(
  tiles: MinerTile[],
  resultClick: number,
  currentClickCount: number,
  willWin: boolean,
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
    `[autoOpenTiles] Starting auto-open: ${unopenedTiles.length} unopened tiles, result on click ${resultClick}, current click ${currentClickCount}`
  );

  // Track if result was found to stop opening more tiles
  let resultFound = false;

  // Open tiles one by one, every 500ms, until result is found
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

      // Check if this is the result click
      if (clickNumber === resultClick) {
        console.log(`[autoOpenTiles] 🎉 Result found on click ${clickNumber}!`);
        resultFound = true;

        // Clear all remaining timeouts (stop opening more tiles)
        for (let i = arrayIndex + 1; i < shuffled.length; i++) {
          if (timeouts[i]) {
            clearTimeout(timeouts[i]);
          }
        }

        onTileOpen(index, clickNumber);
        // Complete after opening result tile
        setTimeout(() => {
          onComplete();
        }, 100);
      } else {
        // Just open empty tile
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
 * Calculates Miner game result based on willWin values from backend
 * @param players Array of game players
 * @param stakeSol Stake amount in SOL
 * @param matchType Match type (Solo, Duo, Team)
 * @param currentPlayer Current player username
 * @param currentPlayerPubkey Current player pubkey
 * @param matchFromBackend Full match data from backend
 * @returns MinerGameResult with playerResults (true = Alive, false = Bombed)
 */
export function calculateMinerGameResult(
  players: MinerGamePlayer[],
  stakeSol: number,
  matchType?: "Solo" | "Duo" | "Team",
  currentPlayer?: string,
  currentPlayerPubkey?: string,
  matchFromBackend?: any
): MinerGameResult {
  const isTeamBattle = matchType === "Duo" || matchType === "Team";

  console.log(
    `[calculateMinerGameResult] Calculating result for ${matchType} match`
  );
  console.log(
    `[calculateMinerGameResult] Players:`,
    players.map((p) => ({ username: p.username, willWin: p.willWin }))
  );

  if (isTeamBattle) {
    // Team battle logic: winner = team with more players who willWin
    const teamSize = matchType === "Duo" ? 2 : 5;
    const teamA = players.slice(0, teamSize);
    const teamB = players.slice(teamSize, teamSize * 2);

    // Count players who willWin (from backend)
    const teamAPrizeCount = teamA.filter((p) => p.willWin === true).length;
    const teamBPrizeCount = teamB.filter((p) => p.willWin === true).length;

    // IMPORTANT: No ties allowed - if equal, Team A wins (first team wins)
    // Use >= to ensure Team A always wins on ties (no draw possible)
    const isTeamAWinner = teamAPrizeCount >= teamBPrizeCount;
    const winningTeamName = isTeamAWinner ? "Team A" : "Team B";

    // Ensure winner is always defined (should never be a draw with >=)
    // Note: With >=, Team A always wins on ties, so winner is always defined
    if (!winningTeamName) {
      console.error(
        `[calculateMinerGameResult] ERROR: No winner determined! This should not happen with >= comparison.`
      );
    }

    console.log(
      `[calculateMinerGameResult] Team A: ${teamAPrizeCount} Alive, Team B: ${teamBPrizeCount} Alive, Winner: ${winningTeamName}${
        teamAPrizeCount === teamBPrizeCount ? " (tie - Team A wins)" : ""
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

    console.log(`[calculateMinerGameResult] Team result:`, {
      winner: winningTeamName,
      playerResults,
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

    // Ensure winner is always defined (should never be null/undefined)
    if (!winner) {
      console.error(
        `[calculateMinerGameResult] ERROR: No winner determined! Using first player as fallback.`
      );
      winner = players[0] || { username: "Unknown", pubkey: "" };
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
    // IMPORTANT: Always use willWin directly from backend - if both have willWin=true, both are Alive
    // The winner is determined separately for payout purposes, but display shows actual willWin values
    const playerResults: Record<string, boolean> = {};

    players.forEach((player) => {
      // willWin should be boolean (true/false) from backend
      // If willWin is undefined or null, default to false (Bombed)
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

    console.log(`[calculateMinerGameResult] Solo result:`, {
      winner: winner.username,
      playerResults,
      scores,
      winAmount,
    });

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
