// Leaderboard API service
import { apiClient } from "./client";
import {
  LeaderboardResult,
  LeaderboardType,
  LeaderboardPeriod,
} from "@/types/leaderboard";

export const leaderboardApi = {
  // Get leaderboard
  async getLeaderboard(
    type: LeaderboardType = LeaderboardType.WinRate,
    period: LeaderboardPeriod = LeaderboardPeriod.AllTime,
    page: number = 1,
    pageSize: number = 50
  ): Promise<LeaderboardResult> {
    const params = new URLSearchParams({
      type: type.toString(),
      period: period.toString(),
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    return apiClient.get<LeaderboardResult>(
      `/api/leaderboard?${params.toString()}`
    );
  },

  // Get win rate leaderboard
  async getWinRateLeaderboard(
    period: LeaderboardPeriod = LeaderboardPeriod.AllTime,
    page: number = 1,
    pageSize: number = 50
  ): Promise<LeaderboardResult> {
    const params = new URLSearchParams({
      period: period.toString(),
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    return apiClient.get<LeaderboardResult>(
      `/api/leaderboard/winrate?${params.toString()}`
    );
  },

  // Get earnings leaderboard
  async getEarningsLeaderboard(
    period: LeaderboardPeriod = LeaderboardPeriod.AllTime,
    page: number = 1,
    pageSize: number = 50
  ): Promise<LeaderboardResult> {
    const params = new URLSearchParams({
      period: period.toString(),
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    return apiClient.get<LeaderboardResult>(
      `/api/leaderboard/earnings?${params.toString()}`
    );
  },
};
