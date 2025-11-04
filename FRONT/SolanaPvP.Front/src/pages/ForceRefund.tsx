import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { usePvpProgram, useLobbyData } from "@/hooks/usePvpProgram";
import { PdaUtils } from "@/services/solana/accounts";
import { useWallet } from "@solana/wallet-adapter-react";

export default function ForceRefund() {
  const { lobbyPda } = useParams<{ lobbyPda: string }>();
  const navigate = useNavigate();
  const { program } = usePvpProgram();
  const { publicKey } = useWallet();
  const { lobby, isLoading: isLoadingLobby } = useLobbyData(
    lobbyPda ? new PublicKey(lobbyPda) : undefined
  );

  const [status, setStatus] = useState<string>("");
  const [isRefunding, setIsRefunding] = useState(false);

  const handleForceRefund = async () => {
    if (!lobbyPda || !lobby || !program || !publicKey) {
      alert("Lobby, program or wallet not found");
      return;
    }

    try {
      setIsRefunding(true);
      setStatus("Sending force_refund transaction...");

      // Get PDAs
      const [activePda] = PdaUtils.getActiveLobbyPda(lobby.creator);

      // Get all participants (team1 + team2)
      const participants = [...lobby.team1, ...lobby.team2];

      console.log("[ForceRefund] Lobby PDA:", lobbyPda);
      console.log("[ForceRefund] Creator:", lobby.creator.toString());
      console.log("[ForceRefund] Requester:", publicKey.toString());
      console.log(
        "[ForceRefund] Participants:",
        participants.map((p) => p.toString())
      );

      // Build force_refund transaction
      const tx = await program.methods
        .forceRefund()
        .accountsStrict({
          lobby: new PublicKey(lobbyPda),
          creator: lobby.creator,
          requester: publicKey,
          active: activePda,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(
          participants.map((pubkey) => ({
            pubkey,
            isSigner: false,
            isWritable: true,
          }))
        )
        .rpc({
          skipPreflight: false,
          commitment: "confirmed",
        });

      setStatus(`✅ Force refund successful! Signature: ${tx}`);
      console.log("✅ Force refund transaction sent! Signature:", tx);

      // Redirect after 3 seconds
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (err: any) {
      console.error("Force refund error:", err);
      setStatus(`❌ Error: ${err.message || err}`);
      alert(`Error: ${err.message || err}`);
    } finally {
      setIsRefunding(false);
    }
  };

  if (isLoadingLobby) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading lobby data...</div>
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Lobby not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center p-4">
      <div className="bg-black/50 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-white mb-6">
          💥 Force Refund (ADMIN/CREATOR ONLY)
        </h1>

        <div className="space-y-4 mb-6">
          <div>
            <p className="text-gray-400">Lobby PDA:</p>
            <p className="text-white font-mono text-sm break-all">{lobbyPda}</p>
          </div>

          <div>
            <p className="text-gray-400">Creator:</p>
            <p className="text-white font-mono text-sm break-all">
              {lobby.creator.toString()}
            </p>
          </div>

          <div>
            <p className="text-gray-400">Status:</p>
            <p className="text-white font-bold">{lobby.status}</p>
          </div>

          <div>
            <p className="text-gray-400">Finalized:</p>
            <p className="text-white">{lobby.finalized ? "Yes" : "No"}</p>
          </div>

          <div>
            <p className="text-gray-400">Team 1:</p>
            <p className="text-white">{lobby.team1.length} players</p>
          </div>

          <div>
            <p className="text-gray-400">Team 2:</p>
            <p className="text-white">{lobby.team2.length} players</p>
          </div>

          <div>
            <p className="text-gray-400">Total Participants:</p>
            <p className="text-white">
              {lobby.team1.length + lobby.team2.length}
            </p>
          </div>
        </div>

        {status && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <p className="text-white font-mono text-sm break-all">{status}</p>
          </div>
        )}

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <p className="text-yellow-400 text-sm">
            ⚠️ <strong>Force Refund</strong> bypasses status checks and works in
            ANY status.
            <br />
            Only use this to unstuck broken lobbies!
            <br />
            <br />
            You must be the creator or admin to use this.
          </p>
        </div>

        <button
          onClick={handleForceRefund}
          disabled={isRefunding || !publicKey}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-4 px-6 rounded-lg transition-all disabled:cursor-not-allowed"
        >
          {isRefunding ? "Sending Force Refund..." : "💥 Force Refund"}
        </button>

        <button
          onClick={() => navigate("/")}
          className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all"
        >
          ← Back to Home
        </button>

        <p className="text-gray-500 text-sm mt-4 text-center">
          ⚠️ This is a temporary testing endpoint. Will be removed in
          production.
        </p>
      </div>
    </div>
  );
}
