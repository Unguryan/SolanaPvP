using SolanaPvP.Domain.Models;
using SolanaPvP.EF_Core.DBOs;

namespace SolanaPvP.EF_Core.Mappers;

public static class MatchInvitationMapper
{
    public static MatchInvitation ToDomain(this MatchInvitationDBO dbo)
    {
        return new MatchInvitation
        {
            Id = dbo.Id,
            InviterPubkey = dbo.InviterPubkey,
            InviteePubkey = dbo.InviteePubkey,
            GameMode = dbo.GameMode,
            MatchType = dbo.MatchType,
            StakeLamports = dbo.StakeLamports,
            Status = dbo.Status,
            CreatedAt = dbo.CreatedAt,
            ExpiresAt = dbo.ExpiresAt,
            MatchPda = dbo.MatchPda
        };
    }

    public static MatchInvitationDBO ToDBO(this MatchInvitation domain)
    {
        return new MatchInvitationDBO
        {
            Id = domain.Id,
            InviterPubkey = domain.InviterPubkey,
            InviteePubkey = domain.InviteePubkey,
            GameMode = domain.GameMode,
            MatchType = domain.MatchType,
            StakeLamports = domain.StakeLamports,
            Status = domain.Status,
            CreatedAt = domain.CreatedAt,
            ExpiresAt = domain.ExpiresAt,
            MatchPda = domain.MatchPda
        };
    }
}
