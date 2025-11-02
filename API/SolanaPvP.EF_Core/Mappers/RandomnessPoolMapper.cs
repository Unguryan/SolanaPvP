using SolanaPvP.Domain.Enums;
using SolanaPvP.Domain.Models;
using SolanaPvP.EF_Core.DBOs;

namespace SolanaPvP.EF_Core.Mappers;

public static class RandomnessPoolMapper
{
    public static RandomnessPoolDBO ToDBO(this RandomnessPoolAccount account)
    {
        return new RandomnessPoolDBO
        {
            AccountPubkey = account.AccountPubkey,
            Status = (int)account.Status,
            CreatedAt = account.CreatedAt,
            LastUsedAt = account.LastUsedAt,
            CooldownUntil = account.CooldownUntil
        };
    }

    public static RandomnessPoolAccount ToDomain(this RandomnessPoolDBO dbo)
    {
        return new RandomnessPoolAccount
        {
            AccountPubkey = dbo.AccountPubkey,
            Status = (RandomnessAccountStatus)dbo.Status,
            CreatedAt = dbo.CreatedAt,
            LastUsedAt = dbo.LastUsedAt,
            CooldownUntil = dbo.CooldownUntil
        };
    }
}

