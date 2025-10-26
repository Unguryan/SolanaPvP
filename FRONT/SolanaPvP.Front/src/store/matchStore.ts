// Match store for matches data and state
import { create } from "zustand";
import { Match, MatchView, MatchFilter, PagedResult } from "@/types/match";
import { matchesApi } from "@/services/api/matches";

interface MatchState {
  // Data
  activeMatches: MatchView[];
  allMatches: PagedResult<MatchView> | null;
  currentMatch: Match | null;

  // Filters
  filters: MatchFilter;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  setActiveMatches: (matches: MatchView[]) => void;
  setAllMatches: (matches: PagedResult<MatchView>) => void;
  setCurrentMatch: (match: Match | null) => void;
  setFilters: (filters: Partial<MatchFilter>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // API calls
  loadActiveMatches: (page?: number, pageSize?: number) => Promise<void>;
  loadAllMatches: (filters?: MatchFilter) => Promise<void>;
  loadMatch: (matchPda: string) => Promise<void>;

  // Real-time updates
  updateMatch: (match: MatchView) => void;
  addMatch: (match: MatchView) => void;
  removeMatch: (matchId: number) => void;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  // Initial state
  activeMatches: [],
  allMatches: null,
  currentMatch: null,
  filters: {
    page: 1,
    pageSize: 20,
  },
  isLoading: false,
  error: null,

  // Actions
  setActiveMatches: (matches) => {
    set({ activeMatches: matches });
  },

  setAllMatches: (matches) => {
    set({ allMatches: matches });
  },

  setCurrentMatch: (match) => {
    set({ currentMatch: match });
  },

  setFilters: (newFilters) => {
    const currentFilters = get().filters;
    set({
      filters: { ...currentFilters, ...newFilters, page: 1 }, // Reset to first page when filters change
    });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  // API calls
  loadActiveMatches: async (page = 1, pageSize = 20) => {
    set({ isLoading: true, error: null });

    try {
      const result = await matchesApi.getActiveMatches(page, pageSize);
      set({ activeMatches: result.items });
    } catch (error: any) {
      console.error("Failed to load active matches:", error);
      set({
        error: error.response?.data?.message || "Failed to load active matches",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  loadAllMatches: async (filters) => {
    const currentFilters = filters || get().filters;
    set({ isLoading: true, error: null });

    try {
      const result = await matchesApi.getMatches(currentFilters);
      set({ allMatches: result });
    } catch (error: any) {
      console.error("Failed to load matches:", error);
      set({ error: error.response?.data?.message || "Failed to load matches" });
    } finally {
      set({ isLoading: false });
    }
  },

  loadMatch: async (matchPda) => {
    set({ isLoading: true, error: null });

    try {
      const match = await matchesApi.getMatch(matchPda);
      set({ currentMatch: match });
    } catch (error: any) {
      console.error("Failed to load match:", error);
      set({ error: error.response?.data?.message || "Failed to load match" });
    } finally {
      set({ isLoading: false });
    }
  },

  // Real-time updates
  updateMatch: (updatedMatch) => {
    const { activeMatches, allMatches } = get();

    // Update in active matches
    const updatedActiveMatches = activeMatches.map((match) =>
      match.id === updatedMatch.id ? updatedMatch : match
    );
    set({ activeMatches: updatedActiveMatches });

    // Update in all matches if exists
    if (allMatches) {
      const updatedAllMatches = {
        ...allMatches,
        items: allMatches.items.map((match: MatchView) =>
          match.id === updatedMatch.id ? updatedMatch : match
        ),
      };
      set({ allMatches: updatedAllMatches });
    }
  },

  addMatch: (newMatch) => {
    const { activeMatches } = get();

    // Only add to active matches if it's not already there
    if (!activeMatches.find((match) => match.id === newMatch.id)) {
      set({ activeMatches: [newMatch, ...activeMatches] });
    }
  },

  removeMatch: (matchId) => {
    const { activeMatches, allMatches } = get();

    // Remove from active matches
    const updatedActiveMatches = activeMatches.filter(
      (match) => match.id !== matchId
    );
    set({ activeMatches: updatedActiveMatches });

    // Remove from all matches if exists
    if (allMatches) {
      const updatedAllMatches = {
        ...allMatches,
        items: allMatches.items.filter(
          (match: MatchView) => match.id !== matchId
        ),
        totalCount: Math.max(0, allMatches.totalCount - 1),
      };
      set({ allMatches: updatedAllMatches });
    }
  },
}));
