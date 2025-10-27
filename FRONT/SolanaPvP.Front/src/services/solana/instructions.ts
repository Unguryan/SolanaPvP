import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import { getSolanaConfig } from "./config";
import { PdaUtils, LobbyAccount, GlobalConfigAccount } from "./accounts";
import { getProgram, getProvider, parseAnchorError } from "./program";

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

// Instruction builders
export class PvpInstructions {
  private static getProgram() {
    const program = getProgram();
    if (!program) throw new Error("Program not initialized");
    return program;
  }

  private static getProvider() {
    const provider = getProvider();
    if (!provider) throw new Error("Provider not initialized");
    return provider;
  }

  // Initialize global config
  static async initConfig(admin: PublicKey): Promise<string> {
    try {
      const program = this.getProgram();
      const [configPda] = PdaUtils.getConfigPda();

      const tx = await program.methods
        .initConfig(admin)
        .accounts({
          config: configPda,
          payer: admin,
          systemProgram: SystemProgram.programId,
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
  static async createLobby(params: CreateLobbyParams): Promise<string> {
    try {
      const program = this.getProgram();
      const [lobbyPda] = PdaUtils.getLobbyPda(params.creator, params.lobbyId);
      const [activePda] = PdaUtils.getActiveLobbyPda(params.creator);

      const tx = await program.methods
        .createLobby(
          new BN(params.lobbyId),
          params.teamSize,
          new BN(params.stakeLamports),
          params.side
        )
        .accounts({
          lobby: lobbyPda,
          active: activePda,
          creator: params.creator,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    } catch (error) {
      throw new Error(`Failed to create lobby: ${parseAnchorError(error)}`);
    }
  }

  // Join lobby
  static async joinLobby(params: JoinLobbyParams): Promise<string> {
    try {
      const program = this.getProgram();
      const [activePda] = PdaUtils.getActiveLobbyPda(params.creator);
      const [configPda] = PdaUtils.getConfigPda();
      const config = getSolanaConfig();

      const accounts: any = {
        lobby: params.lobbyPda,
        creator: params.creator,
        player: params.player,
        active: activePda,
        config: configPda,
        systemProgram: SystemProgram.programId,
      };

      // Add Switchboard accounts if provided (for last join)
      if (params.vrfAccount) {
        accounts.switchboardProgram = new PublicKey(
          config.switchboardProgramId
        );
        accounts.vrf = params.vrfAccount;
        accounts.oracleQueue =
          params.oracleQueue || new PublicKey(config.switchboardOracleQueue);
        accounts.queueAuthority = params.queueAuthority;
        accounts.permissionAccount =
          params.permissionAccount ||
          new PublicKey(config.switchboardPermissionAccount);
        accounts.escrowWallet = params.escrowWallet;
        accounts.payerWallet = params.payerWallet;
        accounts.payerAuthority = params.payerAuthority;
        accounts.recentBlockhashes =
          params.recentBlockhashes || SystemProgram.programId; // Placeholder
        accounts.switchboardState = params.switchboardState;
        accounts.tokenProgram = params.tokenProgram || SystemProgram.programId; // Placeholder
        accounts.associatedTokenProgram =
          params.associatedTokenProgram || SystemProgram.programId; // Placeholder
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
  static async refundLobby(params: RefundLobbyParams): Promise<string> {
    try {
      const program = this.getProgram();
      const [activePda] = PdaUtils.getActiveLobbyPda(params.creator);
      const [configPda] = PdaUtils.getConfigPda();

      const remainingAccounts = params.participants.map((pubkey) => ({
        pubkey,
        isSigner: false,
        isWritable: true,
      }));

      const tx = await program.methods
        .refund()
        .accounts({
          lobby: params.lobbyPda,
          requester: params.requester,
          active: activePda,
          config: configPda,
          systemProgram: SystemProgram.programId,
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
    params: CreateLobbyParams
  ): Promise<Transaction> {
    const program = this.getProgram();
    const [lobbyPda] = PdaUtils.getLobbyPda(params.creator, params.lobbyId);
    const [activePda] = PdaUtils.getActiveLobbyPda(params.creator);

    const instruction = await program.methods
      .createLobby(
        new BN(params.lobbyId),
        params.teamSize,
        new BN(params.stakeLamports),
        params.side
      )
      .accounts({
        lobby: lobbyPda,
        active: activePda,
        creator: params.creator,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const transaction = new Transaction().add(instruction);
    return transaction;
  }

  static async buildJoinLobbyTransaction(
    params: JoinLobbyParams
  ): Promise<Transaction> {
    const program = this.getProgram();
    const [activePda] = PdaUtils.getActiveLobbyPda(params.creator);
    const [configPda] = PdaUtils.getConfigPda();
    const config = getSolanaConfig();

    const accounts: any = {
      lobby: params.lobbyPda,
      creator: params.creator,
      player: params.player,
      active: activePda,
      config: configPda,
      systemProgram: SystemProgram.programId,
    };

    // Add Switchboard accounts if provided
    if (params.vrfAccount) {
      accounts.switchboardProgram = new PublicKey(config.switchboardProgramId);
      accounts.vrf = params.vrfAccount;
      accounts.oracleQueue =
        params.oracleQueue || new PublicKey(config.switchboardOracleQueue);
      accounts.queueAuthority = params.queueAuthority;
      accounts.permissionAccount =
        params.permissionAccount ||
        new PublicKey(config.switchboardPermissionAccount);
      accounts.escrowWallet = params.escrowWallet;
      accounts.payerWallet = params.payerWallet;
      accounts.payerAuthority = params.payerAuthority;
      accounts.recentBlockhashes =
        params.recentBlockhashes || SystemProgram.programId;
      accounts.switchboardState = params.switchboardState;
      accounts.tokenProgram = params.tokenProgram || SystemProgram.programId;
      accounts.associatedTokenProgram =
        params.associatedTokenProgram || SystemProgram.programId;
    }

    const instruction = await program.methods
      .joinSide(params.side)
      .accounts(accounts)
      .instruction();

    const transaction = new Transaction().add(instruction);
    return transaction;
  }

  static async buildRefundLobbyTransaction(
    params: RefundLobbyParams
  ): Promise<Transaction> {
    const program = this.getProgram();
    const [activePda] = PdaUtils.getActiveLobbyPda(params.creator);
    const [configPda] = PdaUtils.getConfigPda();

    const remainingAccounts = params.participants.map((pubkey) => ({
      pubkey,
      isSigner: false,
      isWritable: true,
    }));

    const instruction = await program.methods
      .refund()
      .accounts({
        lobby: params.lobbyPda,
        requester: params.requester,
        active: activePda,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    const transaction = new Transaction().add(instruction);
    return transaction;
  }
}

// Account fetchers
export class PvpAccountFetchers {
  private static getProgram() {
    const program = getProgram();
    if (!program) throw new Error("Program not initialized");
    return program;
  }

  // Fetch global config
  static async fetchGlobalConfig(): Promise<GlobalConfigAccount | null> {
    try {
      const program = this.getProgram();
      const [configPda] = PdaUtils.getConfigPda();

      const account =
        (await (program as any).account?.globalConfig?.fetchNullable?.(
          configPda
        )) || null;
      return account as GlobalConfigAccount | null;
    } catch (error) {
      console.error("Failed to fetch global config:", error);
      return null;
    }
  }

  // Fetch lobby
  static async fetchLobby(lobbyPda: PublicKey): Promise<LobbyAccount | null> {
    try {
      const program = this.getProgram();

      const account =
        (await (program as any).account?.lobby?.fetchNullable?.(lobbyPda)) ||
        null;
      return account as LobbyAccount | null;
    } catch (error) {
      console.error("Failed to fetch lobby:", error);
      return null;
    }
  }

  // Fetch active lobby
  static async fetchActiveLobby(creator: PublicKey): Promise<any | null> {
    try {
      const program = this.getProgram();
      const [activePda] = PdaUtils.getActiveLobbyPda(creator);

      const account =
        (await (program as any).account?.activeLobby?.fetchNullable?.(
          activePda
        )) || null;
      return account;
    } catch (error) {
      console.error("Failed to fetch active lobby:", error);
      return null;
    }
  }

  // Fetch multiple lobbies
  static async fetchLobbies(
    lobbyPdas: PublicKey[]
  ): Promise<(LobbyAccount | null)[]> {
    try {
      const program = this.getProgram();

      const accounts =
        (await (program as any).account?.lobby?.fetchMultiple?.(lobbyPdas)) ||
        [];
      return accounts as (LobbyAccount | null)[];
    } catch (error) {
      console.error("Failed to fetch lobbies:", error);
      return lobbyPdas.map(() => null);
    }
  }
}

// Event listeners
export class PvpEventListeners {
  private static getProgram() {
    const program = getProgram();
    if (!program) throw new Error("Program not initialized");
    return program;
  }

  // Listen for lobby created events
  static onLobbyCreated(callback: (event: any) => void): number {
    const program = this.getProgram();
    return program.addEventListener("LobbyCreated", callback);
  }

  // Listen for player joined events
  static onPlayerJoined(callback: (event: any) => void): number {
    const program = this.getProgram();
    return program.addEventListener("PlayerJoined", callback);
  }

  // Listen for lobby resolved events
  static onLobbyResolved(callback: (event: any) => void): number {
    const program = this.getProgram();
    return program.addEventListener("LobbyResolved", callback);
  }

  // Listen for lobby refunded events
  static onLobbyRefunded(callback: (event: any) => void): number {
    const program = this.getProgram();
    return program.addEventListener("LobbyRefunded", callback);
  }

  // Remove event listener
  static removeEventListener(listenerId: number): void {
    const program = this.getProgram();
    program.removeEventListener(listenerId);
  }
}
