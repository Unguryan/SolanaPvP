// App configuration constants
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:5001",
  WS_URL: import.meta.env.VITE_WS_URL || "ws://localhost:5000",
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const WEBSOCKET = {
  RECONNECT_INTERVAL: 5000,
  MAX_RECONNECT_ATTEMPTS: 10,
  PING_INTERVAL: 30000,
} as const;

export const WALLET = {
  AUTO_CONNECT: true,
  CONFIRM_TRANSACTION_TIMEOUT: 60000,
} as const;
