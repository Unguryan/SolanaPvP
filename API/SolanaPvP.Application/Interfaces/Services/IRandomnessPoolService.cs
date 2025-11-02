namespace SolanaPvP.Application.Interfaces.Services;

public interface IRandomnessPoolService
{
    /// <summary>
    /// Get an available randomness account from the pool and mark it as InUse
    /// </summary>
    Task<string?> GetAvailableAccountAsync();
    
    /// <summary>
    /// Return a randomness account to the pool with cooldown period
    /// </summary>
    Task ReturnAccountAsync(string accountPubkey, int cooldownMinutes);
    
    /// <summary>
    /// Create a new randomness account and add to pool
    /// </summary>
    Task<bool> CreatePoolAccountAsync();
    
    /// <summary>
    /// Initialize pool with target number of accounts
    /// </summary>
    Task InitializePoolAsync(int targetSize);
    
    /// <summary>
    /// Cleanup invalid accounts and move cooldown expired accounts back to Available
    /// </summary>
    Task CleanupInvalidAccountsAsync();
    
    /// <summary>
    /// Process cooldown expired accounts and return them to Available status
    /// </summary>
    Task ProcessCooldownAccountsAsync();
}

