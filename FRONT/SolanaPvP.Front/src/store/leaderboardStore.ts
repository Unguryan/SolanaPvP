// Leaderboard store for leaderboard data and state
import { create } from "zustand";
import {
  LeaderboardResult,
  LeaderboardType,
  LeaderboardPeriod,
} from "@/types/leaderboard";
import { leaderboardApi } from "@/services/api/leaderboard";

interface LeaderboardState {
  // Data
  winRateLeaderboard: LeaderboardResult | null;
  earningsLeaderboard: LeaderboardResult | null;
  currentLeaderboard: LeaderboardResult | null;

  // Filters
  currentType: LeaderboardType;
  currentPeriod: LeaderboardPeriod;
  currentPage: number;
  pageSize: number;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentType: (type: LeaderboardType) => void;
  setCurrentPeriod: (period: LeaderboardPeriod) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // API calls
  loadLeaderboard: (
    type: LeaderboardType,
    period: LeaderboardPeriod,
    page?: number
  ) => Promise<void>;
  loadWinRateLeaderboard: (
    period: LeaderboardPeriod,
    page?: number
  ) => Promise<void>;
  loadEarningsLeaderboard: (
    period: LeaderboardPeriod,
    page?: number
  ) => Promise<void>;

  // Computed values
  getCurrentUserRank: () => number | null;
  getCurrentUserEntry: () => any | null;
}

export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  // Initial state
  winRateLeaderboard: null,
  earningsLeaderboard: null,
  currentLeaderboard: null,
  currentType: LeaderboardType.WinRate,
  currentPeriod: LeaderboardPeriod.AllTime,
  currentPage: 1,
  pageSize: 50,
  isLoading: false,
  error: null,

  // Actions
  setCurrentType: (type) => {
    set({
      currentType: type,
      currentPage: 1, // Reset to first page when type changes
    });
  },

  setCurrentPeriod: (period) => {
    set({
      currentPeriod: period,
      currentPage: 1, // Reset to first page when period changes
    });
  },

  setCurrentPage: (page) => {
    set({ currentPage: page });
  },

  setPageSize: (size) => {
    set({
      pageSize: size,
      currentPage: 1, // Reset to first page when page size changes
    });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  // API calls
  loadLeaderboard: async (type, period, page = 1) => {
    const { pageSize, setLoading, setError } = get();
    setLoading(true);
    setError(null);

    try {
      const result = await leaderboardApi.getLeaderboard(
        type,
        period,
        page,
        pageSize
      );

      set({
        currentLeaderboard: result,
        currentType: type,
        currentPeriod: period,
        currentPage: page,
      });

      // Cache the result based on type
      if (type === LeaderboardType.WinRate) {
        set({ winRateLeaderboard: result });
      } else {
        set({ earningsLeaderboard: result });
      }
    } catch (error: any) {
      console.error("Failed to load leaderboard:", error);
      setError(error.response?.data?.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  },

  loadWinRateLeaderboard: async (period, page = 1) => {
    const { pageSize, setLoading, setError } = get();
    setLoading(true);
    setError(null);

    try {
      const result = await leaderboardApi.getWinRateLeaderboard(
        period,
        page,
        pageSize
      );

      set({
        winRateLeaderboard: result,
        currentLeaderboard: result,
        currentType: LeaderboardType.WinRate,
        currentPeriod: period,
        currentPage: page,
      });
    } catch (error: any) {
      console.error("Failed to load win rate leaderboard:", error);
      setError(
        error.response?.data?.message || "Failed to load win rate leaderboard"
      );
    } finally {
      setLoading(false);
    }
  },

  loadEarningsLeaderboard: async (period, page = 1) => {
    const { pageSize, setLoading, setError } = get();
    setLoading(true);
    setError(null);

    try {
      const result = await leaderboardApi.getEarningsLeaderboard(
        period,
        page,
        pageSize
      );

      set({
        earningsLeaderboard: result,
        currentLeaderboard: result,
        currentType: LeaderboardType.Earnings,
        currentPeriod: period,
        currentPage: page,
      });
    } catch (error: any) {
      console.error("Failed to load earnings leaderboard:", error);
      setError(
        error.response?.data?.message || "Failed to load earnings leaderboard"
      );
    } finally {
      setLoading(false);
    }
  },

  // Computed values
  getCurrentUserRank: () => {
    const { currentLeaderboard } = get();
    if (!currentLeaderboard) return null;

    // This would need to be implemented based on how we identify the current user
    // For now, return null as we don't have the current user's pubkey in this store
    return null;
  },

  getCurrentUserEntry: () => {
    const { currentLeaderboard } = get();
    if (!currentLeaderboard) return null;

    // This would need to be implemented based on how we identify the current user
    // For now, return null as we don't have the current user's pubkey in this store
    return null;
  },
}));
