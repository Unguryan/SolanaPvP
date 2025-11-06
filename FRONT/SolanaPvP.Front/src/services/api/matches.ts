// Match API service
import { apiClient } from "./client";
import { Match, MatchView, MatchFilter, PagedResult } from "@/types/match";

export const matchesApi = {
  // Get all matches with filtering
  async getMatches(filter: MatchFilter = {}): Promise<PagedResult<MatchView>> {
    const params = new URLSearchParams();

    if (filter.status) params.append("status", filter.status);
    if (filter.gameType) params.append("gameType", filter.gameType);
    if (filter.gameMode) params.append("gameMode", filter.gameMode);
    if (filter.matchMode) params.append("matchMode", filter.matchMode);
    if (filter.teamSize) params.append("teamSize", filter.teamSize);
    if (filter.isPrivate !== undefined)
      params.append("isPrivate", filter.isPrivate.toString());
    if (filter.page) params.append("page", filter.page.toString());
    if (filter.pageSize) params.append("pageSize", filter.pageSize.toString());

    return apiClient.get<PagedResult<MatchView>>(
      `/api/matches?${params.toString()}`
    );
  },

  // Get active matches (waiting/awaiting randomness, public only)
  async getActiveMatches(
    page: number = 1,
    pageSize: number = 20
  ): Promise<PagedResult<MatchView>> {
    return apiClient.get<PagedResult<MatchView>>(
      `/api/matches/active?page=${page}&pageSize=${pageSize}`
    );
  },

  // Get recent resolved matches for feed
  async getRecentMatches(count: number = 10): Promise<MatchView[]> {
    return apiClient.get<MatchView[]>(`/api/matches/recent?count=${count}`);
  },

  // Get match details by PDA
  async getMatch(matchPda: string): Promise<Match> {
    return apiClient.get<Match>(`/api/matches/${matchPda}`);
  },

  // Join a match (this would typically be handled by blockchain transaction)
  async joinMatch(
    matchPda: string
  ): Promise<{ success: boolean; message: string }> {
    // This is a placeholder - actual implementation would involve blockchain transaction
    return apiClient.post<{ success: boolean; message: string }>(
      `/api/matches/${matchPda}/join`
    );
  },
};
