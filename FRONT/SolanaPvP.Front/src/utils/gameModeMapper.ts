// Helper to map backend game mode strings to frontend game mode format
// Backend sends: "1x3", "3x9", "5x16"
// Frontend UniversalGameBoard expects: "PickOneFromThree", "PickThreeFromNine", "PickFiveFromSixteen"

export const mapGameModeToFrontend = (gameMode: string): "PickOneFromThree" | "PickThreeFromNine" | "PickFiveFromSixteen" => {
  console.log("[gameModeMapper] Input gameMode:", gameMode);
  
  const mapping: Record<string, "PickOneFromThree" | "PickThreeFromNine" | "PickFiveFromSixteen"> = {
    "1x3": "PickOneFromThree",
    "3x9": "PickThreeFromNine",
    "5x16": "PickFiveFromSixteen",
  };

  const result = mapping[gameMode] || "PickThreeFromNine"; // Default to 3x9
  console.log("[gameModeMapper] Mapped to:", result);
  return result;
};

export const mapTeamSizeToMatchType = (teamSize: string): "Solo" | "Duo" | "Team" => {
  const mapping: Record<string, "Solo" | "Duo" | "Team"> = {
    // Old enum format
    "OneVOne": "Solo",
    "TwoVTwo": "Duo",
    "FiveVFive": "Team",
    "OneVTen": "Team",
    "TwoVTwenty": "Team",
    "FourVForty": "Team",
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
    "OneVOne": 2,
    "TwoVTwo": 4,
    "FiveVFive": 10,
    "OneVTen": 11,
    "TwoVTwenty": 22,
    "FourVForty": 44,
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

export const formatGameDisplay = (gameType: string, gameMode: string, teamSize: string): string => {
  // Format: "Pick Higher • 3x9 • 1v1"
  const gameTypeDisplay = gameType === "PickHigher" ? "Pick Higher" : gameType;
  
  // TeamSize can be either "1v1" (new format) or "OneVOne" (old format)
  let teamSizeDisplay = teamSize;
  
  // If it's old enum format, convert to new format
  if (teamSize.includes("V") || teamSize.includes("One") || teamSize.includes("Two") || teamSize.includes("Five") || teamSize.includes("Four")) {
    teamSizeDisplay = teamSize.replace("VOne", "v1")
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
  
  return `${gameTypeDisplay} • ${gameMode} • ${teamSizeDisplay}`;
};

