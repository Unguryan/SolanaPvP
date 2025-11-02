namespace SolanaPvP.Application.Interfaces.SolanaRPC;

public interface ISwitchboardClient
{
    /// <summary>
    /// Check if randomness is ready in the Switchboard account
    /// </summary>
    /// <param name="randomnessAccount">Switchboard randomness account pubkey</param>
    /// <returns>True if randomness is available and ready to use</returns>
    Task<bool> IsRandomnessReadyAsync(string randomnessAccount);
    
    /// <summary>
    /// Read the randomness value from Switchboard account (for logging/verification)
    /// </summary>
    /// <param name="randomnessAccount">Switchboard randomness account pubkey</param>
    /// <returns>Randomness value if available, null otherwise</returns>
    Task<ulong?> ReadRandomnessValueAsync(string randomnessAccount);
}

