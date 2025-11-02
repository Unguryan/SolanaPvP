// Randomness pool API service
import { apiClient } from "./client";

export const randomnessApi = {
  // Get available randomness account from pool
  async getAvailableAccount(): Promise<{ randomnessAccount: string }> {
    return apiClient.get<{ randomnessAccount: string }>('/api/randomness/available');
  },

  // Get pool statistics
  async getPoolStats(): Promise<any> {
    return apiClient.get('/api/randomness/pool/stats');
  }
};

