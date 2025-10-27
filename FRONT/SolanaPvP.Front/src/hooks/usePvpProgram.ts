import { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import {
  initializeProgram,
  getProgram,
  getConnection,
  isProgramInitialized,
  requestAirdrop,
  parseAnchorError,
} from "../services/solana/program";
import {
  PvpInstructions,
  PvpAccountFetchers,
  PvpEventListeners,
  CreateLobbyParams,
  JoinLobbyParams,
  RefundLobbyParams,
} from "../services/solana/instructions";
import { LobbyAccount, GlobalConfigAccount } from "../services/solana/accounts";

// Hook for managing PvP program state
export function usePvpProgram() {
  const { wallet, publicKey, connected } = useWallet();
  const [program, setProgram] = useState<anchor.Program | null>(null);
  const [connection, setConnection] = useState<anchor.web3.Connection | null>(
    null
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize program when wallet connects
  useEffect(() => {
    if (wallet && publicKey && connected) {
      initializeProgramWithWallet();
    } else {
      resetProgram();
    }
  }, [wallet, publicKey, connected]);

  const initializeProgramWithWallet = useCallback(async () => {
    if (!wallet || !publicKey) return;

    try {
      setIsLoading(true);
      setError(null);

      const anchorWallet = {
        publicKey,
        signTransaction: (wallet as any).signTransaction,
        signAllTransactions: (wallet as any).signAllTransactions,
      } as any;

      const programInstance = await initializeProgram(anchorWallet);
      const connectionInstance = getConnection();

      setProgram(programInstance);
      setConnection(connectionInstance);
      setIsInitialized(true);
    } catch (err) {
      setError(parseAnchorError(err));
      console.error("Failed to initialize program:", err);
    } finally {
      setIsLoading(false);
    }
  }, [wallet, publicKey]);

  const resetProgram = useCallback(() => {
    setProgram(null);
    setConnection(null);
    setIsInitialized(false);
    setError(null);
  }, []);

  const requestAirdropSOL = useCallback(
    async (amount: number = 2) => {
      if (!publicKey || !connection) {
        throw new Error("Wallet not connected");
      }

      try {
        setIsLoading(true);
        // setError(null);

        const signature = await requestAirdrop(publicKey, amount);
        return signature;
      } catch (err) {
        const errorMessage = parseAnchorError(err);
        // setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [publicKey, connection]
  );

  return {
    program,
    connection,
    isInitialized,
    isLoading,
    error,
    publicKey,
    connected,
    requestAirdropSOL,
    resetProgram,
  };
}

// Hook for lobby operations
export function useLobbyOperations() {
  const { program, isInitialized, publicKey, isLoading, error } =
    usePvpProgram();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

  const createLobby = useCallback(
    async (params: Omit<CreateLobbyParams, "creator">) => {
      if (!program || !publicKey || !isInitialized) {
        throw new Error("Program not initialized");
      }

      try {
        setIsCreating(true);
        // setError(null);

        const tx = await PvpInstructions.createLobby({
          ...params,
          creator: publicKey,
        });

        return tx;
      } catch (err) {
        const errorMessage = parseAnchorError(err);
        // setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsCreating(false);
      }
    },
    [program, publicKey, isInitialized]
  );

  const joinLobby = useCallback(
    async (params: Omit<JoinLobbyParams, "player">) => {
      if (!program || !publicKey || !isInitialized) {
        throw new Error("Program not initialized");
      }

      try {
        setIsJoining(true);
        // setError(null);

        const tx = await PvpInstructions.joinLobby({
          ...params,
          player: publicKey,
        });

        return tx;
      } catch (err) {
        const errorMessage = parseAnchorError(err);
        // setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsJoining(false);
      }
    },
    [program, publicKey, isInitialized]
  );

  const refundLobby = useCallback(
    async (params: Omit<RefundLobbyParams, "requester">) => {
      if (!program || !publicKey || !isInitialized) {
        throw new Error("Program not initialized");
      }

      try {
        setIsRefunding(true);
        // setError(null);

        const tx = await PvpInstructions.refundLobby({
          ...params,
          requester: publicKey,
        });

        return tx;
      } catch (err) {
        const errorMessage = parseAnchorError(err);
        // setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsRefunding(false);
      }
    },
    [program, publicKey, isInitialized]
  );

  return {
    createLobby,
    joinLobby,
    refundLobby,
    isCreating,
    isJoining,
    isRefunding,
    isLoading: isLoading || isCreating || isJoining || isRefunding,
    error,
  };
}

// Hook for fetching lobby data
export function useLobbyData(lobbyPda?: PublicKey) {
  const { isInitialized } = usePvpProgram();
  const [lobby, setLobby] = useState<LobbyAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLobby = useCallback(async () => {
    if (!lobbyPda || !isInitialized) return;

    try {
      setIsLoading(true);
      setError(null);

      const lobbyData = await PvpAccountFetchers.fetchLobby(lobbyPda);
      setLobby(lobbyData);
    } catch (err) {
      setError(parseAnchorError(err));
      console.error("Failed to fetch lobby:", err);
    } finally {
      setIsLoading(false);
    }
  }, [lobbyPda, isInitialized]);

  useEffect(() => {
    fetchLobby();
  }, [fetchLobby]);

  return {
    lobby,
    isLoading,
    error,
    refetch: fetchLobby,
  };
}

// Hook for fetching multiple lobbies
export function useLobbiesData(lobbyPdas: PublicKey[]) {
  const { isInitialized } = usePvpProgram();
  const [lobbies, setLobbies] = useState<(LobbyAccount | null)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLobbies = useCallback(async () => {
    if (!lobbyPdas.length || !isInitialized) return;

    try {
      setIsLoading(true);
      setError(null);

      const lobbiesData = await PvpAccountFetchers.fetchLobbies(lobbyPdas);
      setLobbies(lobbiesData);
    } catch (err) {
      setError(parseAnchorError(err));
      console.error("Failed to fetch lobbies:", err);
    } finally {
      setIsLoading(false);
    }
  }, [lobbyPdas, isInitialized]);

  useEffect(() => {
    fetchLobbies();
  }, [fetchLobbies]);

  return {
    lobbies,
    isLoading,
    error,
    refetch: fetchLobbies,
  };
}

// Hook for global config
export function useGlobalConfig() {
  const { isInitialized } = usePvpProgram();
  const [config, setConfig] = useState<GlobalConfigAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!isInitialized) return;

    try {
      setIsLoading(true);
      setError(null);

      const configData = await PvpAccountFetchers.fetchGlobalConfig();
      setConfig(configData);
    } catch (err) {
      setError(parseAnchorError(err));
      console.error("Failed to fetch global config:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    isLoading,
    error,
    refetch: fetchConfig,
  };
}

// Hook for event listeners
export function usePvpEvents() {
  const { isInitialized } = usePvpProgram();
  const [listeners, setListeners] = useState<number[]>([]);

  const addEventListener = useCallback(
    (eventName: string, callback: (event: any) => void) => {
      if (!isInitialized) return;

      let listenerId: number;
      switch (eventName) {
        case "LobbyCreated":
          listenerId = PvpEventListeners.onLobbyCreated(callback);
          break;
        case "PlayerJoined":
          listenerId = PvpEventListeners.onPlayerJoined(callback);
          break;
        case "LobbyResolved":
          listenerId = PvpEventListeners.onLobbyResolved(callback);
          break;
        case "LobbyRefunded":
          listenerId = PvpEventListeners.onLobbyRefunded(callback);
          break;
        default:
          throw new Error(`Unknown event: ${eventName}`);
      }

      setListeners((prev) => [...prev, listenerId]);
      return listenerId;
    },
    [isInitialized]
  );

  const removeEventListener = useCallback((listenerId: number) => {
    PvpEventListeners.removeEventListener(listenerId);
    setListeners((prev) => prev.filter((id) => id !== listenerId));
  }, []);

  const removeAllListeners = useCallback(() => {
    listeners.forEach((id) => PvpEventListeners.removeEventListener(id));
    setListeners([]);
  }, [listeners]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      removeAllListeners();
    };
  }, [removeAllListeners]);

  return {
    addEventListener,
    removeEventListener,
    removeAllListeners,
    listeners,
  };
}

// Hook for wallet balance
export function useWalletBalance() {
  const { publicKey, connection } = usePvpProgram();
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connection) return;

    try {
      setIsLoading(true);
      setError(null);

      const balanceLamports = await connection.getBalance(publicKey);
      setBalance(balanceLamports / anchor.web3.LAMPORTS_PER_SOL);
    } catch (err) {
      setError(parseAnchorError(err));
      console.error("Failed to fetch balance:", err);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}
