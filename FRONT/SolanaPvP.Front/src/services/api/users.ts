// User API service
import { apiClient } from "./client";
import {
  UserProfile,
  ChangeUsernameRequest,
  UsernameAvailabilityResponse,
  RegisterUserRequest,
  UserStatistics,
  MatchSummary,
} from "@/types/user";
import { PagedResult } from "@/types/api";

export const usersApi = {
  // Register new user
  async registerUser(request: RegisterUserRequest): Promise<UserProfile> {
    return apiClient.post<UserProfile>("/api/users/register", request);
  },

  // Get current user profile
  async getCurrentUser(): Promise<UserProfile> {
    return apiClient.get<UserProfile>("/api/users/me");
  },

  // Get user profile by pubkey
  async getUser(pubkey: string): Promise<UserProfile> {
    return apiClient.get<UserProfile>(`/api/users/${pubkey}`);
  },

  // Get user profile by username
  async getUserByUsername(username: string): Promise<UserProfile> {
    return apiClient.get<UserProfile>(`/api/users/username/${username}`);
  },

  // Change username
  async changeUsername(
    request: ChangeUsernameRequest
  ): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(
      "/api/users/me/username",
      request
    );
  },

  // Check username availability
  async checkUsernameAvailability(
    username: string
  ): Promise<UsernameAvailabilityResponse> {
    return apiClient.get<UsernameAvailabilityResponse>(
      `/api/users/username/available?username=${username}`
    );
  },

  // Get user matches
  async getUserMatches(
    pubkey: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PagedResult<MatchSummary>> {
    return apiClient.get<PagedResult<MatchSummary>>(
      `/api/users/${pubkey}/matches?page=${page}&pageSize=${pageSize}`
    );
  },

  // Get user statistics
  async getUserStatistics(
    pubkey: string,
    period: string = "AllTime"
  ): Promise<UserStatistics> {
    return apiClient.get<UserStatistics>(
      `/api/users/${pubkey}/statistics?period=${period}`
    );
  },
};
