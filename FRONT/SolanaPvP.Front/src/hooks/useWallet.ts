import { useCallback, useEffect, useState, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { usersApi } from "@/services/api/users";
import { apiClient } from "@/services/api/client";
import { UserProfile } from "@/types/user";

const isMobileUA = () =>
  /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

export interface WalletUser {
  profile: UserProfile | null;
  isNewUser: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useWalletUser = () => {
  const {
    wallet,
    publicKey,
    connected,
    connecting,
    connect,
    disconnect,
    select,
    wallets,
  } = useWallet();

  const [user, setUser] = useState<WalletUser>({
    profile: null,
    isNewUser: false,
    isLoading: false,
    error: null,
  });

  const installedByName = useMemo(() => {
    const map = new Map<string, { ready: string }>();
    wallets.forEach((w) => map.set(w.adapter.name, { ready: w.readyState }));
    return map;
  }, [wallets]);

  // Handle wallet connection
  const handleConnect = useCallback(
    async (walletName: string) => {
      try {
        setUser((prev) => ({ ...prev, isLoading: true, error: null }));

        // 1) Select the wallet in the adapter
        select(walletName as any);

        // 2) Ensure the adapter is actually available before connecting
        //    (Phantom in-app: Installed; outside Phantom: Loadable -> deeplink)
        const selected = wallets.find((w) => w.adapter.name === walletName);
        const ready = selected?.readyState;

        if (ready !== "Installed" && ready !== "Loadable") {
          // Not detected yet — show a helpful error rather than hanging
          throw new Error(
            `${walletName} wallet is not available on this device/browser.`
          );
        }

        // 3) Single, authoritative connect() via the adapter
        await connect();

        if (!publicKey) {
          throw new Error("Wallet connected, but no public key returned.");
        }

        // Success — the effect that watches (connected, publicKey)
        // will call registerOrGetUser(pubkey)
      } catch (e: any) {
        let msg = "Failed to connect wallet";
        if (typeof e?.message === "string") {
          if (/User rejected/i.test(e.message)) {
            msg =
              "Connection was rejected. Please approve the request in Phantom.";
          } else if (/timeout/i.test(e.message)) {
            msg =
              "Connection timed out. Make sure Phantom is installed and try again.";
          } else if (/not available|not found|not installed/i.test(e.message)) {
            msg =
              "Phantom wallet not found here. On mobile, open your site inside Phantom or install the app.";
          } else {
            msg = e.message;
          }
        }
        setUser((prev) => ({ ...prev, isLoading: false, error: msg }));
      }
    },
    [wallets, select, connect, publicKey]
  );

  // Handle wallet disconnection
  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      setUser({
        profile: null,
        isNewUser: false,
        isLoading: false,
        error: null,
      });
      // Clear API client auth
      apiClient.setUserPubkey(null);
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  }, [disconnect]);

  // Register or get user when wallet connects
  const registerOrGetUser = useCallback(async (pubkey: string) => {
    try {
      setUser((prev) => ({ ...prev, isLoading: true, error: null }));

      // Set the pubkey in API client
      apiClient.setUserPubkey(pubkey);

      try {
        // Try to get existing user
        const profile = await usersApi.getCurrentUser();
        setUser({
          profile,
          isNewUser: false,
          isLoading: false,
          error: null,
        });
      } catch (error: unknown) {
        // If user doesn't exist (404), create new user
        if (
          error &&
          typeof error === "object" &&
          "response" in error &&
          error.response &&
          typeof error.response === "object" &&
          "status" in error.response &&
          error.response.status === 404
        ) {
          const newProfile = await usersApi.registerUser({ pubkey });
          setUser({
            profile: newProfile,
            isNewUser: true,
            isLoading: false,
            error: null,
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("Failed to register/get user:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to register user";
      setUser((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  // Effect to handle wallet connection changes
  useEffect(() => {
    if (connected && publicKey) {
      registerOrGetUser(publicKey.toString());
    } else if (!connected) {
      setUser({
        profile: null,
        isNewUser: false,
        isLoading: false,
        error: null,
      });
      apiClient.setUserPubkey(null);
    }
  }, [connected, publicKey, registerOrGetUser]);

  // Update username
  const updateUsername = useCallback(
    async (newUsername: string) => {
      if (!user.profile) return;

      try {
        setUser((prev) => ({ ...prev, isLoading: true, error: null }));

        await usersApi.changeUsername({ username: newUsername });

        // Update local profile
        setUser((prev) => ({
          ...prev,
          profile: prev.profile
            ? { ...prev.profile, username: newUsername }
            : null,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        console.error("Failed to update username:", error);
        setUser((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update username",
        }));
      }
    },
    [user.profile]
  );

  return {
    // Wallet state
    wallet,
    publicKey,
    connected,
    connecting,
    wallets,

    // User state
    user,

    // Actions
    connect: handleConnect,
    disconnect: handleDisconnect,
    updateUsername,
  };
};
