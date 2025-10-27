import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PvpProgram } from "../target/types/pvp_program";
import { expect } from "chai";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

describe("pvp_program", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.PvpProgram as Program<PvpProgram>;
  const provider = anchor.getProvider();

  // Test accounts
  let admin: Keypair;
  let creator: Keypair;
  let player1: Keypair;
  let player2: Keypair;
  let lobbyPda: PublicKey;
  let activePda: PublicKey;

  before(async () => {
    // Generate test keypairs
    admin = Keypair.generate();
    creator = Keypair.generate();
    player1 = Keypair.generate();
    player2 = Keypair.generate();

    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(
      admin.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      creator.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      player1.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      player2.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );

    // Wait for airdrops to confirm
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Derive PDAs
    [lobbyPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("lobby"),
        creator.publicKey.toBuffer(),
        new anchor.BN(1).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    [activePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("active"), creator.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Creates a lobby", async () => {
    const lobbyId = new anchor.BN(1);
    const teamSize = 1;
    const stakeLamports = new anchor.BN(100_000_000); // 0.1 SOL
    const side = 0; // team1

    const tx = await program.methods
      .createLobby(lobbyId, teamSize, stakeLamports, side)
      .accounts({
        lobby: lobbyPda,
        active: activePda,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    console.log("Create lobby transaction signature", tx);

    // Verify lobby was created
    const lobbyAccount = await program.account.lobby.fetch(lobbyPda);
    expect(lobbyAccount.creator.toString()).to.equal(
      creator.publicKey.toString()
    );
    expect(lobbyAccount.teamSize).to.equal(teamSize);
    expect(lobbyAccount.stakeLamports.toString()).to.equal(
      stakeLamports.toString()
    );
    expect(lobbyAccount.status.open).to.be.true;
    expect(lobbyAccount.team1.length).to.equal(1);
    expect(lobbyAccount.team1[0].toString()).to.equal(
      creator.publicKey.toString()
    );
  });

  it("Player joins lobby", async () => {
    const side = 1; // team2

    const tx = await program.methods
      .joinSide(side)
      .accounts({
        lobby: lobbyPda,
        creator: creator.publicKey,
        player: player1.publicKey,
        active: activePda,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    console.log("Join side transaction signature", tx);

    // Verify player joined
    const lobbyAccount = await program.account.lobby.fetch(lobbyPda);
    expect(lobbyAccount.team2.length).to.equal(1);
    expect(lobbyAccount.team2[0].toString()).to.equal(
      player1.publicKey.toString()
    );
  });

  it("Refunds lobby after timeout", async () => {
    // Wait for refund timeout (2 minutes in production, but we'll test with a shorter timeout)
    // For testing, we'll just verify the refund instruction works
    const tx = await program.methods
      .refund()
      .accounts({
        lobby: lobbyPda,
        requester: creator.publicKey,
        active: activePda,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts([
        { pubkey: creator.publicKey, isSigner: false, isWritable: true },
        { pubkey: player1.publicKey, isSigner: false, isWritable: true },
      ])
      .signers([creator])
      .rpc();

    console.log("Refund transaction signature", tx);

    // Verify lobby was refunded
    const lobbyAccount = await program.account.lobby.fetch(lobbyPda);
    expect(lobbyAccount.status.refunded).to.be.true;
  });
});
