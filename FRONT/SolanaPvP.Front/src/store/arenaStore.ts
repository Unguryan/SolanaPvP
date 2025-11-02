import { create } from "zustand";

export type FeedItem = {
  id: string;
  username: string;
  solAmount: number;
  timestamp: number;
  gameMode: string;
};

export type MatchLobby = {
  id: string;
  matchPda?: string; // Optional PDA, if not provided, id will be used as matchPda
  stake: number;
  playersReady: number;
  playersMax: number;
  endsAt: number;
  gameMode: string;
  matchType?: "Solo" | "Duo" | "Team";
  status?: string; // "Waiting" | "AwaitingRandomness" | "Resolved" | "Refunded"
  resolvedAt?: number; // Timestamp when match was resolved
};

interface ArenaState {
  // Data
  feed: FeedItem[];
  matches: MatchLobby[];
  joinModalMatchId: string | null;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  setJoinModal: (id: string | null) => void;
  addFeedItem: (item: FeedItem) => void;
  setFeed: (items: FeedItem[]) => void;
  upsertMatches: (items: MatchLobby[]) => void;
  updateMatch: (item: MatchLobby) => void;
  removeMatch: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Feed management
  addFeedItemToTop: (item: FeedItem) => void;
  clearFeed: () => void;

  // Match management
  addMatch: (match: MatchLobby) => void;
  clearMatches: () => void;
}

export const useArenaStore = create<ArenaState>((set, get) => ({
  // Initial state
  feed: [],
  matches: [],
  joinModalMatchId: null,
  isLoading: false,
  error: null,

  // Actions
  setJoinModal: (id) => {
    set({ joinModalMatchId: id });
  },

  addFeedItem: (item) => {
    const { feed } = get();
    // Add to beginning and limit to 50 items
    const newFeed = [item, ...feed].slice(0, 50);
    set({ feed: newFeed });
  },

  setFeed: (items) => {
    set({ feed: items });
  },

  addFeedItemToTop: (item) => {
    const { feed } = get();
    // Check if item already exists to avoid duplicates
    const exists = feed.some((f) => f.id === item.id);
    if (!exists) {
      const newFeed = [item, ...feed].slice(0, 50);
      set({ feed: newFeed });
    }
  },

  clearFeed: () => {
    set({ feed: [] });
  },

  upsertMatches: (items) => {
    const { matches } = get();
    const existingIds = new Set(matches.map((m) => m.id));
    const newMatches = items.filter((item) => !existingIds.has(item.id));
    const updatedMatches = matches.map((existing) => {
      const updated = items.find((item) => item.id === existing.id);
      return updated || existing;
    });

    set({ matches: [...updatedMatches, ...newMatches] });
  },

  updateMatch: (item) => {
    const { matches } = get();
    const updatedMatches = matches.map((match) =>
      match.id === item.id ? item : match
    );
    set({ matches: updatedMatches });
  },

  addMatch: (match) => {
    const { matches } = get();
    const exists = matches.some((m) => m.id === match.id);
    if (!exists) {
      set({ matches: [match, ...matches] });
    }
  },

  removeMatch: (id) => {
    const { matches } = get();
    const filteredMatches = matches.filter((match) => match.id !== id);
    set({ matches: filteredMatches });
  },

  clearMatches: () => {
    set({ matches: [] });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },
}));
