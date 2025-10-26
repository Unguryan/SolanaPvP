using SolanaPvP.Domain.Models;
using SolanaPvP.EF_Core.DBOs;

namespace SolanaPvP.EF_Core.Mappers;

public static class MatchMapper
{
    public static Match ToDomain(this MatchDBO dbo)
    {
        return new Match
        {
            MatchPda = dbo.MatchPda,
            GameMode = dbo.GameMode,
            MatchType = dbo.MatchType,
            StakeLamports = dbo.StakeLamports,
            Status = dbo.Status,
            DeadlineTs = dbo.DeadlineTs,
            WinnerSide = dbo.WinnerSide,
            CreateTx = dbo.CreateTx,
            JoinTx = dbo.JoinTx,
            PayoutTx = dbo.PayoutTx,
            CreatedAt = dbo.CreatedAt,
            JoinedAt = dbo.JoinedAt,
            ResolvedAt = dbo.ResolvedAt,
            IsPrivate = dbo.IsPrivate,
            InvitationId = dbo.InvitationId,
            Participants = dbo.Participants.Select(p => p.ToDomain()).ToList(),
            GameData = dbo.GameData?.ToDomain(),
            Events = dbo.Events.Select(e => e.ToDomain()).ToList(),
            Invitation = dbo.Invitation?.ToDomain()
        };
    }

    public static MatchDBO ToDBO(this Match domain)
    {
        return new MatchDBO
        {
            MatchPda = domain.MatchPda,
            GameMode = domain.GameMode,
            MatchType = domain.MatchType,
            StakeLamports = domain.StakeLamports,
            Status = domain.Status,
            DeadlineTs = domain.DeadlineTs,
            WinnerSide = domain.WinnerSide,
            CreateTx = domain.CreateTx,
            JoinTx = domain.JoinTx,
            PayoutTx = domain.PayoutTx,
            CreatedAt = domain.CreatedAt,
            JoinedAt = domain.JoinedAt,
            ResolvedAt = domain.ResolvedAt,
            IsPrivate = domain.IsPrivate,
            InvitationId = domain.InvitationId,
            Participants = domain.Participants.Select(p => p.ToDBO()).ToList(),
            GameData = domain.GameData?.ToDBO(),
            Events = domain.Events.Select(e => e.ToDBO()).ToList(),
            Invitation = domain.Invitation?.ToDBO()
        };
    }
}
