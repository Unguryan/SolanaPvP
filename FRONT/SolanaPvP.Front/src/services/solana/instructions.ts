import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { Program } from "@coral-xyz/anchor";
import type { PvpProgram } from "@/idl/pvp_program";
import {
  PdaUtils,
  LobbyAccount,
  normalizeLobbyStatus,
} from "./accounts";
import { parseAnchorError } from "./program";
import { getSolanaConfig } from "./config";

// Instruction parameters
export interface CreateLobbyParams {
  lobbyId: number;
  teamSize: 1 | 2 | 5;
  stakeLamports: number;
  side: 0 | 1;
  creator: PublicKey;
  // NEW: Game configuration
  game: string;           // "PickHigher", "Plinko", etc.
  gameMode: string;       // "PickHigher1v3", "PickHigher3v9", "PickHigher5v16", "Plinko3Balls", "Miner1v9", etc.
  arenaType: string;      // "SingleBattle", "DeathMatch"
  teamSizeStr: string;    // "1v1", "2v2", "5v5", etc.
}

export interface JoinLobbyParams {
  lobbyPda: PublicKey;
  creator: PublicKey;
  player: PublicKey;
  side: 0 | 1;
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
          params.side,
          params.game,
          params.gameMode,
          params.arenaType,
          params.teamSizeStr
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
      // Fetch current lobby state to determine if this is the final join
      const lobby = await PvpAccountFetchers.fetchLobby(
        program,
        params.lobbyPda
      );
      if (!lobby) {
        throw new Error("Lobby not found");
      }

      // Calculate current player count and required count
      const currentPlayers = lobby.team1.length + lobby.team2.length;
      const requiredPlayers = lobby.teamSize * 2;
      const willBeFinalJoin = currentPlayers + 1 === requiredPlayers;

      console.log(
        `[JoinLobby] Current: ${currentPlayers}/${requiredPlayers}, Final: ${willBeFinalJoin}`
      );

      // Derive required PDAs
      const [activePda] = PdaUtils.getActiveLobbyPda(params.creator);

      // If this is the final join, use joinSideFinal with Orao VRF
      if (willBeFinalJoin) {
        console.log(
          "[JoinLobby] Using joinSideFinal (with Orao VRF)"
        );

        // Generate random VRF seed (32 bytes)
        const vrfSeed = new Uint8Array(32);
        crypto.getRandomValues(vrfSeed);
        const vrfSeedArray = Array.from(vrfSeed);
        
        console.log("🎲 [JoinLobby] Generated VRF seed:", Buffer.from(vrfSeed).toString("hex"));

        // Get Orao VRF program ID from config
        const oraoProgramId = new PublicKey(getSolanaConfig().oraoProgramId);
        
        // Derive Orao VRF PDAs
        const VRF_CONFIG_SEED = Buffer.from("orao-vrf-network-configuration");
        const VRF_REQUEST_SEED = Buffer.from("orao-vrf-randomness-request");
        
        const [vrfConfigPda] = PublicKey.findProgramAddressSync(
          [VRF_CONFIG_SEED],
          oraoProgramId
        );
        
        const [vrfRequestPda] = PublicKey.findProgramAddressSync(
          [VRF_REQUEST_SEED, vrfSeed],
          oraoProgramId
        );
        
        // Fetch VRF config to get treasury
        const vrfConfigData = await program.provider.connection.getAccountInfo(vrfConfigPda);
        if (!vrfConfigData) {
          throw new Error("Orao VRF not initialized on this network");
        }
        
        // Parse treasury from config (offset 8 discriminator + 32 authority + 32 treasury)
        const vrfTreasury = new PublicKey(vrfConfigData.data.slice(40, 72));

        console.log("🔧 [JoinLobby] Building joinSideFinal transaction with Orao VRF accounts:");
        console.log("  - lobby:", params.lobbyPda.toString());
        console.log("  - creator:", params.creator.toString());
        console.log("  - player:", params.player.toString());
        console.log("  - vrfRequest:", vrfRequestPda.toString(), "← DERIVED FROM SEED");
        console.log("  - vrfConfig:", vrfConfigPda.toString());
        console.log("  - vrfTreasury:", vrfTreasury.toString());
        console.log("  - vrfProgram:", oraoProgramId.toString());

        // Use accountsPartial to explicitly provide accounts
        console.log("📤 [JoinLobby] Sending joinSideFinal transaction...");
        console.log("🔍 [DEBUG] Method exists?", typeof program.methods.joinSideFinal);
        console.log("🔍 [DEBUG] Available methods:", Object.keys(program.methods));
        const tx = await program.methods
          .joinSideFinal(params.side, vrfSeedArray)
          .accountsPartial({
            lobby: params.lobbyPda,
            creator: params.creator,
            player: params.player,
            active: activePda,
            vrfRequest: vrfRequestPda,
            vrfConfig: vrfConfigPda,
            vrfTreasury: vrfTreasury,
            vrfProgram: oraoProgramId,
            systemProgram: SystemProgram.programId,
          })
          .rpc({
            skipPreflight: false,
            commitment: "confirmed",
          });

        console.log(
          "✅ [JoinLobby] joinSideFinal transaction sent! Signature:",
          tx
        );
        console.log(
          "🎲 [JoinLobby] Orao VRF request created:",
          vrfRequestPda.toString()
        );
        console.log(
          "⏳ [JoinLobby] Orao oracles will fulfill randomness (sub-second!), then backend resolves match"
        );

        return tx;
      } else {
        console.log("[JoinLobby] Using join_side (simple, no VRF)");

        // Use simple join_side for non-final joins
        const tx = await program.methods
          .joinSide(params.side)
          .accountsPartial({
            lobby: params.lobbyPda,
            creator: params.creator,
            player: params.player,
            active: activePda,
            systemProgram: SystemProgram.programId,
          })
          .rpc({
            skipPreflight: false,
            commitment: "confirmed",
          });

        return tx;
      }
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
        params.side,
        params.game,
        params.gameMode,
        params.arenaType,
        params.teamSizeStr
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
    const accounts: any = {
      creator: params.creator,
      player: params.player,
    };

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
      } as any)
      .remainingAccounts(remainingAccounts)
      .instruction();

    const transaction = new Transaction().add(instruction);
    return transaction;
  }
}

// Type-safe account fetchers
export class PvpAccountFetchers {
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
