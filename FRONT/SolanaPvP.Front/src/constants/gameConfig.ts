// Game configuration constants
export const GAME_MODES = {
  "1x3": {
    name: "Pick 1 from 3",
    description: "Choose 1 card from 3 available options",
    maxSelections: 1,
    gridSize: { rows: 1, cols: 3 },
    timeLimit: 15, // seconds
    icon: "🎯",
  },
  "3x9": {
    name: "Pick 3 from 9",
    description: "Choose 3 cards from 9 available options",
    maxSelections: 3,
    gridSize: { rows: 3, cols: 3 },
    timeLimit: 30, // seconds
    icon: "🎴",
  },
  "5x16": {
    name: "Pick 5 from 16",
    description: "Choose 5 chests from 16 available options",
    maxSelections: 5,
    gridSize: { rows: 4, cols: 4 },
    timeLimit: 45, // seconds
    icon: "🏆",
  },
} as const;

export const TEAM_SIZES = {
  OneVOne: {
    name: "1v1",
    description: "Solo match",
    maxParticipants: 2,
    icon: "⚔️",
  },
  TwoVTwo: {
    name: "2v2",
    description: "Duo match",
    maxParticipants: 4,
    icon: "👥",
  },
  FiveVFive: {
    name: "5v5",
    description: "Team match",
    maxParticipants: 10,
    icon: "🏟️",
  },
  OneVTen: {
    name: "1v10",
    description: "DeathMatch",
    maxParticipants: 11,
    icon: "💀",
  },
} as const;

export const STAKE_OPTIONS = [
  { value: 100000000, label: "0.1 SOL", lamports: 100000000 },
  { value: 500000000, label: "0.5 SOL", lamports: 500000000 },
  { value: 1000000000, label: "1 SOL", lamports: 1000000000 },
  { value: 5000000000, label: "5 SOL", lamports: 5000000000 },
  { value: 10000000000, label: "10 SOL", lamports: 10000000000 },
] as const;

export const INVITATION_EXPIRATION_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
] as const;
