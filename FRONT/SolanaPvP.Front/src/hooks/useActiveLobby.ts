import { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { usePvpProgram } from "./usePvpProgram";
import { PdaUtils, ActiveLobbyAccount } from "@/services/solana/accounts";
import { parseAnchorError } from "@/services/solana/program";

/**
 * Hook to check if the current user has an active lobby
 * This prevents creating multiple lobbies at once
 */
export function useActiveLobby() {
  const { program, publicKey, isInitialized } = usePvpProgram();
  const [activeLobby, setActiveLobby] = useState<ActiveLobbyAccount | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchActiveLobby = useCallback(async () => {
    if (!program || !publicKey || !isInitialized) {
      setActiveLobby(null);
      return;
    }
    if (hasFetched) return; // IMPORTANT: Fetch only once!

    try {
      setIsLoading(true);
      setError(null);

      // Get ActiveLobby PDA for current user
      const [activePda] = PdaUtils.getActiveLobbyPda(publicKey);

      // Fetch the account (null if doesn't exist)
      const activeData = await program.account.activeLobby.fetchNullable(
        activePda
      );

      setActiveLobby(activeData as ActiveLobbyAccount | null);
      setHasFetched(true);

      if (activeData) {
        console.log(
          "[useActiveLobby] User has active lobby:",
          activeData.lobby.toString()
        );
      }
    } catch (err) {
      const errorMsg = parseAnchorError(err);
      setError(errorMsg);
      console.error("[useActiveLobby] Failed to fetch active lobby:", err);
      setActiveLobby(null);
      setHasFetched(true);
    } finally {
      setIsLoading(false);
    }
  }, [program, publicKey, isInitialized, hasFetched]);

  // Fetch on mount and when wallet/program changes
  useEffect(() => {
    fetchActiveLobby();
  }, [publicKey?.toString(), isInitialized]); // FIXED: stable dependencies

  const manualRefetch = useCallback(async () => {
    setHasFetched(false);
    await fetchActiveLobby();
  }, [fetchActiveLobby]);

  return {
    activeLobby,
    hasActiveLobby: !!activeLobby,
    isLoading,
    error,
    refetch: manualRefetch,
  };
}
