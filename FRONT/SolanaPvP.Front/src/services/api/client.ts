// Axios client configuration
import axios from "axios";
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { API_CONFIG } from "@/constants/config";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth headers
    this.client.interceptors.request.use(
      (config) => {
        // Get pubkey from localStorage or context
        const pubkey = this.getUserPubkey();
        if (pubkey) {
          config.headers["X-User-Pubkey"] = pubkey;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          // Clear auth data and redirect to login
          this.clearAuthData();
          window.location.href = "/";
          return Promise.reject(error);
        }

        // Handle network errors
        if (!error.response) {
          console.error("Network error:", error.message);
        }

        return Promise.reject(error);
      }
    );
  }

  private getUserPubkey(): string | null {
    // This will be replaced with actual auth store
    return localStorage.getItem("userPubkey");
  }

  private clearAuthData(): void {
    localStorage.removeItem("userPubkey");
    localStorage.removeItem("userData");
  }

  // Generic request methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // Method to update auth headers (called when user connects wallet)
  setUserPubkey(pubkey: string | null): void {
    if (pubkey) {
      localStorage.setItem("userPubkey", pubkey);
    } else {
      localStorage.removeItem("userPubkey");
    }
  }
}

export const apiClient = new ApiClient();
