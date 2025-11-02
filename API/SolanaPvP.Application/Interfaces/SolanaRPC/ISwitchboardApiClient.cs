namespace SolanaPvP.Application.Interfaces.SolanaRPC;

public interface ISwitchboardApiClient
{
    /// <summary>
    /// Create a new Switchboard OnDemand randomness account
    /// </summary>
    Task<string> CreateRandomnessAccountAsync();
    
    /// <summary>
    /// Commit/request randomness for a specific account
    /// </summary>
    Task<bool> CommitRandomnessAsync(string accountPubkey);
    
    /// <summary>
    /// Check if randomness is ready to be consumed (already exists in SwitchboardClient)
    /// </summary>
    Task<bool> IsRandomnessReadyAsync(string accountPubkey);
}

