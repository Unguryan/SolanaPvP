// Auth store for user authentication and wallet state
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserProfile } from "@/types/user";
import { apiClient } from "@/services/api/client";

interface AuthState {
  // Wallet state
  isWalletConnected: boolean;
  pubkey: string | null;
  walletName: string | null;

  // User data
  userProfile: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setWalletConnected: (
    connected: boolean,
    pubkey?: string,
    walletName?: string
  ) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadUserProfile: () => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isWalletConnected: false,
      pubkey: null,
      walletName: null,
      userProfile: null,
      isLoading: false,
      error: null,

      // Actions
      setWalletConnected: (connected, pubkey, walletName) => {
        set({
          isWalletConnected: connected,
          pubkey: pubkey || null,
          walletName: walletName || null,
        });

        // Update API client with pubkey
        if (connected && pubkey) {
          apiClient.setUserPubkey(pubkey);
          // Load user profile when wallet connects
          get().loadUserProfile();
        } else {
          apiClient.setUserPubkey(null);
          set({ userProfile: null });
        }
      },

      setUserProfile: (profile) => {
        set({ userProfile: profile });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      loadUserProfile: async () => {
        const { pubkey, setLoading, setError, setUserProfile } = get();

        if (!pubkey) {
          setUserProfile(null);
          return;
        }

        setLoading(true);
        setError(null);

        try {
          const profile = await apiClient.get<UserProfile>("/api/users/me");
          setUserProfile(profile);
        } catch (error: any) {
          console.error("Failed to load user profile:", error);
          setError(
            error.response?.data?.message || "Failed to load user profile"
          );
          setUserProfile(null);
        } finally {
          setLoading(false);
        }
      },

      clearAuth: () => {
        set({
          isWalletConnected: false,
          pubkey: null,
          walletName: null,
          userProfile: null,
          isLoading: false,
          error: null,
        });
        apiClient.setUserPubkey(null);
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        isWalletConnected: state.isWalletConnected,
        pubkey: state.pubkey,
        walletName: state.walletName,
      }),
    }
  )
);
