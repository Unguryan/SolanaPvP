// User API service
import { apiClient } from "./client";
import {
  UserProfile,
  ChangeUsernameRequest,
  UsernameAvailabilityResponse,
} from "@/types/user";

export const usersApi = {
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
};
