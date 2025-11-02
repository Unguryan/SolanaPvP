namespace SolanaPvP.Domain.Enums;

/// <summary>
/// Status of a randomness account in the pool
/// </summary>
public enum RandomnessAccountStatus
{
    /// <summary>
    /// Account is ready to be used for a new lobby
    /// </summary>
    Available = 0,
    
    /// <summary>
    /// Account is currently assigned to an active lobby
    /// </summary>
    InUse = 1,
    
    /// <summary>
    /// Account was recently used and is in cooldown period before reuse
    /// </summary>
    Cooldown = 2,
    
    /// <summary>
    /// Account is invalid or failed verification
    /// </summary>
    Invalid = 3
}

