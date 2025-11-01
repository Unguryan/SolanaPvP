import { useState, useEffect, useCallback, useMemo } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { usePvpProgram as useTypedPvpProgram } from "@/utils/usePvpProgram";
import type { PvpProgram } from "@/idl/pvp_program";
import { requestAirdrop, parseAnchorError } from "../services/solana/program";
import {
  PvpInstructions,
  PvpAccountFetchers,
  PvpEventListeners,
  CreateLobbyParams,
  JoinLobbyParams,
  RefundLobbyParams,
} from "../services/solana/instructions";
import { LobbyAccount, GlobalConfigAccount } from "../services/solana/accounts";

// Hook for managing PvP program state with typed program
export function usePvpProgram() {
  const { publicKey, connected } = useWallet();
  const program = useTypedPvpProgram(); // Use the new typed hook
  const [isLoading, setIsLoading] = useState(false);

  // Get connection from program
  const connection = useMemo(() => {
    return program?.provider.connection || null;
  }, [program]);

  const isInitialized = useMemo(() => {
    return program !== null && connected;
  }, [program, connected]);

  const requestAirdropSOL = useCallback(
    async (amount: number = 2) => {
      if (!publicKey || !connection) {
        throw new Error("Wallet not connected");
      }

      try {
        setIsLoading(true);
        const signature = await requestAirdrop(connection, publicKey, amount);
        return signature;
      } catch (err) {
        const errorMessage = parseAnchorError(err);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [publicKey, connection]
  );

  return {
    program: program as Program<PvpProgram> | null,
    connection,
    isInitialized,
    isLoading,
    publicKey,
    connected,
    requestAirdropSOL,
  };
}

// Hook for lobby operations
export function useLobbyOperations() {
  const { program, isInitialized, publicKey, isLoading } = usePvpProgram();
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

        const tx = await PvpInstructions.createLobby(program, {
          ...params,
          creator: publicKey,
        });

        return tx;
      } catch (err) {
        const errorMessage = parseAnchorError(err);
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

        const tx = await PvpInstructions.joinLobby(program, {
          ...params,
          player: publicKey,
        });

        return tx;
      } catch (err) {
        const errorMessage = parseAnchorError(err);
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

        const tx = await PvpInstructions.refundLobby(program, {
          ...params,
          requester: publicKey,
        });

        return tx;
      } catch (err) {
        const errorMessage = parseAnchorError(err);
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
  };
}

// Hook for fetching lobby data
export function useLobbyData(lobbyPda?: PublicKey) {
  const { program, isInitialized } = usePvpProgram();
  const [lobby, setLobby] = useState<LobbyAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLobby = useCallback(async () => {
    if (!lobbyPda || !isInitialized || !program) return;

    try {
      setIsLoading(true);
      setError(null);

      const lobbyData = await PvpAccountFetchers.fetchLobby(program, lobbyPda);
      setLobby(lobbyData);
    } catch (err) {
      setError(parseAnchorError(err));
      console.error("Failed to fetch lobby:", err);
    } finally {
      setIsLoading(false);
    }
  }, [lobbyPda, isInitialized, program]);

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
  const { program, isInitialized } = usePvpProgram();
  const [lobbies, setLobbies] = useState<(LobbyAccount | null)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLobbies = useCallback(async () => {
    if (!lobbyPdas.length || !isInitialized || !program) return;

    try {
      setIsLoading(true);
      setError(null);

      const lobbiesData = await PvpAccountFetchers.fetchLobbies(
        program,
        lobbyPdas
      );
      setLobbies(lobbiesData);
    } catch (err) {
      setError(parseAnchorError(err));
      console.error("Failed to fetch lobbies:", err);
    } finally {
      setIsLoading(false);
    }
  }, [lobbyPdas, isInitialized, program]);

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
  const { program, isInitialized } = usePvpProgram();
  const [config, setConfig] = useState<GlobalConfigAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!isInitialized || !program) return;

    try {
      setIsLoading(true);
      setError(null);

      const configData = await PvpAccountFetchers.fetchGlobalConfig(program);
      setConfig(configData);
    } catch (err) {
      setError(parseAnchorError(err));
      console.error("Failed to fetch global config:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, program]);

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

// Hook for initializing global config
export function useInitConfig() {
  const { publicKey, connected } = useWallet();
  const { program, isInitialized } = usePvpProgram();
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const initConfig = useCallback(async () => {
    if (!publicKey || !connected || !isInitialized || !program) {
      setError("Wallet not connected or program not initialized");
      return;
    }

    try {
      setIsInitializing(true);
      setError(null);
      setTxSignature(null);

      const signature = await PvpInstructions.initConfig(program, publicKey);
      setTxSignature(signature);

      console.log("✅ Config initialized successfully!");
      console.log("Transaction signature:", signature);
      console.log("Admin pubkey:", publicKey.toString());
    } catch (err: any) {
      const errorMessage = parseAnchorError(err);
      setError(errorMessage);
      console.error("Failed to initialize config:", err);

      // Check if config already exists
      if (
        errorMessage.includes("already in use") ||
        errorMessage.includes("AccountInUse") ||
        errorMessage.includes("already initialized")
      ) {
        console.log("⚠️  Config already exists (this is OK)");
        setError(null);
      }
    } finally {
      setIsInitializing(false);
    }
  }, [publicKey, connected, isInitialized, program]);

  return {
    initConfig,
    isInitializing,
    error,
    txSignature,
  };
}

// Hook for event listeners
export function usePvpEvents() {
  const { program, isInitialized } = usePvpProgram();
  const [listeners, setListeners] = useState<number[]>([]);

  const addEventListener = useCallback(
    (eventName: string, callback: (event: any) => void) => {
      if (!isInitialized || !program) return;

      let listenerId: number;
      switch (eventName) {
        case "LobbyCreated":
          listenerId = PvpEventListeners.onLobbyCreated(program, callback);
          break;
        case "PlayerJoined":
          listenerId = PvpEventListeners.onPlayerJoined(program, callback);
          break;
        case "LobbyResolved":
          listenerId = PvpEventListeners.onLobbyResolved(program, callback);
          break;
        case "LobbyRefunded":
          listenerId = PvpEventListeners.onLobbyRefunded(program, callback);
          break;
        default:
          throw new Error(`Unknown event: ${eventName}`);
      }

      setListeners((prev) => [...prev, listenerId]);
      return listenerId;
    },
    [isInitialized, program]
  );

  const removeEventListener = useCallback(
    (listenerId: number) => {
      if (!program) return;
      PvpEventListeners.removeEventListener(program, listenerId);
      setListeners((prev) => prev.filter((id) => id !== listenerId));
    },
    [program]
  );

  const removeAllListeners = useCallback(() => {
    if (!program) return;
    listeners.forEach((id) =>
      PvpEventListeners.removeEventListener(program, id)
    );
    setListeners([]);
  }, [listeners, program]);

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
