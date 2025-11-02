namespace SolanaPvP.Domain.Settings;

/// <summary>
/// Switchboard OnDemand configuration
/// </summary>
public class SwitchboardSettings
{
    /// <summary>
    /// Switchboard API base URL
    /// </summary>
    public string ApiUrl { get; set; } = "https://api.switchboard.xyz";
    
    /// <summary>
    /// Switchboard Queue pubkey (devnet/mainnet specific)
    /// </summary>
    public string QueuePubkey { get; set; } = "FfD96yeXs4cxZshoPPSKhSPgVQxLAJUT3gefgh84m1Di";
    
    /// <summary>
    /// Initial number of randomness accounts to create on startup
    /// </summary>
    public int PoolInitialSize { get; set; } = 5;
    
    /// <summary>
    /// Maximum number of randomness accounts allowed in pool
    /// </summary>
    public int PoolMaxSize { get; set; } = 20;
    
    /// <summary>
    /// Minutes to wait before reusing a randomness account (prevents replay attacks)
    /// </summary>
    public int CooldownMinutes { get; set; } = 5;
}

