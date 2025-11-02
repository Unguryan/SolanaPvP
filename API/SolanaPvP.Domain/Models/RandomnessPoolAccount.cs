using SolanaPvP.Domain.Enums;

namespace SolanaPvP.Domain.Models;

/// <summary>
/// Represents a Switchboard OnDemand randomness account in the pool
/// </summary>
public class RandomnessPoolAccount
{
    public string AccountPubkey { get; set; } = string.Empty;
    public RandomnessAccountStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public DateTime? CooldownUntil { get; set; }
}

