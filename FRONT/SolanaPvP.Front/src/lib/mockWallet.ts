export type WalletTransaction = {
  id: string;
  type: "deposit" | "withdrawal" | "match_win" | "match_loss" | "refund";
  amount: number;
  timestamp: number;
  status: "completed" | "pending" | "failed";
  signature?: string;
  description: string;
};

export type WalletBalance = {
  sol: number;
  usd: number;
  lastUpdated: number;
};

export const mockWalletBalance: WalletBalance = {
  sol: 12.4567,
  usd: 245.32,
  lastUpdated: Date.now(),
};

export const mockTransactions: WalletTransaction[] = [
  {
    id: "tx_1",
    type: "match_win",
    amount: 8.5,
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    status: "completed",
    signature: "5KJp7K...",
    description: "Won Pick3from9 match",
  },
  {
    id: "tx_2",
    type: "match_loss",
    amount: -2.1,
    timestamp: Date.now() - 4 * 60 * 60 * 1000,
    status: "completed",
    signature: "3Hm9L...",
    description: "Lost Pick1from3 match",
  },
  {
    id: "tx_3",
    type: "deposit",
    amount: 10.0,
    timestamp: Date.now() - 6 * 60 * 60 * 1000,
    status: "completed",
    signature: "7Np2M...",
    description: "Deposit from external wallet",
  },
  {
    id: "tx_4",
    type: "match_win",
    amount: 4.2,
    timestamp: Date.now() - 8 * 60 * 60 * 1000,
    status: "completed",
    signature: "9Qr5P...",
    description: "Won Pick5from16 match",
  },
  {
    id: "tx_5",
    type: "refund",
    amount: 1.5,
    timestamp: Date.now() - 12 * 60 * 60 * 1000,
    status: "completed",
    signature: "2Bx8K...",
    description: "Match cancelled - refund",
  },
];

export const getTransactionIcon = (type: string) => {
  switch (type) {
    case "deposit":
      return "⬇️";
    case "withdrawal":
      return "⬆️";
    case "match_win":
      return "🏆";
    case "match_loss":
      return "💥";
    case "refund":
      return "↩️";
    default:
      return "💰";
  }
};

export const getTransactionColor = (type: string) => {
  switch (type) {
    case "deposit":
    case "match_win":
    case "refund":
      return "text-sol-mint";
    case "withdrawal":
    case "match_loss":
      return "text-red-400";
    default:
      return "text-txt-muted";
  }
};

export const formatTimeAgo = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }
};
