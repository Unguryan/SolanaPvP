namespace SolanaPvP.Application.Interfaces.SolanaRPC;

public interface IResolveSender
{
    /// <summary>
    /// Sends a resolve_match transaction to the blockchain
    /// </summary>
    /// <param name="matchPda">The match PDA to resolve</param>
    /// <param name="randomnessAccount">The Switchboard randomness account pubkey</param>
    /// <returns>Transaction signature</returns>
    Task<string> SendResolveMatchAsync(string matchPda, string randomnessAccount);
}

