import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { Program } from "@coral-xyz/anchor";
import type { PvpProgram } from "@/idl/pvp_program";
import { getSolanaConfig } from "./config";
import {
  PdaUtils,
  LobbyAccount,
  GlobalConfigAccount,
  normalizeLobbyStatus,
} from "./accounts";
import { parseAnchorError } from "./program";

// Instruction parameters
export interface CreateLobbyParams {
  lobbyId: number;
  teamSize: 1 | 2 | 5;
  stakeLamports: number;
  side: 0 | 1;
  creator: PublicKey;
}

export interface JoinLobbyParams {
  lobbyPda: PublicKey;
  creator: PublicKey;
  player: PublicKey;
  side: 0 | 1;
  // Switchboard VRF accounts (required for last join)
  vrfAccount?: PublicKey;
  oracleQueue?: PublicKey;
  queueAuthority?: PublicKey;
  permissionAccount?: PublicKey;
  escrowWallet?: PublicKey;
  payerWallet?: PublicKey;
  payerAuthority?: PublicKey;
  recentBlockhashes?: PublicKey;
  switchboardState?: PublicKey;
  tokenProgram?: PublicKey;
  associatedTokenProgram?: PublicKey;
}

export interface RefundLobbyParams {
  lobbyPda: PublicKey;
  creator: PublicKey;
  requester: PublicKey;
  participants: PublicKey[];
  lobbyAccount?: LobbyAccount; // Optional: lobby data for PDA resolution
}

// Type-safe instruction builders
export class PvpInstructions {
  // Initialize global config
  static async initConfig(
    program: Program<PvpProgram>,
    admin: PublicKey
  ): Promise<string> {
    try {
      const tx = await program.methods
        .initConfig(admin)
        .accounts({
          payer: admin,
        })
        .rpc({
          skipPreflight: false,
          commitment: "confirmed",
        });

      return tx;
    } catch (error: any) {
      console.error("Init config error details:", error);

      const errorMsg = parseAnchorError(error);
      if (error.message?.includes("Blockhash not found")) {
        throw new Error(
          `Transaction failed: Network issue (blockhash expired). Please try again.`
        );
      }

      throw new Error(`Failed to initialize config: ${errorMsg}`);
    }
  }

  // Create lobby
  static async createLobby(
    program: Program<PvpProgram>,
    params: CreateLobbyParams
  ): Promise<string> {
    try {
      // Add explicit RPC options for better reliability
      const tx = await program.methods
        .createLobby(
          new BN(params.lobbyId),
          params.teamSize,
          new BN(params.stakeLamports),
          params.side
        )
        .accounts({
          creator: params.creator,
        })
        .rpc({
          skipPreflight: false,
          commitment: "confirmed",
        });

      return tx;
    } catch (error: any) {
      console.error("Create lobby error details:", error);

      // More detailed error message
      const errorMsg = parseAnchorError(error);
      if (error.message?.includes("Blockhash not found")) {
        throw new Error(
          `Transaction failed: Network issue (blockhash expired). Please try again.`
        );
      }

      throw new Error(`Failed to create lobby: ${errorMsg}`);
    }
  }

  // Join lobby
  static async joinLobby(
    program: Program<PvpProgram>,
    params: JoinLobbyParams
  ): Promise<string> {
    try {
      const config = getSolanaConfig();

      // Build accounts object - Anchor will derive PDAs automatically
      const accounts: any = {
        creator: params.creator,
        player: params.player,
      };

      // Add Switchboard accounts if provided (for last join triggering VRF)
      if (params.vrfAccount) {
        accounts.vrf = params.vrfAccount;
        accounts.oracleQueue =
          params.oracleQueue || new PublicKey(config.switchboardOracleQueue);
        accounts.queueAuthority = params.queueAuthority;
        accounts.permissionAccount =
          params.permissionAccount ||
          new PublicKey(config.switchboardPermissionAccount);
        accounts.escrowWallet = params.escrowWallet;
        accounts.payerWallet = params.payerWallet;
        accounts.payerAuthority = params.payerAuthority || params.player;
        accounts.recentBlockhashes =
          params.recentBlockhashes ||
          new PublicKey("SysvarRecentB1ockHashes11111111111111111111");
        accounts.switchboardState = params.switchboardState;
        accounts.tokenProgram =
          params.tokenProgram ||
          new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
        accounts.associatedTokenProgram =
          params.associatedTokenProgram ||
          new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
      }

      const tx = await program.methods
        .joinSide(params.side)
        .accounts(accounts)
        .rpc({
          skipPreflight: false,
          commitment: "confirmed",
        });

      return tx;
    } catch (error: any) {
      console.error("Join lobby error details:", error);

      const errorMsg = parseAnchorError(error);
      if (error.message?.includes("Blockhash not found")) {
        throw new Error(
          `Transaction failed: Network issue (blockhash expired). Please try again.`
        );
      }

      throw new Error(`Failed to join lobby: ${errorMsg}`);
    }
  }

  // Refund lobby
  static async refundLobby(
    program: Program<PvpProgram>,
    params: RefundLobbyParams
  ): Promise<string> {
    try {
      // Derive PDAs
      const [configPda] = PdaUtils.getConfigPda();
      const [activePda] = PdaUtils.getActiveLobbyPda(params.creator);

      const remainingAccounts = params.participants.map((pubkey) => ({
        pubkey,
        isSigner: false,
        isWritable: true,
      }));

      // Refund seeds use lobby.creator and lobby.lobby_id - circular dependency
      // Solution: use accountsStrict with all accounts including systemProgram
      const tx = await program.methods
        .refund()
        .accountsStrict({
          lobby: params.lobbyPda,
          creator: params.creator,
          requester: params.requester,
          active: activePda,
          config: configPda,
          systemProgram: SystemProgram.programId,
        } as any) // Bypass TypeScript for circular PDA seeds
        .remainingAccounts(remainingAccounts)
        .rpc({
          skipPreflight: false,
          commitment: "confirmed",
        });

      return tx;
    } catch (error: any) {
      console.error("Refund lobby error details:", error);

      const errorMsg = parseAnchorError(error);
      if (error.message?.includes("Blockhash not found")) {
        throw new Error(
          `Transaction failed: Network issue (blockhash expired). Please try again.`
        );
      }

      throw new Error(`Failed to refund lobby: ${errorMsg}`);
    }
  }

  // Build transaction without sending
  static async buildCreateLobbyTransaction(
    program: Program<PvpProgram>,
    params: CreateLobbyParams
  ): Promise<Transaction> {
    const instruction = await program.methods
      .createLobby(
        new BN(params.lobbyId),
        params.teamSize,
        new BN(params.stakeLamports),
        params.side
      )
      .accounts({
        creator: params.creator,
      })
      .instruction();

    const transaction = new Transaction().add(instruction);
    return transaction;
  }

  static async buildJoinLobbyTransaction(
    program: Program<PvpProgram>,
    params: JoinLobbyParams
  ): Promise<Transaction> {
    const config = getSolanaConfig();

    const accounts: any = {
      creator: params.creator,
      player: params.player,
    };

    // Add Switchboard accounts if provided (for last join triggering VRF)
    if (params.vrfAccount) {
      accounts.vrf = params.vrfAccount;
      accounts.oracleQueue =
        params.oracleQueue || new PublicKey(config.switchboardOracleQueue);
      accounts.queueAuthority = params.queueAuthority;
      accounts.permissionAccount =
        params.permissionAccount ||
        new PublicKey(config.switchboardPermissionAccount);
      accounts.escrowWallet = params.escrowWallet;
      accounts.payerWallet = params.payerWallet;
      accounts.payerAuthority = params.payerAuthority || params.player;
      accounts.recentBlockhashes =
        params.recentBlockhashes ||
        new PublicKey("SysvarRecentB1ockHashes11111111111111111111");
      accounts.switchboardState = params.switchboardState;
      accounts.tokenProgram =
        params.tokenProgram ||
        new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
      accounts.associatedTokenProgram =
        params.associatedTokenProgram ||
        new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
    }

    const instruction = await program.methods
      .joinSide(params.side)
      .accounts(accounts)
      .instruction();

    const transaction = new Transaction().add(instruction);
    return transaction;
  }

  static async buildRefundLobbyTransaction(
    program: Program<PvpProgram>,
    params: RefundLobbyParams
  ): Promise<Transaction> {
    // Derive PDAs
    const [configPda] = PdaUtils.getConfigPda();
    const [activePda] = PdaUtils.getActiveLobbyPda(params.creator);

    const remainingAccounts = params.participants.map((pubkey) => ({
      pubkey,
      isSigner: false,
      isWritable: true,
    }));

    const instruction = await program.methods
      .refund()
      .accounts({
        lobby: params.lobbyPda,
        creator: params.creator,
        requester: params.requester,
        active: activePda,
        config: configPda,
      } as any)
      .remainingAccounts(remainingAccounts)
      .instruction();

    const transaction = new Transaction().add(instruction);
    return transaction;
  }
}

// Type-safe account fetchers
export class PvpAccountFetchers {
  // Fetch global config
  static async fetchGlobalConfig(
    program: Program<PvpProgram>
  ): Promise<GlobalConfigAccount | null> {
    try {
      const [configPda] = PdaUtils.getConfigPda();

      // Type-safe account fetch - no more 'as any'!
      const account = await program.account.globalConfig.fetchNullable(
        configPda
      );
      return account as GlobalConfigAccount | null;
    } catch (error) {
      console.error("Failed to fetch global config:", error);
      return null;
    }
  }

  // Fetch lobby
  static async fetchLobby(
    program: Program<PvpProgram>,
    lobbyPda: PublicKey
  ): Promise<LobbyAccount | null> {
    try {
      // Type-safe account fetch - program.account.lobby is fully typed!
      const account = await program.account.lobby.fetchNullable(lobbyPda);

      if (!account) return null;

      // Normalize status from Anchor enum format {open: {}} to string "open"
      const normalized = {
        ...account,
        status: normalizeLobbyStatus(account.status),
      } as LobbyAccount;

      return normalized;
    } catch (error) {
      console.error("Failed to fetch lobby:", error);
      return null;
    }
  }

  // Fetch active lobby
  static async fetchActiveLobby(
    program: Program<PvpProgram>,
    creator: PublicKey
  ): Promise<any | null> {
    try {
      const [activePda] = PdaUtils.getActiveLobbyPda(creator);

      const account = await program.account.activeLobby.fetchNullable(
        activePda
      );
      return account;
    } catch (error) {
      console.error("Failed to fetch active lobby:", error);
      return null;
    }
  }

  // Fetch multiple lobbies
  static async fetchLobbies(
    program: Program<PvpProgram>,
    lobbyPdas: PublicKey[]
  ): Promise<(LobbyAccount | null)[]> {
    try {
      // Type-safe multiple fetch
      const accounts = await program.account.lobby.fetchMultiple(lobbyPdas);

      // Normalize status for each account
      return accounts.map((account) => {
        if (!account) return null;

        return {
          ...account,
          status: normalizeLobbyStatus(account.status),
        } as LobbyAccount;
      });
    } catch (error) {
      console.error("Failed to fetch lobbies:", error);
      return lobbyPdas.map(() => null);
    }
  }
}

// Event listeners
export class PvpEventListeners {
  // Note: Events are not defined in the current program IDL
  // These methods are placeholders for future event functionality

  // Listen for lobby created events
  static onLobbyCreated(
    program: Program<PvpProgram>,
    callback: (event: any) => void
  ): number {
    console.warn("Event listeners not yet implemented in program", callback);
    return 0;
  }

  // Listen for player joined events
  static onPlayerJoined(
    program: Program<PvpProgram>,
    callback: (event: any) => void
  ): number {
    console.warn("Event listeners not yet implemented in program", callback);
    return 0;
  }

  // Listen for lobby resolved events
  static onLobbyResolved(
    program: Program<PvpProgram>,
    callback: (event: any) => void
  ): number {
    console.warn("Event listeners not yet implemented in program", callback);
    return 0;
  }

  // Listen for lobby refunded events
  static onLobbyRefunded(
    program: Program<PvpProgram>,
    callback: (event: any) => void
  ): number {
    console.warn("Event listeners not yet implemented in program", callback);
    return 0;
  }

  // Remove event listener
  static removeEventListener(
    program: Program<PvpProgram>,
    listenerId: number
  ): void {
    try {
      program.removeEventListener(listenerId);
    } catch (error) {
      console.error("Failed to remove event listener:", error);
    }
  }
}
