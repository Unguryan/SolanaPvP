// Route paths constants
export const ROUTES = {
  HOME: "/",
  MATCHES: "/matches",
  GAME: "/game/:matchId",
  LEADERBOARD: "/leaderboard",
  PROFILE: "/profile",
  PROFILE_USER: "/profile/:identifier",
  WALLET: "/wallet",
  NOT_FOUND: "/404",
} as const;

export const API_ROUTES = {
  MATCHES: "/api/matches",
  USERS: "/api/users",
  INVITATIONS: "/api/invitations",
  LEADERBOARD: "/api/leaderboard",
  HEALTH: "/api/health",
} as const;
