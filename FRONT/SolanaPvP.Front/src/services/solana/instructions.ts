import { PublicKey, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import { Program } from "@coral-xyz/anchor";
import type { PvpProgram } from "@/idl/pvp_program";
import { getSolanaConfig } from "./config";
import { PdaUtils, LobbyAccount, GlobalConfigAccount } from "./accounts";
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
        .rpc();

      return tx;
    } catch (error) {
      throw new Error(
        `Failed to initialize config: ${parseAnchorError(error)}`
      );
    }
  }

  // Create lobby
  static async createLobby(
    program: Program<PvpProgram>,
    params: CreateLobbyParams
  ): Promise<string> {
    try {
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
        .rpc();

      return tx;
    } catch (error) {
      throw new Error(`Failed to create lobby: ${parseAnchorError(error)}`);
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
        .rpc();

      return tx;
    } catch (error) {
      throw new Error(`Failed to join lobby: ${parseAnchorError(error)}`);
    }
  }

  // Refund lobby
  static async refundLobby(
    program: Program<PvpProgram>,
    params: RefundLobbyParams
  ): Promise<string> {
    try {
      const remainingAccounts = params.participants.map((pubkey) => ({
        pubkey,
        isSigner: false,
        isWritable: true,
      }));

      const tx = await program.methods
        .refund()
        .accounts({
          creator: params.creator,
          requester: params.requester,
        })
        .remainingAccounts(remainingAccounts)
        .rpc();

      return tx;
    } catch (error) {
      throw new Error(`Failed to refund lobby: ${parseAnchorError(error)}`);
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
    const remainingAccounts = params.participants.map((pubkey) => ({
      pubkey,
      isSigner: false,
      isWritable: true,
    }));

    const instruction = await program.methods
      .refund()
      .accounts({
        creator: params.creator,
        requester: params.requester,
      })
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
      return account as LobbyAccount | null;
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
      return accounts as (LobbyAccount | null)[];
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
