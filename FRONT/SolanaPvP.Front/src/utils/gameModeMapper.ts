// Helper to map backend game mode strings to frontend game mode format
// Backend sends: "PickHigher1v3", "PickHigher3v9", "PickHigher5v16", "Plinko3Balls", "Plinko5Balls", "Plinko7Balls", "Miner1v9", "Miner3v16", "Miner5v25", "GoldBars1v9", "GoldBars3v16", "GoldBars5v25"
// Frontend UniversalGameBoard expects: "PickOneFromThree", "PickThreeFromNine", "PickFiveFromSixteen", "Plinko3Balls", "Miner1v9", "GoldBars1v9", etc.

export const mapGameModeToFrontend = (
  gameMode: string
):
  | "PickOneFromThree"
  | "PickThreeFromNine"
  | "PickFiveFromSixteen"
  | "Plinko3Balls"
  | "Plinko5Balls"
  | "Plinko7Balls"
  | "Miner1v9"
  | "Miner3v16"
  | "Miner5v25"
  | "GoldBars1v9"
  | "GoldBars3v16"
  | "GoldBars5v25" => {
  console.log("[gameModeMapper] Input gameMode:", gameMode);

  const mapping: Record<
    string,
    | "PickOneFromThree"
    | "PickThreeFromNine"
    | "PickFiveFromSixteen"
    | "Plinko3Balls"
    | "Plinko5Balls"
    | "Plinko7Balls"
    | "Miner1v9"
    | "Miner3v16"
    | "Miner5v25"
    | "GoldBars1v9"
    | "GoldBars3v16"
    | "GoldBars5v25"
  > = {
    // PickHigher modes (standard format from backend)
    PickHigher1v3: "PickOneFromThree",
    PickHigher3v9: "PickThreeFromNine",
    PickHigher5v16: "PickFiveFromSixteen",
    // Plinko modes (backend sends same as frontend)
    Plinko3Balls: "Plinko3Balls",
    Plinko5Balls: "Plinko5Balls",
    Plinko7Balls: "Plinko7Balls",
    // Miner modes (backend sends same as frontend)
    Miner1v9: "Miner1v9",
    Miner3v16: "Miner3v16",
    Miner5v25: "Miner5v25",
    // GoldBars modes (backend sends same as frontend)
    GoldBars1v9: "GoldBars1v9",
    GoldBars3v16: "GoldBars3v16",
    GoldBars5v25: "GoldBars5v25",
  };

  const result = mapping[gameMode] || "PickThreeFromNine"; // Default to 3x9
  console.log("[gameModeMapper] Mapped to:", result);
  return result;
};

export const mapTeamSizeToMatchType = (
  teamSize: string
): "Solo" | "Duo" | "Team" => {
  const mapping: Record<string, "Solo" | "Duo" | "Team"> = {
    // Old enum format
    OneVOne: "Solo",
    TwoVTwo: "Duo",
    FiveVFive: "Team",
    OneVTen: "Team",
    TwoVTwenty: "Team",
    FourVForty: "Team",
    // NEW string format from blockchain
    "1v1": "Solo",
    "2v2": "Duo",
    "5v5": "Team",
    "1v10": "Team",
    "2v20": "Team",
    "4v40": "Team",
  };

  return mapping[teamSize] || "Solo";
};

export const getPlayersMaxFromTeamSize = (teamSize: string): number => {
  const mapping: Record<string, number> = {
    // Old enum format
    OneVOne: 2,
    TwoVTwo: 4,
    FiveVFive: 10,
    OneVTen: 11,
    TwoVTwenty: 22,
    FourVForty: 44,
    // NEW string format from blockchain
    "1v1": 2,
    "2v2": 4,
    "5v5": 10,
    "1v10": 11,
    "2v20": 22,
    "4v40": 44,
  };

  return mapping[teamSize] || 2; // Default to 1v1
};

export const formatGameDisplay = (
  gameType: string,
  gameMode: string,
  teamSize: string
): string => {
  // Format: "Pick Higher • 3v9 • 1v1" or "Plinko • 5 balls • 1v1" or "Miner • 1v9 • 1v1" or "Gold Bars • 1v9 • 1v1"
  const gameTypeDisplay =
    gameType === "PickHigher"
      ? "Pick Higher"
      : gameType === "Plinko"
      ? "Plinko"
      : gameType === "Miner"
      ? "Miner"
      : gameType === "GoldBars"
      ? "Gold Bars"
      : gameType;

  // Format game mode nicely
  let gameModeDisplay = gameMode;
  if (gameMode === "PickHigher1v3") gameModeDisplay = "1v3";
  else if (gameMode === "PickHigher3v9") gameModeDisplay = "3v9";
  else if (gameMode === "PickHigher5v16") gameModeDisplay = "5v16";
  else if (gameMode === "Plinko3Balls") gameModeDisplay = "3 balls";
  else if (gameMode === "Plinko5Balls") gameModeDisplay = "5 balls";
  else if (gameMode === "Plinko7Balls") gameModeDisplay = "7 balls";
  else if (gameMode === "Miner1v9") gameModeDisplay = "1v9";
  else if (gameMode === "Miner3v16") gameModeDisplay = "3v16";
  else if (gameMode === "Miner5v25") gameModeDisplay = "5v25";
  else if (gameMode === "GoldBars1v9") gameModeDisplay = "1v9";
  else if (gameMode === "GoldBars3v16") gameModeDisplay = "3v16";
  else if (gameMode === "GoldBars5v25") gameModeDisplay = "5v25";

  // TeamSize can be either "1v1" (new format) or "OneVOne" (old format)
  let teamSizeDisplay = teamSize;

  // If it's old enum format, convert to new format
  if (
    teamSize.includes("V") ||
    teamSize.includes("One") ||
    teamSize.includes("Two") ||
    teamSize.includes("Five") ||
    teamSize.includes("Four")
  ) {
    teamSizeDisplay = teamSize
      .replace("VOne", "v1")
      .replace("VTwo", "v2")
      .replace("VFive", "v5")
      .replace("VTen", "v10")
      .replace("VTwenty", "v20")
      .replace("VForty", "v40")
      .replace("One", "1")
      .replace("Two", "2")
      .replace("Four", "4")
      .replace("Five", "5");
  }

  return `${gameTypeDisplay} • ${gameModeDisplay} • ${teamSizeDisplay}`;
};
